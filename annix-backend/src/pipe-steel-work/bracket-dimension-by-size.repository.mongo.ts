import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { BracketDimensionBySizeRepository } from "./bracket-dimension-by-size.repository";
import { BracketDimensionBySizeEntity } from "./entities/bracket-dimension-by-size.entity";

@Injectable()
export class MongoBracketDimensionBySizeRepository
  extends MongoCrudRepository<BracketDimensionBySizeEntity>
  implements BracketDimensionBySizeRepository
{
  constructor(
    @InjectModel("BracketDimensionBySizeEntity")
    model: Model<BracketDimensionBySizeEntity>,
  ) {
    super(model);
  }

  async findByTypeAndNb(
    bracketTypeCode: string,
    nbMm: number,
  ): Promise<BracketDimensionBySizeEntity | null> {
    const document = await this.documents.findOne({ bracketTypeCode, nbMm }).lean().exec();
    return this.toDomain(document);
  }

  async findByTypeOrdered(bracketTypeCode: string): Promise<BracketDimensionBySizeEntity[]> {
    const documents = await this.documents
      .find({ bracketTypeCode })
      .sort({ nbMm: 1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }
}
