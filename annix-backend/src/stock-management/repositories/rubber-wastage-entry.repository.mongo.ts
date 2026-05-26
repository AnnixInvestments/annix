import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { RubberWastageEntry } from "../entities/rubber-wastage-entry.entity";
import { RubberWastageEntryRepository } from "./rubber-wastage-entry.repository";

@Injectable()
export class MongoRubberWastageEntryRepository
  extends MongoCrudRepository<RubberWastageEntry>
  implements RubberWastageEntryRepository
{
  constructor(
    @InjectModel("RubberWastageEntry") model: Model<RubberWastageEntry>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  build(data: DeepPartial<RubberWastageEntry>): RubberWastageEntry {
    return data as RubberWastageEntry;
  }

  withTransaction(context: TransactionContext): MongoRubberWastageEntryRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoRubberWastageEntryRepository requires a MongoTransactionContext");
    }
    return new MongoRubberWastageEntryRepository(this.model, context.session);
  }
}
