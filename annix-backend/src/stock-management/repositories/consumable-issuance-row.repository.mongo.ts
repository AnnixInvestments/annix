import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { ConsumableIssuanceRow } from "../entities/consumable-issuance-row.entity";
import { ConsumableIssuanceRowRepository } from "./consumable-issuance-row.repository";

@Injectable()
export class MongoConsumableIssuanceRowRepository
  extends MongoCrudRepository<ConsumableIssuanceRow>
  implements ConsumableIssuanceRowRepository
{
  constructor(
    @InjectModel("ConsumableIssuanceRow") model: Model<ConsumableIssuanceRow>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  build(data: DeepPartial<ConsumableIssuanceRow>): ConsumableIssuanceRow {
    return data as ConsumableIssuanceRow;
  }

  withTransaction(context: TransactionContext): MongoConsumableIssuanceRowRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoConsumableIssuanceRowRepository requires a MongoTransactionContext");
    }
    return new MongoConsumableIssuanceRowRepository(this.model, context.session);
  }
}
