import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { SteelSpecification } from "./entities/steel-specification.entity";
import { SteelSpecificationRepository } from "./steel-specification.repository";

@Injectable()
export class MongoSteelSpecificationRepository
  extends MongoCrudRepository<SteelSpecification>
  implements SteelSpecificationRepository
{
  constructor(@InjectModel("SteelSpecification") model: Model<SteelSpecification>) {
    super(model);
  }

  async findAllWithRelations(): Promise<SteelSpecification[]> {
    const docs = await this.documents.find().lean().exec();
    return this.toDomainList(docs);
  }

  async findByIdWithRelations(id: number): Promise<SteelSpecification | null> {
    const doc = await this.documents.findById(id).lean().exec();
    return this.toDomain(doc);
  }

  async findByName(steelSpecName: string): Promise<SteelSpecification | null> {
    const doc = await this.documents.findOne({ steelSpecName }).lean().exec();
    return this.toDomain(doc);
  }

  async findByIds(ids: number[]): Promise<SteelSpecification[]> {
    const docs = await this.documents
      .find({ _id: { $in: ids } })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}
