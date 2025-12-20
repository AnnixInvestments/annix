import {
  Injectable,
  NotFoundException,
  BadRequestException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ReviewWorkflow,
  ReviewStatus,
  ReviewEntityType,
  WorkflowType,
} from './entities/review-workflow.entity';
import { WorkflowQueryDto } from './dto/workflow-query.dto';
import { AssignReviewerDto } from './dto/assign-reviewer.dto';
import { User } from '../user/entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { DrawingsService } from '../drawings/drawings.service';
import { DrawingStatus } from '../drawings/entities/drawing.entity';
import { BoqService } from '../boq/boq.service';
import { BoqStatus } from '../boq/entities/boq.entity';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// State machine transition map
const VALID_TRANSITIONS: Record<ReviewStatus, ReviewStatus[]> = {
  [ReviewStatus.DRAFT]: [ReviewStatus.SUBMITTED],
  [ReviewStatus.SUBMITTED]: [ReviewStatus.UNDER_REVIEW],
  [ReviewStatus.UNDER_REVIEW]: [
    ReviewStatus.APPROVED,
    ReviewStatus.REJECTED,
    ReviewStatus.CHANGES_REQUESTED,
  ],
  [ReviewStatus.CHANGES_REQUESTED]: [ReviewStatus.SUBMITTED],
  [ReviewStatus.APPROVED]: [], // Terminal state
  [ReviewStatus.REJECTED]: [ReviewStatus.DRAFT], // Can restart
};

@Injectable()
export class WorkflowService {
  constructor(
    @InjectRepository(ReviewWorkflow)
    private workflowRepository: Repository<ReviewWorkflow>,
    private auditService: AuditService,
    @Inject(forwardRef(() => DrawingsService))
    private drawingsService: DrawingsService,
    @Inject(forwardRef(() => BoqService))
    private boqService: BoqService,
  ) {}

  private canTransition(from: ReviewStatus, to: ReviewStatus): boolean {
    return VALID_TRANSITIONS[from]?.includes(to) || false;
  }

  private getWorkflowType(entityType: ReviewEntityType): WorkflowType {
    switch (entityType) {
      case ReviewEntityType.DRAWING:
        return WorkflowType.DRAWING_REVIEW;
      case ReviewEntityType.BOQ:
        return WorkflowType.BOQ_REVIEW;
      case ReviewEntityType.RFQ:
        return WorkflowType.RFQ_REVIEW;
    }
  }

  async submitForReview(
    entityType: ReviewEntityType,
    entityId: number,
    user: User,
  ): Promise<ReviewWorkflow> {
    // Deactivate any existing active workflow
    await this.workflowRepository.update(
      { entityType, entityId, isActive: true },
      { isActive: false },
    );

    // Create new workflow
    const workflow = this.workflowRepository.create({
      workflowType: this.getWorkflowType(entityType),
      entityType,
      entityId,
      currentStatus: ReviewStatus.SUBMITTED,
      previousStatus: ReviewStatus.DRAFT,
      submittedBy: user,
      submittedAt: new Date(),
      isActive: true,
    });

    const saved = await this.workflowRepository.save(workflow);

    // Update entity status
    await this.updateEntityStatus(entityType, entityId, ReviewStatus.SUBMITTED);

    await this.auditService.log({
      entityType: entityType.toLowerCase(),
      entityId,
      action: AuditAction.SUBMIT,
      newValues: { workflowId: saved.id, status: ReviewStatus.SUBMITTED },
      performedBy: user,
    });

    return saved;
  }

