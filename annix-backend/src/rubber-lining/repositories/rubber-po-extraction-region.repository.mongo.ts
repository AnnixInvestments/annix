import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { RubberPoExtractionRegion } from "../entities/rubber-po-extraction-region.entity";
import { RubberPoExtractionRegionRepository } from "./rubber-po-extraction-region.repository";

@Injectable()
export class MongoRubberPoExtractionRegionRepository
  extends MongoCrudRepository<RubberPoExtractionRegion>
  implements RubberPoExtractionRegionRepository
{
  constructor(@InjectModel("RubberPoExtractionRegion") model: Model<RubberPoExtractionRegion>) {
    super(model);
  }

  build(data: Partial<RubberPoExtractionRegion>): RubberPoExtractionRegion {
    return data as RubberPoExtractionRegion;
  }

  saveMany(entities: RubberPoExtractionRegion[]): Promise<RubberPoExtractionRegion[]> {
    return Promise.all(entities.map((entity) => this.create(entity)));
  }
}
