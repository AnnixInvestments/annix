import { randomBytes } from "node:crypto";
import {
  ConflictException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
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
import { CvAssistantEeConsentTextVersion } from "../entities/cv-assistant-ee-consent-text-version.entity";
import { CvAssistantEeDisclosureInvite } from "../entities/cv-assistant-ee-disclosure-invite.entity";
import { JobPosting } from "../entities/job-posting.entity";
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
    private readonly popiaService: PopiaService,
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
