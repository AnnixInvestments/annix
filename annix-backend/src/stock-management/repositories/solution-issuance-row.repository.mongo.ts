import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { SolutionIssuanceRow } from "../entities/solution-issuance-row.entity";
import { SolutionIssuanceRowRepository } from "./solution-issuance-row.repository";

@Injectable()
export class MongoSolutionIssuanceRowRepository
  extends MongoCrudRepository<SolutionIssuanceRow>
  implements SolutionIssuanceRowRepository
{
  constructor(
    @InjectModel("SolutionIssuanceRow") model: Model<SolutionIssuanceRow>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  build(data: DeepPartial<SolutionIssuanceRow>): SolutionIssuanceRow {
    return data as SolutionIssuanceRow;
  }

  withTransaction(context: TransactionContext): MongoSolutionIssuanceRowRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoSolutionIssuanceRowRepository requires a MongoTransactionContext");
    }
    return new MongoSolutionIssuanceRowRepository(this.model, context.session);
  }
}
