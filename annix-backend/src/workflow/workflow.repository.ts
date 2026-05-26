import { CrudRepository } from "../lib/persistence/crud-repository";
import { PaginatedResponse } from "../shared/dto";
import { WorkflowQueryDto } from "./dto/workflow-query.dto";
import { ReviewEntityType, ReviewWorkflow } from "./entities/review-workflow.entity";

export abstract class ReviewWorkflowRepository extends CrudRepository<ReviewWorkflow> {
  abstract findWithRelations(id: number): Promise<ReviewWorkflow | null>;
  abstract findActiveByEntity(
    entityType: ReviewEntityType,
    entityId: number,
  ): Promise<ReviewWorkflow | null>;
  abstract findPendingForReviewer(reviewerUserId: number): Promise<ReviewWorkflow[]>;
  abstract findAllPaginated(query: WorkflowQueryDto): Promise<PaginatedResponse<ReviewWorkflow>>;
  abstract deactivateAllForEntity(entityType: ReviewEntityType, entityId: number): Promise<void>;
}
