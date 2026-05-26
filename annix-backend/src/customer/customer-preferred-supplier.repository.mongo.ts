import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { CustomerPreferredSupplierRepository } from "./customer-preferred-supplier.repository";
import { CustomerPreferredSupplier } from "./entities/customer-preferred-supplier.entity";

@Injectable()
export class MongoCustomerPreferredSupplierRepository
  extends MongoCrudRepository<CustomerPreferredSupplier>
  implements CustomerPreferredSupplierRepository
{
  constructor(@InjectModel("CustomerPreferredSupplier") model: Model<CustomerPreferredSupplier>) {
    super(model);
  }

  async findActiveByCompany(
    customerCompanyId: number,
    relations?: string[],
  ): Promise<CustomerPreferredSupplier[]> {
    const docs = await this.documents
      .find({ customerCompanyId, isActive: true })
      .populate(relations ?? [])
      .sort({ priority: 1, createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findActiveByCompanyAndSupplier(
    customerCompanyId: number,
    supplierProfileId: number,
  ): Promise<CustomerPreferredSupplier | null> {
    const doc = await this.documents
      .findOne({ customerCompanyId, supplierProfileId, isActive: true })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findByCompanyAndSupplier(
    customerCompanyId: number,
    supplierProfileId: number,
  ): Promise<CustomerPreferredSupplier | null> {
    const doc = await this.documents
      .findOne({ customerCompanyId, supplierProfileId })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findActiveByIdInCompany(
    id: number,
    customerCompanyId: number,
  ): Promise<CustomerPreferredSupplier | null> {
    const doc = await this.documents
      .findOne({ _id: id, customerCompanyId, isActive: true })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findByIdInCompany(
    id: number,
    customerCompanyId: number,
  ): Promise<CustomerPreferredSupplier | null> {
    const doc = await this.documents.findOne({ _id: id, customerCompanyId }).lean().exec();
    return this.toDomain(doc);
  }
}
