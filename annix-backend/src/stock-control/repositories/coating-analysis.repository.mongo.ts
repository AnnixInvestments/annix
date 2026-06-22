import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { CoatingAnalysisStatus, JobCardCoatingAnalysis } from "../entities/coating-analysis.entity";
import { JobCardCoatingAnalysisRepository } from "./coating-analysis.repository";

@Injectable()
export class MongoJobCardCoatingAnalysisRepository
  extends MongoTenantScopedRepository<JobCardCoatingAnalysis>
  implements JobCardCoatingAnalysisRepository
{
  constructor(
    @InjectModel("JobCardCoatingAnalysis")
    model: Model<JobCardCoatingAnalysis>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoJobCardCoatingAnalysisRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoJobCardCoatingAnalysisRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoJobCardCoatingAnalysisRepository {
    return new MongoJobCardCoatingAnalysisRepository(this.model, session);
  }

  async saveForCompany(
    companyId: number,
    entity: JobCardCoatingAnalysis,
  ): Promise<JobCardCoatingAnalysis> {
    if (entity.companyId !== companyId) {
      throw new Error("Coating analysis does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: JobCardCoatingAnalysis): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Coating analysis does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  async findOneForCompany(id: number, companyId: number): Promise<JobCardCoatingAnalysis | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async findOneForJobCard(
    companyId: number,
    jobCardId: number,
  ): Promise<JobCardCoatingAnalysis | null> {
    const doc = await this.documents.findOne({ jobCardId, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async findLiningFlagForJobCard(
    companyId: number,
    jobCardId: number,
  ): Promise<{ id: number; hasInternalLining: boolean } | null> {
    const doc = await this.documents
      .findOne({ jobCardId, companyId })
      .select("_id hasInternalLining")
      .lean()
      .exec();
    if (!doc) {
      return null;
    }
    return {
      id: doc._id as number,
      hasInternalLining: Boolean(doc.hasInternalLining),
    };
  }

  countByStatus(companyId: number, status: CoatingAnalysisStatus): Promise<number> {
    return this.documents.countDocuments({ companyId, status }).exec();
  }

  async findLatestForJobCard(
    companyId: number,
    jobCardId: number,
  ): Promise<JobCardCoatingAnalysis | null> {
    const doc = await this.documents
      .findOne({ companyId, jobCardId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomain(doc);
  }
}
