import { Injectable, NotFoundException, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import { nestPopulate } from "../../lib/persistence/nest-populate";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { StockControlProfile } from "../entities/stock-control-profile.entity";
import { StockControlProfileRepository } from "./stock-control-profile.repository";

@Injectable()
export class MongoStockControlProfileRepository
  extends MongoTenantScopedRepository<StockControlProfile>
  implements StockControlProfileRepository
{
  constructor(
    @InjectModel("StockControlProfile") model: Model<StockControlProfile>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoStockControlProfileRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoStockControlProfileRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoStockControlProfileRepository {
    return new MongoStockControlProfileRepository(this.model, session);
  }

  async saveForCompany(
    companyId: number,
    entity: StockControlProfile,
  ): Promise<StockControlProfile> {
    if (entity.companyId !== companyId) {
      throw new Error("Profile does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: StockControlProfile): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Profile does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  async findOneByUserId(userId: number): Promise<StockControlProfile | null> {
    const doc = await this.documents.findOne({ userId }).lean().exec();
    return this.toDomain(doc);
  }

  async findOneByUserIdWithRelations(
    userId: number,
    relations: string[],
  ): Promise<StockControlProfile | null> {
    const doc = await this.documents
      .findOne({ userId })
      .populate(nestPopulate(relations))
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findOneOrFailByUserId(userId: number): Promise<StockControlProfile> {
    const profile = await this.findOneByUserId(userId);
    if (!profile) {
      throw new NotFoundException("StockControlProfile not found");
    }
    return profile;
  }

  async updateByUserId(userId: number, updates: DeepPartial<StockControlProfile>): Promise<void> {
    await this.documents.updateOne({ userId }, { $set: updates }).exec();
  }
}
