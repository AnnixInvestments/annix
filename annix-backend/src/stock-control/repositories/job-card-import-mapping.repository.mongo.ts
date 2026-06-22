import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { JobCardImportMapping } from "../entities/job-card-import-mapping.entity";
import { JobCardImportMappingRepository } from "./job-card-import-mapping.repository";

@Injectable()
export class MongoJobCardImportMappingRepository
  extends MongoTenantScopedRepository<JobCardImportMapping>
  implements JobCardImportMappingRepository
{
  constructor(
    @InjectModel("JobCardImportMapping")
    model: Model<JobCardImportMapping>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoJobCardImportMappingRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoJobCardImportMappingRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoJobCardImportMappingRepository {
    return new MongoJobCardImportMappingRepository(this.model, session);
  }

  async saveForCompany(
    companyId: number,
    entity: JobCardImportMapping,
  ): Promise<JobCardImportMapping> {
    if (entity.companyId !== companyId) {
      throw new Error("Job card import mapping does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: JobCardImportMapping): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Job card import mapping does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  async findForCompany(companyId: number): Promise<JobCardImportMapping | null> {
    const doc = await this.documents.findOne({ companyId }).lean().exec();
    return this.toDomain(doc);
  }
}
