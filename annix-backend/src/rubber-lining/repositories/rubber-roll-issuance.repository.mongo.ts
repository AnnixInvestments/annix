import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { RubberRollIssuance } from "../entities/rubber-roll-issuance.entity";
import { RubberRollIssuanceRepository } from "./rubber-roll-issuance.repository";

const ISSUANCE_RELATIONS = ["rollStock", "items"];

@Injectable()
export class MongoRubberRollIssuanceRepository
  extends MongoCrudRepository<RubberRollIssuance>
  implements RubberRollIssuanceRepository
{
  constructor(@InjectModel("RubberRollIssuance") model: Model<RubberRollIssuance>) {
    super(model);
  }

  build(data: Partial<RubberRollIssuance>): RubberRollIssuance {
    return data as RubberRollIssuance;
  }

  async findAllWithRelations(): Promise<RubberRollIssuance[]> {
    const docs = await this.documents
      .find()
      .populate(ISSUANCE_RELATIONS)
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneByIdWithRelations(id: number): Promise<RubberRollIssuance | null> {
    const doc = await this.documents.findById(id).populate(ISSUANCE_RELATIONS).lean().exec();
    return this.toDomain(doc);
  }

  async findOneByIdWithRollStock(id: number): Promise<RubberRollIssuance | null> {
    const doc = await this.documents.findById(id).populate("rollStock").lean().exec();
    return this.toDomain(doc);
  }

  async findOneByIdWithRollStockAndItems(id: number): Promise<RubberRollIssuance | null> {
    const doc = await this.documents.findById(id).populate(ISSUANCE_RELATIONS).lean().exec();
    return this.toDomain(doc);
  }
}
