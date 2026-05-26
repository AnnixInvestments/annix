import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { IssuanceItemCoatTracking } from "../entities/issuance-item-coat-tracking.entity";
import { IssuanceItemCoatTrackingRepository } from "./issuance-item-coat-tracking.repository";

@Injectable()
export class MongoIssuanceItemCoatTrackingRepository
  extends MongoCrudRepository<IssuanceItemCoatTracking>
  implements IssuanceItemCoatTrackingRepository
{
  constructor(
    @InjectModel("IssuanceItemCoatTracking") model: Model<IssuanceItemCoatTracking>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  build(data: DeepPartial<IssuanceItemCoatTracking>): IssuanceItemCoatTracking {
    return data as IssuanceItemCoatTracking;
  }

  withTransaction(context: TransactionContext): MongoIssuanceItemCoatTrackingRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoIssuanceItemCoatTrackingRepository requires a MongoTransactionContext");
    }
    return new MongoIssuanceItemCoatTrackingRepository(this.model, context.session);
  }
}
