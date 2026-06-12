import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { AnnixOrbitTalentPool } from "../entities/annix-orbit-talent-pool.entity";
import { AnnixOrbitTalentPoolRepository } from "./annix-orbit-talent-pool.repository";

@Injectable()
export class MongoAnnixOrbitTalentPoolRepository
  extends MongoCrudRepository<AnnixOrbitTalentPool>
  implements AnnixOrbitTalentPoolRepository
{
  constructor(@InjectModel("AnnixOrbitTalentPool") model: Model<AnnixOrbitTalentPool>) {
    super(model);
  }

  async findByCompany(companyId: number): Promise<AnnixOrbitTalentPool[]> {
    const docs = await this.documents.find({ companyId }).sort({ createdAt: -1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByIdForCompany(id: number, companyId: number): Promise<AnnixOrbitTalentPool | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }
}
