import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { RubberPriceListItem } from "../entities/rubber-price-list-item.entity";
import { RubberPriceListItemRepository } from "./rubber-price-list-item.repository";

@Injectable()
export class MongoRubberPriceListItemRepository
  extends MongoCrudRepository<RubberPriceListItem>
  implements RubberPriceListItemRepository
{
  constructor(
    @InjectModel("RubberPriceListItem")
    model: Model<RubberPriceListItem>,
  ) {
    super(model);
  }

  async findAllForCompany(companyId: number): Promise<RubberPriceListItem[]> {
    const docs = await this.documents
      .find({ companyId })
      .sort({ supplier: 1, productCode: 1, cureType: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneForCompany(companyId: number, id: number): Promise<RubberPriceListItem | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }
}
