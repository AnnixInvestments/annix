import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { ConsumableReturn } from "../entities/consumable-return.entity";
import { ConsumableReturnRepository } from "./consumable-return.repository";

@Injectable()
export class MongoConsumableReturnRepository
  extends MongoCrudRepository<ConsumableReturn>
  implements ConsumableReturnRepository
{
  constructor(
    @InjectModel("ConsumableReturn") model: Model<ConsumableReturn>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  build(data: DeepPartial<ConsumableReturn>): ConsumableReturn {
    return data as ConsumableReturn;
  }

  withTransaction(context: TransactionContext): MongoConsumableReturnRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoConsumableReturnRepository requires a MongoTransactionContext");
    }
    return new MongoConsumableReturnRepository(this.model, context.session);
  }
}
