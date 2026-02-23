import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EmailService } from "../../email/email.service";
import { Candidate, CandidateStatus } from "../entities/candidate.entity";
import { JobPosting } from "../entities/job-posting.entity";
import { CandidateService } from "./candidate.service";
import { CvExtractionService } from "./cv-extraction.service";
import { JobMatchService } from "./job-match.service";
import { ReferenceService } from "./reference.service";

@Injectable()
export class WorkflowAutomationService {
  private readonly logger = new Logger(WorkflowAutomationService.name);

  constructor(
    @InjectRepository(Candidate)
    private readonly candidateRepo: Repository<Candidate>,
    @InjectRepository(JobPosting)
    private readonly jobPostingRepo: Repository<JobPosting>,
    private readonly cvExtractionService: CvExtractionService,
    private readonly jobMatchService: JobMatchService,
    private readonly candidateService: CandidateService,
    private readonly referenceService: ReferenceService,
    private readonly emailService: EmailService,
  ) {}

  async processCandidateCv(candidateId: number): Promise<void> {
    const candidate = await this.candidateRepo.findOne({
      where: { id: candidateId },
      relations: ["jobPosting"],
    });

    if (!candidate) {
      this.logger.warn(`Candidate ${candidateId} not found`);
      return;
    }

    if (!candidate.cvFilePath) {
      this.logger.warn(`Candidate ${candidateId} has no CV file`);
      return;
    }

    try {
      candidate.status = CandidateStatus.SCREENING;
      await this.candidateRepo.save(candidate);

      const { text, data } = await this.cvExtractionService.processCV(candidate.cvFilePath);

      candidate.rawCvText = text;
      candidate.extractedData = data;
      candidate.name = data.candidateName || candidate.name;
      candidate.email = data.email || candidate.email;
      await this.candidateRepo.save(candidate);

      const matchAnalysis = await this.jobMatchService.analyzeMatch(data, candidate.jobPosting);

      candidate.matchAnalysis = matchAnalysis;
      candidate.matchScore = matchAnalysis.overallScore;
      await this.candidateRepo.save(candidate);

      if (data.references && data.references.length > 0) {
        await this.referenceService.createReferencesFromExtractedData(candidateId, data);
      }

      await this.applyAutomationRules(candidate);

      this.logger.log(
        `Processed CV for candidate ${candidateId}, score: ${matchAnalysis.overallScore}`,
      );
    } catch (error) {
      this.logger.error(`Failed to process CV for candidate ${candidateId}: ${error.message}`);
      candidate.status = CandidateStatus.NEW;
      await this.candidateRepo.save(candidate);
    }
  }

  private async applyAutomationRules(candidate: Candidate): Promise<void> {
    const jobPosting = candidate.jobPosting;

    if (!candidate.matchScore) {
      return;
    }

    if (jobPosting.autoRejectEnabled && candidate.matchScore < jobPosting.autoRejectThreshold) {
      await this.autoRejectCandidate(candidate);
    } else if (candidate.matchScore >= jobPosting.autoAcceptThreshold) {
      await this.autoShortlistCandidate(candidate);
    } else {
      candidate.status = CandidateStatus.NEW;
      await this.candidateRepo.save(candidate);
    }
  }

  private async autoRejectCandidate(candidate: Candidate): Promise<void> {
    candidate.status = CandidateStatus.REJECTED;
    await this.candidateRepo.save(candidate);

    if (candidate.email) {
      const sent = await this.emailService.sendCvAssistantRejectionEmail(
        candidate.email,
        candidate.name || "Applicant",
        candidate.jobPosting.title,
      );

      if (sent) {
        await this.candidateService.markRejectionSent(candidate.id);
        this.logger.log(`Auto-rejection email sent to candidate ${candidate.id}`);
      }
    }
  }

  private async autoShortlistCandidate(candidate: Candidate): Promise<void> {
    candidate.status = CandidateStatus.SHORTLISTED;
    await this.candidateRepo.save(candidate);

    if (candidate.email) {
      const sent = await this.emailService.sendCvAssistantShortlistEmail(
        candidate.email,
        candidate.name || "Applicant",
        candidate.jobPosting.title,
      );

      if (sent) {
        await this.candidateService.markAcceptanceSent(candidate.id);
        this.logger.log(`Auto-shortlist email sent to candidate ${candidate.id}`);
      }
    }

    const refs = await this.referenceService.pendingReferencesForCandidate(candidate.id);
    if (refs.length > 0) {
      await this.referenceService.sendReferenceRequests(candidate.id);
    }
  }

  async manualReject(candidateId: number, companyId: number): Promise<void> {
    const candidate = await this.candidateRepo.findOne({
      where: { id: candidateId },
      relations: ["jobPosting"],
    });

    if (!candidate || candidate.jobPosting.companyId !== companyId) {
      return;
    }

    candidate.status = CandidateStatus.REJECTED;
    await this.candidateRepo.save(candidate);

    if (candidate.email && !candidate.rejectionSentAt) {
      const sent = await this.emailService.sendCvAssistantRejectionEmail(
        candidate.email,
        candidate.name || "Applicant",
        candidate.jobPosting.title,
      );

      if (sent) {
        await this.candidateService.markRejectionSent(candidate.id);
      }
    }
  }

  async manualShortlist(candidateId: number, companyId: number): Promise<void> {
    const candidate = await this.candidateRepo.findOne({
      where: { id: candidateId },
      relations: ["jobPosting", "references"],
    });

    if (!candidate || candidate.jobPosting.companyId !== companyId) {
      return;
    }

    candidate.status = CandidateStatus.SHORTLISTED;
    await this.candidateRepo.save(candidate);

    if (candidate.email && !candidate.acceptanceSentAt) {
      const sent = await this.emailService.sendCvAssistantShortlistEmail(
        candidate.email,
        candidate.name || "Applicant",
        candidate.jobPosting.title,
      );

      if (sent) {
        await this.candidateService.markAcceptanceSent(candidate.id);
      }
    }

    if (candidate.references && candidate.references.length > 0) {
      await this.referenceService.sendReferenceRequests(candidate.id);
    }
  }

  async manualAccept(candidateId: number, companyId: number): Promise<void> {
    const candidate = await this.candidateRepo.findOne({
      where: { id: candidateId },
      relations: ["jobPosting"],
    });

    if (!candidate || candidate.jobPosting.companyId !== companyId) {
      return;
    }

    candidate.status = CandidateStatus.ACCEPTED;
    await this.candidateRepo.save(candidate);

    if (candidate.email) {
      await this.emailService.sendCvAssistantAcceptanceEmail(
        candidate.email,
        candidate.name || "Applicant",
        candidate.jobPosting.title,
      );
    }
  }
}
