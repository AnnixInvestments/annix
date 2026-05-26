import { CrudRepository } from "../../lib/persistence/crud-repository";
import { QaReviewDecision } from "../entities/qa-review-decision.entity";

export abstract class QaReviewDecisionRepository extends CrudRepository<QaReviewDecision> {
  abstract findLatestForJobCard(
    companyId: number,
    jobCardId: number,
  ): Promise<QaReviewDecision | null>;
}
