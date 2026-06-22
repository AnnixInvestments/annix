import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { QaReviewDecision } from "../entities/qa-review-decision.entity";

export abstract class QaReviewDecisionRepository extends TenantScopedRepository<QaReviewDecision> {
  abstract withTransaction(context: TransactionContext): QaReviewDecisionRepository;
  abstract saveForCompany(companyId: number, entity: QaReviewDecision): Promise<QaReviewDecision>;
  abstract removeForCompany(companyId: number, entity: QaReviewDecision): Promise<void>;
  abstract findLatestForJobCard(
    companyId: number,
    jobCardId: number,
  ): Promise<QaReviewDecision | null>;
}
