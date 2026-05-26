import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { RubberOffcutStock } from "../entities/rubber-offcut-stock.entity";
import { RubberOffcutStockRepository } from "./rubber-offcut-stock.repository";

@Injectable()
export class MongoRubberOffcutStockRepository
  extends MongoCrudRepository<RubberOffcutStock>
  implements RubberOffcutStockRepository
{
  constructor(
    @InjectModel("RubberOffcutStock") model: Model<RubberOffcutStock>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  build(data: DeepPartial<RubberOffcutStock>): RubberOffcutStock {
    return data as RubberOffcutStock;
  }

  withTransaction(context: TransactionContext): MongoRubberOffcutStockRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoRubberOffcutStockRepository requires a MongoTransactionContext");
    }
    return new MongoRubberOffcutStockRepository(this.model, context.session);
  }
}
