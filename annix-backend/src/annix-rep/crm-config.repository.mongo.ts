import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { CrmConfigRepository } from "./crm-config.repository";
import { CrmConfig, CrmType } from "./entities/crm-config.entity";

@Injectable()
export class MongoCrmConfigRepository
  extends MongoCrudRepository<CrmConfig>
  implements CrmConfigRepository
{
  constructor(@InjectModel("CrmConfig") model: Model<CrmConfig>) {
    super(model);
  }

  async findActive(): Promise<CrmConfig[]> {
    const docs = await this.documents.find({ isActive: true }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByUserAndType(userId: number, crmType: CrmType): Promise<CrmConfig | null> {
    const doc = await this.documents.findOne({ userId, crmType }).lean().exec();
    return this.toDomain(doc);
  }

  async findByIdAndUser(id: number, userId: number): Promise<CrmConfig | null> {
    const doc = await this.documents.findOne({ _id: id, userId }).lean().exec();
    return this.toDomain(doc);
  }

  async findByUser(userId: number): Promise<CrmConfig[]> {
    const docs = await this.documents.find({ userId }).sort({ createdAt: -1 }).lean().exec();
    return this.toDomainList(docs);
  }
}
