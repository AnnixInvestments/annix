import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { MarketingSiteContent } from "../entities/marketing-site-content.entity";
import { MarketingSiteContentRepository } from "./marketing-site-content.repository";

@Injectable()
export class MongoMarketingSiteContentRepository
  extends MongoCrudRepository<MarketingSiteContent>
  implements MarketingSiteContentRepository
{
  constructor(@InjectModel("MarketingSiteContent") model: Model<MarketingSiteContent>) {
    super(model);
  }

  build(data: Partial<MarketingSiteContent>): MarketingSiteContent {
    return data as MarketingSiteContent;
  }
}
