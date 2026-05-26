import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { PipeClampEntity } from "./entities/pipe-clamp.entity";
import { PipeClampRepository } from "./pipe-clamp.repository";

@Injectable()
export class MongoPipeClampRepository
  extends MongoCrudRepository<PipeClampEntity>
  implements PipeClampRepository
{
  constructor(@InjectModel("PipeClampEntity") model: Model<PipeClampEntity>) {
    super(model);
  }

  async pipeClamps(clampType?: string, nbMm?: number): Promise<PipeClampEntity[]> {
    const filter: Record<string, unknown> = {};
    if (clampType) {
      filter.clampType = clampType;
    }
    if (nbMm) {
      filter.nbMm = nbMm;
    }
    const docs = await this.documents.find(filter).sort({ clampType: 1, nbMm: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async pipeClamp(clampType: string, nbMm: number): Promise<PipeClampEntity | null> {
    const doc = await this.documents.findOne({ clampType, nbMm }).lean().exec();
    return this.toDomain(doc);
  }

  async pipeClampTypes(): Promise<Array<{ clampType: string; clampDescription: string }>> {
    const results = await this.documents.aggregate([
      {
        $group: {
          _id: { clampType: "$clampType", clampDescription: "$clampDescription" },
        },
      },
      {
        $project: {
          _id: 0,
          clampType: "$_id.clampType",
          clampDescription: "$_id.clampDescription",
        },
      },
    ]);
    return results as Array<{ clampType: string; clampDescription: string }>;
  }
}
