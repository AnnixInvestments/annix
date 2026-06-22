import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { JobCardExtractionCorrection } from "../entities/job-card-extraction-correction.entity";
import { JobCardExtractionCorrectionRepository } from "./job-card-extraction-correction.repository";

@Injectable()
export class MongoJobCardExtractionCorrectionRepository
  extends MongoTenantScopedRepository<JobCardExtractionCorrection>
  implements JobCardExtractionCorrectionRepository
{
  constructor(
    @InjectModel("JobCardExtractionCorrection")
    model: Model<JobCardExtractionCorrection>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoJobCardExtractionCorrectionRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error(
        "MongoJobCardExtractionCorrectionRepository requires a MongoTransactionContext",
      );
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoJobCardExtractionCorrectionRepository {
    return new MongoJobCardExtractionCorrectionRepository(this.model, session);
  }

  async saveForCompany(
    companyId: number,
    entity: JobCardExtractionCorrection,
  ): Promise<JobCardExtractionCorrection> {
    if (entity.companyId !== companyId) {
      throw new Error("Job card extraction correction does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: JobCardExtractionCorrection): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Job card extraction correction does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  async findForJobCardOrdered(
    companyId: number,
    jobCardId: number,
  ): Promise<JobCardExtractionCorrection[]> {
    const docs = await this.documents
      .find({ companyId, jobCardId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findRecentForCustomer(
    companyId: number,
    customerName: string,
    limit: number,
  ): Promise<JobCardExtractionCorrection[]> {
    const docs = await this.documents
      .find({ companyId, customerName })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findRecentForCompany(
    companyId: number,
    limit: number,
  ): Promise<JobCardExtractionCorrection[]> {
    const docs = await this.documents
      .find({ companyId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}
