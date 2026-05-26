import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { RubberApplicationRating } from "../entities/rubber-application.entity";
import {
  type ApplicationRatingFilters,
  RubberApplicationRatingRepository,
} from "./rubber-application-rating.repository";

type Doc = Record<string, unknown>;

@Injectable()
export class MongoRubberApplicationRatingRepository
  extends MongoCrudRepository<RubberApplicationRating>
  implements RubberApplicationRatingRepository
{
  constructor(@InjectModel("RubberApplicationRating") model: Model<RubberApplicationRating>) {
    super(model);
  }

  async findFilteredOrdered(
    filters?: ApplicationRatingFilters,
  ): Promise<RubberApplicationRating[]> {
    const filter: Doc = {};
    if (filters?.chemicalCategory) {
      filter.chemicalCategory = filters.chemicalCategory;
    }
    if (filters?.typeNumber) {
      filter.rubberTypeId = { $in: await this.typeIdsByNumber(filters.typeNumber) };
    }
    const docs = await this.documents
      .find(filter)
      .populate("rubberType")
      .sort({ chemicalCategory: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByChemicalCategoriesAndRatings(
    chemicalCategories: string[],
    resistanceRatings: string[],
  ): Promise<RubberApplicationRating[]> {
    const docs = await this.documents
      .find({
        chemicalCategory: { $in: chemicalCategories },
        resistanceRating: { $in: resistanceRatings },
      })
      .populate("rubberType")
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
