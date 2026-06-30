import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import {
  MongoTransactionContext,
  TransactionContext,
} from "../../lib/persistence/transaction-context";
import { JobPosting, JobPostingStatus } from "../entities/job-posting.entity";
import { JobPostingRepository } from "./job-posting.repository";

// Test-mode postings must never surface on any public surface (job list, XML
// feed, or direct reference-number lookup). Older rows predate the flag, so a
// missing/null value is treated as "not test mode".
const NOT_TEST_MODE = { $or: [{ testMode: null }, { testMode: false }] };

@Injectable()
export class MongoJobPostingRepository
  extends MongoCrudRepository<JobPosting>
  implements JobPostingRepository
{
  constructor(
    @InjectModel("JobPosting", ORBIT_CONNECTION) model: Model<JobPosting>,
    @InjectModel("Company") private readonly companyModel: Model<{ _id: number }>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoJobPostingRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoJobPostingRepository requires a MongoTransactionContext");
    }
    return new MongoJobPostingRepository(this.model, this.companyModel, context.session);
  }

  async findByCompany(companyId: number, status?: string): Promise<JobPosting[]> {
    const filter: Record<string, unknown> = { companyId };
    if (status) {
      filter.status = status;
    }
    const docs = await this.documents.find(filter).sort({ createdAt: -1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByIdForCompany(id: number, companyId: number): Promise<JobPosting | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async findByIdForCompanyWithCandidates(
    id: number,
    companyId: number,
  ): Promise<JobPosting | null> {
    const doc = await this.documents
      .findOne({ _id: id, companyId })
      .populate("candidates")
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findWizardDraft(id: number, companyId: number): Promise<JobPosting | null> {
    const doc = await this.documents
      .findOne({ _id: id, companyId })
      .populate(["skills", "successMetrics", "screeningQuestions"])
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findByIdForCompanyWithCompany(id: number, companyId: number): Promise<JobPosting | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    if (!doc) {
      return null;
    }
    const company = await this.companyModel.findById(companyId).lean().exec();
    return this.toDomain({ ...doc, company: company ?? null });
  }

  findByIdForCompanyWithWizardRelations(id: number, companyId: number): Promise<JobPosting | null> {
    return this.findWizardDraft(id, companyId);
  }

  async findByIdForCompanyWithSkillsAndMetrics(
    id: number,
    companyId: number,
  ): Promise<JobPosting | null> {
    const doc = await this.documents
      .findOne({ _id: id, companyId })
      .populate(["skills", "successMetrics"])
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findByIdForCompanyWithSkills(id: number, companyId: number): Promise<JobPosting | null> {
    const doc = await this.documents
      .findOne({ _id: id, companyId })
      .populate("skills")
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async activeForCompany(companyId: number): Promise<JobPosting[]> {
    const docs = await this.documents
      .find({ companyId, status: JobPostingStatus.ACTIVE })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async activeForFeed(): Promise<JobPosting[]> {
    const docs = await this.documents
      .find({ status: JobPostingStatus.ACTIVE, ...NOT_TEST_MODE })
      .sort({ activatedAt: -1 })
      .limit(1000)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findActiveByReferenceNumber(referenceNumber: string): Promise<JobPosting | null> {
    const doc = await this.documents
      .findOne({ referenceNumber, status: JobPostingStatus.ACTIVE, ...NOT_TEST_MODE })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findByReferenceNumber(referenceNumber: string): Promise<JobPosting | null> {
    const doc = await this.documents.findOne({ referenceNumber }).lean().exec();
    return this.toDomain(doc);
  }

  async activePublicJobs(search?: string): Promise<JobPosting[]> {
    const filter: Record<string, unknown> = {
      status: JobPostingStatus.ACTIVE,
      ...NOT_TEST_MODE,
    };
    if (search) {
      filter.$and = [
        {
          $or: [
            { title: { $regex: search, $options: "i" } },
            { industry: { $regex: search, $options: "i" } },
          ],
        },
      ];
    }
    const docs = await this.documents.find(filter).sort({ activatedAt: -1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async closedForCompanyWithCandidates(companyId: number): Promise<JobPosting[]> {
    const docs = await this.documents
      .find({ companyId, status: JobPostingStatus.CLOSED })
      .populate("candidates")
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async activeJobsForFairness(): Promise<JobPosting[]> {
    const docs = await this.documents
      .find({ status: JobPostingStatus.ACTIVE })
      .select(["_id", "companyId", "title"])
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}
