import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import {
  AnsiFittingDimensionRepository,
  AnsiFittingTypeRepository,
} from "./ansi-fitting.repository";
import { AnsiB169FittingDimension } from "./entities/ansi-b16-9-fitting-dimension.entity";
import { AnsiB169FittingType } from "./entities/ansi-b16-9-fitting-type.entity";

type MongoDoc = Record<string, unknown>;

@Injectable()
export class MongoAnsiFittingDimensionRepository
  extends MongoCrudRepository<AnsiB169FittingDimension>
  implements AnsiFittingDimensionRepository
{
  constructor(@InjectModel("AnsiB169FittingDimension") model: Model<AnsiB169FittingDimension>) {
    super(model);
  }

  private get fittingTypeModel(): Model<MongoDoc> {
    return this.model.db.model<MongoDoc>("AnsiB169FittingType");
  }

  private async fittingTypeIdByCode(code: string): Promise<unknown | null> {
    const doc = await this.fittingTypeModel.findOne({ code }).lean().exec();
    return doc ? doc._id : null;
  }

  async sizesByFittingType(fittingTypeCode: string, schedule?: string): Promise<number[]> {
    const fittingTypeId = await this.fittingTypeIdByCode(fittingTypeCode);
    if (fittingTypeId === null) {
      return [];
    }
    const filter: Record<string, unknown> = { fittingTypeId };
    if (schedule) {
      filter.schedule = schedule;
    }
    const result = await this.documents.distinct("nbMm", filter).exec();
    return (result as number[]).sort((a, b) => a - b);
  }

  async schedulesByFittingType(fittingTypeCode: string): Promise<string[]> {
    const fittingTypeId = await this.fittingTypeIdByCode(fittingTypeCode);
    if (fittingTypeId === null) {
      return [];
    }
    const result = await this.documents.distinct("schedule", { fittingTypeId }).exec();
    return (result as string[]).sort();
  }

  async dimensionByTypeNbSchedule(
    fittingTypeCode: string,
    nbMm: number,
    schedule: string,
    branchNbMm?: number,
  ): Promise<AnsiB169FittingDimension | null> {
    const fittingTypeId = await this.fittingTypeIdByCode(fittingTypeCode);
    if (fittingTypeId === null) {
      return null;
    }

    if (branchNbMm !== null && branchNbMm !== undefined) {
      const docs = await this.documents
        .find({
          fittingTypeId,
          nbMm,
          schedule,
          branchOdMm: { $ne: null },
        })
        .lean()
        .exec();
      const branchNps = String(branchNbMm);
      const match = docs.find(
        (d) =>
          d.branchNps !== null && d.branchNps !== undefined && String(d.branchNps) === branchNps,
      );
      if (match) {
        return this.toDomain(match);
      }
      return null;
    }

    return this.toDomain(
      await this.documents
        .findOne({ fittingTypeId, nbMm, schedule, branchNps: null })
        .lean()
        .exec(),
    );
  }

  async allDimensionsByTypeAndSchedule(
    fittingTypeCode: string,
    schedule: string,
  ): Promise<AnsiB169FittingDimension[]> {
    const fittingTypeId = await this.fittingTypeIdByCode(fittingTypeCode);
    if (fittingTypeId === null) {
      return [];
    }
    return this.toDomainList(
      await this.documents.find({ fittingTypeId, schedule }).sort({ nbMm: 1 }).lean().exec(),
    );
  }
}

@Injectable()
export class MongoAnsiFittingTypeRepository
  extends MongoCrudRepository<AnsiB169FittingType>
  implements AnsiFittingTypeRepository
{
  constructor(@InjectModel("AnsiB169FittingType") model: Model<AnsiB169FittingType>) {
    super(model);
  }

  async findAllOrderedByName(): Promise<AnsiB169FittingType[]> {
    return this.toDomainList(await this.documents.find().sort({ name: 1 }).lean().exec());
  }
}
