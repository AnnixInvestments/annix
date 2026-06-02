import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { AnnixOrbitClient } from "../entities/annix-orbit-client.entity";
import { AnnixOrbitClientRepository } from "./annix-orbit-client.repository";

@Injectable()
export class MongoAnnixOrbitClientRepository
  extends MongoCrudRepository<AnnixOrbitClient>
  implements AnnixOrbitClientRepository
{
  constructor(@InjectModel("AnnixOrbitClient") model: Model<AnnixOrbitClient>) {
    super(model);
  }

  async findByCompany(companyId: number): Promise<AnnixOrbitClient[]> {
    const docs = await this.documents.find({ companyId }).sort({ createdAt: -1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByIdForCompany(id: number, companyId: number): Promise<AnnixOrbitClient | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }
}
