import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { PipeNpsOd, PipeScheduleWall } from "./entities/pipe-schedule-wall.entity";
import { PipeAllowableStress, PipeSteelGrade } from "./entities/steel-grade-stress.entity";
import { PipeSizingRepository } from "./pipe-sizing.repository";

@Injectable()
export class MongoPipeSizingRepository
  extends MongoCrudRepository<PipeSteelGrade>
  implements PipeSizingRepository
{
  constructor(@InjectModel("PipeSteelGrade") model: Model<PipeSteelGrade>) {
    super(model);
  }

  private get stressModel(): Model<Record<string, unknown>> {
    return this.model.db.model<Record<string, unknown>>("PipeAllowableStress");
  }

  private get scheduleWallModel(): Model<Record<string, unknown>> {
    return this.model.db.model<Record<string, unknown>>("PipeScheduleWall");
  }

  private get npsOdModel(): Model<Record<string, unknown>> {
    return this.model.db.model<Record<string, unknown>>("PipeNpsOd");
  }

  async findAllGradesOrdered(): Promise<PipeSteelGrade[]> {
    const docs = await this.documents.find().sort({ code: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findGradeByCode(code: string): Promise<PipeSteelGrade | null> {
    const doc = await this.documents.findOne({ code }).lean().exec();
    return this.toDomain(doc);
  }

  async findAllNpsOdOrdered(): Promise<PipeNpsOd[]> {
    const docs = await this.npsOdModel.find().sort({ odInch: 1 }).lean().exec();
    return docs.map((doc) => {
      const { _id, ...rest } = doc;
      return { id: _id, ...rest } as unknown as PipeNpsOd;
    });
  }

  async findNpsOdByNps(nps: string): Promise<PipeNpsOd | null> {
    const doc = await this.npsOdModel.findOne({ nps }).lean().exec();
    if (!doc) {
      return null;
    }
    const { _id, ...rest } = doc;
    return { id: _id, ...rest } as unknown as PipeNpsOd;
  }

  async findScheduleWallsByNps(nps: string): Promise<PipeScheduleWall[]> {
    const docs = await this.scheduleWallModel
      .find({ nps })
      .sort({ wallThicknessInch: 1 })
      .lean()
      .exec();
    return docs.map((doc) => {
      const { _id, ...rest } = doc;
      return { id: _id, ...rest } as unknown as PipeScheduleWall;
    });
  }

  async findScheduleWallByNpsAndDesignation(
    nps: string,
    schedule: string,
  ): Promise<PipeScheduleWall | null> {
    const doc = await this.scheduleWallModel.findOne({ nps, schedule }).lean().exec();
    if (!doc) {
      return null;
    }
    const { _id, ...rest } = doc;
    return { id: _id, ...rest } as unknown as PipeScheduleWall;
  }

  async findStressesByGradeId(gradeId: number): Promise<PipeAllowableStress[]> {
    const docs = await this.stressModel.find({ gradeId }).sort({ temperatureF: 1 }).lean().exec();
    return docs.map((doc) => {
      const { _id, ...rest } = doc;
      return { id: _id, ...rest } as unknown as PipeAllowableStress;
    });
  }
}
