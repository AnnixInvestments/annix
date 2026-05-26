import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { CustomerDeviceBindingRepository } from "./customer-device-binding.repository";
import { CustomerDeviceBinding } from "./entities/customer-device-binding.entity";

@Injectable()
export class MongoCustomerDeviceBindingRepository
  extends MongoCrudRepository<CustomerDeviceBinding>
  implements CustomerDeviceBindingRepository
{
  constructor(@InjectModel("CustomerDeviceBinding") model: Model<CustomerDeviceBinding>) {
    super(model);
  }

  async findActivePrimary(
    profileIdField: string,
    profileId: number,
    deviceFingerprint: string,
  ): Promise<CustomerDeviceBinding | null> {
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
