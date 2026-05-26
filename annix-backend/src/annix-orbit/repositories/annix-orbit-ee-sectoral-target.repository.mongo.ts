import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { AnnixOrbitEeSectoralTarget } from "../entities/annix-orbit-ee-sectoral-target.entity";
import { AnnixOrbitEeSectoralTargetRepository } from "./annix-orbit-ee-sectoral-target.repository";

@Injectable()
export class MongoAnnixOrbitEeSectoralTargetRepository
  extends MongoCrudRepository<AnnixOrbitEeSectoralTarget>
  implements AnnixOrbitEeSectoralTargetRepository
{
  constructor(
    @InjectModel("AnnixOrbitEeSectoralTarget")
    model: Model<AnnixOrbitEeSectoralTarget>,
  ) {
    super(model);
  }

  async listOrdered(): Promise<AnnixOrbitEeSectoralTarget[]> {
    const docs = await this.documents
      .find()
      .sort({ sectorCode: 1, occupationalLevel: 1, targetMetric: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findBySectorCode(sectorCode: string): Promise<AnnixOrbitEeSectoralTarget[]> {
    const docs = await this.documents.find({ sectorCode }).lean().exec();
    return this.toDomainList(docs);
  }

  async deleteById(id: number): Promise<number> {
    const result = await this.documents.findByIdAndDelete(id).exec();
    return result ? 1 : 0;
  }
}
