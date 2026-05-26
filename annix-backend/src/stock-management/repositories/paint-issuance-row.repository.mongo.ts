import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { PaintIssuanceRow } from "../entities/paint-issuance-row.entity";
import { PaintIssuanceRowRepository } from "./paint-issuance-row.repository";

@Injectable()
export class MongoPaintIssuanceRowRepository
  extends MongoCrudRepository<PaintIssuanceRow>
  implements PaintIssuanceRowRepository
{
  constructor(
    @InjectModel("PaintIssuanceRow") model: Model<PaintIssuanceRow>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  build(data: DeepPartial<PaintIssuanceRow>): PaintIssuanceRow {
    return data as PaintIssuanceRow;
  }

  withTransaction(context: TransactionContext): MongoPaintIssuanceRowRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoPaintIssuanceRowRepository requires a MongoTransactionContext");
    }
    return new MongoPaintIssuanceRowRepository(this.model, context.session);
  }
}
