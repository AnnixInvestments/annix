import { Injectable, Logger } from "@nestjs/common";
import { EmailService } from "../../email/email.service";
import { CvEmailTemplateKind } from "../entities/annix-orbit-email-template.entity";
import { Candidate, CandidateStatus, type MatchAnalysis } from "../entities/candidate.entity";
import { JobPosting } from "../entities/job-posting.entity";
import { AnnixOrbitCompanyRepository } from "../repositories/annix-orbit-company.repository";
import { CandidateRepository } from "../repositories/candidate.repository";
import { CandidateService } from "./candidate.service";
import { CandidateJobMatchingService } from "./candidate-job-matching.service";
import { CvAuditService } from "./cv-audit.service";
import { CvExtractionService } from "./cv-extraction.service";
import {
  CvScreeningService,
  type ScreeningRejectionCategory,
  type ScreeningResult,
} from "./cv-screening.service";
import { EmailTemplateService } from "./email-template.service";
import { EmbeddingService } from "./embedding.service";
import { JobMatchService } from "./job-match.service";
import { formatMatchExplanation } from "./match-explanation";
import { ReferenceService } from "./reference.service";

const POPIA_RETENTION_MONTHS = 12;

@Injectable()
export class WorkflowAutomationService {
  private readonly logger = new Logger(WorkflowAutomationService.name);

  constructor(
    private readonly candidateRepo: CandidateRepository,
    private readonly companyRepo: AnnixOrbitCompanyRepository,
    private readonly cvExtractionService: CvExtractionService,
    private readonly jobMatchService: JobMatchService,
    private readonly candidateService: CandidateService,
    private readonly referenceService: ReferenceService,
    private readonly emailService: EmailService,
    private readonly embeddingService: EmbeddingService,
    private readonly candidateJobMatchingService: CandidateJobMatchingService,
    private readonly cvAuditService: CvAuditService,
    private readonly cvScreeningService: CvScreeningService,
    private readonly emailTemplateService: EmailTemplateService,
  ) {}

