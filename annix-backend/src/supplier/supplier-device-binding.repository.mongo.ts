import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { SupplierDeviceBinding } from "./entities/supplier-device-binding.entity";
import { SupplierDeviceBindingRepository } from "./supplier-device-binding.repository";

@Injectable()
export class MongoSupplierDeviceBindingRepository
  extends MongoCrudRepository<SupplierDeviceBinding>
  implements SupplierDeviceBindingRepository
{
  constructor(@InjectModel("SupplierDeviceBinding") model: Model<SupplierDeviceBinding>) {
    super(model);
  }

  async findActivePrimary(
    profileIdField: string,
    profileId: number,
    deviceFingerprint: string,
  ): Promise<SupplierDeviceBinding | null> {
    const doc = await this.documents
      .findOne({
        [profileIdField]: profileId,
        deviceFingerprint,
        isActive: true,
        isPrimary: true,
      })
      .lean()
      .exec();
    return this.toDomain(doc);
  }
}
