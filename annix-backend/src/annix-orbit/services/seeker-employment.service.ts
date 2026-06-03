import { Injectable } from "@nestjs/common";
import { fromISO, fromJSDate, now } from "../../lib/datetime";
import { SeekerEmploymentRecord } from "../entities/seeker-employment-record.entity";
import { AnnixOrbitProfileRepository } from "../repositories/annix-orbit-profile.repository";
import { CandidateRepository } from "../repositories/candidate.repository";
import { SeekerEmploymentRecordRepository } from "../repositories/seeker-employment-record.repository";
import type { NixGeneratedCvExperience } from "./nix-prompts";
import { SeekerCompanyResearchService } from "./seeker-company-research.service";

export type EmploymentLifecycleStatus = "active" | "left";
export type EmploymentResearchStatus = "pending" | "researched" | "skipped" | "failed";

export interface SeekerEmploymentRecordView {
  id: number;
  applyClickId: number | null;
  externalJobId: number | null;
  employerName: string;
  companyWebsiteUrl: string | null;
  roleTitle: string;
  roleOutline: string | null;
  startDate: string | null;
  endDate: string | null;
  status: EmploymentLifecycleStatus;
  researchStatus: EmploymentResearchStatus;
  researchedAt: string | null;
  appliedToCvAt: string | null;
}

export interface CreateEmploymentInput {
  applyClickId?: number | null;
  externalJobId?: number | null;
  employerName: string;
  companyWebsiteUrl?: string | null;
  roleTitle: string;
  roleOutline?: string | null;
  startDate: string;
}

export interface UpdateEmploymentInput {
  employerName?: string;
  companyWebsiteUrl?: string | null;
  roleTitle?: string;
  roleOutline?: string | null;
  startDate?: string;
  endDate?: string | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  const dt = typeof value === "string" ? fromISO(value) : fromJSDate(value);
  return dt.isValid ? dt.toISO() : null;
}

function parseDate(value: string | null | undefined): Date | null {
  if (value == null) return null;
  const dt = fromISO(value);
  return dt.isValid ? dt.toJSDate() : null;
}

function trimOrNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveLifecycle(raw: string | null): EmploymentLifecycleStatus {
  return raw === "left" ? "left" : "active";
}

function resolveResearch(raw: string | null): EmploymentResearchStatus {
  if (raw === "researched" || raw === "skipped" || raw === "failed") return raw;
  return "pending";
}

function buildPeriod(start: Date | string | null, end: Date | string | null): string {
  const startDt =
    start == null ? null : typeof start === "string" ? fromISO(start) : fromJSDate(start);
  const endDt = end == null ? null : typeof end === "string" ? fromISO(end) : fromJSDate(end);
  const startLabel = startDt?.isValid ? startDt.toFormat("LLL yyyy") : "";
  const endLabel = endDt?.isValid ? endDt.toFormat("LLL yyyy") : "Present";
  return startLabel ? `${startLabel} – ${endLabel}` : endLabel;
}

function experienceKey(exp: { employer: string; role: string }): string {
  return `${exp.employer.trim().toLowerCase()}|${exp.role.trim().toLowerCase()}`;
}

function mergeExperience(
  existing: NixGeneratedCvExperience[],
  incoming: NixGeneratedCvExperience,
): NixGeneratedCvExperience[] {
  const incomingKey = experienceKey(incoming);
  const filtered = existing.filter((exp) => experienceKey(exp) !== incomingKey);
  return [incoming, ...filtered];
}

@Injectable()
export class SeekerEmploymentService {
  constructor(
    private readonly candidateRepo: CandidateRepository,
    private readonly employmentRepo: SeekerEmploymentRecordRepository,
    private readonly profileRepo: AnnixOrbitProfileRepository,
    private readonly companyResearchService: SeekerCompanyResearchService,
  ) {}

  async listForSeeker(email: string | null): Promise<SeekerEmploymentRecordView[]> {
    if (!email) return [];
    const candidates = await this.candidateRepo.findByEmail(email);
    if (candidates.length === 0) return [];
    const records = await this.employmentRepo.listForCandidates(candidates.map((c) => c.id));
    return records.map((record) => this.toView(record));
  }

  async createOnAcceptance(
    email: string | null,
    input: CreateEmploymentInput,
  ): Promise<SeekerEmploymentRecordView | null> {
    if (!email) return null;
    const candidates = await this.candidateRepo.findByEmail(email);
    if (candidates.length === 0) return null;
    const startDate = parseDate(input.startDate);
    const employerName = input.employerName.trim();
    const roleTitle = input.roleTitle.trim();
    if (!startDate || employerName.length === 0 || roleTitle.length === 0) return null;
    const created = await this.employmentRepo.create({
      candidateId: candidates[0].id,
      applyClickId: input.applyClickId ?? null,
      externalJobId: input.externalJobId ?? null,
      employerName,
      companyWebsiteUrl: trimOrNull(input.companyWebsiteUrl),
      roleTitle,
      roleOutline: trimOrNull(input.roleOutline),
      startDate,
      endDate: null,
      status: "active",
      researchStatus: "pending",
      researchedAt: null,
      appliedToCvAt: null,
    });
    return this.toView(created);
  }

