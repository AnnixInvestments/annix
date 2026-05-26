import { randomBytes } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DateTime, now } from "../../lib/datetime";
import {
  EeConsentSource,
  EeDisabilityStatus,
  EeGender,
  EeNationalityStatus,
  EePopulationGroup,
  EePurpose,
} from "../entities/annix-orbit-candidate-ee-attributes.entity";
import { AnnixOrbitEeConsentTextVersion } from "../entities/annix-orbit-ee-consent-text-version.entity";
import { AnnixOrbitEeDisclosureInvite } from "../entities/annix-orbit-ee-disclosure-invite.entity";
import { CvEmailTemplateKind } from "../entities/annix-orbit-email-template.entity";
import { AnnixOrbitCompanyRepository } from "../repositories/annix-orbit-company.repository";
import { AnnixOrbitEeConsentTextVersionRepository } from "../repositories/annix-orbit-ee-consent-text-version.repository";
import { AnnixOrbitEeDisclosureInviteRepository } from "../repositories/annix-orbit-ee-disclosure-invite.repository";
import { CandidateRepository } from "../repositories/candidate.repository";
import { JobPostingRepository } from "../repositories/job-posting.repository";
import { EmailTemplateService } from "./email-template.service";
import { PopiaService } from "./popia.service";

const INVITE_TOKEN_TTL_DAYS = 30;
const INVITE_TOKEN_BYTES = 32;

interface SubmitDisclosureInput {
  populationGroup: EePopulationGroup;
  gender: EeGender;
  disabilityStatus: EeDisabilityStatus;
  requiresAccommodation: boolean;
  accommodationNotes: string | null;
  nationalityStatus: EeNationalityStatus;
  purposes: EePurpose[];
}

export interface DisclosureLookupResult {
  candidate: { name: string | null; email: string | null };
  job: { id: number; title: string; referenceNumber: string | null };
  consentText: { id: number; versionLabel: string; body: string };
  expiresAt: Date;
  alreadySubmitted: boolean;
}

@Injectable()
export class EeDisclosureService {
  private readonly logger = new Logger(EeDisclosureService.name);

  constructor(
    private readonly inviteRepo: AnnixOrbitEeDisclosureInviteRepository,
    private readonly consentTextVersionRepo: AnnixOrbitEeConsentTextVersionRepository,
    private readonly candidateRepo: CandidateRepository,
    private readonly jobPostingRepo: JobPostingRepository,
    private readonly companyRepo: AnnixOrbitCompanyRepository,
    private readonly popiaService: PopiaService,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly configService: ConfigService,
  ) {}

  async createInvite(
    candidateId: number,
    jobPostingId: number,
  ): Promise<AnnixOrbitEeDisclosureInvite> {
    const candidate = await this.candidateRepo.findById(candidateId);
    if (!candidate) throw new NotFoundException("Candidate not found");

    const job = await this.jobPostingRepo.findById(jobPostingId);
    if (!job) throw new NotFoundException("Job posting not found");

    const existing = await this.inviteRepo.findActiveInvite(
      candidateId,
      jobPostingId,
      now().toJSDate(),
    );
    if (existing) return existing;

    const token = randomBytes(INVITE_TOKEN_BYTES).toString("base64url");
    const expiresAt = DateTime.now().plus({ days: INVITE_TOKEN_TTL_DAYS }).toJSDate();

    return this.inviteRepo.create({
      candidateId,
      jobPostingId,
      token,
      expiresAt,
      usedAt: null,
    });
  }

  async lookupByToken(token: string): Promise<DisclosureLookupResult> {
    const invite = await this.inviteRepo.findByTokenWithRelations(token);
    if (!invite) throw new NotFoundException("Disclosure invite not found");
    if (invite.expiresAt.getTime() < now().toMillis()) {
      throw new GoneException("Disclosure invite has expired");
    }

    const consentText = await this.activeConsentText();

    return {
      candidate: { name: invite.candidate.name, email: invite.candidate.email },
      job: {
        id: invite.jobPosting.id,
        title: invite.jobPosting.title,
        referenceNumber: invite.jobPosting.referenceNumber,
      },
      consentText: {
        id: consentText.id,
        versionLabel: consentText.versionLabel,
        body: consentText.body,
      },
      expiresAt: invite.expiresAt,
      alreadySubmitted: invite.usedAt !== null,
    };
  }

