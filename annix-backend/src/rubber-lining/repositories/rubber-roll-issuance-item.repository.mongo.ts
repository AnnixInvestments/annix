import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { RubberRollIssuanceItem } from "../entities/rubber-roll-issuance.entity";
import { RubberRollIssuanceItemRepository } from "./rubber-roll-issuance-item.repository";

@Injectable()
export class MongoRubberRollIssuanceItemRepository
  extends MongoCrudRepository<RubberRollIssuanceItem>
  implements RubberRollIssuanceItemRepository
{
  constructor(@InjectModel("RubberRollIssuanceItem") model: Model<RubberRollIssuanceItem>) {
    super(model);
  }

  build(data: Partial<RubberRollIssuanceItem>): RubberRollIssuanceItem {
    return data as RubberRollIssuanceItem;
  }

  async saveMany(entities: RubberRollIssuanceItem[]): Promise<RubberRollIssuanceItem[]> {
    return Promise.all(entities.map((entity) => this.create(entity)));
  }
}
