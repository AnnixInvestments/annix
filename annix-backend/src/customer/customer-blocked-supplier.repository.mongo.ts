import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { CustomerBlockedSupplierRepository } from "./customer-blocked-supplier.repository";
import { CustomerBlockedSupplier } from "./entities/customer-blocked-supplier.entity";

@Injectable()
export class MongoCustomerBlockedSupplierRepository
  extends MongoCrudRepository<CustomerBlockedSupplier>
  implements CustomerBlockedSupplierRepository
{
  constructor(@InjectModel("CustomerBlockedSupplier") model: Model<CustomerBlockedSupplier>) {
    super(model);
  }

  async findActiveByCompany(customerCompanyId: number): Promise<CustomerBlockedSupplier[]> {
    const docs = await this.documents.find({ customerCompanyId, isActive: true }).lean().exec();
    return this.toDomainList(docs);
  }

  async findActiveByCompanyAndSupplier(
    customerCompanyId: number,
    supplierProfileId: number,
  ): Promise<CustomerBlockedSupplier | null> {
    const doc = await this.documents
      .findOne({ customerCompanyId, supplierProfileId, isActive: true })
      .lean()
      .exec();
    return this.toDomain(doc);
  }
}
