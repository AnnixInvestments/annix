import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { RubberRollIssuanceLineItem } from "../entities/rubber-roll-issuance.entity";
import { RubberRollIssuanceLineItemRepository } from "./rubber-roll-issuance-line-item.repository";

@Injectable()
export class MongoRubberRollIssuanceLineItemRepository
  extends MongoCrudRepository<RubberRollIssuanceLineItem>
  implements RubberRollIssuanceLineItemRepository
{
  constructor(@InjectModel("RubberRollIssuanceLineItem") model: Model<RubberRollIssuanceLineItem>) {
    super(model);
  }

  build(data: Partial<RubberRollIssuanceLineItem>): RubberRollIssuanceLineItem {
    return data as RubberRollIssuanceLineItem;
  }

  async saveMany(entities: RubberRollIssuanceLineItem[]): Promise<RubberRollIssuanceLineItem[]> {
    return Promise.all(entities.map((entity) => this.create(entity)));
  }
}
