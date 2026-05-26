import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { DnExtractionCorrection } from "../entities/dn-extraction-correction.entity";
import { DnExtractionCorrectionRepository } from "./dn-extraction-correction.repository";

@Injectable()
export class MongoDnExtractionCorrectionRepository
  extends MongoCrudRepository<DnExtractionCorrection>
  implements DnExtractionCorrectionRepository
{
  constructor(
    @InjectModel("DnExtractionCorrection")
    model: Model<DnExtractionCorrection>,
  ) {
    super(model);
  }

  createMany(rows: Array<DeepPartial<DnExtractionCorrection>>): Promise<DnExtractionCorrection[]> {
    return Promise.all(rows.map((row) => this.create(row)));
  }

  async findRecentForCompany(companyId: number, limit: number): Promise<DnExtractionCorrection[]> {
    const docs = await this.documents
      .find({ companyId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}
