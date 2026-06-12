import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { AnnixOrbitShortlist } from "../entities/annix-orbit-shortlist.entity";
import { AnnixOrbitShortlistRepository } from "./annix-orbit-shortlist.repository";

@Injectable()
export class MongoAnnixOrbitShortlistRepository
  extends MongoCrudRepository<AnnixOrbitShortlist>
  implements AnnixOrbitShortlistRepository
{
  constructor(@InjectModel("AnnixOrbitShortlist") model: Model<AnnixOrbitShortlist>) {
    super(model);
  }

  async findByCompany(companyId: number): Promise<AnnixOrbitShortlist[]> {
    const docs = await this.documents.find({ companyId }).sort({ createdAt: -1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByIdForCompany(id: number, companyId: number): Promise<AnnixOrbitShortlist | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async findByShareToken(token: string): Promise<AnnixOrbitShortlist | null> {
    const doc = await this.documents.findOne({ shareToken: token }).lean().exec();
    return this.toDomain(doc);
  }
}
