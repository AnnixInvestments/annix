import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { FlangeTypeWeight } from "./entities/flange-type-weight.entity";
import { FlangeTypeWeightRepository } from "./flange-type-weight.repository";

type MongoDoc = Record<string, unknown>;

@Injectable()
export class MongoFlangeTypeWeightRepository
  extends MongoCrudRepository<FlangeTypeWeight>
  implements FlangeTypeWeightRepository
{
  constructor(@InjectModel("FlangeTypeWeight") model: Model<FlangeTypeWeight>) {
    super(model);
  }

  private get flangeStandardModel(): Model<MongoDoc> {
    return this.model.db.model<MongoDoc>("FlangeStandard");
  }

  async findAllWithStandard(): Promise<FlangeTypeWeight[]> {
    return this.toDomainList(await this.documents.find().lean().exec());
  }

  async findFlangeTypeWeight(
    nominalBoreMm: number,
    pressureClass: string,
    flangeTypeCode: string,
    flangeStandardCode: string | null,
  ): Promise<FlangeTypeWeight | null> {
    const filter: Record<string, unknown> = {
      nominal_bore_mm: nominalBoreMm,
      pressure_class: pressureClass,
      flange_type_code: flangeTypeCode,
    };

    if (flangeStandardCode) {
      const standard = await this.flangeStandardModel
        .findOne({ code: flangeStandardCode })
        .lean()
        .exec();
      if (!standard) {
        return null;
      }
      filter.flange_standard_id = standard._id;
    } else {
      filter.flange_standard_id = null;
    }

    return this.toDomain(await this.documents.findOne(filter).lean().exec());
  }

  async findBlankFlangeWeight(
    nominalBoreMm: number,
    pressureClass: string,
  ): Promise<FlangeTypeWeight | null> {
    return this.toDomain(
      await this.documents
        .findOne({
          nominal_bore_mm: nominalBoreMm,
          pressure_class: pressureClass,
          flange_type_code: "BLANK",
          flange_standard_id: null,
        })
        .lean()
        .exec(),
    );
  }

  async distinctPressureClasses(): Promise<{ pressureClass: string }[]> {
    const result = await this.documents.distinct("pressure_class", {}).exec();
    const sorted = (result as string[]).sort();
    return sorted.map((pressureClass) => ({ pressureClass }));
  }

  async distinctFlangeTypeCodes(): Promise<{ flangeTypeCode: string }[]> {
    const result = await this.documents.distinct("flange_type_code", {}).exec();
    const sorted = (result as string[]).sort();
    return sorted.map((flangeTypeCode) => ({ flangeTypeCode }));
  }
}
