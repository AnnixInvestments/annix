import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import { now } from "../../lib/datetime";
import {
  ApprovalStatus,
  JobCardApproval,
  WorkflowStep,
} from "../entities/job-card-approval.entity";
import {
  JobCardDocument,
  JobCardDocumentType,
} from "../entities/job-card-document.entity";
import { JobCard, JobCardWorkflowStatus } from "../entities/job-card.entity";
import { StockControlRole, StockControlUser } from "../entities/stock-control-user.entity";
import { RequisitionService } from "./requisition.service";
import { SignatureService } from "./signature.service";
import { WorkflowNotificationService } from "./workflow-notification.service";

interface ApprovalInput {
  signatureDataUrl?: string;
  comments?: string;
}

interface UserContext {
  id: number;
  companyId: number;
  name: string;
  role: StockControlRole;
}

@Injectable()
export class JobCardWorkflowService {
  private readonly logger = new Logger(JobCardWorkflowService.name);

  constructor(
    @InjectRepository(JobCard)
    private readonly jobCardRepo: Repository<JobCard>,
    @InjectRepository(JobCardApproval)
    private readonly approvalRepo: Repository<JobCardApproval>,
    @InjectRepository(JobCardDocument)
    private readonly documentRepo: Repository<JobCardDocument>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    private readonly signatureService: SignatureService,
    private readonly notificationService: WorkflowNotificationService,
    @Inject(forwardRef(() => RequisitionService))
    private readonly requisitionService: RequisitionService,
  ) {}

  async uploadDocument(
    companyId: number,
    jobCardId: number,
    user: UserContext,
    file: Express.Multer.File,
    documentType: JobCardDocumentType,
  ): Promise<JobCardDocument> {
    const jobCard = await this.jobCardForWorkflow(companyId, jobCardId);

    if (
      jobCard.workflowStatus !== JobCardWorkflowStatus.DRAFT &&
      jobCard.workflowStatus !== JobCardWorkflowStatus.DOCUMENT_UPLOADED
    ) {
      throw new BadRequestException(
        "Documents can only be uploaded in draft or document_uploaded status",
      );
    }

    const result = await this.storageService.upload(
      file,
      `stock-control/job-cards/${companyId}/${jobCardId}`,
    );

    const document = this.documentRepo.create({
      jobCardId,
      companyId,
      documentType,
      fileUrl: result.url,
      originalFilename: result.originalFilename,
      mimeType: result.mimeType,
      fileSizeBytes: result.size,
      uploadedById: user.id,
      uploadedByName: user.name,
    });

    const saved = await this.documentRepo.save(document);

    if (jobCard.workflowStatus === JobCardWorkflowStatus.DRAFT) {
      jobCard.workflowStatus = JobCardWorkflowStatus.DOCUMENT_UPLOADED;
      await this.jobCardRepo.save(jobCard);

      await this.createApprovalRecord(companyId, jobCardId, WorkflowStep.DOCUMENT_UPLOAD, user);
      await this.notificationService.notifyApprovalRequired(
        companyId,
        jobCardId,
        WorkflowStep.ADMIN_APPROVAL,
      );
    }

    this.logger.log(`Document uploaded for job card ${jobCardId} by ${user.name}`);
    return saved;
  }

  async approveStep(
    companyId: number,
    jobCardId: number,
    user: UserContext,
    input: ApprovalInput,
  ): Promise<JobCard> {
    const jobCard = await this.jobCardForWorkflow(companyId, jobCardId);
    const currentStep = this.currentStepForStatus(jobCard.workflowStatus);

    if (!currentStep) {
      throw new BadRequestException("Job card is not in an approvable state");
    }

    this.validateUserCanApprove(user.role, currentStep);

    let signatureUrl: string | null = null;
    if (input.signatureDataUrl) {
      const sig = await this.signatureService.uploadSignature(
        companyId,
        user.id,
        input.signatureDataUrl,
      );
      signatureUrl = sig.signatureUrl;
    } else {
      signatureUrl = await this.signatureService.signatureUrl(user.id);
    }

    await this.createApprovalRecord(
      companyId,
      jobCardId,
      currentStep,
      user,
      ApprovalStatus.APPROVED,
      signatureUrl,
      input.comments,
    );

    const nextStatus = this.nextStatus(jobCard.workflowStatus);
    jobCard.workflowStatus = nextStatus;
    await this.jobCardRepo.save(jobCard);

    await this.notificationService.notifyApprovalCompleted(
      companyId,
      jobCardId,
      currentStep,
      user.name,
    );

    if (nextStatus === JobCardWorkflowStatus.REQUISITION_SENT) {
      await this.requisitionService.createFromJobCard(companyId, jobCardId, user.name);
    }

    const nextStep = this.currentStepForStatus(nextStatus);
    if (nextStep) {
      await this.notificationService.notifyApprovalRequired(companyId, jobCardId, nextStep);
    }

    if (nextStatus === JobCardWorkflowStatus.READY_FOR_DISPATCH) {
      await this.notificationService.notifyDispatchReady(companyId, jobCardId);
    }

    this.logger.log(
      `Job card ${jobCardId} approved at step ${currentStep} by ${user.name}, moved to ${nextStatus}`,
    );

    return this.jobCardForWorkflow(companyId, jobCardId);
  }

