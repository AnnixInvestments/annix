import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EmailService } from "../../email/email.service";
import { Candidate, CandidateStatus, type MatchAnalysis } from "../entities/candidate.entity";
import { CvAssistantCompany } from "../entities/cv-assistant-company.entity";
import { JobPosting } from "../entities/job-posting.entity";
import { CandidateService } from "./candidate.service";
import { CandidateJobMatchingService } from "./candidate-job-matching.service";
import { CvAuditService } from "./cv-audit.service";
import { CvExtractionService } from "./cv-extraction.service";
import {
  CvScreeningService,
  type ScreeningRejectionCategory,
  type ScreeningResult,
} from "./cv-screening.service";
import { EmbeddingService } from "./embedding.service";
import { JobMatchService } from "./job-match.service";
import { ReferenceService } from "./reference.service";

const POPIA_RETENTION_MONTHS = 12;

@Injectable()
export class WorkflowAutomationService {
  private readonly logger = new Logger(WorkflowAutomationService.name);

  constructor(
    @InjectRepository(Candidate)
    private readonly candidateRepo: Repository<Candidate>,
    @InjectRepository(JobPosting)
    private readonly jobPostingRepo: Repository<JobPosting>,
    @InjectRepository(CvAssistantCompany)
    private readonly companyRepo: Repository<CvAssistantCompany>,
    private readonly cvExtractionService: CvExtractionService,
    private readonly jobMatchService: JobMatchService,
    private readonly candidateService: CandidateService,
    private readonly referenceService: ReferenceService,
    private readonly emailService: EmailService,
    private readonly embeddingService: EmbeddingService,
    private readonly candidateJobMatchingService: CandidateJobMatchingService,
    private readonly cvAuditService: CvAuditService,
    private readonly cvScreeningService: CvScreeningService,
  ) {}

