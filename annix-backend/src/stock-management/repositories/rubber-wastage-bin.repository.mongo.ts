import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { RubberWastageBin } from "../entities/rubber-wastage-bin.entity";
import { RubberWastageBinRepository } from "./rubber-wastage-bin.repository";

@Injectable()
export class MongoRubberWastageBinRepository
  extends MongoCrudRepository<RubberWastageBin>
  implements RubberWastageBinRepository
{
  constructor(
    @InjectModel("RubberWastageBin") model: Model<RubberWastageBin>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  build(data: DeepPartial<RubberWastageBin>): RubberWastageBin {
    return data as RubberWastageBin;
  }

  withTransaction(context: TransactionContext): MongoRubberWastageBinRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoRubberWastageBinRepository requires a MongoTransactionContext");
    }
    return new MongoRubberWastageBinRepository(this.model, context.session);
  }

  async findActiveForCompany(companyId: number): Promise<RubberWastageBin[]> {
    const docs = await this.documents
      .find({ companyId, active: true })
      .sort({ colour: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByColour(companyId: number, colour: string): Promise<RubberWastageBin | null> {
    const doc = await this.documents
      .findOne({ companyId, colour })
      .session(this.session)
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findByIdForCompany(companyId: number, id: number): Promise<RubberWastageBin | null> {
    const doc = await this.documents
      .findOne({ _id: id, companyId })
      .session(this.session)
      .lean()
      .exec();
    return this.toDomain(doc);
  }
}
