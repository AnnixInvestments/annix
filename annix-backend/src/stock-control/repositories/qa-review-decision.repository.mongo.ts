import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { QaReviewDecision } from "../entities/qa-review-decision.entity";
import { QaReviewDecisionRepository } from "./qa-review-decision.repository";

@Injectable()
export class MongoQaReviewDecisionRepository
  extends MongoTenantScopedRepository<QaReviewDecision>
  implements QaReviewDecisionRepository
{
  constructor(
    @InjectModel("QaReviewDecision") model: Model<QaReviewDecision>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoQaReviewDecisionRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoQaReviewDecisionRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoQaReviewDecisionRepository {
    return new MongoQaReviewDecisionRepository(this.model, session);
  }

  async saveForCompany(companyId: number, entity: QaReviewDecision): Promise<QaReviewDecision> {
    if (entity.companyId !== companyId) {
      throw new Error("QA review decision does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: QaReviewDecision): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("QA review decision does not belong to the requesting company");
    }
    await this.remove(entity);
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
