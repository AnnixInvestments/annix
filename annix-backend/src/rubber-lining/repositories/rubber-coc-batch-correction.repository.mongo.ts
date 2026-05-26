import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { RubberCocBatchCorrection } from "../entities/rubber-coc-batch-correction.entity";
import {
  type BatchCorrectionHintFilters,
  RubberCocBatchCorrectionRepository,
} from "./rubber-coc-batch-correction.repository";

type Doc = Record<string, unknown>;

@Injectable()
export class MongoRubberCocBatchCorrectionRepository
  extends MongoCrudRepository<RubberCocBatchCorrection>
  implements RubberCocBatchCorrectionRepository
{
  constructor(
    @InjectModel("RubberCocBatchCorrection")
    model: Model<RubberCocBatchCorrection>,
  ) {
    super(model);
  }

  build(data: Partial<RubberCocBatchCorrection>): RubberCocBatchCorrection {
    return data as RubberCocBatchCorrection;
  }

  saveMany(entities: RubberCocBatchCorrection[]): Promise<RubberCocBatchCorrection[]> {
    return Promise.all(entities.map((entity) => this.create(entity)));
  }

  async findRecentForHints(
    filters: BatchCorrectionHintFilters,
  ): Promise<RubberCocBatchCorrection[]> {
    const filter: Doc = {};
    if (filters.supplierName) {
      filter.supplierName = filters.supplierName;
    }
    if (filters.compoundCode) {
      filter.compoundCode = filters.compoundCode;
    }
    const docs = await this.documents.find(filter).sort({ createdAt: -1 }).limit(30).lean().exec();
    return this.toDomainList(docs);
  }
}
