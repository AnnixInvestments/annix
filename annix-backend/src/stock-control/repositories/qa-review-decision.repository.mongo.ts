import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { QaReviewDecision } from "../entities/qa-review-decision.entity";
import { QaReviewDecisionRepository } from "./qa-review-decision.repository";

@Injectable()
export class MongoQaReviewDecisionRepository
  extends MongoCrudRepository<QaReviewDecision>
  implements QaReviewDecisionRepository
{
  constructor(@InjectModel("QaReviewDecision") model: Model<QaReviewDecision>) {
    super(model);
  }

  async findLatestForJobCard(
    companyId: number,
    jobCardId: number,
  ): Promise<QaReviewDecision | null> {
    const doc = await this.documents
      .findOne({ companyId, jobCardId })
      .sort({ cycleNumber: -1 })
      .lean()
      .exec();
    return this.toDomain(doc);
  }
}
