import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, Repository } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import { EmailService } from "../../email/email.service";
import { Candidate, CandidateStatus, ExtractedCvData } from "../entities/candidate.entity";
import { CandidateReference, ReferenceStatus } from "../entities/candidate-reference.entity";

const TOKEN_EXPIRY_DAYS = 7;

@Injectable()
export class ReferenceService {
  private readonly logger = new Logger(ReferenceService.name);

  constructor(
    @InjectRepository(CandidateReference)
    private readonly referenceRepo: Repository<CandidateReference>,
    @InjectRepository(Candidate)
    private readonly candidateRepo: Repository<Candidate>,
    private readonly emailService: EmailService,
  ) {}

  async createReferencesFromExtractedData(
    candidateId: number,
    extractedData: ExtractedCvData,
  ): Promise<CandidateReference[]> {
    const references = extractedData.references || [];
    const created: CandidateReference[] = [];

    for (const ref of references) {
      if (ref.email) {
        const reference = this.referenceRepo.create({
          candidateId,
          name: ref.name,
          email: ref.email,
          relationship: ref.relationship,
          feedbackToken: uuidv4(),
          tokenExpiresAt: new Date(Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
          status: ReferenceStatus.PENDING,
        });
        const saved = await this.referenceRepo.save(reference);
        created.push(saved);
      }
    }

    return created;
  }

  async sendReferenceRequests(candidateId: number): Promise<number> {
    const candidate = await this.candidateRepo.findOne({
      where: { id: candidateId },
      relations: ["jobPosting", "references"],
    });

    if (!candidate) {
      throw new NotFoundException("Candidate not found");
    }

    let sentCount = 0;

    for (const reference of candidate.references) {
      if (reference.status === ReferenceStatus.PENDING) {
        const sent = await this.emailService.sendCvAssistantReferenceRequestEmail(
          reference.email,
          reference.name,
          candidate.name || "the candidate",
          candidate.jobPosting.title,
          reference.feedbackToken,
        );

        if (sent) {
          reference.status = ReferenceStatus.REQUESTED;
          reference.requestSentAt = new Date();
          await this.referenceRepo.save(reference);
          sentCount++;
        }
      }
    }

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
    const reference = await this.referenceRepo.findOne({
      where: { feedbackToken: token },
      relations: ["candidate", "candidate.jobPosting"],
    });

    if (!reference) {
      return { valid: false };
    }

    if (reference.tokenExpiresAt < new Date()) {
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
      jobTitle: reference.candidate.jobPosting.title,
    };
  }

  async submitFeedback(token: string, rating: number, feedbackText?: string): Promise<void> {
    const { valid, reference } = await this.validateToken(token);

    if (!valid || !reference) {
      throw new BadRequestException("Invalid or expired feedback link");
    }

    reference.feedbackRating = rating;
    reference.feedbackText = feedbackText || null;
    reference.feedbackSubmittedAt = new Date();
    reference.status = ReferenceStatus.RESPONDED;
    await this.referenceRepo.save(reference);

    this.logger.log(`Reference feedback submitted for candidate ${reference.candidateId}`);
  }

  async pendingReferencesForCandidate(candidateId: number): Promise<CandidateReference[]> {
    return this.referenceRepo.find({
      where: {
        candidateId,
        status: ReferenceStatus.REQUESTED,
      },
    });
  }

  async completedReferencesForCandidate(candidateId: number): Promise<CandidateReference[]> {
    return this.referenceRepo.find({
      where: {
        candidateId,
        status: ReferenceStatus.RESPONDED,
      },
    });
  }

  async sendReminders(): Promise<number> {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    const pendingRefs = await this.referenceRepo.find({
      where: {
        status: ReferenceStatus.REQUESTED,
        requestSentAt: LessThan(twoDaysAgo),
        reminderSentAt: null as unknown as Date,
      },
      relations: ["candidate", "candidate.jobPosting"],
    });

    let sentCount = 0;

    for (const reference of pendingRefs) {
      if (reference.tokenExpiresAt > new Date()) {
        const sent = await this.emailService.sendCvAssistantReferenceReminderEmail(
          reference.email,
          reference.name,
          reference.candidate.name || "the candidate",
          reference.candidate.jobPosting.title,
          reference.feedbackToken,
        );

        if (sent) {
          reference.reminderSentAt = new Date();
          await this.referenceRepo.save(reference);
          sentCount++;
        }
      }
    }

    return sentCount;
  }

  async referencesForCompany(
    companyId: number,
    status?: ReferenceStatus,
  ): Promise<CandidateReference[]> {
    const queryBuilder = this.referenceRepo
      .createQueryBuilder("reference")
      .innerJoinAndSelect("reference.candidate", "candidate")
      .innerJoinAndSelect("candidate.jobPosting", "jobPosting")
      .where("jobPosting.companyId = :companyId", { companyId });

    if (status) {
      queryBuilder.andWhere("reference.status = :status", { status });
    }

    return queryBuilder.orderBy("reference.createdAt", "DESC").getMany();
  }
}
