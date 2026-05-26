import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { PaginatedResponse } from "../shared/dto";
import { WorkflowQueryDto } from "./dto/workflow-query.dto";
import { ReviewEntityType, ReviewStatus, ReviewWorkflow } from "./entities/review-workflow.entity";
import { ReviewWorkflowRepository } from "./workflow.repository";

@Injectable()
export class MongoReviewWorkflowRepository
  extends MongoCrudRepository<ReviewWorkflow>
  implements ReviewWorkflowRepository
{
  constructor(@InjectModel("ReviewWorkflow") model: Model<ReviewWorkflow>) {
    super(model);
  }

  async findWithRelations(id: number): Promise<ReviewWorkflow | null> {
    const document = await this.documents.findById(id).lean().exec();
    return this.toDomain(document);
  }

  async findActiveByEntity(
    entityType: ReviewEntityType,
    entityId: number,
  ): Promise<ReviewWorkflow | null> {
    const document = await this.documents
      .findOne({ entityType, entityId, isActive: true })
      .lean()
      .exec();
    return this.toDomain(document);
  }

  async findPendingForReviewer(reviewerUserId: number): Promise<ReviewWorkflow[]> {
    const documents = await this.documents
      .find({
        $or: [
          {
            assignedReviewerId: reviewerUserId,
            currentStatus: ReviewStatus.UNDER_REVIEW,
            isActive: true,
          },
          { currentStatus: ReviewStatus.SUBMITTED, isActive: true },
        ],
      })
      .sort({ submittedAt: 1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async findAllPaginated(query: WorkflowQueryDto): Promise<PaginatedResponse<ReviewWorkflow>> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (query.workflowType) {
      filter.workflowType = query.workflowType;
    }
    if (query.entityType) {
      filter.entityType = query.entityType;
    }
    if (query.status) {
      filter.currentStatus = query.status;
    }
    if (query.assignedReviewerId) {
      filter.assignedReviewerId = query.assignedReviewerId;
    }
    if (query.submittedByUserId) {
      filter.submittedById = query.submittedByUserId;
    }
    if (query.isActive !== undefined) {
      filter.isActive = query.isActive;
    }

    const [documents, total] = await Promise.all([
      this.documents.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean().exec(),
      this.documents.countDocuments(filter).exec(),
    ]);

    return {
      data: this.toDomainList(documents),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async deactivateAllForEntity(entityType: ReviewEntityType, entityId: number): Promise<void> {
    await this.documents
      .updateMany({ entityType, entityId, isActive: true }, { $set: { isActive: false } })
      .exec();
  }
}
