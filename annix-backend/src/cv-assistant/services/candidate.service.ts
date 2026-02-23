import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Candidate, CandidateStatus } from "../entities/candidate.entity";
import { JobPosting } from "../entities/job-posting.entity";

@Injectable()
export class CandidateService {
  constructor(
    @InjectRepository(Candidate)
    private readonly candidateRepo: Repository<Candidate>,
    @InjectRepository(JobPosting)
    private readonly jobPostingRepo: Repository<JobPosting>,
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
    filters?: { status?: string; jobPostingId?: number },
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

  async updateStatus(companyId: number, id: number, status: CandidateStatus): Promise<Candidate> {
    const candidate = await this.findById(companyId, id);
    candidate.status = status;
    return this.candidateRepo.save(candidate);
  }

  async updateExtractedData(id: number, data: Partial<Candidate>): Promise<Candidate> {
    const candidate = await this.candidateRepo.findOne({ where: { id } });
    if (!candidate) {
      throw new NotFoundException("Candidate not found");
    }

    if (data.extractedData !== undefined) candidate.extractedData = data.extractedData;
    if (data.matchAnalysis !== undefined) candidate.matchAnalysis = data.matchAnalysis;
    if (data.matchScore !== undefined) candidate.matchScore = data.matchScore;
    if (data.name !== undefined) candidate.name = data.name;
    if (data.email !== undefined) candidate.email = data.email;
    if (data.rawCvText !== undefined) candidate.rawCvText = data.rawCvText;
    if (data.status !== undefined) candidate.status = data.status;

    return this.candidateRepo.save(candidate);
  }

  async markRejectionSent(id: number): Promise<void> {
    await this.candidateRepo.update(id, {
      rejectionSentAt: new Date(),
      status: CandidateStatus.REJECTED,
    });
  }

  async markAcceptanceSent(id: number): Promise<void> {
    await this.candidateRepo.update(id, {
      acceptanceSentAt: new Date(),
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