  async submitDisclosure(token: string, input: SubmitDisclosureInput): Promise<void> {
    const invite = await this.inviteRepo.findByToken(token);
    if (!invite) throw new NotFoundException("Disclosure invite not found");
    if (invite.expiresAt.getTime() < now().toMillis()) {
      throw new GoneException("Disclosure invite has expired");
    }
    if (invite.usedAt !== null) {
      throw new ConflictException(
        "Disclosure already submitted; corrections are made via the candidate self-service portal",
      );
    }

    const consentText = await this.activeConsentText();

    await this.popiaService.recordEeConsent({
      candidateId: invite.candidateId,
      populationGroup: input.populationGroup,
      gender: input.gender,
      disabilityStatus: input.disabilityStatus,
      requiresAccommodation: input.requiresAccommodation,
      accommodationNotes: input.accommodationNotes,
      nationalityStatus: input.nationalityStatus,
      consentTextVersionId: consentText.id,
      consentSource: EeConsentSource.POST_APPLICATION_EMAIL,
      purposes: input.purposes,
      actorId: null,
    });

    await this.inviteRepo.markUsed(invite.id, now().toJSDate());
  }

  async sendInviteForCandidate(
    companyId: number,
    candidateId: number,
  ): Promise<{ sent: boolean; disclosureLink: string; alreadyUsed: boolean }> {
    const candidate = await this.candidateRepo.findByIdWithJobPosting(candidateId);
    if (!candidate) throw new NotFoundException("Candidate not found");
    const jobPosting = candidate.jobPosting;
    if (!jobPosting || jobPosting.companyId !== companyId) {
      throw new ForbiddenException("Candidate does not belong to your company");
    }
    if (!candidate.email) {
      throw new BadRequestException("Candidate has no email address on file.");
    }

    const company = await this.companyRepo.findById(companyId);
    if (!company) throw new NotFoundException("Company not found");
    if (!company.isDesignatedEmployer) {
      throw new BadRequestException(
        "Company must be flagged as a designated employer before sending EE disclosure invites",
      );
    }
    if (!company.eeaReportingEnabled) {
      throw new BadRequestException(
        "EEA reporting must be enabled on the company before sending EE disclosure invites",
      );
    }

    await this.activeConsentText();

    const invite = await this.createInvite(candidate.id, jobPosting.id);
    const disclosureLink = this.disclosureLinkFor(invite.token);
    const dpoEmail = this.dpoEmail();

    const sent = await this.emailTemplateService.renderAndSend({
      companyId,
      kind: CvEmailTemplateKind.EE_DISCLOSURE_INVITE,
      to: candidate.email,
      vars: {
        candidateName: candidate.name || "Applicant",
        jobTitle: jobPosting.title,
        companyName: company.name,
        disclosureLink,
        dpoEmail,
      },
    });

    return { sent, disclosureLink, alreadyUsed: invite.usedAt !== null };
  }

  private dpoEmail(): string {
    return (
      this.configService.get<string>("ANNIX_EE_DATA_PROTECTION_OFFICER_EMAIL") ??
      "privacy@example.com"
    );
  }

  private disclosureLinkFor(token: string): string {
    const baseUrl = this.configService.get<string>("FRONTEND_URL") ?? "http://localhost:3000";
    return `${baseUrl}/annix-orbit/ee-disclosure/${token}`;
  }

  private async activeConsentText(): Promise<AnnixOrbitEeConsentTextVersion> {
    const activeNow = now().toJSDate();
    const active = await this.consentTextVersionRepo.activeAt(activeNow);
    if (!active) {
      throw new NotFoundException(
        "No active EE consent text version configured; seed one before enabling EE disclosure",
      );
    }
    return active;
  }
}
