import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { ForgedFittingDimension } from "./entities/forged-fitting-dimension.entity";
import { ForgedFittingRepository } from "./forged-fitting.repository";

@Injectable()
export class MongoForgedFittingRepository
  extends MongoCrudRepository<ForgedFittingDimension>
  implements ForgedFittingRepository
{
  constructor(@InjectModel("ForgedFittingDimension") model: Model<ForgedFittingDimension>) {
    super(model);
  }

  private get seriesModel(): Model<Record<string, unknown>> {
    return this.model.db.model<Record<string, unknown>>("ForgedFittingSeries");
  }

  private get typeModel(): Model<Record<string, unknown>> {
    return this.model.db.model<Record<string, unknown>>("ForgedFittingType");
  }

  async fittingTypes(): Promise<{ code: string; name: string }[]> {
    const types = await this.typeModel.find().sort({ name: 1 }).lean().exec();
    return types.map((t) => ({ code: t["code"] as string, name: t["name"] as string }));
  }

  async seriesList(): Promise<{ id: number; pressureClass: number; connectionType: string }[]> {
    const series = await this.seriesModel
      .find()
      .sort({ pressureClass: 1, connectionType: 1 })
      .lean()
      .exec();
    return series.map((s) => ({
      id: s["_id"] as number,
      pressureClass: s["pressureClass"] as number,
      connectionType: s["connectionType"] as string,
    }));
  }

  async sizes(
    fittingTypeCode: string,
    pressureClass: number,
    connectionType: string,
  ): Promise<number[]> {
    const types = await this.typeModel.find({ code: fittingTypeCode }).lean().exec();
    const typeIds = types.map((t) => t["_id"]);
    const series = await this.seriesModel.find({ pressureClass, connectionType }).lean().exec();
    const seriesIds = series.map((s) => s["_id"]);
    const values = await this.documents
      .distinct("nominalBoreMm", { fittingTypeId: { $in: typeIds }, seriesId: { $in: seriesIds } })
      .exec();
    return (values as number[]).sort((a, b) => a - b);
  }

  async dimensionByFilter(
    fittingTypeCode: string,
    nominalBoreMm: number,
    pressureClass: number,
    connectionType: string,
  ): Promise<ForgedFittingDimension | null> {
    const types = await this.typeModel.find({ code: fittingTypeCode }).lean().exec();
    const typeIds = types.map((t) => t["_id"]);
    const series = await this.seriesModel.find({ pressureClass, connectionType }).lean().exec();
    const seriesIds = series.map((s) => s["_id"]);
    const doc = await this.documents
      .findOne({ fittingTypeId: { $in: typeIds }, nominalBoreMm, seriesId: { $in: seriesIds } })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async allDimensions(
    fittingTypeCode: string,
    pressureClass: number,
    connectionType: string,
  ): Promise<ForgedFittingDimension[]> {
    const types = await this.typeModel.find({ code: fittingTypeCode }).lean().exec();
    const typeIds = types.map((t) => t["_id"]);
    const series = await this.seriesModel.find({ pressureClass, connectionType }).lean().exec();
    const seriesIds = series.map((s) => s["_id"]);
    const docs = await this.documents
      .find({ fittingTypeId: { $in: typeIds }, seriesId: { $in: seriesIds } })
      .sort({ nominalBoreMm: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}
