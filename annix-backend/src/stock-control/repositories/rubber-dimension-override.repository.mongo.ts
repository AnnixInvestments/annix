import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { RubberDimensionOverride } from "../entities/rubber-dimension-override.entity";
import {
  type RubberDimensionOverrideMatch,
  type RubberDimensionOverrideQuery,
  RubberDimensionOverrideRepository,
} from "./rubber-dimension-override.repository";

@Injectable()
export class MongoRubberDimensionOverrideRepository
  extends MongoTenantScopedRepository<RubberDimensionOverride>
  implements RubberDimensionOverrideRepository
{
  constructor(
    @InjectModel("RubberDimensionOverride")
    model: Model<RubberDimensionOverride>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoRubberDimensionOverrideRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoRubberDimensionOverrideRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoRubberDimensionOverrideRepository {
    return new MongoRubberDimensionOverrideRepository(this.model, session);
  }

  async saveForCompany(
    companyId: number,
    entity: RubberDimensionOverride,
  ): Promise<RubberDimensionOverride> {
    if (entity.companyId !== companyId) {
      throw new Error("Rubber dimension override does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: RubberDimensionOverride): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Rubber dimension override does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  async findMatchingOverride(
    companyId: number,
    criteria: RubberDimensionOverrideMatch,
  ): Promise<RubberDimensionOverride | null> {
    const doc = await this.documents
      .findOne({
        companyId,
        itemType: criteria.itemType,
        nbMm: criteria.nbMm,
        odMm: criteria.odMm,
        schedule: criteria.schedule,
        pipeLengthMm: criteria.pipeLengthMm,
        flangeConfig: criteria.flangeConfig,
      })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findBestSuggestions(
    companyId: number,
    criteria: RubberDimensionOverrideQuery,
  ): Promise<RubberDimensionOverride[]> {
    const docs = await this.documents
      .find({
        companyId,
        itemType: criteria.itemType,
        nbMm: criteria.nbMm,
        schedule: criteria.schedule,
        pipeLengthMm: criteria.pipeLengthMm,
        flangeConfig: criteria.flangeConfig,
      })
      .sort({ usageCount: -1 })
      .limit(1)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async updateById(id: number, changes: DeepPartial<RubberDimensionOverride>): Promise<void> {
    await this.documents.findByIdAndUpdate(id, changes as Record<string, unknown>).exec();
  }
}
