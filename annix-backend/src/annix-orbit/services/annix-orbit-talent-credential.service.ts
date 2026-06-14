import { CREDENTIAL_TYPES, type CredentialType } from "@annix/product-data/sa-market";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DateTime } from "../../lib/datetime";
import { AnnixOrbitTalentCredential } from "../entities/annix-orbit-talent-credential.entity";
import { AnnixOrbitTalentCandidateRepository } from "../repositories/annix-orbit-talent-candidate.repository";
import { AnnixOrbitTalentCredentialRepository } from "../repositories/annix-orbit-talent-credential.repository";
import { OrbitCredentialTypeRepository } from "../repositories/orbit-credential-type.repository";
import {
  addDaysIso,
  type CredentialExpiryStatus,
  classifyCredentialExpiry,
  DEFAULT_EXPIRY_WARN_DAYS,
  toIsoDate,
} from "./credential-expiry";
import { computeSiteReady, type SiteReadyResult } from "./site-ready";

export interface UpsertTalentCredentialInput {
  credentialType?: string;
  issuedAt?: string | null;
  expiresAt?: string | null;
  issuingAuthority?: string | null;
  documentPath?: string | null;
  verified?: boolean;
  notes?: string | null;
}

export interface TalentCredentialView extends AnnixOrbitTalentCredential {
  status: CredentialExpiryStatus;
}

export interface CompanyExpiringSummary {
  withinDays: number;
  candidateCount: number;
  credentialCount: number;
  expiredCount: number;
  expiringCount: number;
  items: Array<{
    credentialId: number;
    candidateId: number;
    credentialType: string;
    expiresAt: string | null;
    status: CredentialExpiryStatus;
  }>;
}

const HISTORICAL_FLOOR = "1900-01-01";

@Injectable()
export class AnnixOrbitTalentCredentialService {
  constructor(
    private readonly credentialRepo: AnnixOrbitTalentCredentialRepository,
    private readonly candidateRepo: AnnixOrbitTalentCandidateRepository,
    private readonly credentialTypeRepo: OrbitCredentialTypeRepository,
  ) {}

  private today(): string {
    return DateTime.now().toISODate() ?? new Date().toISOString().slice(0, 10);
  }

  private async assertCandidateInCompany(candidateId: number, companyId: number): Promise<void> {
    const candidate = await this.candidateRepo.findByIdForCompany(candidateId, companyId);
    if (!candidate) {
      throw new NotFoundException("Candidate not found");
    }
  }

  private async assertAllowedCode(code: string): Promise<void> {
    if (CREDENTIAL_TYPES.includes(code as CredentialType)) {
      return;
    }
    const match = await this.credentialTypeRepo.findByCode(code);
    if (!match?.active) {
      throw new BadRequestException(`Unknown credential type: ${code}`);
    }
  }

  private withStatus(credential: AnnixOrbitTalentCredential, today: string): TalentCredentialView {
    return {
      ...credential,
      issuedAt: toIsoDate(credential.issuedAt),
      expiresAt: toIsoDate(credential.expiresAt),
      status: classifyCredentialExpiry(credential.expiresAt, today),
    };
  }

  async listForCandidate(candidateId: number, companyId: number): Promise<TalentCredentialView[]> {
    await this.assertCandidateInCompany(candidateId, companyId);
    const credentials = await this.credentialRepo.findByCandidate(candidateId);
    const today = this.today();
    return credentials.map((credential) => this.withStatus(credential, today));
  }

  async create(
    candidateId: number,
    companyId: number,
    input: UpsertTalentCredentialInput,
  ): Promise<TalentCredentialView> {
    await this.assertCandidateInCompany(candidateId, companyId);
    const code = (input.credentialType ?? "").trim().toLowerCase();
    await this.assertAllowedCode(code);
    const created = await this.credentialRepo.create({
      companyId,
      candidateId,
      credentialType: code,
      issuedAt: input.issuedAt ?? null,
      expiresAt: input.expiresAt ?? null,
      issuingAuthority: input.issuingAuthority ? input.issuingAuthority.trim() : null,
      documentPath: input.documentPath ?? null,
      verified: input.verified ?? false,
      notes: input.notes ? input.notes.trim() : null,
    });
    return this.withStatus(created, this.today());
  }

