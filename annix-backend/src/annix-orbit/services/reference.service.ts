import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { v4 as uuidv4 } from "uuid";
import { EmailService } from "../../email/email.service";
import { fromJSDate, now } from "../../lib/datetime";
import { CvEmailTemplateKind } from "../entities/annix-orbit-email-template.entity";
import { CandidateStatus, ExtractedCvData } from "../entities/candidate.entity";
import { CandidateReference, ReferenceStatus } from "../entities/candidate-reference.entity";
import { AnnixOrbitCompanyRepository } from "../repositories/annix-orbit-company.repository";
import { CandidateRepository } from "../repositories/candidate.repository";
import { CandidateReferenceRepository } from "../repositories/candidate-reference.repository";
import { EmailTemplateService } from "./email-template.service";

const TOKEN_EXPIRY_DAYS = 7;

@Injectable()
export class ReferenceService {
  private readonly logger = new Logger(ReferenceService.name);

  constructor(
    private readonly referenceRepo: CandidateReferenceRepository,
    private readonly candidateRepo: CandidateRepository,
    private readonly companyRepo: AnnixOrbitCompanyRepository,
    private readonly emailService: EmailService,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly configService: ConfigService,
  ) {}

  async createReferencesFromExtractedData(
    candidateId: number,
    extractedData: ExtractedCvData,
  ): Promise<CandidateReference[]> {
    const references = extractedData.references || [];
    const refsWithEmail = references.filter((ref) => ref.email);

    return refsWithEmail.reduce(
      async (accPromise, ref) => {
        const acc = await accPromise;
        const saved = await this.referenceRepo.create({
          candidateId,
          name: ref.name,
          email: ref.email,
          relationship: ref.relationship,
          feedbackToken: uuidv4(),
          tokenExpiresAt: now().plus({ days: TOKEN_EXPIRY_DAYS }).toJSDate(),
          status: ReferenceStatus.PENDING,
        });
        return [...acc, saved];
      },
      Promise.resolve([] as CandidateReference[]),
    );
  }

  async sendReferenceRequests(candidateId: number): Promise<number> {
    const candidate = await this.candidateRepo.findByIdWithJobAndReferences(candidateId);

    if (!candidate || !candidate.jobPosting) {
      throw new NotFoundException("Candidate not found");
    }

    const jobPosting = candidate.jobPosting;
    const companyId = jobPosting.companyId;
    const company = await this.companyRepo.findById(companyId);
    const companyName = company?.name ?? "the hiring team";
    const frontendUrl = this.configService.get<string>("FRONTEND_URL") ?? "http://localhost:3000";

    const sentCount = await candidate.references
      .filter((reference) => reference.status === ReferenceStatus.PENDING)
      .reduce(async (countPromise, reference) => {
        const count = await countPromise;
        const feedbackLink = `${frontendUrl}/annix-orbit/reference-feedback/${reference.feedbackToken}`;
        const sent = await this.emailTemplateService.renderAndSend({
          companyId,
          kind: CvEmailTemplateKind.REFERENCE_REQUEST,
          to: reference.email,
          vars: {
            referenceName: reference.name,
            candidateName: candidate.name || "the candidate",
            jobTitle: jobPosting.title,
            companyName,
            feedbackLink,
          },
        });

        if (sent) {
          reference.status = ReferenceStatus.REQUESTED;
          reference.requestSentAt = now().toJSDate();
          await this.referenceRepo.save(reference);
          return count + 1;
        }
        return count;
      }, Promise.resolve(0));

    if (sentCount > 0 && candidate.status === CandidateStatus.SHORTLISTED) {
      candidate.status = CandidateStatus.REFERENCE_CHECK;
      await this.candidateRepo.save(candidate);
    }

    return sentCount;
  }

  async validateToken(token: string): Promise<{
    valid: boolean;
    reference?: CandidateReference;
    candidateName?: string;
    jobTitle?: string;
  }> {
    const reference = await this.referenceRepo.findByFeedbackTokenWithCandidate(token);

    if (!reference) {
      return { valid: false };
    }

    if (fromJSDate(reference.tokenExpiresAt) < now()) {
      reference.status = ReferenceStatus.EXPIRED;
      await this.referenceRepo.save(reference);
      return { valid: false };
    }

    if (reference.status === ReferenceStatus.RESPONDED) {
      return { valid: false };
    }

    return {
      valid: true,
      reference,
      candidateName: reference.candidate.name || "the candidate",
      jobTitle: reference.candidate.jobPosting?.title ?? "the role",
    };
  }

  async submitFeedback(token: string, rating: number, feedbackText?: string): Promise<void> {
    const { valid, reference } = await this.validateToken(token);

    if (!valid || !reference) {
      throw new BadRequestException("Invalid or expired feedback link");
    }

    reference.feedbackRating = rating;
    reference.feedbackText = feedbackText || null;
    reference.feedbackSubmittedAt = now().toJSDate();
    reference.status = ReferenceStatus.RESPONDED;
    await this.referenceRepo.save(reference);

    this.logger.log(`Reference feedback submitted for candidate ${reference.candidateId}`);
  }

  async pendingReferencesForCandidate(candidateId: number): Promise<CandidateReference[]> {
    return this.referenceRepo.findByCandidateAndStatus(candidateId, ReferenceStatus.REQUESTED);
  }

  async completedReferencesForCandidate(candidateId: number): Promise<CandidateReference[]> {
    return this.referenceRepo.findByCandidateAndStatus(candidateId, ReferenceStatus.RESPONDED);
  }

  async sendReminders(): Promise<number> {
    const twoDaysAgo = now().minus({ days: 2 }).toJSDate();

    const pendingRefs = await this.referenceRepo.findPendingRemindersBefore(twoDaysAgo);

    const sentCount = await pendingRefs
      .filter((reference) => fromJSDate(reference.tokenExpiresAt) > now())
      .reduce(async (countPromise, reference) => {
        const count = await countPromise;
        const sent = await this.emailService.sendAnnixOrbitReferenceReminderEmail(
          reference.email,
          reference.name,
          reference.candidate.name || "the candidate",
          reference.candidate.jobPosting?.title ?? "the role",
          reference.feedbackToken,
        );

        if (sent) {
          reference.reminderSentAt = now().toJSDate();
          await this.referenceRepo.save(reference);
          return count + 1;
        }
        return count;
      }, Promise.resolve(0));

    return sentCount;
  }

  async referencesForCompany(
    companyId: number,
    status?: ReferenceStatus,
  ): Promise<CandidateReference[]> {
    return this.referenceRepo.referencesForCompany(companyId, status);
  }
}
