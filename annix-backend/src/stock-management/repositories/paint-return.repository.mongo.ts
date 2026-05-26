import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { PaintReturn } from "../entities/paint-return.entity";
import { PaintReturnRepository } from "./paint-return.repository";

@Injectable()
export class MongoPaintReturnRepository
  extends MongoCrudRepository<PaintReturn>
  implements PaintReturnRepository
{
  constructor(
    @InjectModel("PaintReturn") model: Model<PaintReturn>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  build(data: DeepPartial<PaintReturn>): PaintReturn {
    return data as PaintReturn;
  }

  withTransaction(context: TransactionContext): MongoPaintReturnRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoPaintReturnRepository requires a MongoTransactionContext");
    }
    return new MongoPaintReturnRepository(this.model, context.session);
  }
}
