import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { AngleRange } from "src/angle-range/entities/angle-range.entity";
import { FittingVariant } from "src/fitting-variant/entities/fitting-variant.entity";
import { type DeepPartial } from "../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { FittingDimension } from "./entities/fitting-dimension.entity";
import { FittingDimensionRepository } from "./fitting-dimension.repository";

type MongoDoc = Record<string, unknown>;

@Injectable()
export class MongoFittingDimensionRepository
  extends MongoCrudRepository<FittingDimension>
  implements FittingDimensionRepository
{
  constructor(@InjectModel("FittingDimension") model: Model<FittingDimension>) {
    super(model);
  }

  private get variantModel(): Model<MongoDoc> {
    return this.model.db.model<MongoDoc>("FittingVariant");
  }

  private get angleRangeModel(): Model<MongoDoc> {
    return this.model.db.model<MongoDoc>("AngleRange");
  }

  async findAllWithRelations(): Promise<FittingDimension[]> {
    return this.toDomainList(await this.documents.find().lean().exec());
  }

  async findByIdWithRelations(id: number): Promise<FittingDimension | null> {
    return this.toDomain(await this.documents.findById(id).lean().exec());
  }

  async findVariantById(id: number): Promise<FittingVariant | null> {
    const doc = await this.variantModel.findById(id).lean().exec();
    if (!doc) {
      return null;
    }
    const { _id, ...rest } = doc;
    return { id: _id, ...rest } as unknown as FittingVariant;
  }

  async findAngleRangeById(id: number): Promise<AngleRange | null> {
    const doc = await this.angleRangeModel.findById(id).lean().exec();
    if (!doc) {
      return null;
    }
    const { _id, ...rest } = doc;
    return { id: _id, ...rest } as unknown as AngleRange;
  }

  instantiate(data: DeepPartial<FittingDimension>): FittingDimension {
    return data as FittingDimension;
  }
}
