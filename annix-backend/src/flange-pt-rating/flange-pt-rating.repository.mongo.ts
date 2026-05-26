import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { FlangePtRating } from "./entities/flange-pt-rating.entity";
import { FlangePtRatingRepository } from "./flange-pt-rating.repository";

type MongoDoc = Record<string, unknown>;

@Injectable()
export class MongoFlangePtRatingRepository
  extends MongoCrudRepository<FlangePtRating>
  implements FlangePtRatingRepository
{
  constructor(@InjectModel("FlangePtRating") model: Model<FlangePtRating>) {
    super(model);
  }

  private get pressureClassModel(): Model<MongoDoc> {
    return this.model.db.model<MongoDoc>("FlangePressureClass");
  }

  async saveMany(entities: FlangePtRating[]): Promise<FlangePtRating[]> {
    return Promise.all(entities.map((entity) => this.save(entity)));
  }

  async findAllWithRelations(): Promise<FlangePtRating[]> {
    return this.toDomainList(
      await this.documents.find().sort({ pressureClassId: 1, temperatureCelsius: 1 }).lean().exec(),
    );
  }

  async findByPressureClassId(pressureClassId: number): Promise<FlangePtRating[]> {
    return this.toDomainList(
      await this.documents.find({ pressureClassId }).sort({ temperatureCelsius: 1 }).lean().exec(),
    );
  }

  async findByPressureClassAndMaterial(
    pressureClassId: number,
    materialGroup: string,
  ): Promise<FlangePtRating[]> {
    return this.toDomainList(
      await this.documents
        .find({ pressureClassId, materialGroup })
        .sort({ temperatureCelsius: 1 })
        .lean()
        .exec(),
    );
  }

  async findByStandardAndMaterial(
    standardId: number,
    materialGroup: string,
  ): Promise<FlangePtRating[]> {
    const pressureClasses = await this.pressureClassModel.find({ standardId }).lean().exec();
    const pressureClassIds = pressureClasses.map((pc) => pc._id);
    if (pressureClassIds.length === 0) {
      return [];
    }
    return this.toDomainList(
      await this.documents
        .find({ pressureClassId: { $in: pressureClassIds }, materialGroup })
        .sort({ pressureClassId: 1, temperatureCelsius: 1 })
        .lean()
        .exec(),
    );
  }

  async distinctMaterialGroups(): Promise<{ materialGroup: string }[]> {
    const result = await this.documents.distinct("materialGroup", {}).exec();
    return (result as string[]).map((materialGroup) => ({ materialGroup }));
  }

  async findByStandardAndMaterialOrdered(
    standardId: number,
    materialGroup: string,
  ): Promise<FlangePtRating[]> {
    const pressureClasses = await this.pressureClassModel.find({ standardId }).lean().exec();
    const pressureClassIds = pressureClasses.map((pc) => pc._id);
    if (pressureClassIds.length === 0) {
      return [];
    }
    return this.toDomainList(
      await this.documents
        .find({ pressureClassId: { $in: pressureClassIds }, materialGroup })
        .sort({ pressureClassId: 1, temperatureCelsius: 1 })
        .lean()
        .exec(),
    );
  }
}
