import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { RubberAdhesionRequirement } from "../entities/rubber-application.entity";
import { RubberAdhesionRequirementRepository } from "./rubber-adhesion-requirement.repository";

type Doc = Record<string, unknown>;

@Injectable()
export class MongoRubberAdhesionRequirementRepository
  extends MongoCrudRepository<RubberAdhesionRequirement>
  implements RubberAdhesionRequirementRepository
{
  constructor(
    @InjectModel("RubberAdhesionRequirement")
    model: Model<RubberAdhesionRequirement>,
  ) {
    super(model);
  }

  async findByTypeNumberOrdered(typeNumber?: number): Promise<RubberAdhesionRequirement[]> {
    const filter: Doc = {};
    if (typeNumber) {
      filter.rubberTypeId = { $in: await this.typeIdsByNumber(typeNumber) };
    }
    const docs = await this.documents
      .find(filter)
      .populate("rubberType")
      .sort({ vulcanizationMethod: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  private async typeIdsByNumber(typeNumber: number): Promise<number[]> {
    const typeModel = this.model.db.model<Doc>("RubberType");
    const types = await typeModel.find({ typeNumber }).select("_id").lean().exec();
    return types.map((type) => type._id as number);
  }
}
