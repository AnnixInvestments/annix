import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { AnnixOrbitComplianceItem } from "../entities/annix-orbit-compliance-item.entity";
import { AnnixOrbitComplianceItemRepository } from "./annix-orbit-compliance-item.repository";

@Injectable()
export class MongoAnnixOrbitComplianceItemRepository
  extends MongoCrudRepository<AnnixOrbitComplianceItem>
  implements AnnixOrbitComplianceItemRepository
{
  constructor(@InjectModel("AnnixOrbitComplianceItem") model: Model<AnnixOrbitComplianceItem>) {
    super(model);
  }

  async findByCompany(companyId: number): Promise<AnnixOrbitComplianceItem[]> {
    const docs = await this.documents.find({ companyId }).sort({ createdAt: -1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByIdForCompany(
    id: number,
    companyId: number,
  ): Promise<AnnixOrbitComplianceItem | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }
}
