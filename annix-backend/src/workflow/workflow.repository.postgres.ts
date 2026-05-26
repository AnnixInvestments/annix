import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { PaginatedResponse } from "../shared/dto";
import { WorkflowQueryDto } from "./dto/workflow-query.dto";
import { ReviewEntityType, ReviewStatus, ReviewWorkflow } from "./entities/review-workflow.entity";
import { ReviewWorkflowRepository } from "./workflow.repository";

@Injectable()
export class PostgresReviewWorkflowRepository
  extends TypeOrmCrudRepository<ReviewWorkflow>
  implements ReviewWorkflowRepository
{
  constructor(@InjectRepository(ReviewWorkflow) repository: Repository<ReviewWorkflow>) {
    super(repository);
  }

  findWithRelations(id: number): Promise<ReviewWorkflow | null> {
    return this.repository.findOne({
      where: { id },
      relations: ["submittedBy", "assignedReviewer", "decidedBy"],
    });
  }

  findActiveByEntity(
    entityType: ReviewEntityType,
    entityId: number,
  ): Promise<ReviewWorkflow | null> {
    return this.repository.findOne({
      where: { entityType, entityId, isActive: true },
      relations: ["submittedBy", "assignedReviewer", "decidedBy"],
    });
  }

  findPendingForReviewer(reviewerUserId: number): Promise<ReviewWorkflow[]> {
    return this.repository.find({
      where: [
        {
          assignedReviewer: { id: reviewerUserId },
          currentStatus: ReviewStatus.UNDER_REVIEW,
          isActive: true,
        },
        { currentStatus: ReviewStatus.SUBMITTED, isActive: true },
      ],
      relations: ["submittedBy", "assignedReviewer"],
      order: { submittedAt: "ASC" },
    });
  }

  async findAllPaginated(query: WorkflowQueryDto): Promise<PaginatedResponse<ReviewWorkflow>> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    let queryBuilder = this.repository
      .createQueryBuilder("workflow")
      .leftJoinAndSelect("workflow.submittedBy", "submittedBy")
      .leftJoinAndSelect("workflow.assignedReviewer", "assignedReviewer")
      .leftJoinAndSelect("workflow.decidedBy", "decidedBy");

    if (query.workflowType) {
      queryBuilder = queryBuilder.andWhere("workflow.workflow_type = :workflowType", {
        workflowType: query.workflowType,
      });
    }

    if (query.entityType) {
      queryBuilder = queryBuilder.andWhere("workflow.entity_type = :entityType", {
        entityType: query.entityType,
      });
    }

    if (query.status) {
      queryBuilder = queryBuilder.andWhere("workflow.current_status = :status", {
        status: query.status,
      });
    }

    if (query.assignedReviewerId) {
      queryBuilder = queryBuilder.andWhere("workflow.assigned_reviewer_user_id = :reviewerId", {
        reviewerId: query.assignedReviewerId,
      });
    }

    if (query.submittedByUserId) {
      queryBuilder = queryBuilder.andWhere("workflow.submitted_by_user_id = :submittedBy", {
        submittedBy: query.submittedByUserId,
      });
    }

    if (query.isActive !== undefined) {
      queryBuilder = queryBuilder.andWhere("workflow.is_active = :isActive", {
        isActive: query.isActive,
      });
    }

    const [data, total] = await queryBuilder
      .orderBy("workflow.updated_at", "DESC")
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async deactivateAllForEntity(entityType: ReviewEntityType, entityId: number): Promise<void> {
    await this.repository.update({ entityType, entityId, isActive: true }, { isActive: false });
  }
}
