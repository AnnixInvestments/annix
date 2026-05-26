import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { FlangeDimension } from "../flange-dimension/entities/flange-dimension.entity";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { PipeDimension } from "../pipe-dimension/entities/pipe-dimension.entity";
import { BendCenterToFaceRepository } from "./bend-center-to-face.repository";
import { BendCenterToFace } from "./entities/bend-center-to-face.entity";

type MongoDoc = Record<string, unknown>;

@Injectable()
export class MongoBendCenterToFaceRepository
  extends MongoCrudRepository<BendCenterToFace>
  implements BendCenterToFaceRepository
{
  constructor(@InjectModel("BendCenterToFace") model: Model<BendCenterToFace>) {
    super(model);
  }

  private get pipeDimensionModel(): Model<MongoDoc> {
    return this.model.db.model<MongoDoc>("PipeDimension");
  }

  private get flangeDimensionModel(): Model<MongoDoc> {
    return this.model.db.model<MongoDoc>("FlangeDimension");
  }

  private get nominalModel(): Model<MongoDoc> {
    return this.model.db.model<MongoDoc>("NominalOutsideDiameterMm");
  }

  async findAllOrdered(): Promise<BendCenterToFace[]> {
    return this.toDomainList(
      await this.documents.find().sort({ bendType: 1, nominalBoreMm: 1, degrees: 1 }).lean().exec(),
    );
  }

  async findByBendType(bendType: string): Promise<BendCenterToFace[]> {
    return this.toDomainList(
      await this.documents.find({ bendType }).sort({ nominalBoreMm: 1, degrees: 1 }).lean().exec(),
    );
  }

  async findByNominalBore(nominalBoreMm: number): Promise<BendCenterToFace[]> {
    return this.toDomainList(
      await this.documents.find({ nominalBoreMm }).sort({ bendType: 1, degrees: 1 }).lean().exec(),
    );
  }

  async findByCriteria(
    bendType: string,
    nominalBoreMm: number,
    degrees: number,
  ): Promise<BendCenterToFace | null> {
    return this.toDomain(
      await this.documents.findOne({ bendType, nominalBoreMm, degrees }).lean().exec(),
    );
  }

  async findByBendTypeAndNominalBoreOrdered(
    bendType: string,
    nominalBoreMm: number,
  ): Promise<BendCenterToFace[]> {
    return this.toDomainList(
      await this.documents.find({ bendType, nominalBoreMm }).sort({ degrees: 1 }).lean().exec(),
    );
  }

  async distinctBendTypes(): Promise<string[]> {
    const result = await this.documents.distinct("bendType", {}).exec();
    return (result as string[]).sort();
  }

  async distinctNominalBoresForBendType(bendType: string): Promise<number[]> {
    const result = await this.documents.distinct("nominalBoreMm", { bendType }).exec();
    return (result as number[]).sort((a, b) => a - b);
  }

  async distinctDegreesForBendType(bendType: string, nominalBoreMm?: number): Promise<number[]> {
    const filter: Record<string, unknown> = { bendType };
    if (typeof nominalBoreMm === "number") {
      filter.nominalBoreMm = nominalBoreMm;
    }
    const result = await this.documents.distinct("degrees", filter).exec();
    return (result as number[]).sort((a, b) => a - b);
  }

  async findPipeDimension(
    nominalBoreMm: number,
    wallThicknessMm: number,
  ): Promise<PipeDimension | null> {
    const nominals = await this.nominalModel
      .find({ nominal_diameter_mm: nominalBoreMm })
      .lean()
      .exec();
    const nominalIds = nominals.map((n) => n._id);
    if (nominalIds.length === 0) {
      return null;
    }
    const doc = await this.pipeDimensionModel
      .findOne({
        nominalOutsideDiameterId: { $in: nominalIds },
        wall_thickness_mm: wallThicknessMm,
      })
      .lean()
      .exec();
    if (!doc) {
      return null;
    }
    const { _id, ...rest } = doc;
    return { id: _id, ...rest } as unknown as PipeDimension;
  }

  async findFlangeDimension(
    nominalBoreMm: number,
    flangeStandardId: number,
    flangePressureClassId: number,
  ): Promise<FlangeDimension | null> {
    const nominals = await this.nominalModel
      .find({ nominal_diameter_mm: nominalBoreMm })
      .lean()
      .exec();
    const nominalIds = nominals.map((n) => n._id);
    if (nominalIds.length === 0) {
      return null;
    }
    const doc = await this.flangeDimensionModel
      .findOne({
        nominalOutsideDiameterId: { $in: nominalIds },
        standardId: flangeStandardId,
        pressureClassId: flangePressureClassId,
      })
      .lean()
      .exec();
    if (!doc) {
      return null;
    }
    const { _id, ...rest } = doc;
    return { id: _id, ...rest } as unknown as FlangeDimension;
  }
}
