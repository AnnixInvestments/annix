import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { MongoTransactionContext } from "../../lib/persistence/transaction-context";
import { PaperPortfolio } from "../entities/paper-portfolio.entity";
import { PaperPortfolioRepository } from "./paper-portfolio.repository";

@Injectable()
export class MongoPaperPortfolioRepository
  extends MongoCrudRepository<PaperPortfolio>
  implements PaperPortfolioRepository
{
  constructor(
    @InjectModel("PaperPortfolio") model: Model<PaperPortfolio>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  async findActive(): Promise<PaperPortfolio[]> {
    const docs = await this.documents.find({ isActive: true }).session(this.session).lean().exec();
    return this.toDomainList(docs);
  }

  async findAllOrderedByCreatedAt(): Promise<PaperPortfolio[]> {
    const docs = await this.documents
      .find()
      .sort({ createdAt: 1 })
      .session(this.session)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findBySlug(slug: string): Promise<PaperPortfolio | null> {
    const doc = await this.documents.findOne({ slug }).session(this.session).lean().exec();
    return this.toDomain(doc);
  }

  async findByIdOrFail(id: string): Promise<PaperPortfolio> {
    const doc = await this.documents.findById(id).session(this.session).lean().exec();
    if (!doc) {
      throw new Error(`PaperPortfolio ${id} not found`);
    }
    return this.toDomain(doc) as PaperPortfolio;
  }

  async findActiveBuyAndHold(): Promise<PaperPortfolio[]> {
    const docs = await this.documents
      .find({ isActive: true, executorStrategy: "buy-and-hold" })
      .session(this.session)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async updateById(id: string, changes: Partial<PaperPortfolio>): Promise<void> {
    await this.documents
      .updateOne({ _id: id }, { $set: changes }, this.session ? { session: this.session } : {})
      .exec();
  }

  withTransaction(context: TransactionContext): MongoPaperPortfolioRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoPaperPortfolioRepository requires a MongoTransactionContext");
    }
    return new MongoPaperPortfolioRepository(this.model, context.session);
  }
}