  async startReview(workflowId: number, user: User): Promise<ReviewWorkflow> {
    const workflow = await this.findOne(workflowId);

    if (workflow.currentStatus !== ReviewStatus.SUBMITTED) {
      throw new BadRequestException('Can only start review on submitted items');
    }

    workflow.previousStatus = workflow.currentStatus;
    workflow.currentStatus = ReviewStatus.UNDER_REVIEW;
    workflow.assignedReviewer = user;

    const saved = await this.workflowRepository.save(workflow);

    await this.updateEntityStatus(
      workflow.entityType,
      workflow.entityId,
      ReviewStatus.UNDER_REVIEW,
    );

    await this.auditService.log({
      entityType: workflow.entityType.toLowerCase(),
      entityId: workflow.entityId,
      action: AuditAction.ASSIGN_REVIEWER,
      newValues: { reviewerId: user.id, status: ReviewStatus.UNDER_REVIEW },
      performedBy: user,
    });

    return saved;
  }

  async approve(
    workflowId: number,
    notes: string,
    user: User,
  ): Promise<ReviewWorkflow> {
    return this.processDecision(
      workflowId,
      ReviewStatus.APPROVED,
      notes,
      user,
      AuditAction.APPROVE,
    );
  }

  async reject(
    workflowId: number,
    reason: string,
    user: User,
  ): Promise<ReviewWorkflow> {
    return this.processDecision(
      workflowId,
      ReviewStatus.REJECTED,
      reason,
      user,
      AuditAction.REJECT,
    );
  }

  async requestChanges(
    workflowId: number,
    changesRequired: string,
    user: User,
  ): Promise<ReviewWorkflow> {
    return this.processDecision(
      workflowId,
      ReviewStatus.CHANGES_REQUESTED,
      changesRequired,
      user,
      AuditAction.REQUEST_CHANGES,
    );
  }

