import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { StockTake, type StockTakeStatus } from "../entities/stock-take.entity";
import { StockTakeRepository } from "./stock-take.repository";

@Injectable()
export class MongoStockTakeRepository
  extends MongoCrudRepository<StockTake>
  implements StockTakeRepository
{
  constructor(
    @InjectModel("StockTake") model: Model<StockTake>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  build(data: DeepPartial<StockTake>): StockTake {
    return data as StockTake;
  }

  withTransaction(context: TransactionContext): MongoStockTakeRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoStockTakeRepository requires a MongoTransactionContext");
    }
    return new MongoStockTakeRepository(this.model, context.session);
  }

  async findByIdForCompany(companyId: number, id: number): Promise<StockTake | null> {
    const doc = await this.documents
      .findOne({ _id: id, companyId })
      .session(this.session)
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findByIdForCompanyWithLines(companyId: number, id: number): Promise<StockTake | null> {
    const doc = await this.documents
      .findOne({ _id: id, companyId })
      .populate(["lines"])
      .session(this.session)
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findForCompany(
    companyId: number,
    status: StockTakeStatus | undefined,
  ): Promise<StockTake[]> {
    const query: Record<string, unknown> = { companyId };
    if (status) {
      query.status = status;
    }
    const docs = await this.documents.find(query).sort({ createdAt: -1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findDraftForPeriod(companyId: number, periodLabel: string): Promise<StockTake | null> {
    const doc = await this.documents
      .findOne({ companyId, periodLabel, status: "draft" })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async distinctCompanyIds(): Promise<number[]> {
    const ids = await this.documents.distinct("companyId").exec();
    return ids.map((id) => Number(id));
  }
}
