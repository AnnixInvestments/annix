import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  TransactionContext,
  TypeOrmTransactionContext,
} from "../../lib/persistence/transaction-context";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { JobPosting, JobPostingStatus } from "../entities/job-posting.entity";
import { JobPostingRepository } from "./job-posting.repository";

@Injectable()
export class PostgresJobPostingRepository
  extends TypeOrmCrudRepository<JobPosting>
  implements JobPostingRepository
{
  constructor(@InjectRepository(JobPosting) repository: Repository<JobPosting>) {
    super(repository);
  }

  withTransaction(context: TransactionContext): PostgresJobPostingRepository {
    if (!(context instanceof TypeOrmTransactionContext)) {
      throw new Error("PostgresJobPostingRepository requires a TypeOrmTransactionContext");
    }
    return new PostgresJobPostingRepository(context.manager.getRepository(JobPosting));
  }

  findByCompany(companyId: number, status?: string): Promise<JobPosting[]> {
    const query: Record<string, unknown> = { companyId };
    if (status) {
      query.status = status;
    }
    return this.repository.find({ where: query, order: { createdAt: "DESC" } });
  }

  findByIdForCompany(id: number, companyId: number): Promise<JobPosting | null> {
    return this.repository.findOne({ where: { id, companyId } });
  }

  findByIdForCompanyWithCandidates(id: number, companyId: number): Promise<JobPosting | null> {
    return this.repository.findOne({ where: { id, companyId }, relations: ["candidates"] });
  }

  findWizardDraft(id: number, companyId: number): Promise<JobPosting | null> {
    return this.repository.findOne({
      where: { id, companyId },
      relations: ["skills", "successMetrics", "screeningQuestions"],
    });
  }

  findByIdForCompanyWithCompany(id: number, companyId: number): Promise<JobPosting | null> {
    return this.repository.findOne({ where: { id, companyId }, relations: ["company"] });
  }

  findByIdForCompanyWithWizardRelations(id: number, companyId: number): Promise<JobPosting | null> {
    return this.repository.findOne({
      where: { id, companyId },
      relations: ["skills", "successMetrics", "screeningQuestions"],
    });
  }

  findByIdForCompanyWithSkillsAndMetrics(
    id: number,
    companyId: number,
  ): Promise<JobPosting | null> {
    return this.repository.findOne({
      where: { id, companyId },
      relations: ["skills", "successMetrics"],
    });
  }

  findByIdForCompanyWithSkills(id: number, companyId: number): Promise<JobPosting | null> {
    return this.repository.findOne({ where: { id, companyId }, relations: ["skills"] });
  }

  activeForCompany(companyId: number): Promise<JobPosting[]> {
    return this.repository.find({
      where: { companyId, status: JobPostingStatus.ACTIVE },
    });
  }

  activeForFeed(): Promise<JobPosting[]> {
    return this.repository.find({
      where: { status: JobPostingStatus.ACTIVE },
      order: { activatedAt: "DESC" },
      take: 1000,
    });
  }

  findActiveByReferenceNumber(referenceNumber: string): Promise<JobPosting | null> {
    return this.repository.findOne({
      where: { referenceNumber, status: JobPostingStatus.ACTIVE },
    });
  }

  findByReferenceNumber(referenceNumber: string): Promise<JobPosting | null> {
    return this.repository.findOne({ where: { referenceNumber } });
  }

  activePublicJobs(search?: string): Promise<JobPosting[]> {
    const qb = this.repository
      .createQueryBuilder("job")
      .where("job.status = :status", { status: JobPostingStatus.ACTIVE })
      .andWhere("(job.test_mode IS NULL OR job.test_mode = false)");
    if (search) {
      qb.andWhere("(job.title ILIKE :search OR job.industry ILIKE :search)", {
        search: `%${search}%`,
      });
    }
    return qb.orderBy("job.activatedAt", "DESC", "NULLS LAST").getMany();
  }

  closedForCompanyWithCandidates(companyId: number): Promise<JobPosting[]> {
    return this.repository.find({
      where: { companyId, status: JobPostingStatus.CLOSED },
      relations: ["candidates"],
    });
  }

  activeJobsForFairness(): Promise<JobPosting[]> {
    return this.repository.find({
      where: { status: JobPostingStatus.ACTIVE },
      select: ["id", "companyId", "title"],
    });
  }
}
