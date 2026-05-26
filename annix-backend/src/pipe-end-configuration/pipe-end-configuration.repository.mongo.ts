import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { PipeEndConfiguration } from "./entities/pipe-end-configuration.entity";
import { PipeEndConfigurationRepository } from "./pipe-end-configuration.repository";

@Injectable()
export class MongoPipeEndConfigurationRepository
  extends MongoCrudRepository<PipeEndConfiguration>
  implements PipeEndConfigurationRepository
{
  constructor(@InjectModel("PipeEndConfiguration") model: Model<PipeEndConfiguration>) {
    super(model);
  }

  async findAllWithWeldType(): Promise<PipeEndConfiguration[]> {
    const docs = await this.documents.find().lean().exec();
    return this.toDomainList(docs);
  }

  async findByCode(configCode: string): Promise<PipeEndConfiguration | null> {
    const doc = await this.documents.findOne({ config_code: configCode }).lean().exec();
    return this.toDomain(doc);
  }

  async findByItemTypeFilter(
    whereClause: Partial<PipeEndConfiguration>,
  ): Promise<PipeEndConfiguration[]> {
    const docs = await this.documents
      .find(whereClause as Record<string, unknown>)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}
