import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { Bolt } from "src/bolt/entities/bolt.entity";
import { BoltMass } from "src/bolt-mass/entities/bolt-mass.entity";
import { FlangePressureClass } from "src/flange-pressure-class/entities/flange-pressure-class.entity";
import { FlangeStandard } from "src/flange-standard/entities/flange-standard.entity";
import { NominalOutsideDiameterMm } from "src/nominal-outside-diameter-mm/entities/nominal-outside-diameter-mm.entity";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { FlangeDimension } from "./entities/flange-dimension.entity";
import { FlangeDimensionRepository } from "./flange-dimension.repository";

type MongoDoc = Record<string, unknown>;

@Injectable()
export class MongoFlangeDimensionRepository
  extends MongoCrudRepository<FlangeDimension>
  implements FlangeDimensionRepository
{
  constructor(@InjectModel("FlangeDimension") model: Model<FlangeDimension>) {
    super(model);
  }

  private get nominalModel(): Model<MongoDoc> {
    return this.model.db.model<MongoDoc>("NominalOutsideDiameterMm");
  }

  private get standardModel(): Model<MongoDoc> {
    return this.model.db.model<MongoDoc>("FlangeStandard");
  }

  private get pressureClassModel(): Model<MongoDoc> {
    return this.model.db.model<MongoDoc>("FlangePressureClass");
  }

  private get boltModel(): Model<MongoDoc> {
    return this.model.db.model<MongoDoc>("Bolt");
  }

  private get boltMassModel(): Model<MongoDoc> {
    return this.model.db.model<MongoDoc>("BoltMass");
  }

  async findAllWithRelations(): Promise<FlangeDimension[]> {
    return this.toDomainList(await this.documents.find().lean().exec());
  }

  async findByIdWithRelations(id: number): Promise<FlangeDimension | null> {
    return this.toDomain(await this.documents.findById(id).lean().exec());
  }

  async findBySpecs(
    nominalBoreMm: number,
    standardId: number,
    pressureClassId: number,
    flangeTypeId?: number,
  ): Promise<FlangeDimension | null> {
    const nominals = await this.nominalModel
      .find({ nominal_diameter_mm: nominalBoreMm })
      .lean()
      .exec();
    const nominalIds = nominals.map((n) => n._id);
    if (nominalIds.length === 0) {
      return null;
    }

    const filter: Record<string, unknown> = {
      nominalOutsideDiameterId: { $in: nominalIds },
      standardId,
      pressureClassId,
    };

    if (flangeTypeId) {
      filter.flangeTypeId = flangeTypeId;
    }

    let doc = await this.documents.findOne(filter).lean().exec();

    if (!doc && flangeTypeId) {
      const { flangeTypeId: _removed, ...filterWithoutType } = filter;
      doc = await this.documents.findOne(filterWithoutType).lean().exec();
    }

    return this.toDomain(doc);
  }

  async findByCodeAndDesignation(
    nbMm: number,
    code: string,
    designation: string,
  ): Promise<FlangeDimension | null> {
    const nominals = await this.nominalModel.find({ nominal_diameter_mm: nbMm }).lean().exec();
    const nominalIds = nominals.map((n) => n._id);
    if (nominalIds.length === 0) {
      return null;
    }

    const standard = await this.standardModel.findOne({ code }).lean().exec();
    if (!standard) {
      return null;
    }

    const pressureClass = await this.pressureClassModel.findOne({ designation }).lean().exec();
    if (!pressureClass) {
      return null;
    }

    return this.toDomain(
      await this.documents
        .findOne({
          nominalOutsideDiameterId: { $in: nominalIds },
          standardId: standard._id,
          pressureClassId: pressureClass._id,
        })
        .lean()
        .exec(),
    );
  }

  async findClosestBoltMass(boltId: number, lengthMm: number): Promise<BoltMass | null> {
    const docs = await this.boltMassModel.find({ boltId }).lean().exec();
    if (docs.length === 0) {
      return null;
    }
    const closest = docs.reduce((best, d) => {
      const bestDist = Math.abs(Number(best.length_mm) - lengthMm);
      const dDist = Math.abs(Number(d.length_mm) - lengthMm);
      return dDist < bestDist ? d : best;
    });
    const { _id, ...rest } = closest;
    return { id: _id, ...rest } as unknown as BoltMass;
  }

  async findNominalById(id: number): Promise<NominalOutsideDiameterMm | null> {
    const doc = await this.nominalModel.findById(id).lean().exec();
    if (!doc) {
      return null;
    }
    const { _id, ...rest } = doc;
    return { id: _id, ...rest } as unknown as NominalOutsideDiameterMm;
  }

  async findStandardById(id: number): Promise<FlangeStandard | null> {
    const doc = await this.standardModel.findById(id).lean().exec();
    if (!doc) {
      return null;
    }
    const { _id, ...rest } = doc;
    return { id: _id, ...rest } as unknown as FlangeStandard;
  }

  async findPressureClassById(id: number): Promise<FlangePressureClass | null> {
    const doc = await this.pressureClassModel.findById(id).lean().exec();
    if (!doc) {
      return null;
    }
    const { _id, ...rest } = doc;
    return { id: _id, ...rest } as unknown as FlangePressureClass;
  }

  async findBoltById(id: number): Promise<Bolt | null> {
    const doc = await this.boltModel.findById(id).lean().exec();
    if (!doc) {
      return null;
    }
    const { _id, ...rest } = doc;
    return { id: _id, ...rest } as unknown as Bolt;
  }

  async findBoltMassByBoltAndLength(boltId: number, lengthMm: number): Promise<BoltMass | null> {
    const doc = await this.boltMassModel.findOne({ boltId, length_mm: lengthMm }).lean().exec();
    if (!doc) {
      return null;
    }
    const { _id, ...rest } = doc;
    return { id: _id, ...rest } as unknown as BoltMass;
  }

  async existsByAllFields(params: {
    nominalOutsideDiameterId: number;
    standardId: number;
    pressureClassId: number;
    D: number;
    b: number;
    d4: number;
    f: number;
    num_holes: number;
    d1: number;
    pcd: number;
    mass_kg: number;
    bolt?: Bolt | null;
  }): Promise<boolean> {
    const filter: Record<string, unknown> = {
      nominalOutsideDiameterId: params.nominalOutsideDiameterId,
      standardId: params.standardId,
      pressureClassId: params.pressureClassId,
      D: params.D,
      b: params.b,
      d4: params.d4,
      f: params.f,
      num_holes: params.num_holes,
      d1: params.d1,
      pcd: params.pcd,
      mass_kg: params.mass_kg,
    };
    if (params.bolt) {
      filter.boltId = params.bolt.id;
    }
    const doc = await this.documents.findOne(filter).lean().exec();
    return doc !== null;
  }

  async findByNominalDiameterStandardAndPressureClassWithBolt(
    nominalDiameterMm: number,
    standardId: number,
    pressureClassId: number,
  ): Promise<FlangeDimension | null> {
    const nominalDoc = await this.nominalModel
      .findOne({ nominal_diameter_mm: nominalDiameterMm })
      .lean()
      .exec();
    if (!nominalDoc) return null;
    const doc = await this.documents
      .findOne({
        nominalOutsideDiameterId: nominalDoc._id,
        standardId,
        pressureClassId,
      })
      .lean()
      .exec();
    return this.toDomain(doc);
  }
}
