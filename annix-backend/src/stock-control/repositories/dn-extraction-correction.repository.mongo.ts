import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { DnExtractionCorrection } from "../entities/dn-extraction-correction.entity";
import { DnExtractionCorrectionRepository } from "./dn-extraction-correction.repository";

@Injectable()
export class MongoDnExtractionCorrectionRepository
  extends MongoTenantScopedRepository<DnExtractionCorrection>
  implements DnExtractionCorrectionRepository
{
  constructor(
    @InjectModel("DnExtractionCorrection")
    model: Model<DnExtractionCorrection>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoDnExtractionCorrectionRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoDnExtractionCorrectionRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoDnExtractionCorrectionRepository {
    return new MongoDnExtractionCorrectionRepository(this.model, session);
  }

  async saveForCompany(
    companyId: number,
    entity: DnExtractionCorrection,
  ): Promise<DnExtractionCorrection> {
    if (entity.companyId !== companyId) {
      throw new Error("DN extraction correction does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: DnExtractionCorrection): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("DN extraction correction does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  createMany(rows: Array<DeepPartial<DnExtractionCorrection>>): Promise<DnExtractionCorrection[]> {
    return Promise.all(rows.map((row) => this.create(row)));
  }

  async findRecentForCompany(companyId: number, limit: number): Promise<DnExtractionCorrection[]> {
    const docs = await this.documents
      .find({ companyId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}
