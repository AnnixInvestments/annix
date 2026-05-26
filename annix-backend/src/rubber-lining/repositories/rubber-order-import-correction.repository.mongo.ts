import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { RubberOrderImportCorrection } from "../entities/rubber-order-import-correction.entity";
import { RubberOrderImportCorrectionRepository } from "./rubber-order-import-correction.repository";

@Injectable()
export class MongoRubberOrderImportCorrectionRepository
  extends MongoCrudRepository<RubberOrderImportCorrection>
  implements RubberOrderImportCorrectionRepository
{
  constructor(
    @InjectModel("RubberOrderImportCorrection")
    model: Model<RubberOrderImportCorrection>,
  ) {
    super(model);
  }

  saveMany(rows: Partial<RubberOrderImportCorrection>[]): Promise<RubberOrderImportCorrection[]> {
    return Promise.all(rows.map((row) => this.create(row as RubberOrderImportCorrection)));
  }

  async findOneByFieldAndOriginalValueLatest(
    fieldName: string,
    originalValue: string,
  ): Promise<RubberOrderImportCorrection | null> {
    const doc = await this.documents
      .findOne({ fieldName, originalValue })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findByCompanyNameLatest(
    companyName: string,
    take: number,
  ): Promise<RubberOrderImportCorrection[]> {
    const docs = await this.documents
      .find({ companyName })
      .sort({ createdAt: -1 })
      .limit(take)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}