  async update(
    id: number,
    companyId: number,
    input: UpsertTalentCredentialInput,
  ): Promise<TalentCredentialView> {
    const existing = await this.credentialRepo.findById(id);
    if (!existing || existing.companyId !== companyId) {
      throw new NotFoundException("Credential not found");
    }
    if (input.credentialType !== undefined) {
      const code = input.credentialType.trim().toLowerCase();
      await this.assertAllowedCode(code);
      existing.credentialType = code;
    }
    if (input.issuedAt !== undefined) existing.issuedAt = input.issuedAt;
    if (input.expiresAt !== undefined) existing.expiresAt = input.expiresAt;
    if (input.issuingAuthority !== undefined) {
      existing.issuingAuthority = input.issuingAuthority ? input.issuingAuthority.trim() : null;
    }
    if (input.documentPath !== undefined) existing.documentPath = input.documentPath;
    if (input.verified !== undefined) existing.verified = input.verified;
    if (input.notes !== undefined) existing.notes = input.notes ? input.notes.trim() : null;
    const saved = await this.credentialRepo.save(existing);
    return this.withStatus(saved, this.today());
  }

  async remove(id: number, companyId: number): Promise<void> {
    const existing = await this.credentialRepo.findById(id);
    if (!existing || existing.companyId !== companyId) {
      throw new NotFoundException("Credential not found");
    }
    await this.credentialRepo.deleteById(id);
  }

  // Powers the recruiter dashboard "Compliance Alerts" card (issue
  // #362): candidates in this company holding at least one already-
  // expired or soon-to-expire credential.
  async expiringSummaryForCompany(
    companyId: number,
    withinDays: number = DEFAULT_EXPIRY_WARN_DAYS,
  ): Promise<CompanyExpiringSummary> {
    const today = this.today();
    const dayEnd = addDaysIso(today, withinDays);
    const credentials = await this.credentialRepo.expiringForCompany(
      companyId,
      HISTORICAL_FLOOR,
      dayEnd,
    );

    const candidateIds = new Set<number>();
    const items = credentials.reduce<CompanyExpiringSummary["items"]>((acc, credential) => {
      const status = classifyCredentialExpiry(credential.expiresAt, today, withinDays);
      if (status !== "expired" && status !== "expiring") {
        return acc;
      }
      candidateIds.add(credential.candidateId);
      acc.push({
        credentialId: credential.id,
        candidateId: credential.candidateId,
        credentialType: credential.credentialType,
        expiresAt: toIsoDate(credential.expiresAt),
        status,
      });
      return acc;
    }, []);

    return {
      withinDays,
      candidateCount: candidateIds.size,
      credentialCount: items.length,
      expiredCount: items.filter((item) => item.status === "expired").length,
      expiringCount: items.filter((item) => item.status === "expiring").length,
      items,
    };
  }

  // Site-Ready / Compliance-Readiness score for one candidate (#362
  // phase 4) — score + the actionable "missing to be site-ready" gaps.
  async siteReadyForCandidate(candidateId: number, companyId: number): Promise<SiteReadyResult> {
    await this.assertCandidateInCompany(candidateId, companyId);
    const credentials = await this.credentialRepo.findByCandidate(candidateId);
    return computeSiteReady(credentials, this.today());
  }

  // Company-wide site-ready scores keyed by candidate — powers the
  // candidate-list facet and (later) the dashboard site-ready signal.
  // Single batched credential read; the score is computed on the fly so
  // it is never stale (no stored score, infra-light).
  async siteReadyScoresForCompany(
    companyId: number,
    userId: number,
  ): Promise<Array<{ candidateId: number } & SiteReadyResult>> {
    const candidates = await this.candidateRepo.findVisibleForCompany(companyId, userId);
    const candidateIds = candidates.map((candidate) => candidate.id);
    const credentials = await this.credentialRepo.listForCandidates(candidateIds);
    const byCandidate = credentials.reduce((acc, credential) => {
      const list = acc.get(credential.candidateId);
      if (list) {
        list.push(credential);
      } else {
        acc.set(credential.candidateId, [credential]);
      }
      return acc;
    }, new Map<number, AnnixOrbitTalentCredential[]>());
    const today = this.today();
    return candidateIds.map((candidateId) => ({
      candidateId,
      ...computeSiteReady(byCandidate.get(candidateId) ?? [], today),
    }));
  }
}
