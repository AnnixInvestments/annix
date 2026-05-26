import { forwardRef, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { AuditService } from "../../audit/audit.service";
import { now, nowISO } from "../../lib/datetime";
import { Candidate, CandidateStatus } from "../entities/candidate.entity";
import { CandidateRepository } from "../repositories/candidate.repository";
import { CandidateReferenceRepository } from "../repositories/candidate-reference.repository";
import { JobPostingRepository } from "../repositories/job-posting.repository";
import { CvAuditService } from "./cv-audit.service";
import { ReferenceService } from "./reference.service";

export interface CandidateDataExport {
  exportedAt: string;
  candidate: {
    id: number;
    name: string | null;
    email: string | null;
    status: string;
    matchScore: number | null;
    extractedData: unknown;
    matchAnalysis: unknown;
    beeLevel: number | null;
    popiaConsent: boolean;
    popiaConsentedAt: Date | null;
    lastActiveAt: Date | null;
    jobAlertsOptIn: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  applications: Array<{
    jobPostingId: number;
    jobTitle: string;
    referenceNumber: string | null;
    appliedAt: Date;
    currentStatus: string;
  }>;
  screeningDecisions: Array<{
    timestamp: Date;
    subAction: string;
    actorUserId: number | null;
    details: Record<string, unknown> | null;
  }>;
  communications: Array<{
    type: "rejection_email" | "shortlist_email" | "reference_request";
    sentAt: Date;
    recipient: string | null;
    metadata: Record<string, unknown> | null;
  }>;
}

@Injectable()
export class CandidateService {
  private readonly logger = new Logger(CandidateService.name);

  constructor(
    private readonly candidateRepo: CandidateRepository,
    private readonly jobPostingRepo: JobPostingRepository,
    private readonly referenceRepo: CandidateReferenceRepository,
    private readonly cvAuditService: CvAuditService,
    private readonly auditService: AuditService,
    @Inject(forwardRef(() => ReferenceService))
    private readonly referenceService: ReferenceService,
  ) {}

  async create(jobPostingId: number, data: Partial<Candidate>): Promise<Candidate> {
    return this.candidateRepo.create({
      ...data,
      jobPostingId,
      status: CandidateStatus.NEW,
    });
  }

  async findByJobPosting(
    companyId: number,
    jobPostingId: number,
    status?: string,
  ): Promise<Candidate[]> {
    const jobPosting = await this.jobPostingRepo.findByIdForCompany(jobPostingId, companyId);
    if (!jobPosting) {
      throw new NotFoundException("Job posting not found");
    }

    return this.candidateRepo.findByJobPosting(jobPostingId, status);
  }

  async findById(companyId: number, id: number): Promise<Candidate> {
    const candidate = await this.candidateRepo.findByIdWithJobAndReferences(id);

    if (!candidate || !candidate.jobPosting || candidate.jobPosting.companyId !== companyId) {
      throw new NotFoundException("Candidate not found");
    }

    return candidate;
  }

  async findAllForCompany(
    companyId: number,
    filters?: { status?: string; jobPostingId?: number | null },
  ): Promise<Candidate[]> {
    return this.candidateRepo.findAllForCompany(companyId, filters);
  }

  async updateStatus(
    companyId: number,
    id: number,
    status: CandidateStatus,
    actorId: number | null = null,
    reason: string | null = null,
  ): Promise<Candidate> {
    const candidate = await this.findById(companyId, id);
    const previousStatus = candidate.status;
    candidate.status = status;
    const saved = await this.candidateRepo.save(candidate);

    if (actorId !== null && previousStatus !== status) {
      await this.cvAuditService.logHrOverride(id, previousStatus, status, reason, actorId);
    }

    if (
      previousStatus !== CandidateStatus.REFERENCE_CHECK &&
      status === CandidateStatus.REFERENCE_CHECK
    ) {
      try {
        const sent = await this.referenceService.sendReferenceRequests(id);
        this.logger.log(
          `Reference-check transition for candidate ${id}: ${sent} reference request(s) sent.`,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Reference request dispatch failed for candidate ${id}: ${message}`);
      }
    }

    return saved;
  }

  async dataExport(companyId: number, candidateId: number): Promise<CandidateDataExport> {
    const candidate = await this.findById(companyId, candidateId);
    const references = await this.referenceRepo.findByCandidate(candidateId);

    const auditLogs = await this.auditService.findByEntity("cv_candidate", candidateId);
    const screeningDecisions = auditLogs
      .filter((log) => log.appName === "annix-orbit" && log.subAction !== null)
      .map((log) => ({
        timestamp: log.timestamp,
        subAction: log.subAction ?? "",
        actorUserId: log.userIdRaw,
        details: log.details ?? null,
      }));

    const communications: CandidateDataExport["communications"] = [];

    if (candidate.rejectionSentAt) {
      communications.push({
        type: "rejection_email",
        sentAt: candidate.rejectionSentAt,
        recipient: candidate.email,
        metadata: { jobTitle: candidate.jobPosting?.title ?? null },
      });
    }
    if (candidate.acceptanceSentAt) {
      communications.push({
        type: "shortlist_email",
        sentAt: candidate.acceptanceSentAt,
        recipient: candidate.email,
        metadata: { jobTitle: candidate.jobPosting?.title ?? null },
      });
    }
    references.forEach((ref) => {
      if (ref.requestSentAt) {
        communications.push({
          type: "reference_request",
          sentAt: ref.requestSentAt,
          recipient: ref.email,
          metadata: { referenceName: ref.name, status: ref.status },
        });
      }
    });

    await this.cvAuditService.logDataExport(candidateId, null);

    return {
      exportedAt: nowISO() ?? "",
      candidate: {
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        status: candidate.status,
        matchScore: candidate.matchScore,
        extractedData: candidate.extractedData,
        matchAnalysis: candidate.matchAnalysis,
        beeLevel: candidate.beeLevel,
        popiaConsent: candidate.popiaConsent,
        popiaConsentedAt: candidate.popiaConsentedAt,
        lastActiveAt: candidate.lastActiveAt,
        jobAlertsOptIn: candidate.jobAlertsOptIn,
        createdAt: candidate.createdAt,
        updatedAt: candidate.updatedAt,
      },
      applications: candidate.jobPosting
        ? [
            {
              jobPostingId: candidate.jobPosting.id,
              jobTitle: candidate.jobPosting.title,
              referenceNumber: candidate.jobPosting.referenceNumber ?? null,
              appliedAt: candidate.createdAt,
              currentStatus: candidate.status,
            },
          ]
        : [],
      screeningDecisions,
      communications,
    };
  }

  async updateExtractedData(id: number, data: Partial<Candidate>): Promise<Candidate> {
    const candidate = await this.candidateRepo.findById(id);
    if (!candidate) {
      throw new NotFoundException("Candidate not found");
    }

    if (data.extractedData != null) candidate.extractedData = data.extractedData;
    if (data.matchAnalysis != null) candidate.matchAnalysis = data.matchAnalysis;
    if (data.matchScore != null) candidate.matchScore = data.matchScore;
    if (data.name != null) candidate.name = data.name;
    if (data.email != null) candidate.email = data.email;
    if (data.rawCvText != null) candidate.rawCvText = data.rawCvText;
    if (data.status != null) candidate.status = data.status;

    return this.candidateRepo.save(candidate);
  }

  async markRejectionSent(id: number): Promise<void> {
    await this.candidateRepo.markRejectionSent(id, now().toJSDate());
  }

  async markAcceptanceSent(id: number): Promise<void> {
    await this.candidateRepo.markAcceptanceSent(id, now().toJSDate());
  }

  async topCandidates(companyId: number, limit: number = 10): Promise<Candidate[]> {
    return this.candidateRepo.topCandidates(companyId, limit);
  }

  async stats(companyId: number): Promise<{
    total: number;
    byStatus: Record<string, number>;
    avgScore: number | null;
  }> {
    const candidates = await this.findAllForCompany(companyId);

    const byStatus = candidates.reduce(
      (acc, c) => {
        acc[c.status] = (acc[c.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const scores = candidates.map((c) => c.matchScore).filter((s): s is number => s !== null);

    const avgScore =
      scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

    return {
      total: candidates.length,
      byStatus,
      avgScore,
    };
  }
}
