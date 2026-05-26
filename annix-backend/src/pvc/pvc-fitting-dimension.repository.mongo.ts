import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import {
  PvcFittingDimension,
  PvcFittingDimensionType,
} from "./entities/pvc-fitting-dimension.entity";
import { PvcFittingDimensionRepository } from "./pvc-fitting-dimension.repository";

@Injectable()
export class MongoPvcFittingDimensionRepository
  extends MongoCrudRepository<PvcFittingDimension>
  implements PvcFittingDimensionRepository
{
  constructor(@InjectModel("PvcFittingDimension") model: Model<PvcFittingDimension>) {
    super(model);
  }

  async findByCriteria(
    fittingType: PvcFittingDimensionType,
    mainDnMm: number,
    branchDnMm: number | null,
  ): Promise<PvcFittingDimension | null> {
    const query: Record<string, unknown> = { fittingType, mainDnMm };
    if (branchDnMm === null) {
      query.branchDnMm = null;
    } else {
      query.branchDnMm = branchDnMm;
    }
    const document = await this.documents.findOne(query).lean().exec();
    return this.toDomain(document);
  }

  async findAllOrderedByTypeAndSize(): Promise<PvcFittingDimension[]> {
    const documents = await this.documents
      .find()
      .sort({ fittingType: 1, mainDnMm: 1, branchDnMm: 1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async findByType(fittingType: PvcFittingDimensionType): Promise<PvcFittingDimension[]> {
    const documents = await this.documents
      .find({ fittingType })
      .sort({ mainDnMm: 1, branchDnMm: 1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }
}
