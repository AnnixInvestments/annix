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
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, LessThan, MoreThan, Repository } from "typeorm";
import { DateTime, now } from "../../lib/datetime";
import { Candidate } from "../entities/candidate.entity";
import {
  EeConsentSource,
  EeDisabilityStatus,
  EeGender,
  EeNationalityStatus,
  EePopulationGroup,
  EePurpose,
} from "../entities/cv-assistant-candidate-ee-attributes.entity";
import { CvAssistantCompany } from "../entities/cv-assistant-company.entity";
import { CvAssistantEeConsentTextVersion } from "../entities/cv-assistant-ee-consent-text-version.entity";
import { CvAssistantEeDisclosureInvite } from "../entities/cv-assistant-ee-disclosure-invite.entity";
import { CvEmailTemplateKind } from "../entities/cv-assistant-email-template.entity";
import { JobPosting } from "../entities/job-posting.entity";
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
    @InjectRepository(CvAssistantEeDisclosureInvite)
    private readonly inviteRepo: Repository<CvAssistantEeDisclosureInvite>,
    @InjectRepository(CvAssistantEeConsentTextVersion)
    private readonly consentTextVersionRepo: Repository<CvAssistantEeConsentTextVersion>,
    @InjectRepository(Candidate)
    private readonly candidateRepo: Repository<Candidate>,
    @InjectRepository(JobPosting)
    private readonly jobPostingRepo: Repository<JobPosting>,
    @InjectRepository(CvAssistantCompany)
    private readonly companyRepo: Repository<CvAssistantCompany>,
    private readonly popiaService: PopiaService,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly configService: ConfigService,
  ) {}

  async createInvite(
    candidateId: number,
    jobPostingId: number,
  ): Promise<CvAssistantEeDisclosureInvite> {
    const candidate = await this.candidateRepo.findOne({ where: { id: candidateId } });
    if (!candidate) throw new NotFoundException("Candidate not found");

    const job = await this.jobPostingRepo.findOne({ where: { id: jobPostingId } });
    if (!job) throw new NotFoundException("Job posting not found");

    const existing = await this.inviteRepo.findOne({
      where: {
        candidateId,
        jobPostingId,
        usedAt: IsNull(),
        expiresAt: MoreThan(now().toJSDate()),
      },
      order: { createdAt: "DESC" },
    });
    if (existing) return existing;

    const token = randomBytes(INVITE_TOKEN_BYTES).toString("base64url");
    const expiresAt = DateTime.now().plus({ days: INVITE_TOKEN_TTL_DAYS }).toJSDate();

    const invite = this.inviteRepo.create({
      candidateId,
      jobPostingId,
      token,
      expiresAt,
      usedAt: null,
    });
    return this.inviteRepo.save(invite);
  }

  async lookupByToken(token: string): Promise<DisclosureLookupResult> {
    const invite = await this.inviteRepo.findOne({
      where: { token },
      relations: ["candidate", "jobPosting"],
    });
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
    const invite = await this.inviteRepo.findOne({ where: { token } });
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

    await this.inviteRepo.update(invite.id, { usedAt: now().toJSDate() });
  }

  async sendInviteForCandidate(
    companyId: number,
    candidateId: number,
  ): Promise<{ sent: boolean; disclosureLink: string; alreadyUsed: boolean }> {
    const candidate = await this.candidateRepo.findOne({
      where: { id: candidateId },
      relations: ["jobPosting"],
    });
    if (!candidate) throw new NotFoundException("Candidate not found");
    if (candidate.jobPosting.companyId !== companyId) {
      throw new ForbiddenException("Candidate does not belong to your company");
    }
    if (!candidate.email) {
      throw new BadRequestException("Candidate has no email address on file.");
    }

    const company = await this.companyRepo.findOne({ where: { id: companyId } });
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

    const invite = await this.createInvite(candidate.id, candidate.jobPosting.id);
    const disclosureLink = this.disclosureLinkFor(invite.token);
    const dpoEmail = this.dpoEmail();

    const sent = await this.emailTemplateService.renderAndSend({
      companyId,
      kind: CvEmailTemplateKind.EE_DISCLOSURE_INVITE,
      to: candidate.email,
      vars: {
        candidateName: candidate.name || "Applicant",
        jobTitle: candidate.jobPosting.title,
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
    return `${baseUrl}/cv-assistant/ee-disclosure/${token}`;
  }

  private async activeConsentText(): Promise<CvAssistantEeConsentTextVersion> {
    const activeNow = now().toJSDate();
    const active = await this.consentTextVersionRepo.findOne({
      where: [
        { effectiveFrom: LessThan(activeNow), effectiveTo: IsNull() },
        { effectiveFrom: LessThan(activeNow), effectiveTo: MoreThan(activeNow) },
      ],
      order: { effectiveFrom: "DESC" },
    });
    if (!active) {
      throw new NotFoundException(
        "No active EE consent text version configured; seed one before enabling EE disclosure",
      );
    }
    return active;
  }
}
