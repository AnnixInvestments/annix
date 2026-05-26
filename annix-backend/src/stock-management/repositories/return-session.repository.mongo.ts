import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { ReturnSession } from "../entities/return-session.entity";
import { ReturnSessionRepository } from "./return-session.repository";

@Injectable()
export class MongoReturnSessionRepository
  extends MongoCrudRepository<ReturnSession>
  implements ReturnSessionRepository
{
  constructor(
    @InjectModel("ReturnSession") model: Model<ReturnSession>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  build(data: DeepPartial<ReturnSession>): ReturnSession {
    return data as ReturnSession;
  }

  withTransaction(context: TransactionContext): MongoReturnSessionRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoReturnSessionRepository requires a MongoTransactionContext");
    }
    return new MongoReturnSessionRepository(this.model, context.session);
  }

  async findOutstandingForCompany(companyId: number): Promise<ReturnSession[]> {
    const docs = await this.documents
      .find({ companyId, status: "pending" })
      .populate(["offcutReturns", "paintReturns", "consumableReturns"])
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByIdForCompany(companyId: number, id: number): Promise<ReturnSession | null> {
    const doc = await this.documents
      .findOne({ _id: id, companyId })
      .session(this.session)
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findByIdWithReturns(id: number): Promise<ReturnSession | null> {
    const doc = await this.documents
      .findById(id)
      .populate(["offcutReturns", "paintReturns", "consumableReturns"])
      .session(this.session)
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findByIdWithOffcutReturns(id: number): Promise<ReturnSession | null> {
    const doc = await this.documents
      .findById(id)
      .populate(["offcutReturns"])
      .session(this.session)
      .lean()
      .exec();
    return this.toDomain(doc);
  }
}
