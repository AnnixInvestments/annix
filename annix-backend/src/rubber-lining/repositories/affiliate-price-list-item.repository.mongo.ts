import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { AffiliatePriceListItem } from "../entities/affiliate-price-list-item.entity";
import { AffiliatePriceListItemRepository } from "./affiliate-price-list-item.repository";

@Injectable()
export class MongoAffiliatePriceListItemRepository
  extends MongoCrudRepository<AffiliatePriceListItem>
  implements AffiliatePriceListItemRepository
{
  constructor(
    @InjectModel("AffiliatePriceListItem")
    model: Model<AffiliatePriceListItem>,
  ) {
    super(model);
  }

  build(data: Partial<AffiliatePriceListItem>): AffiliatePriceListItem {
    return data as AffiliatePriceListItem;
  }

  async findByPriceListId(priceListId: number): Promise<AffiliatePriceListItem[]> {
    const docs = await this.documents.find({ priceListId }).sort({ productCode: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async deleteByPriceListId(priceListId: number): Promise<void> {
    await this.documents.deleteMany({ priceListId }).exec();
  }
}
