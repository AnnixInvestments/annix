import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { RubberProduction, RubberProductionStatus } from "../entities/rubber-production.entity";
import { RubberProductionRepository } from "./rubber-production.repository";

const PRODUCTION_RELATIONS = ["product", "compoundStock"];

@Injectable()
export class MongoRubberProductionRepository
  extends MongoCrudRepository<RubberProduction>
  implements RubberProductionRepository
{
  constructor(@InjectModel("RubberProduction") model: Model<RubberProduction>) {
    super(model);
  }

  build(data: Partial<RubberProduction>): RubberProduction {
    return data as RubberProduction;
  }

  async findFilteredWithRelations(status?: RubberProductionStatus): Promise<RubberProduction[]> {
    const filter: Record<string, unknown> = {};
    if (status !== undefined) {
      filter.status = status;
    }
    const docs = await this.documents
      .find(filter)
      .populate(PRODUCTION_RELATIONS)
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneByIdWithRelations(id: number): Promise<RubberProduction | null> {
    const doc = await this.documents.findById(id).populate(PRODUCTION_RELATIONS).lean().exec();
    return this.toDomain(doc);
  }

  async findLatest(): Promise<RubberProduction | null> {
    const doc = await this.documents.findOne().sort({ _id: -1 }).lean().exec();
    return this.toDomain(doc);
  }
}
