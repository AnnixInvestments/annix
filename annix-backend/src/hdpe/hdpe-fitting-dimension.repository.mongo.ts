import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import {
  HdpeFittingDimension,
  HdpeFittingDimensionType,
} from "./entities/hdpe-fitting-dimension.entity";
import { HdpeFittingDimensionRepository } from "./hdpe-fitting-dimension.repository";

@Injectable()
export class MongoHdpeFittingDimensionRepository
  extends MongoCrudRepository<HdpeFittingDimension>
  implements HdpeFittingDimensionRepository
{
  constructor(@InjectModel("HdpeFittingDimension") model: Model<HdpeFittingDimension>) {
    super(model);
  }

  async findByCriteria(
    fittingType: HdpeFittingDimensionType,
    mainDnMm: number,
    branchDnMm: number | null,
  ): Promise<HdpeFittingDimension | null> {
    const query: Record<string, unknown> = { fittingType, mainDnMm };
    if (branchDnMm === null) {
      query.branchDnMm = null;
    } else {
      query.branchDnMm = branchDnMm;
    }
    const document = await this.documents.findOne(query).lean().exec();
    return this.toDomain(document);
  }

  async findAllOrderedByTypeAndSize(): Promise<HdpeFittingDimension[]> {
    const documents = await this.documents
      .find()
      .sort({ fittingType: 1, mainDnMm: 1, branchDnMm: 1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async findByType(fittingType: HdpeFittingDimensionType): Promise<HdpeFittingDimension[]> {
    const documents = await this.documents
      .find({ fittingType })
      .sort({ mainDnMm: 1, branchDnMm: 1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }
}
