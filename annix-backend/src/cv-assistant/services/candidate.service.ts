import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuditService } from "../../audit/audit.service";
import { now, nowISO } from "../../lib/datetime";
import { Candidate, CandidateStatus } from "../entities/candidate.entity";
import { CandidateReference } from "../entities/candidate-reference.entity";
import { JobPosting } from "../entities/job-posting.entity";
import { CvAuditService } from "./cv-audit.service";

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
  constructor(
    @InjectRepository(Candidate)
    private readonly candidateRepo: Repository<Candidate>,
    @InjectRepository(JobPosting)
    private readonly jobPostingRepo: Repository<JobPosting>,
    @InjectRepository(CandidateReference)
    private readonly referenceRepo: Repository<CandidateReference>,
    private readonly cvAuditService: CvAuditService,
    private readonly auditService: AuditService,
  ) {}

  async create(jobPostingId: number, data: Partial<Candidate>): Promise<Candidate> {
    const candidate = this.candidateRepo.create({
      ...data,
      jobPostingId,
      status: CandidateStatus.NEW,
    });
    return this.candidateRepo.save(candidate);
  }

  async findByJobPosting(
    companyId: number,
    jobPostingId: number,
    status?: string,
  ): Promise<Candidate[]> {
    const jobPosting = await this.jobPostingRepo.findOne({
      where: { id: jobPostingId, companyId },
    });
    if (!jobPosting) {
      throw new NotFoundException("Job posting not found");
    }

    const query: Record<string, unknown> = { jobPostingId };
    if (status) {
      query.status = status;
    }

    return this.candidateRepo.find({
      where: query,
      order: { matchScore: "DESC", createdAt: "DESC" },
      relations: ["references"],
    });
  }

  async findById(companyId: number, id: number): Promise<Candidate> {
    const candidate = await this.candidateRepo.findOne({
      where: { id },
      relations: ["jobPosting", "references"],
    });

    if (!candidate || candidate.jobPosting.companyId !== companyId) {
      throw new NotFoundException("Candidate not found");
    }

    return candidate;
  }

  async findAllForCompany(
    companyId: number,
    filters?: { status?: string; jobPostingId?: number | null },
  ): Promise<Candidate[]> {
    const queryBuilder = this.candidateRepo
      .createQueryBuilder("candidate")
      .innerJoinAndSelect("candidate.jobPosting", "jobPosting")
      .leftJoinAndSelect("candidate.references", "references")
      .where("jobPosting.companyId = :companyId", { companyId });

    if (filters?.status) {
      queryBuilder.andWhere("candidate.status = :status", { status: filters.status });
    }

    if (filters?.jobPostingId) {
      queryBuilder.andWhere("candidate.jobPostingId = :jobPostingId", {
        jobPostingId: filters.jobPostingId,
      });
    }

    return queryBuilder
      .orderBy("candidate.matchScore", "DESC", "NULLS LAST")
      .addOrderBy("candidate.createdAt", "DESC")
      .getMany();
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

    return saved;
  }

  async dataExport(companyId: number, candidateId: number): Promise<CandidateDataExport> {
    const candidate = await this.findById(companyId, candidateId);
    const references = await this.referenceRepo.find({ where: { candidateId } });

    const auditLogs = await this.auditService.findByEntity("cv_candidate", candidateId);
    const screeningDecisions = auditLogs
      .filter((log) => log.appName === "cv-assistant" && log.subAction !== null)
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
        metadata: { jobTitle: candidate.jobPosting.title },
      });
    }
    if (candidate.acceptanceSentAt) {
      communications.push({
        type: "shortlist_email",
        sentAt: candidate.acceptanceSentAt,
        recipient: candidate.email,
        metadata: { jobTitle: candidate.jobPosting.title },
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
      applications: [
        {
          jobPostingId: candidate.jobPosting.id,
          jobTitle: candidate.jobPosting.title,
          referenceNumber: candidate.jobPosting.referenceNumber ?? null,
          appliedAt: candidate.createdAt,
          currentStatus: candidate.status,
        },
      ],
      screeningDecisions,
      communications,
    };
  }

  async updateExtractedData(id: number, data: Partial<Candidate>): Promise<Candidate> {
    const candidate = await this.candidateRepo.findOne({ where: { id } });
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
    await this.candidateRepo.update(id, {
      rejectionSentAt: now().toJSDate(),
      status: CandidateStatus.REJECTED,
    });
  }

  async markAcceptanceSent(id: number): Promise<void> {
    await this.candidateRepo.update(id, {
      acceptanceSentAt: now().toJSDate(),
    });
  }

  async topCandidates(companyId: number, limit: number = 10): Promise<Candidate[]> {
    return this.candidateRepo
      .createQueryBuilder("candidate")
      .innerJoinAndSelect("candidate.jobPosting", "jobPosting")
      .where("jobPosting.companyId = :companyId", { companyId })
      .andWhere("candidate.status NOT IN (:...excludedStatuses)", {
        excludedStatuses: [CandidateStatus.REJECTED],
      })
      .orderBy("candidate.matchScore", "DESC", "NULLS LAST")
      .limit(limit)
      .getMany();
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