  async processCandidateCv(candidateId: number): Promise<void> {
    const candidate = await this.candidateRepo.findByIdWithJobPosting(candidateId);

    if (!candidate) {
      this.logger.warn(`Candidate ${candidateId} not found`);
    } else if (!candidate.cvFilePath) {
      this.logger.warn(`Candidate ${candidateId} has no CV file`);
    } else if (!candidate.jobPosting) {
      this.logger.warn(
        `Candidate ${candidateId} has no job posting — skipping recruiter CV automation`,
      );
    } else {
      const jobPosting = candidate.jobPosting;
      try {
        candidate.status = CandidateStatus.SCREENING;
        await this.candidateRepo.save(candidate);

        const { text, data } = await this.cvExtractionService.processCV(candidate.cvFilePath);

        candidate.rawCvText = text;
        candidate.extractedData = data;
        candidate.name = data.candidateName || candidate.name;
        candidate.email = data.email || candidate.email;
        await this.candidateRepo.save(candidate);

        const matchAnalysis = await this.jobMatchService.analyzeMatch(data, jobPosting);

        candidate.matchAnalysis = matchAnalysis;
        candidate.matchScore = matchAnalysis.overallScore;
        await this.candidateRepo.save(candidate);

        if (data.references && data.references.length > 0) {
          await this.referenceService.createReferencesFromExtractedData(candidateId, data);
        }

        this.embeddingService
          .embedCandidate(candidateId)
          .then(async (embedded) => {
            if (embedded) {
              await this.embeddingService.backfillForActiveDemand();
              return this.candidateJobMatchingService.matchCandidateToJobs(candidateId);
            }
            return null;
          })
          .catch((err: unknown) => {
            this.logger.warn(
              `Failed to generate embedding/matches for candidate ${candidateId}: ${err instanceof Error ? err.message : String(err)}`,
            );
          });

        await this.applyAutomationRules(candidate, jobPosting);

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
      const explanation = formatMatchExplanation(candidate.matchAnalysis, jobPosting);
      const sent = await this.emailService.sendCvApplicationRejected({
        to: candidate.email,
        applicantName: candidate.name || "Applicant",
        jobTitle: jobPosting.title,
        jobReference: jobPosting.referenceNumber,
        companyName,
        reasons: categories,
        retentionMonths: POPIA_RETENTION_MONTHS,
        matchExplanationBullets: explanation.bullets,
        matchReasoningSummary: explanation.reasoning,
      });

      if (sent) {
        await this.candidateService.markRejectionSent(candidate.id);
        await this.cvAuditService.logRejectionExplanation(candidate.id, jobPosting.id, {
          channel: "auto_reject_email",
          bullets: explanation.bullets,
          reasoning: explanation.reasoning,
          categories,
        });
        this.logger.log(`Rejection email sent to candidate ${candidate.id}`);
      }
    }
  }

  private async companyName(companyId: number): Promise<string> {
    const company = await this.companyRepo.findById(companyId);
    return company?.name || "the hiring team";
  }

  private async autoShortlistCandidate(candidate: Candidate): Promise<void> {
    candidate.status = CandidateStatus.SHORTLISTED;
    await this.candidateRepo.save(candidate);

    if (candidate.email) {
      const sent = await this.emailService.sendAnnixOrbitShortlistEmail(
        candidate.email,
        candidate.name || "Applicant",
        candidate.jobPosting?.title ?? "the role",
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
    const candidate = await this.candidateRepo.findByIdWithJobPosting(candidateId);

    if (candidate?.jobPosting && candidate.jobPosting.companyId === companyId) {
      const jobPosting = candidate.jobPosting;
      const previousStatus = candidate.status;
      candidate.status = CandidateStatus.REJECTED;
      await this.candidateRepo.save(candidate);

      if (candidate.email && !candidate.rejectionSentAt) {
        const companyName = await this.companyName(jobPosting.companyId);
        const explanation = formatMatchExplanation(candidate.matchAnalysis, jobPosting);
        const sent = await this.emailTemplateService.renderAndSend({
          companyId: jobPosting.companyId,
          kind: CvEmailTemplateKind.REJECTION,
          to: candidate.email,
          vars: {
            candidateName: candidate.name || "Applicant",
            jobTitle: jobPosting.title,
            companyName,
            matchExplanation: explanation.text,
          },
        });

        if (sent) {
          await this.candidateService.markRejectionSent(candidate.id);
          await this.cvAuditService.logRejectionExplanation(candidate.id, jobPosting.id, {
            channel: "manual_reject_email",
            bullets: explanation.bullets,
            reasoning: explanation.reasoning,
            hrReason: reason,
          });
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
          jobPosting.id,
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
    const candidate = await this.candidateRepo.findByIdWithJobAndReferences(candidateId);

    if (candidate?.jobPosting && candidate.jobPosting.companyId === companyId) {
      const jobPosting = candidate.jobPosting;
      const previousStatus = candidate.status;
      candidate.status = CandidateStatus.SHORTLISTED;
      await this.candidateRepo.save(candidate);

      if (candidate.email && !candidate.acceptanceSentAt) {
        const companyName = await this.companyName(jobPosting.companyId);
        const sent = await this.emailTemplateService.renderAndSend({
          companyId: jobPosting.companyId,
          kind: CvEmailTemplateKind.SHORTLIST,
          to: candidate.email,
          vars: {
            candidateName: candidate.name || "Applicant",
            jobTitle: jobPosting.title,
            companyName,
          },
        });

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
          jobPosting.id,
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
    const candidate = await this.candidateRepo.findByIdWithJobPosting(candidateId);

    if (candidate?.jobPosting && candidate.jobPosting.companyId === companyId) {
      const jobPosting = candidate.jobPosting;
      const previousStatus = candidate.status;
      candidate.status = CandidateStatus.ACCEPTED;
      await this.candidateRepo.save(candidate);

      if (candidate.email) {
        const companyName = await this.companyName(jobPosting.companyId);
        await this.emailTemplateService.renderAndSend({
          companyId: jobPosting.companyId,
          kind: CvEmailTemplateKind.ACCEPTANCE,
          to: candidate.email,
          vars: {
            candidateName: candidate.name || "Applicant",
            jobTitle: jobPosting.title,
            companyName,
          },
        });
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
          jobPosting.id,
          "manual_accepted",
          reason ? [reason] : [],
          actorId,
        );
      }
    }
  }
}
