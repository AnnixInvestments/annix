import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { CustomerPurchaseOrderItem } from "../entities/customer-purchase-order-item.entity";
import { CustomerPurchaseOrderItemRepository } from "./customer-purchase-order-item.repository";

@Injectable()
export class MongoCustomerPurchaseOrderItemRepository
  extends MongoCrudRepository<CustomerPurchaseOrderItem>
  implements CustomerPurchaseOrderItemRepository
{
  constructor(
    @InjectModel("CustomerPurchaseOrderItem")
    model: Model<CustomerPurchaseOrderItem>,
  ) {
    super(model);
  }

  createMany(
    rows: Array<DeepPartial<CustomerPurchaseOrderItem>>,
  ): Promise<CustomerPurchaseOrderItem[]> {
    return Promise.all(rows.map((row) => this.create(row)));
  }

  async findOneForCpoAndCompany(
    id: number,
    cpoId: number,
    companyId: number,
  ): Promise<CustomerPurchaseOrderItem | null> {
    const doc = await this.documents.findOne({ _id: id, cpoId, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async findOneForCpo(id: number, cpoId: number): Promise<CustomerPurchaseOrderItem | null> {
    const doc = await this.documents.findOne({ _id: id, cpoId }).lean().exec();
    return this.toDomain(doc);
  }

  async findForCpoOrdered(cpoId: number, companyId: number): Promise<CustomerPurchaseOrderItem[]> {
    const docs = await this.documents
      .find({ cpoId, companyId })
      .sort({ sortOrder: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async updateById(id: number, changes: DeepPartial<CustomerPurchaseOrderItem>): Promise<void> {
    await this.documents.findByIdAndUpdate(id, changes as Record<string, unknown>).exec();
  }

  async deleteForCpo(cpoId: number): Promise<void> {
    await this.documents.deleteMany({ cpoId }).exec();
  }
}
