import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { RubberPurchaseRequisitionItem } from "../entities/rubber-purchase-requisition.entity";
import { RubberPurchaseRequisitionItemRepository } from "./rubber-purchase-requisition-item.repository";

@Injectable()
export class MongoRubberPurchaseRequisitionItemRepository
  extends MongoCrudRepository<RubberPurchaseRequisitionItem>
  implements RubberPurchaseRequisitionItemRepository
{
  constructor(
    @InjectModel("RubberPurchaseRequisitionItem")
    model: Model<RubberPurchaseRequisitionItem>,
  ) {
    super(model);
  }

  build(data: Partial<RubberPurchaseRequisitionItem>): RubberPurchaseRequisitionItem {
    return data as RubberPurchaseRequisitionItem;
  }
}
