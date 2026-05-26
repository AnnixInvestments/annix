import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { ReconciliationEvent } from "../entities/reconciliation-event.entity";
import { ReconciliationEventRepository } from "./reconciliation-event.repository";

@Injectable()
export class MongoReconciliationEventRepository
  extends MongoCrudRepository<ReconciliationEvent>
  implements ReconciliationEventRepository
{
  constructor(
    @InjectModel("ReconciliationEvent")
    model: Model<ReconciliationEvent>,
  ) {
    super(model);
  }

  async findForItemsOrdered(itemIds: number[]): Promise<ReconciliationEvent[]> {
    const docs = await this.documents
      .find({ reconciliationItemId: { $in: itemIds } })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}
