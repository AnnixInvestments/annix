import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../../lib/persistence/mongo-crud-repository";
import { PositectorDevice } from "../entities/positector-device.entity";
import { PositectorDeviceRepository } from "./positector-device.repository";

@Injectable()
export class MongoPositectorDeviceRepository
  extends MongoCrudRepository<PositectorDevice>
  implements PositectorDeviceRepository
{
  constructor(@InjectModel("PositectorDevice") model: Model<PositectorDevice>) {
    super(model);
  }

  async findByCompanyAndIp(companyId: number, ipAddress: string): Promise<PositectorDevice | null> {
    const doc = await this.documents.findOne({ companyId, ipAddress }).lean().exec();
    return this.toDomain(doc);
  }

  async findAllForCompany(
    companyId: number,
    activeFilter: boolean | undefined,
  ): Promise<PositectorDevice[]> {
    const filter: Record<string, unknown> = { companyId };
    if (activeFilter !== undefined) {
      filter.isActive = activeFilter;
    }
    const docs = await this.documents.find(filter).sort({ deviceName: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByIdForCompany(companyId: number, id: number): Promise<PositectorDevice | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async updateById(id: number, updates: Partial<PositectorDevice>): Promise<void> {
    await this.documents.updateOne({ _id: id }, { $set: updates }).exec();
  }
}
