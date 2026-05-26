import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { RubberOffcutReturn } from "../entities/rubber-offcut-return.entity";
import { RubberOffcutReturnRepository } from "./rubber-offcut-return.repository";

@Injectable()
export class MongoRubberOffcutReturnRepository
  extends MongoCrudRepository<RubberOffcutReturn>
  implements RubberOffcutReturnRepository
{
  constructor(
    @InjectModel("RubberOffcutReturn") model: Model<RubberOffcutReturn>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  build(data: DeepPartial<RubberOffcutReturn>): RubberOffcutReturn {
    return data as RubberOffcutReturn;
  }

  withTransaction(context: TransactionContext): MongoRubberOffcutReturnRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoRubberOffcutReturnRepository requires a MongoTransactionContext");
    }
    return new MongoRubberOffcutReturnRepository(this.model, context.session);
  }
}
