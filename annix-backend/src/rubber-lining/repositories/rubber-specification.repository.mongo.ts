import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { RubberSpecification } from "../entities/rubber-specification.entity";
import { RubberSpecificationRepository } from "./rubber-specification.repository";

@Injectable()
export class MongoRubberSpecificationRepository
  extends MongoCrudRepository<RubberSpecification>
  implements RubberSpecificationRepository
{
  constructor(@InjectModel("RubberSpecification") model: Model<RubberSpecification>) {
    super(model);
  }

  build(data: Partial<RubberSpecification>): RubberSpecification {
    return data as RubberSpecification;
  }

  async findAllWithTypeOrdered(): Promise<RubberSpecification[]> {
    const docs = await this.documents
      .find()
      .populate("rubberType")
      .sort({ rubberTypeId: 1, grade: 1, hardnessClassIrhd: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByTypeIdOrdered(rubberTypeId: number): Promise<RubberSpecification[]> {
    const docs = await this.documents
      .find({ rubberTypeId })
      .populate("rubberType")
      .sort({ grade: 1, hardnessClassIrhd: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByTypeIdsOrdered(rubberTypeIds: number[]): Promise<RubberSpecification[]> {
    const docs = await this.documents
      .find({ rubberTypeId: { $in: rubberTypeIds } })
      .populate("rubberType")
      .sort({ grade: 1, hardnessClassIrhd: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneByCallout(
    rubberTypeId: number,
    grade: string,
    hardnessClassIrhd: number,
  ): Promise<RubberSpecification | null> {
    const doc = await this.documents
      .findOne({ rubberTypeId, grade, hardnessClassIrhd })
      .populate("rubberType")
      .lean()
      .exec();
    return this.toDomain(doc);
  }
}
