import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { AnnixOrbitPlacement } from "../entities/annix-orbit-placement.entity";
import { AnnixOrbitPlacementRepository } from "./annix-orbit-placement.repository";

@Injectable()
export class MongoAnnixOrbitPlacementRepository
  extends MongoCrudRepository<AnnixOrbitPlacement>
  implements AnnixOrbitPlacementRepository
{
  constructor(@InjectModel("AnnixOrbitPlacement") model: Model<AnnixOrbitPlacement>) {
    super(model);
  }

  async findByCompany(companyId: number): Promise<AnnixOrbitPlacement[]> {
    const docs = await this.documents.find({ companyId }).sort({ createdAt: -1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByIdForCompany(id: number, companyId: number): Promise<AnnixOrbitPlacement | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }
}
