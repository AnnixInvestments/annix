import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { WeldThicknessFittingRecommendation } from "./entities/weld-thickness-fitting-recommendation.entity";
import { WeldThicknessPipeRecommendation } from "./entities/weld-thickness-pipe-recommendation.entity";
import { WeldThicknessRepository } from "./weld-thickness.repository";

@Injectable()
export class MongoWeldThicknessRepository
  extends MongoCrudRepository<WeldThicknessFittingRecommendation>
  implements WeldThicknessRepository
{
  constructor(
    @InjectModel("WeldThicknessFittingRecommendation")
    model: Model<WeldThicknessFittingRecommendation>,
  ) {
    super(model);
  }

  private get pipeModel(): Model<WeldThicknessPipeRecommendation> {
    return this.model.db.model<WeldThicknessPipeRecommendation>("WeldThicknessPipeRecommendation");
  }

  private get pipes() {
    return this.pipeModel as unknown as Model<Record<string, unknown>>;
  }

  private toPipe(doc: Record<string, unknown> | null): WeldThicknessPipeRecommendation | null {
    if (!doc) {
      return null;
    }
    const { _id, ...rest } = doc;
    return { id: _id, ...rest } as unknown as WeldThicknessPipeRecommendation;
  }

  private toPipeList(docs: Record<string, unknown>[]): WeldThicknessPipeRecommendation[] {
    return docs.map((d) => this.toPipe(d) as WeldThicknessPipeRecommendation);
  }

  async findFitting(
    nominalBoreMm: number,
    fittingClass: string,
    temperatureCelsius: number,
  ): Promise<WeldThicknessFittingRecommendation | null> {
    const doc = await this.documents
      .findOne({
        nominal_bore_mm: nominalBoreMm,
        fitting_class: fittingClass,
        temperature_celsius: temperatureCelsius,
      })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findFittingsByDnAndTemp(
    nominalBoreMm: number,
    temperatureCelsius: number,
  ): Promise<WeldThicknessFittingRecommendation[]> {
    const docs = await this.documents
      .find({ nominal_bore_mm: nominalBoreMm, temperature_celsius: temperatureCelsius })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findAllFittings(): Promise<WeldThicknessFittingRecommendation[]> {
    const docs = await this.documents.find().lean().exec();
    return this.toDomainList(docs);
  }

  async findAvailableFittingDns(): Promise<number[]> {
    const results = (await this.documents.distinct("nominal_bore_mm").exec()) as number[];
    return results.slice().sort((a, b) => a - b);
  }

  async findFittingTemperatureBreakpoints(): Promise<number[]> {
    const results = (await this.documents.distinct("temperature_celsius").exec()) as number[];
    return results.slice().sort((a, b) => a - b);
  }

  async findPipe(
    nominalBoreMm: number,
    schedule: string,
    steelType: string,
    temperatureCelsius: number,
  ): Promise<WeldThicknessPipeRecommendation | null> {
    const doc = await this.pipes
      .findOne({
        nominal_bore_mm: nominalBoreMm,
        schedule,
        steel_type: steelType,
        temperature_celsius: temperatureCelsius,
      })
      .lean()
      .exec();
    return this.toPipe(doc);
  }

  async findAllPipesBySteelType(steelType: string): Promise<WeldThicknessPipeRecommendation[]> {
    const docs = await this.pipes.find({ steel_type: steelType }).lean().exec();
    return this.toPipeList(docs);
  }

  async findPipeTemperatureBreakpoints(): Promise<number[]> {
    const results = (await this.pipes.distinct("temperature_celsius").exec()) as number[];
    return results.slice().sort((a, b) => a - b);
  }
}