  async processCandidateCv(candidateId: number): Promise<void> {
    const candidate = await this.candidateRepo.findOne({
      where: { id: candidateId },
      relations: ["jobPosting"],
    });

    if (!candidate) {
      this.logger.warn(`Candidate ${candidateId} not found`);
    } else if (!candidate.cvFilePath) {
      this.logger.warn(`Candidate ${candidateId} has no CV file`);
    } else {
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

        this.embeddingService
          .embedCandidate(candidateId)
          .then((embedded) => {
            if (embedded) {
              return this.candidateJobMatchingService.matchCandidateToJobs(candidateId);
            }
            return null;
          })
          .catch((err: unknown) => {
            this.logger.warn(
              `Failed to generate embedding/matches for candidate ${candidateId}: ${err instanceof Error ? err.message : String(err)}`,
            );
          });

        await this.applyAutomationRules(candidate, candidate.jobPosting);

        this.logger.log(
          `Processed CV for candidate ${candidateId}, score: ${matchAnalysis.overallScore}`,
        );
      } catch (error: unknown) {
        this.logger.error(
          `Failed to process CV for candidate ${candidateId}: ${error instanceof Error ? error.message : String(error)}`,
        );
        candidate.status = CandidateStatus.NEW;
        await this.candidateRepo.save(candidate);
      }
    }
  }

  async applyAutomationRules(candidate: Candidate, jobPosting: JobPosting): Promise<void> {
    const screening = this.cvScreeningService.screen(candidate, jobPosting);
    this.persistScreeningOutcome(candidate, screening);

    if (!screening.passed && jobPosting.autoRejectEnabled) {
      await this.autoRejectCandidate(candidate, jobPosting, screening.rejectionCategories);
      await this.cvAuditService.logScreeningDecision(
        candidate.id,
        jobPosting.id,
        "auto_rejected",
        screening.reasons,
        null,
      );
      this.logger.log(
        `Candidate ${candidate.id} auto-rejected on hard filters: ${screening.rejectionCategories.join(", ")}`,
      );
    } else if (!screening.passed) {
      candidate.status = CandidateStatus.NEW;
      await this.candidateRepo.save(candidate);
      await this.cvAuditService.logScreeningDecision(
        candidate.id,
        jobPosting.id,
        "acknowledged",
        [
          `Hard filters failed (${screening.rejectionCategories.join(", ")}) but auto-reject disabled — held for HR review`,
        ],
        null,
      );
      this.logger.log(
        `Candidate ${candidate.id} failed hard filters but auto-reject disabled — held for human review (${screening.rejectionCategories.join(", ")})`,
      );
    } else {
      await this.acknowledgeApplication(candidate, jobPosting);
      await this.cvAuditService.logScreeningDecision(
        candidate.id,
        jobPosting.id,
        "acknowledged",
        ["Hard filters passed; acknowledgement sent"],
        null,
      );
      this.logger.log(`Candidate ${candidate.id} passed hard filters — acknowledgement sent`);

      const score = candidate.matchScore;
      if (score !== null && score !== undefined && score >= jobPosting.autoAcceptThreshold) {
        await this.autoShortlistCandidate(candidate);
        await this.cvAuditService.logScreeningDecision(
          candidate.id,
          jobPosting.id,
          "auto_shortlisted",
          [`score ${score} >= auto-accept threshold ${jobPosting.autoAcceptThreshold}`],
          null,
        );
      }
    }
  }

  private persistScreeningOutcome(candidate: Candidate, screening: ScreeningResult): void {
    const existing = candidate.matchAnalysis;
    const summaryReason = screening.passed
      ? "Hard filters passed"
      : `Hard filters failed: ${screening.reasons.join("; ")}`;

    const updated: MatchAnalysis = existing
      ? {
          ...existing,
          reasoning: `${summaryReason}${existing.reasoning ? ` | ${existing.reasoning}` : ""}`,
        }
      : {
          overallScore: candidate.matchScore ?? 0,
          skillsMatched: [],
          skillsMissing: [],
          experienceMatch: !screening.rejectionCategories.includes("experience"),
          educationMatch: !screening.rejectionCategories.includes("qualifications"),
          recommendation: screening.passed ? "review" : "reject",
          reasoning: summaryReason,
        };

    candidate.matchAnalysis = updated;
  }

  private async acknowledgeApplication(
    candidate: Candidate,
    jobPosting: JobPosting,
  ): Promise<void> {
    candidate.status = CandidateStatus.SCREENING;
    await this.candidateRepo.save(candidate);

    if (candidate.email) {
      const companyName = await this.companyName(jobPosting.companyId);
      const sent = await this.emailService.sendCvApplicationAcknowledged({
        to: candidate.email,
        applicantName: candidate.name || "Applicant",
        jobTitle: jobPosting.title,
        jobReference: jobPosting.referenceNumber,
        companyName,
        responseTimelineDays: jobPosting.responseTimelineDays,
      });

      if (sent) {
        this.logger.log(`Acknowledgement email sent to candidate ${candidate.id}`);
      }
    }
  }

  private async autoRejectCandidate(
    candidate: Candidate,
    jobPosting: JobPosting,
    categories: ScreeningRejectionCategory[],
  ): Promise<void> {
    candidate.status = CandidateStatus.REJECTED;
    await this.candidateRepo.save(candidate);

    if (candidate.email && !candidate.rejectionSentAt) {
      const companyName = await this.companyName(jobPosting.companyId);
      const sent = await this.emailService.sendCvApplicationRejected({
        to: candidate.email,
        applicantName: candidate.name || "Applicant",
        jobTitle: jobPosting.title,
        jobReference: jobPosting.referenceNumber,
        companyName,
        reasons: categories,
        retentionMonths: POPIA_RETENTION_MONTHS,
      });

      if (sent) {
        await this.candidateService.markRejectionSent(candidate.id);
        this.logger.log(`Rejection email sent to candidate ${candidate.id}`);
      }
    }
  }

  private async companyName(companyId: number): Promise<string> {
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    return company?.name || "the hiring team";
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

  async manualReject(
    candidateId: number,
    companyId: number,
    actorId: number | null = null,
    reason: string | null = null,
  ): Promise<void> {
    const candidate = await this.candidateRepo.findOne({
      where: { id: candidateId },
      relations: ["jobPosting"],
    });

    if (candidate && candidate.jobPosting.companyId === companyId) {
      const previousStatus = candidate.status;
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

      if (actorId !== null) {
        await this.cvAuditService.logHrOverride(
          candidate.id,
          previousStatus,
          CandidateStatus.REJECTED,
          reason,
          actorId,
        );
        await this.cvAuditService.logScreeningDecision(
          candidate.id,
          candidate.jobPosting.id,
          "manual_rejected",
          reason ? [reason] : [],
          actorId,
        );
      }
    }
  }

  async manualShortlist(
    candidateId: number,
    companyId: number,
    actorId: number | null = null,
    reason: string | null = null,
  ): Promise<void> {
    const candidate = await this.candidateRepo.findOne({
      where: { id: candidateId },
      relations: ["jobPosting", "references"],
    });

    if (candidate && candidate.jobPosting.companyId === companyId) {
      const previousStatus = candidate.status;
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

      if (actorId !== null) {
        await this.cvAuditService.logHrOverride(
          candidate.id,
          previousStatus,
          CandidateStatus.SHORTLISTED,
          reason,
          actorId,
        );
        await this.cvAuditService.logScreeningDecision(
          candidate.id,
          candidate.jobPosting.id,
          "shortlisted",
          reason ? [reason] : [],
          actorId,
        );
      }
    }
  }

  async manualAccept(
    candidateId: number,
    companyId: number,
    actorId: number | null = null,
    reason: string | null = null,
  ): Promise<void> {
    const candidate = await this.candidateRepo.findOne({
      where: { id: candidateId },
      relations: ["jobPosting"],
    });

    if (candidate && candidate.jobPosting.companyId === companyId) {
      const previousStatus = candidate.status;
      candidate.status = CandidateStatus.ACCEPTED;
      await this.candidateRepo.save(candidate);

      if (candidate.email) {
        await this.emailService.sendCvAssistantAcceptanceEmail(
          candidate.email,
          candidate.name || "Applicant",
          candidate.jobPosting.title,
        );
      }

      if (actorId !== null) {
        await this.cvAuditService.logHrOverride(
          candidate.id,
          previousStatus,
          CandidateStatus.ACCEPTED,
          reason,
          actorId,
        );
        await this.cvAuditService.logScreeningDecision(
          candidate.id,
          candidate.jobPosting.id,
          "manual_accepted",
          reason ? [reason] : [],
          actorId,
        );
      }
    }
  }
}