  async rejectStep(
    companyId: number,
    jobCardId: number,
    user: UserContext,
    reason: string,
  ): Promise<JobCard> {
    const jobCard = await this.jobCardForWorkflow(companyId, jobCardId);
    const currentStep = this.currentStepForStatus(jobCard.workflowStatus);

    if (!currentStep) {
      throw new BadRequestException("Job card is not in a rejectable state");
    }

    if (![StockControlRole.ADMIN, StockControlRole.MANAGER].includes(user.role)) {
      throw new ForbiddenException("Only admin or manager can reject");
    }

    await this.approvalRepo.update(
      { jobCardId, step: currentStep, status: ApprovalStatus.PENDING },
      {
        status: ApprovalStatus.REJECTED,
        rejectedReason: reason,
        approvedById: user.id,
        approvedByName: user.name,
        approvedAt: now().toJSDate(),
      },
    );

    jobCard.workflowStatus = JobCardWorkflowStatus.DOCUMENT_UPLOADED;
    await this.jobCardRepo.save(jobCard);

    await this.notificationService.notifyRejection(companyId, jobCardId, user.name, reason);

    this.logger.log(`Job card ${jobCardId} rejected at step ${currentStep} by ${user.name}`);

    return this.jobCardForWorkflow(companyId, jobCardId);
  }

  async workflowStatus(companyId: number, jobCardId: number): Promise<{
    currentStatus: JobCardWorkflowStatus;
    currentStep: WorkflowStep | null;
    canApprove: boolean;
    requiredRole: StockControlRole | null;
  }> {
    const jobCard = await this.jobCardForWorkflow(companyId, jobCardId);
    const currentStep = this.currentStepForStatus(jobCard.workflowStatus);
    const requiredRole = currentStep ? this.roleForStep(currentStep) : null;

    return {
      currentStatus: jobCard.workflowStatus,
      currentStep,
      canApprove: currentStep !== null,
      requiredRole,
    };
  }

  async approvalHistory(companyId: number, jobCardId: number): Promise<JobCardApproval[]> {
    return this.approvalRepo.find({
      where: { jobCardId, companyId },
      relations: ["approvedBy"],
      order: { createdAt: "ASC" },
    });
  }

  async pendingApprovalsForUser(user: UserContext): Promise<JobCard[]> {
    const statuses = this.statusesForRole(user.role);

    if (statuses.length === 0) {
      return [];
    }

    return this.jobCardRepo
      .createQueryBuilder("jc")
      .where("jc.companyId = :companyId", { companyId: user.companyId })
      .andWhere("jc.workflowStatus IN (:...statuses)", { statuses })
      .orderBy("jc.createdAt", "ASC")
      .getMany();
  }

  async canUserApprove(user: UserContext, jobCardId: number): Promise<boolean> {
    const jobCard = await this.jobCardRepo.findOne({
      where: { id: jobCardId, companyId: user.companyId },
    });

    if (!jobCard) {
      return false;
    }

    const currentStep = this.currentStepForStatus(jobCard.workflowStatus);
    if (!currentStep) {
      return false;
    }

    const requiredRole = this.roleForStep(currentStep);
    return user.role === requiredRole || user.role === StockControlRole.ADMIN;
  }

  async documents(companyId: number, jobCardId: number): Promise<JobCardDocument[]> {
    return this.documentRepo.find({
      where: { jobCardId, companyId },
      order: { createdAt: "DESC" },
    });
  }

  private async jobCardForWorkflow(companyId: number, jobCardId: number): Promise<JobCard> {
    const jobCard = await this.jobCardRepo.findOne({
      where: { id: jobCardId, companyId },
    });

    if (!jobCard) {
      throw new NotFoundException(`Job card ${jobCardId} not found`);
    }

    return jobCard;
  }

  private async createApprovalRecord(
    companyId: number,
    jobCardId: number,
    step: WorkflowStep,
    user: UserContext,
    status: ApprovalStatus = ApprovalStatus.APPROVED,
    signatureUrl?: string | null,
    comments?: string,
  ): Promise<JobCardApproval> {
    const approval = this.approvalRepo.create({
      jobCardId,
      companyId,
      step,
      status,
      approvedById: user.id,
      approvedByName: user.name,
      signatureUrl: signatureUrl ?? null,
      comments: comments ?? null,
      approvedAt: status === ApprovalStatus.APPROVED ? now().toJSDate() : null,
    });

    return this.approvalRepo.save(approval);
  }

  private validateUserCanApprove(role: StockControlRole, step: WorkflowStep): void {
    const requiredRole = this.roleForStep(step);

    if (role === StockControlRole.ADMIN) {
      return;
    }

    if (role !== requiredRole) {
      throw new ForbiddenException(
        `Role ${role} cannot approve step ${step}. Required: ${requiredRole}`,
      );
    }
  }