  async update(
    email: string | null,
    id: number,
    input: UpdateEmploymentInput,
  ): Promise<SeekerEmploymentRecordView | null> {
    const record = await this.ownedRecord(email, id);
    if (!record) return null;
    if (input.employerName !== undefined) {
      const employerName = input.employerName.trim();
      if (employerName.length > 0) record.employerName = employerName;
    }
    if (input.roleTitle !== undefined) {
      const roleTitle = input.roleTitle.trim();
      if (roleTitle.length > 0) record.roleTitle = roleTitle;
    }
    if (input.companyWebsiteUrl !== undefined) {
      record.companyWebsiteUrl = trimOrNull(input.companyWebsiteUrl);
    }
    if (input.roleOutline !== undefined) record.roleOutline = trimOrNull(input.roleOutline);
    if (input.startDate !== undefined) {
      const startDate = parseDate(input.startDate);
      if (startDate) record.startDate = startDate;
    }
    if (input.endDate !== undefined) record.endDate = parseDate(input.endDate);
    const saved = await this.employmentRepo.save(record);
    return this.toView(saved);
  }

  async markLeft(
    email: string | null,
    id: number,
    endDate: string | null,
  ): Promise<SeekerEmploymentRecordView | null> {
    const record = await this.ownedRecord(email, id);
    if (!record) return null;
    record.status = "left";
    const parsed = parseDate(endDate);
    record.endDate = parsed ? parsed : now().toJSDate();
    const saved = await this.employmentRepo.save(record);
    return this.toView(saved);
  }

  async reactivate(email: string | null, userId: number): Promise<{ refreshed: number }> {
    if (!email) return { refreshed: 0 };
    const candidates = await this.candidateRepo.findByEmail(email);
    if (candidates.length === 0) return { refreshed: 0 };
    const records = await this.employmentRepo.listForCandidates(candidates.map((c) => c.id));
    const pending = records.filter(
      (record) => resolveResearch(record.researchStatus) === "pending",
    );
    const refreshed = await pending.reduce(async (accPromise, record) => {
      const acc = await accPromise;
      const applied = await this.applyToNixCv(userId, record);
      return applied ? acc + 1 : acc;
    }, Promise.resolve(0));
    return { refreshed };
  }

  async applyToNixCv(userId: number, record: SeekerEmploymentRecord): Promise<boolean> {
    const profile = await this.profileRepo.findByUserId(userId);
    if (!profile) return false;
    const cv = profile.nixGeneratedCv;
    if (!cv) return false;
    const research = await this.companyResearchService.research(
      record.companyWebsiteUrl,
      record.roleTitle,
      record.roleOutline,
    );
    const outline = record.roleOutline;
    const fallbackBullets = outline && outline.trim().length > 0 ? [outline.trim()] : [];
    const researchedBullets = research ? research.inferredBullets : [];
    const bullets = researchedBullets.length > 0 ? researchedBullets : fallbackBullets;
    const experience: NixGeneratedCvExperience = {
      role: record.roleTitle,
      employer: record.employerName,
      period: buildPeriod(record.startDate, record.endDate),
      location: null,
      bullets,
    };
    const existingExperience = Array.isArray(cv.experience) ? cv.experience : [];
    profile.nixGeneratedCv = {
      ...cv,
      experience: mergeExperience(existingExperience, experience),
    };
    profile.nixGeneratedCvAt = now().toJSDate();
    await this.profileRepo.save(profile);
    record.appliedToCvAt = now().toJSDate();
    record.researchStatus = research ? "researched" : "skipped";
    await this.employmentRepo.save(record);
    return true;
  }

  private async ownedRecord(
    email: string | null,
    id: number,
  ): Promise<SeekerEmploymentRecord | null> {
    if (!email) return null;
    const candidates = await this.candidateRepo.findByEmail(email);
    if (candidates.length === 0) return null;
    const candidateIds = new Set(candidates.map((c) => c.id));
    const record = await this.employmentRepo.findById(id);
    if (!record || !candidateIds.has(record.candidateId)) return null;
    return record;
  }

  private toView(record: SeekerEmploymentRecord): SeekerEmploymentRecordView {
    return {
      id: record.id,
      applyClickId: record.applyClickId ?? null,
      externalJobId: record.externalJobId ?? null,
      employerName: record.employerName,
      companyWebsiteUrl: record.companyWebsiteUrl ?? null,
      roleTitle: record.roleTitle,
      roleOutline: record.roleOutline ?? null,
      startDate: toIso(record.startDate),
      endDate: toIso(record.endDate),
      status: resolveLifecycle(record.status),
      researchStatus: resolveResearch(record.researchStatus),
      researchedAt: toIso(record.researchedAt),
      appliedToCvAt: toIso(record.appliedToCvAt),
    };
  }
}
