import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { AffiliatePriceList } from "../entities/affiliate-price-list.entity";
import { AffiliatePriceListRepository } from "./affiliate-price-list.repository";

@Injectable()
export class MongoAffiliatePriceListRepository
  extends MongoCrudRepository<AffiliatePriceList>
  implements AffiliatePriceListRepository
{
  constructor(
    @InjectModel("AffiliatePriceList")
    model: Model<AffiliatePriceList>,
  ) {
    super(model);
  }

  build(data: Partial<AffiliatePriceList>): AffiliatePriceList {
    return data as AffiliatePriceList;
  }

  async findByAffiliateId(affiliateId: number): Promise<AffiliatePriceList[]> {
    const docs = await this.documents.find({ affiliateId }).sort({ uploadedAt: -1 }).lean().exec();
    return this.toDomainList(docs);
  }
}
