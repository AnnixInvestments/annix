import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { ProductDatasheet, type ProductDatasheetType } from "../entities/product-datasheet.entity";
import {
  type DatasheetOwnerField,
  ProductDatasheetRepository,
} from "./product-datasheet.repository";

@Injectable()
export class MongoProductDatasheetRepository
  extends MongoCrudRepository<ProductDatasheet>
  implements ProductDatasheetRepository
{
  constructor(@InjectModel("ProductDatasheet") model: Model<ProductDatasheet>) {
    super(model);
  }

  build(data: DeepPartial<ProductDatasheet>): ProductDatasheet {
    return data as ProductDatasheet;
  }

  async findActiveByOwner(
    companyId: number,
    ownerField: DatasheetOwnerField,
    ownerId: number,
  ): Promise<ProductDatasheet[]> {
    const query: Record<string, unknown> = { companyId, isActive: true };
    query[ownerField] = ownerId;
    const docs = await this.documents.find(query).lean().exec();
    return this.toDomainList(docs);
  }

  async findActiveForCompany(
    companyId: number,
    productType: ProductDatasheetType | undefined,
  ): Promise<ProductDatasheet[]> {
    const query: Record<string, unknown> = { companyId, isActive: true };
    if (productType) {
      query.productType = productType;
    }
    const docs = await this.documents.find(query).sort({ uploadedAt: -1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findOneForCompany(companyId: number, id: number): Promise<ProductDatasheet | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async findByIdOrFail(id: number): Promise<ProductDatasheet> {
    const doc = await this.documents.findById(id).lean().exec();
    if (!doc) {
      throw new Error(`ProductDatasheet ${id} not found`);
    }
    return this.toDomain(doc) as ProductDatasheet;
  }

  async updateActiveFlagForIds(ids: number[], isActive: boolean): Promise<void> {
    await this.documents.updateMany({ _id: { $in: ids } }, { $set: { isActive } }).exec();
  }

  async updateById(id: number, patch: DeepPartial<ProductDatasheet>): Promise<void> {
    await this.documents.updateOne({ _id: id }, { $set: patch }).exec();
  }
}
