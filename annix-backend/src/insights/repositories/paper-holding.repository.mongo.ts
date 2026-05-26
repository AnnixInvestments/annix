import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { MongoTransactionContext } from "../../lib/persistence/transaction-context";
import { PaperHolding } from "../entities/paper-holding.entity";
import { PaperHoldingRepository } from "./paper-holding.repository";

@Injectable()
export class MongoPaperHoldingRepository
  extends MongoCrudRepository<PaperHolding>
  implements PaperHoldingRepository
{
  constructor(
    @InjectModel("PaperHolding") model: Model<PaperHolding>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  async findByPortfolio(portfolioId: string): Promise<PaperHolding[]> {
    const docs = await this.documents.find({ portfolioId }).session(this.session).lean().exec();
    return this.toDomainList(docs);
  }

  async findByPortfolioWithAsset(portfolioId: string): Promise<PaperHolding[]> {
    const docs = await this.documents
      .find({ portfolioId })
      .populate("asset")
      .session(this.session)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByPortfolioWithAssetOrdered(portfolioId: string): Promise<PaperHolding[]> {
    const docs = await this.documents
      .find({ portfolioId })
      .populate("asset")
      .sort({ firstAcquiredAt: 1 })
      .session(this.session)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  countByPortfolio(portfolioId: string): Promise<number> {
    return this.documents.countDocuments({ portfolioId }).session(this.session).exec();
  }

  async findByPortfolioAndAsset(
    portfolioId: string,
    assetId: string,
  ): Promise<PaperHolding | null> {
    const doc = await this.documents
      .findOne({ portfolioId, assetId })
      .session(this.session)
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async updateById(id: string, changes: Partial<PaperHolding>): Promise<void> {
    await this.documents
      .updateOne({ _id: id }, { $set: changes }, this.session ? { session: this.session } : {})
      .exec();
  }

  async deleteById(id: string): Promise<void> {
    await this.documents
      .deleteOne({ _id: id }, this.session ? { session: this.session } : {})
      .exec();
  }

  withTransaction(context: TransactionContext): MongoPaperHoldingRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoPaperHoldingRepository requires a MongoTransactionContext");
    }
    return new MongoPaperHoldingRepository(this.model, context.session);
  }
}
