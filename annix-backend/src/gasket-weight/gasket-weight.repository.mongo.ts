import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { FlangeDimension } from "../flange-dimension/entities/flange-dimension.entity";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { GasketWeight } from "./entities/gasket-weight.entity";
import { GasketWeightRepository } from "./gasket-weight.repository";

@Injectable()
export class MongoGasketWeightRepository
  extends MongoCrudRepository<GasketWeight>
  implements GasketWeightRepository
{
  constructor(@InjectModel("GasketWeight") model: Model<GasketWeight>) {
    super(model);
  }

  private get flangeDimensionModel(): Model<Record<string, unknown>> {
    return this.model.db.model<Record<string, unknown>>("FlangeDimension");
  }

  private get nominalOdModel(): Model<Record<string, unknown>> {
    return this.model.db.model<Record<string, unknown>>("NominalOutsideDiameterMm");
  }

  private get pressureClassModel(): Model<Record<string, unknown>> {
    return this.model.db.model<Record<string, unknown>>("FlangePressureClass");
  }

  private get flangeStandardModel(): Model<Record<string, unknown>> {
    return this.model.db.model<Record<string, unknown>>("FlangeStandard");
  }

  async findAllGaskets(): Promise<GasketWeight[]> {
    const docs = await this.documents.find().lean().exec();
    return this.toDomainList(docs);
  }

  async findGasketByTypeAndBore(
    gasketType: string,
    nominalBoreMm: number,
  ): Promise<GasketWeight | null> {
    const doc = await this.documents
      .findOne({ gasket_type: gasketType.toUpperCase(), nominal_bore_mm: nominalBoreMm })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findFlangeDimension(
    nominalBoreMm: number,
    pressureClass: string,
    flangeStandardCode?: string,
  ): Promise<FlangeDimension | null> {
    return this.queryFlangeDimension(nominalBoreMm, pressureClass, flangeStandardCode);
  }

  async findFlangeDimensionWithBolt(
    nominalBoreMm: number,
    pressureClass: string,
    flangeStandardCode?: string,
  ): Promise<FlangeDimension | null> {
    return this.queryFlangeDimension(nominalBoreMm, pressureClass, flangeStandardCode);
  }

  async distinctGasketTypes(): Promise<{ type: string }[]> {
    const values = await this.documents.distinct("gasket_type").exec();
    const sorted = (values as string[]).sort();
    return sorted.map((type) => ({ type }));
  }

  private async queryFlangeDimension(
    nominalBoreMm: number,
    pressureClass: string,
    flangeStandardCode?: string,
  ): Promise<FlangeDimension | null> {
    const nominalDocs = await this.nominalOdModel
      .find({ nominal_bore_mm: nominalBoreMm })
      .lean()
      .exec();
    const nominalIds = nominalDocs.map((n) => n["_id"]);

    const pcDocs = await this.pressureClassModel.find({ designation: pressureClass }).lean().exec();
    const pcIds = pcDocs.map((p) => p["_id"]);

    const filter: Record<string, unknown> = {
      nominalOutsideDiameterId: { $in: nominalIds },
      pressureClassId: { $in: pcIds },
    };

    if (flangeStandardCode) {
      const stdDocs = await this.flangeStandardModel
        .find({ code: flangeStandardCode })
        .lean()
        .exec();
      const stdIds = stdDocs.map((s) => s["_id"]);
      filter["standardId"] = { $in: stdIds };
    }

    const doc = await this.flangeDimensionModel.findOne(filter).lean().exec();
    if (!doc) {
      return null;
    }
    const { _id, ...rest } = doc;
    return { id: _id, ...rest } as unknown as FlangeDimension;
  }
}