  private async processDecision(
    workflowId: number,
    newStatus: ReviewStatus,
    notes: string,
    user: User,
    action: AuditAction,
  ): Promise<ReviewWorkflow> {
    const workflow = await this.findOne(workflowId);

    if (workflow.currentStatus !== ReviewStatus.UNDER_REVIEW) {
      throw new BadRequestException('Can only make decisions on items under review');
    }

    if (!this.canTransition(workflow.currentStatus, newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${workflow.currentStatus} to ${newStatus}`,
      );
    }

    workflow.previousStatus = workflow.currentStatus;
    workflow.currentStatus = newStatus;
    workflow.decidedBy = user;
    workflow.decisionNotes = notes;
    workflow.decidedAt = new Date();

    const saved = await this.workflowRepository.save(workflow);

    await this.updateEntityStatus(workflow.entityType, workflow.entityId, newStatus);

    await this.auditService.log({
      entityType: workflow.entityType.toLowerCase(),
      entityId: workflow.entityId,
      action,
      newValues: { status: newStatus, notes, decidedBy: user.id },
      performedBy: user,
    });

    return saved;
  }

  async assignReviewer(
    workflowId: number,
    dto: AssignReviewerDto,
    user: User,
  ): Promise<ReviewWorkflow> {
    const workflow = await this.findOne(workflowId);

    if (
      workflow.currentStatus !== ReviewStatus.SUBMITTED &&
      workflow.currentStatus !== ReviewStatus.UNDER_REVIEW
    ) {
      throw new BadRequestException('Can only assign reviewer to submitted or under review items');
    }

    workflow.assignedReviewer = { id: dto.reviewerUserId } as User;
    if (dto.dueDate) {
      workflow.dueDate = new Date(dto.dueDate);
    }

    if (workflow.currentStatus === ReviewStatus.SUBMITTED) {
      workflow.previousStatus = workflow.currentStatus;
      workflow.currentStatus = ReviewStatus.UNDER_REVIEW;
      await this.updateEntityStatus(
        workflow.entityType,
        workflow.entityId,
        ReviewStatus.UNDER_REVIEW,
      );
    }

    const saved = await this.workflowRepository.save(workflow);

    await this.auditService.log({
      entityType: workflow.entityType.toLowerCase(),
      entityId: workflow.entityId,
      action: AuditAction.ASSIGN_REVIEWER,
      newValues: { reviewerUserId: dto.reviewerUserId, dueDate: dto.dueDate },
      performedBy: user,
    });

    return saved;
  }

  async findOne(id: number): Promise<ReviewWorkflow> {
    const workflow = await this.workflowRepository.findOne({
      where: { id },
      relations: ['submittedBy', 'assignedReviewer', 'decidedBy'],
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }

    return workflow;
  }

  async findActiveByEntity(
    entityType: ReviewEntityType,
    entityId: number,
  ): Promise<ReviewWorkflow | null> {
    return this.workflowRepository.findOne({
      where: { entityType, entityId, isActive: true },
      relations: ['submittedBy', 'assignedReviewer', 'decidedBy'],
    });
  }

  async getPendingReviews(
    reviewerUserId: number,
  ): Promise<ReviewWorkflow[]> {
    return this.workflowRepository.find({
      where: [
        { assignedReviewer: { id: reviewerUserId }, currentStatus: ReviewStatus.UNDER_REVIEW, isActive: true },
        { currentStatus: ReviewStatus.SUBMITTED, isActive: true },
      ],
      relations: ['submittedBy', 'assignedReviewer'],
      order: { submittedAt: 'ASC' },
    });
  }

  async findAll(query: WorkflowQueryDto): Promise<PaginatedResult<ReviewWorkflow>> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    let queryBuilder = this.workflowRepository
      .createQueryBuilder('workflow')
      .leftJoinAndSelect('workflow.submittedBy', 'submittedBy')
      .leftJoinAndSelect('workflow.assignedReviewer', 'assignedReviewer')
      .leftJoinAndSelect('workflow.decidedBy', 'decidedBy');

    if (query.workflowType) {
      queryBuilder = queryBuilder.andWhere('workflow.workflow_type = :workflowType', {
        workflowType: query.workflowType,
      });
    }

    if (query.entityType) {
      queryBuilder = queryBuilder.andWhere('workflow.entity_type = :entityType', {
        entityType: query.entityType,
      });
    }

    if (query.status) {
      queryBuilder = queryBuilder.andWhere('workflow.current_status = :status', {
        status: query.status,
      });
    }

    if (query.assignedReviewerId) {
      queryBuilder = queryBuilder.andWhere(
        'workflow.assigned_reviewer_user_id = :reviewerId',
        { reviewerId: query.assignedReviewerId },
      );
    }

    if (query.submittedByUserId) {
      queryBuilder = queryBuilder.andWhere(
        'workflow.submitted_by_user_id = :submittedBy',
        { submittedBy: query.submittedByUserId },
      );
    }

    if (query.isActive !== undefined) {
      queryBuilder = queryBuilder.andWhere('workflow.is_active = :isActive', {
        isActive: query.isActive,
      });
    }

    const [data, total] = await queryBuilder
      .orderBy('workflow.updated_at', 'DESC')
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

  async getAuditTrail(entityType: string, entityId: number) {
    return this.auditService.findByEntity(entityType, entityId);
  }

  private async updateEntityStatus(
    entityType: ReviewEntityType,
    entityId: number,
    status: ReviewStatus,
  ): Promise<void> {
    const statusMap: Record<ReviewStatus, DrawingStatus | BoqStatus> = {
      [ReviewStatus.DRAFT]: DrawingStatus.DRAFT,
      [ReviewStatus.SUBMITTED]: DrawingStatus.SUBMITTED,
      [ReviewStatus.UNDER_REVIEW]: DrawingStatus.UNDER_REVIEW,
      [ReviewStatus.CHANGES_REQUESTED]: DrawingStatus.CHANGES_REQUESTED,
      [ReviewStatus.APPROVED]: DrawingStatus.APPROVED,
      [ReviewStatus.REJECTED]: DrawingStatus.REJECTED,
    };

    if (entityType === ReviewEntityType.DRAWING) {
      await this.drawingsService.updateStatus(entityId, statusMap[status] as DrawingStatus);
    } else if (entityType === ReviewEntityType.BOQ) {
      await this.boqService.updateStatus(entityId, statusMap[status] as BoqStatus);
    }
  }
}
