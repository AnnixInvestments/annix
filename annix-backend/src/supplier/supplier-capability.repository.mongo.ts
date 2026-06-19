import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { SupplierCapability } from "./entities/supplier-capability.entity";
import { SupplierCapabilityRepository } from "./supplier-capability.repository";

@Injectable()
export class MongoSupplierCapabilityRepository
  extends MongoCrudRepository<SupplierCapability>
  implements SupplierCapabilityRepository
{
  constructor(@InjectModel("SupplierCapability") model: Model<SupplierCapability>) {
    super(model);
  }

  async findActiveBySupplierIdsWithRelations(
    supplierProfileIds: number[],
  ): Promise<SupplierCapability[]> {
    if (supplierProfileIds.length === 0) return [];
    const documents = await this.documents
      .find({ supplierProfileId: { $in: supplierProfileIds }, isActive: true })
      .populate("supplierProfile")
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async findActiveBySupplier(supplierProfileId: number): Promise<SupplierCapability[]> {
    const documents = await this.documents
      .find({ supplierProfileId, isActive: true })
      .session(this.session)
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async findBySupplier(supplierProfileId: number): Promise<SupplierCapability[]> {
    const documents = await this.documents
      .find({ supplierProfileId })
      .session(this.session)
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async removeById(id: number): Promise<void> {
    await this.documents.findByIdAndDelete(id).session(this.session).exec();
  }
}
