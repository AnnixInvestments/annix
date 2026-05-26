import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { MaterialAllowableStress } from "./entities/material-allowable-stress.entity";
import { PipeSchedule } from "./entities/pipe-schedule.entity";
import { PipeScheduleRepository } from "./pipe-schedule.repository";

@Injectable()
export class MongoPipeScheduleRepository
  extends MongoCrudRepository<PipeSchedule>
  implements PipeScheduleRepository
{
  constructor(@InjectModel("PipeSchedule") model: Model<PipeSchedule>) {
    super(model);
  }

  private get stressModel(): Model<Record<string, unknown>> {
    return this.model.db.model<Record<string, unknown>>("MaterialAllowableStress");
  }

  async findStressesByMaterialOrdered(materialCode: string): Promise<MaterialAllowableStress[]> {
    const docs = await this.stressModel
      .find({ materialCode })
      .sort({ temperatureCelsius: 1 })
      .lean()
      .exec();
    return docs.map((doc) => {
      const { _id, ...rest } = doc;
      return { id: _id, ...rest } as unknown as MaterialAllowableStress;
    });
  }

  async findSchedulesByNps(nps: string): Promise<PipeSchedule[]> {
    const docs = await this.documents.find({ nps }).sort({ wallThicknessInch: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findSchedulesByNbMm(nbMm: number): Promise<PipeSchedule[]> {
    const docs = await this.documents.find({ nbMm }).sort({ wallThicknessInch: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findAllSchedulesOrdered(): Promise<PipeSchedule[]> {
    const docs = await this.documents.find().sort({ nbMm: 1, wallThicknessInch: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async distinctMaterials(): Promise<{ materialCode: string; materialName: string }[]> {
    const results = await this.stressModel
      .aggregate([
        { $group: { _id: "$materialCode", materialName: { $first: "$materialName" } } },
        { $project: { materialCode: "$_id", materialName: 1, _id: 0 } },
      ])
      .exec();
    return results as { materialCode: string; materialName: string }[];
  }

  async distinctNpsSizes(): Promise<{ nps: string }[]> {
    const values = await this.documents.distinct("nps").exec();
    const sorted = (values as string[]).sort();
    return sorted.map((nps) => ({ nps }));
  }

  async findScheduleByNpsAndDesignation(
    nps: string,
    schedule: string,
  ): Promise<PipeSchedule | null> {
    const doc = await this.documents.findOne({ nps, schedule }).lean().exec();
    return this.toDomain(doc);
  }
}
