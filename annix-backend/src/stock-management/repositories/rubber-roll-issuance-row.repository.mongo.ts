import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { RubberRollIssuanceRow } from "../entities/rubber-roll-issuance-row.entity";
import { RubberRollIssuanceRowRepository } from "./rubber-roll-issuance-row.repository";

@Injectable()
export class MongoRubberRollIssuanceRowRepository
  extends MongoCrudRepository<RubberRollIssuanceRow>
  implements RubberRollIssuanceRowRepository
{
  constructor(
    @InjectModel("RubberRollIssuanceRow") model: Model<RubberRollIssuanceRow>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  build(data: DeepPartial<RubberRollIssuanceRow>): RubberRollIssuanceRow {
    return data as RubberRollIssuanceRow;
  }

  withTransaction(context: TransactionContext): MongoRubberRollIssuanceRowRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoRubberRollIssuanceRowRepository requires a MongoTransactionContext");
    }
    return new MongoRubberRollIssuanceRowRepository(this.model, context.session);
  }
}