  private roleForStep(step: WorkflowStep): StockControlRole {
    const roleMap: Record<WorkflowStep, StockControlRole> = {
      [WorkflowStep.DOCUMENT_UPLOAD]: StockControlRole.ACCOUNTS,
      [WorkflowStep.ADMIN_APPROVAL]: StockControlRole.ADMIN,
      [WorkflowStep.MANAGER_APPROVAL]: StockControlRole.MANAGER,
      [WorkflowStep.REQUISITION_SENT]: StockControlRole.MANAGER,
      [WorkflowStep.STOCK_ALLOCATION]: StockControlRole.STOREMAN,
      [WorkflowStep.MANAGER_FINAL]: StockControlRole.MANAGER,
      [WorkflowStep.READY_FOR_DISPATCH]: StockControlRole.STOREMAN,
      [WorkflowStep.DISPATCHED]: StockControlRole.STOREMAN,
    };

    return roleMap[step];
  }

  private currentStepForStatus(status: JobCardWorkflowStatus): WorkflowStep | null {
    const stepMap: Record<JobCardWorkflowStatus, WorkflowStep | null> = {
      [JobCardWorkflowStatus.DRAFT]: null,
      [JobCardWorkflowStatus.DOCUMENT_UPLOADED]: WorkflowStep.ADMIN_APPROVAL,
      [JobCardWorkflowStatus.ADMIN_APPROVED]: WorkflowStep.MANAGER_APPROVAL,
      [JobCardWorkflowStatus.MANAGER_APPROVED]: WorkflowStep.REQUISITION_SENT,
      [JobCardWorkflowStatus.REQUISITION_SENT]: WorkflowStep.STOCK_ALLOCATION,
      [JobCardWorkflowStatus.STOCK_ALLOCATED]: WorkflowStep.MANAGER_FINAL,
      [JobCardWorkflowStatus.MANAGER_FINAL]: WorkflowStep.READY_FOR_DISPATCH,
      [JobCardWorkflowStatus.READY_FOR_DISPATCH]: WorkflowStep.DISPATCHED,
      [JobCardWorkflowStatus.DISPATCHED]: null,
    };

    return stepMap[status];
  }

  private nextStatus(current: JobCardWorkflowStatus): JobCardWorkflowStatus {
    const transitionMap: Record<JobCardWorkflowStatus, JobCardWorkflowStatus> = {
      [JobCardWorkflowStatus.DRAFT]: JobCardWorkflowStatus.DOCUMENT_UPLOADED,
      [JobCardWorkflowStatus.DOCUMENT_UPLOADED]: JobCardWorkflowStatus.ADMIN_APPROVED,
      [JobCardWorkflowStatus.ADMIN_APPROVED]: JobCardWorkflowStatus.MANAGER_APPROVED,
      [JobCardWorkflowStatus.MANAGER_APPROVED]: JobCardWorkflowStatus.REQUISITION_SENT,
      [JobCardWorkflowStatus.REQUISITION_SENT]: JobCardWorkflowStatus.STOCK_ALLOCATED,
      [JobCardWorkflowStatus.STOCK_ALLOCATED]: JobCardWorkflowStatus.MANAGER_FINAL,
      [JobCardWorkflowStatus.MANAGER_FINAL]: JobCardWorkflowStatus.READY_FOR_DISPATCH,
      [JobCardWorkflowStatus.READY_FOR_DISPATCH]: JobCardWorkflowStatus.DISPATCHED,
      [JobCardWorkflowStatus.DISPATCHED]: JobCardWorkflowStatus.DISPATCHED,
    };

    return transitionMap[current];
  }

  private statusesForRole(role: StockControlRole): JobCardWorkflowStatus[] {
    const roleStatuses: Record<StockControlRole, JobCardWorkflowStatus[]> = {
      [StockControlRole.ACCOUNTS]: [],
      [StockControlRole.ADMIN]: [JobCardWorkflowStatus.DOCUMENT_UPLOADED],
      [StockControlRole.MANAGER]: [
        JobCardWorkflowStatus.ADMIN_APPROVED,
        JobCardWorkflowStatus.MANAGER_APPROVED,
        JobCardWorkflowStatus.STOCK_ALLOCATED,
      ],
      [StockControlRole.STOREMAN]: [
        JobCardWorkflowStatus.REQUISITION_SENT,
        JobCardWorkflowStatus.READY_FOR_DISPATCH,
      ],
    };

    if (role === StockControlRole.ADMIN) {
      return [
        JobCardWorkflowStatus.DOCUMENT_UPLOADED,
        JobCardWorkflowStatus.ADMIN_APPROVED,
        JobCardWorkflowStatus.MANAGER_APPROVED,
        JobCardWorkflowStatus.STOCK_ALLOCATED,
      ];
    }

    return roleStatuses[role] || [];
  }
}
