import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { PaintPriceListItem } from "../entities/paint-price-list-item.entity";
import { PaintPriceListItemRepository } from "./paint-price-list-item.repository";

@Injectable()
export class MongoPaintPriceListItemRepository
  extends MongoCrudRepository<PaintPriceListItem>
  implements PaintPriceListItemRepository
{
  constructor(
    @InjectModel("PaintPriceListItem")
    model: Model<PaintPriceListItem>,
  ) {
    super(model);
  }

  async findAllForCompany(companyId: number): Promise<PaintPriceListItem[]> {
    const docs = await this.documents
      .find({ companyId })
      .sort({ supplierName: 1, productName: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneForCompany(companyId: number, id: number): Promise<PaintPriceListItem | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }
}
