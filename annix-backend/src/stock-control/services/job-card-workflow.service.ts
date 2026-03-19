import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuditService } from "../../audit/audit.service";
import { AuditAction } from "../../audit/entities/audit-log.entity";
import { now } from "../../lib/datetime";
import { IStorageService, STORAGE_SERVICE, StorageArea } from "../../storage/storage.interface";
import {
  JobCard,
  JobCardStatus,
  WORKFLOW_STATUS_DRAFT,
  WORKFLOW_STATUS_FILE_CLOSED,
} from "../entities/job-card.entity";
import { JobCardActionCompletion } from "../entities/job-card-action-completion.entity";
import { ApprovalStatus, JobCardApproval } from "../entities/job-card-approval.entity";
import { JobCardDocument, JobCardDocumentType } from "../entities/job-card-document.entity";
import { StockControlRole } from "../entities/stock-control-user.entity";
import { WorkflowStepConfig } from "../entities/workflow-step-config.entity";
import { BackgroundStepService } from "./background-step.service";
import { RequisitionService } from "./requisition.service";
import { SignatureService } from "./signature.service";
import { WorkflowAssignmentService } from "./workflow-assignment.service";
import { WorkflowNotificationService } from "./workflow-notification.service";
import { WorkflowStepConfigService } from "./workflow-step-config.service";

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
    @InjectRepository(JobCardActionCompletion)
    private readonly actionCompletionRepo: Repository<JobCardActionCompletion>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    private readonly signatureService: SignatureService,
    private readonly notificationService: WorkflowNotificationService,
    @Inject(forwardRef(() => RequisitionService))
    private readonly requisitionService: RequisitionService,
    private readonly stepConfigService: WorkflowStepConfigService,
    private readonly assignmentService: WorkflowAssignmentService,
    @Inject(forwardRef(() => BackgroundStepService))
    private readonly backgroundStepService: BackgroundStepService,
    private readonly auditService: AuditService,
  ) {}

  async uploadDocument(
    companyId: number,
    jobCardId: number,
    user: UserContext,
    file: Express.Multer.File,
    documentType: JobCardDocumentType,
  ): Promise<JobCardDocument> {
    const jobCard = await this.jobCardForWorkflow(companyId, jobCardId);

    const fgSteps = await this.stepConfigService.orderedSteps(companyId);
    const firstFgKey = fgSteps.length > 0 ? fgSteps[0].key : "admin_approval";

    if (jobCard.workflowStatus !== WORKFLOW_STATUS_DRAFT && jobCard.workflowStatus !== firstFgKey) {
      throw new BadRequestException(
        "Documents can only be uploaded in draft or initial workflow status",
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

    if (jobCard.workflowStatus === WORKFLOW_STATUS_DRAFT) {
      jobCard.workflowStatus = firstFgKey;
      await this.jobCardRepo.save(jobCard);

      await this.createApprovalRecord(companyId, jobCardId, "document_upload", user);
      await this.notificationService.notifyApprovalRequired(companyId, jobCardId, firstFgKey, {
        id: user.id,
        name: user.name,
      });
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
    const fgSteps = await this.stepConfigService.orderedSteps(companyId);
    const currentStep = this.currentFgStep(jobCard.workflowStatus, fgSteps);

    if (!currentStep) {
      throw new BadRequestException("Job card is not in an approvable state");
    }

    if (jobCard.status !== JobCardStatus.ACTIVE) {
      throw new BadRequestException(
        "Job card must be activated before workflow steps can be approved",
      );
    }

    await this.validateUserIsAssigned(user, currentStep.key);

    const actionCompletion = await this.actionCompletionRepo.findOne({
      where: { jobCardId, stepKey: currentStep.key, actionType: "primary" },
    });

    if (!actionCompletion) {
      const autoAction = this.actionCompletionRepo.create({
        jobCardId,
        companyId,
        stepKey: currentStep.key,
        actionType: "primary",
        completedById: user.id,
        completedByName: user.name,
        completedAt: now().toJSDate(),
        metadata: { autoCreatedByApproval: true },
      });
      await this.actionCompletionRepo.save(autoAction);
    }

    await this.notificationService.markJobCardNotificationsAsRead(user.id, jobCardId);

    let signatureUrl: string | null = null;
    if (input.signatureDataUrl) {
      const sig = await this.signatureService.uploadSignature(
        companyId,
        user.id,
        input.signatureDataUrl,
      );
      signatureUrl = sig.signatureUrl;
    } else {
      const existing = await this.signatureService.findByUser(user.id);
      signatureUrl = existing?.signatureUrl ?? null;
    }

    await this.createApprovalRecord(
      companyId,
      jobCardId,
      currentStep.key,
      user,
      ApprovalStatus.APPROVED,
      signatureUrl,
      input.comments,
    );

    const nextStatus = this.nextFgStatus(currentStep.key, fgSteps);

    const updateResult = await this.jobCardRepo.update(
      { id: jobCardId, companyId, workflowStatus: jobCard.workflowStatus },
      { workflowStatus: nextStatus },
    );

    if (updateResult.affected === 0) {
      throw new ConflictException(
        "Job card workflow status has changed. Please refresh and try again.",
      );
    }

    jobCard.workflowStatus = nextStatus;

    const senderInfo = { id: user.id, name: user.name };

    await this.notificationService.notifyApprovalCompleted(
      companyId,
      jobCardId,
      currentStep.key,
      senderInfo,
    );

    const nextStep = this.currentFgStep(nextStatus, fgSteps);
    if (nextStep) {
      await this.notificationService.notifyApprovalRequired(
        companyId,
        jobCardId,
        nextStep.key,
        senderInfo,
      );
    }

    await this.triggerBackgroundSteps(companyId, jobCardId, currentStep.key, senderInfo);

    this.auditService
      .log({
        entityType: "job_card_workflow",
        entityId: jobCardId,
        action: AuditAction.APPROVE,
        oldValues: { workflowStatus: jobCard.workflowStatus, step: currentStep.key },
        newValues: { workflowStatus: nextStatus, approvedBy: user.name },
      })
      .catch((err) => this.logger.error(`Audit log failed: ${err.message}`, err.stack));

    this.logger.log(
      `Job card ${jobCardId} approved at step ${currentStep.key} by ${user.name}, moved to ${nextStatus}`,
    );

    return this.jobCardForWorkflow(companyId, jobCardId);
  }

  async completeAction(
    companyId: number,
    jobCardId: number,
    user: UserContext,
    stepKey: string,
    actionType: string = "primary",
    metadata?: Record<string, unknown>,
  ): Promise<JobCardActionCompletion> {
    const jobCard = await this.jobCardForWorkflow(companyId, jobCardId);

    if (jobCard.status !== JobCardStatus.ACTIVE) {
      throw new BadRequestException("Job card must be active");
    }

    const fgSteps = await this.stepConfigService.orderedSteps(companyId);
    const bgSteps = await this.stepConfigService.backgroundSteps(companyId);
    const allSteps = [...fgSteps, ...bgSteps];
    const stepConfig = allSteps.find((s) => s.key === stepKey);

    if (!stepConfig) {
      throw new NotFoundException(`Step "${stepKey}" not found for this company`);
    }

    await this.validateUserIsAssigned(user, stepKey);

    const existing = await this.actionCompletionRepo.findOne({
      where: { jobCardId, stepKey, actionType },
    });

    if (existing) {
      throw new BadRequestException(`Action already completed for step "${stepKey}"`);
    }

    if (stepKey === "job_file_review" && actionType === "secondary") {
      const completion = this.actionCompletionRepo.create({
        jobCardId,
        companyId,
        stepKey,
        actionType: "secondary",
        completedById: user.id,
        completedByName: user.name,
        completedAt: now().toJSDate(),
        metadata: { choice: "job_file_still_open", ...metadata },
      });

      const saved = await this.actionCompletionRepo.save(completion);
      this.logger.log(
        `Job file review marked as "still open" for job card ${jobCardId} by ${user.name}`,
      );
      return saved;
    }

    if (stepKey === "file_sign_off") {
      const archiveMetadata = await this.archiveJobCardDocuments(companyId, jobCardId);
      metadata = { ...metadata, ...archiveMetadata };
    }

    const completion = this.actionCompletionRepo.create({
      jobCardId,
      companyId,
      stepKey,
      actionType,
      completedById: user.id,
      completedByName: user.name,
      completedAt: now().toJSDate(),
      metadata: metadata ?? null,
    });

    const saved = await this.actionCompletionRepo.save(completion);

    this.logger.log(
      `Action "${actionType}" completed for step "${stepKey}" on job card ${jobCardId} by ${user.name}`,
    );

    return saved;
  }

  async actionCompletions(
    companyId: number,
    jobCardId: number,
  ): Promise<JobCardActionCompletion[]> {
    return this.actionCompletionRepo.find({
      where: { jobCardId, companyId },
      order: { completedAt: "ASC" },
    });
  }

  async archiveUrls(
    companyId: number,
    jobCardId: number,
  ): Promise<Array<{ filename: string; url: string }>> {
    const completion = await this.actionCompletionRepo.findOne({
      where: { jobCardId, companyId, stepKey: "file_sign_off", actionType: "primary" },
    });

    if (!completion?.metadata) {
      return [];
    }

    const archivedPaths = (completion.metadata as Record<string, unknown>).archivedPaths;
    if (!Array.isArray(archivedPaths)) {
      return [];
    }

    const urls = await Promise.all(
      (archivedPaths as Array<{ path: string; filename: string }>).map(async (entry) => {
        const url = await this.storageService.presignedUrl(entry.path, 3600).catch(() => null);
        return { filename: entry.filename, url: url || "" };
      }),
    );

    return urls.filter((u) => u.url !== "");
  }

  private async triggerBackgroundSteps(
    companyId: number,
    jobCardId: number,
    completedStepKey: string,
    sender: { id: number; name: string },
  ): Promise<void> {
    const bgSteps = await this.stepConfigService.backgroundStepsForTrigger(
      companyId,
      completedStepKey,
    );

    if (bgSteps.length > 0) {
      const firstStep = bgSteps[0];
      await this.notificationService.notifyBackgroundStepRequired(
        companyId,
        jobCardId,
        firstStep.key,
        firstStep.label,
        sender,
      );
    }
  }

  async advancePastBackgroundSteps(
    companyId: number,
    jobCardId: number,
    sender: { id: number; name: string },
  ): Promise<void> {
    this.logger.log(
      `Background steps complete for job card ${jobCardId}, no FG auto-advance needed in dynamic workflow`,
    );
  }

  async rejectStep(
    companyId: number,
    jobCardId: number,
    user: UserContext,
    reason: string,
  ): Promise<JobCard> {
    const jobCard = await this.jobCardForWorkflow(companyId, jobCardId);
    const fgSteps = await this.stepConfigService.orderedSteps(companyId);
    const currentStep = this.currentFgStep(jobCard.workflowStatus, fgSteps);

    if (!currentStep) {
      throw new BadRequestException("Job card is not in a rejectable state");
    }

    if (![StockControlRole.ADMIN, StockControlRole.MANAGER].includes(user.role)) {
      throw new ForbiddenException("Only admin or manager can reject");
    }

    await this.notificationService.markJobCardNotificationsAsRead(user.id, jobCardId);

    await this.approvalRepo.update(
      { jobCardId, step: currentStep.key, status: ApprovalStatus.PENDING },
      {
        status: ApprovalStatus.REJECTED,
        rejectedReason: reason,
        approvedById: user.id,
        approvedByName: user.name,
        approvedAt: now().toJSDate(),
      },
    );

    const firstFgKey = fgSteps.length > 0 ? fgSteps[0].key : WORKFLOW_STATUS_DRAFT;

    const updateResult = await this.jobCardRepo.update(
      { id: jobCardId, companyId, workflowStatus: jobCard.workflowStatus },
      { workflowStatus: firstFgKey },
    );

    if (updateResult.affected === 0) {
      throw new ConflictException(
        "Job card workflow status has changed. Please refresh and try again.",
      );
    }

    jobCard.workflowStatus = firstFgKey;

    await this.notificationService.notifyRejection(
      companyId,
      jobCardId,
      { id: user.id, name: user.name },
      reason,
    );

    this.auditService
      .log({
        entityType: "job_card_workflow",
        entityId: jobCardId,
        action: AuditAction.REJECT,
        oldValues: { workflowStatus: jobCard.workflowStatus, step: currentStep.key },
        newValues: {
          workflowStatus: firstFgKey,
          rejectedBy: user.name,
          reason,
        },
      })
      .catch((err) => this.logger.error(`Audit log failed: ${err.message}`, err.stack));

    this.logger.log(`Job card ${jobCardId} rejected at step ${currentStep.key} by ${user.name}`);

    return this.jobCardForWorkflow(companyId, jobCardId);
  }

  async workflowStatus(
    companyId: number,
    jobCardId: number,
    requestingUserId?: number,
  ): Promise<{
    currentStatus: string;
    currentStep: string | null;
    canApprove: boolean;
    requiredRole: string | null;
    jobCardStatus: JobCardStatus;
    stepAssignments: Record<string, { name: string; isPrimary: boolean }[]>;
    foregroundSteps: Array<{
      key: string;
      label: string;
      sortOrder: number;
      actionLabel: string | null;
    }>;
    backgroundSteps: Array<{
      stepKey: string;
      label: string;
      triggerAfterStep: string | null;
      completedAt: string | null;
      completedByName: string | null;
      notes: string | null;
      actionLabel: string | null;
    }>;
    actionCompletions: Array<{
      stepKey: string;
      actionType: string;
      completedByName: string;
      completedAt: string;
      metadata: Record<string, unknown> | null;
    }>;
  }> {
    const jobCard = await this.jobCardForWorkflow(companyId, jobCardId);

    const [allAssignments, fgConfigs, bgStatuses, actions] = await Promise.all([
      this.assignmentService.allAssignments(companyId),
      this.stepConfigService.orderedSteps(companyId),
      this.backgroundStepService.statusForJobCard(companyId, jobCardId),
      this.actionCompletionRepo.find({
        where: { jobCardId, companyId },
        order: { completedAt: "ASC" },
      }),
    ]);

    const currentStep = this.currentFgStep(jobCard.workflowStatus, fgConfigs);

    const stepAssignments = allAssignments.reduce(
      (acc, sa) => ({
        ...acc,
        [sa.step]: sa.users.map((u) => ({
          name: u.name,
          isPrimary: sa.primaryUserId === u.id,
        })),
      }),
      {} as Record<string, { name: string; isPrimary: boolean }[]>,
    );

    const foregroundSteps = fgConfigs.map((s) => ({
      key: s.key,
      label: s.label,
      sortOrder: s.sortOrder,
      actionLabel: s.actionLabel,
    }));

    const bgStepConfigs = await this.stepConfigService.backgroundSteps(companyId);
    const bgConfigByKey = bgStepConfigs.reduce<Record<string, WorkflowStepConfig>>(
      (acc, s) => ({ ...acc, [s.key]: s }),
      {},
    );

    const backgroundSteps = bgStatuses.map((bs) => ({
      ...bs,
      actionLabel: bgConfigByKey[bs.stepKey]?.actionLabel ?? null,
    }));

    const actionCompletions = actions.map((a) => ({
      stepKey: a.stepKey,
      actionType: a.actionType,
      completedByName: a.completedByName,
      completedAt: a.completedAt.toISOString(),
      metadata: a.metadata,
    }));

    const isAssignedToCurrentStep =
      currentStep !== null && requestingUserId
        ? (() => {
            const assigned = allAssignments.find((sa) => sa.step === currentStep.key);
            if (!assigned || assigned.users.length === 0) return true;
            return assigned.users.some((u) => u.id === requestingUserId);
          })()
        : true;

    return {
      currentStatus: jobCard.workflowStatus,
      currentStep: currentStep?.key ?? null,
      canApprove:
        currentStep !== null && jobCard.status === JobCardStatus.ACTIVE && isAssignedToCurrentStep,
      requiredRole: null,
      jobCardStatus: jobCard.status,
      stepAssignments,
      foregroundSteps,
      backgroundSteps,
      actionCompletions,
    };
  }

  async approvalHistory(companyId: number, jobCardId: number): Promise<JobCardApproval[]> {
    const approvals = await this.approvalRepo.find({
      where: { jobCardId, companyId },
      relations: ["approvedBy"],
      order: { createdAt: "ASC" },
    });

    const withPresignedUrls = await Promise.all(
      approvals.map(async (approval) => {
        if (approval.signatureUrl) {
          const presigned = await this.signatureService
            .presignedUrl(approval.signatureUrl)
            .catch(() => null);
          return { ...approval, signatureUrl: presigned };
        }
        return approval;
      }),
    );

    return withPresignedUrls;
  }

  async pendingApprovalsForUser(
    user: UserContext,
    page: number = 1,
    limit: number = 50,
  ): Promise<JobCard[]> {
    const fgSteps = await this.stepConfigService.orderedSteps(user.companyId);
    const statuses = fgSteps.map((s) => s.key);

    if (statuses.length === 0) {
      return [];
    }

    return this.jobCardRepo
      .createQueryBuilder("jc")
      .where("jc.companyId = :companyId", { companyId: user.companyId })
      .andWhere("jc.workflowStatus IN (:...statuses)", { statuses })
      .andWhere("jc.status = :status", { status: JobCardStatus.ACTIVE })
      .orderBy("jc.createdAt", "ASC")
      .take(limit)
      .skip((page - 1) * limit)
      .getMany();
  }

  async canUserApprove(user: UserContext, jobCardId: number): Promise<boolean> {
    const jobCard = await this.jobCardRepo.findOne({
      where: { id: jobCardId, companyId: user.companyId },
    });

    if (!jobCard) {
      return false;
    }

    if (jobCard.status !== JobCardStatus.ACTIVE) {
      return false;
    }

    const fgSteps = await this.stepConfigService.orderedSteps(user.companyId);
    const currentStep = this.currentFgStep(jobCard.workflowStatus, fgSteps);
    if (!currentStep) {
      return false;
    }

    const hasExplicit = await this.assignmentService.hasExplicitAssignments(
      user.companyId,
      currentStep.key,
    );
    if (hasExplicit) {
      const assignedIds = await this.assignmentService.assignedUserIdsForStep(
        user.companyId,
        currentStep.key,
      );
      return assignedIds.includes(user.id);
    }

    return true;
  }

  async initializeWorkflow(
    companyId: number,
    jobCardId: number,
    user: { id: number; name: string },
    options: { advance?: boolean } = {},
  ): Promise<void> {
    const jobCard = await this.jobCardForWorkflow(companyId, jobCardId);

    if (jobCard.workflowStatus !== WORKFLOW_STATUS_DRAFT) {
      return;
    }

    const firstDocument = await this.documentRepo.findOne({
      where: { jobCardId, companyId },
      order: { createdAt: "ASC" },
    });

    const documentUploader =
      firstDocument?.uploadedById && firstDocument?.uploadedByName
        ? { id: firstDocument.uploadedById, name: firstDocument.uploadedByName }
        : user;

    await this.createApprovalRecord(companyId, jobCardId, "document_upload", {
      id: documentUploader.id,
      name: documentUploader.name,
      companyId,
      role: StockControlRole.ACCOUNTS,
    });

    if (options.advance) {
      const fgSteps = await this.stepConfigService.orderedSteps(companyId);
      const firstFgKey = fgSteps.length > 0 ? fgSteps[0].key : "admin_approval";

      jobCard.workflowStatus = firstFgKey;
      await this.jobCardRepo.save(jobCard);

      await this.notificationService.notifyApprovalRequired(companyId, jobCardId, firstFgKey, {
        id: user.id,
        name: user.name,
      });

      this.logger.log(
        `Workflow advanced to ${firstFgKey} for job card ${jobCardId} by ${user.name}`,
      );
    }

    this.logger.log(
      `Workflow initialized for job card ${jobCardId} by ${user.name}, document upload credited to ${documentUploader.name}`,
    );
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
    step: string,
    user: UserContext | { id: number; name: string; companyId: number; role: StockControlRole },
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

  private async validateUserIsAssigned(user: UserContext, stepKey: string): Promise<void> {
    const hasExplicit = await this.assignmentService.hasExplicitAssignments(
      user.companyId,
      stepKey,
    );

    if (!hasExplicit) {
      return;
    }

    const assignedIds = await this.assignmentService.assignedUserIdsForStep(
      user.companyId,
      stepKey,
    );

    if (!assignedIds.includes(user.id)) {
      throw new ForbiddenException(
        "You are not assigned to this workflow step. Only the assigned person can approve.",
      );
    }
  }

  private static readonly LEGACY_STATUS_POSITION: Record<string, number> = {
    document_uploaded: 0,
    document_upload: 0,
    admin_approved: 1,
    manager_approved: 2,
    requisition_sent: 2,
    requisition: 2,
    stock_allocated: 2,
    stock_allocation: 2,
    manager_final: 2,
    ready_for_dispatch: 3,
    ready: 3,
  };

  private currentFgStep(status: string, fgSteps: WorkflowStepConfig[]): WorkflowStepConfig | null {
    if (status === WORKFLOW_STATUS_DRAFT || status === WORKFLOW_STATUS_FILE_CLOSED) {
      return null;
    }

    const idx = fgSteps.findIndex((s) => s.key === status);
    if (idx >= 0) {
      return fgSteps[idx];
    }

    const position = JobCardWorkflowService.LEGACY_STATUS_POSITION[status];
    if (position !== undefined && position < fgSteps.length) {
      return fgSteps[position];
    }

    return null;
  }

  private nextFgStatus(currentStepKey: string, fgSteps: WorkflowStepConfig[]): string {
    const idx = fgSteps.findIndex((s) => s.key === currentStepKey);
    if (idx < 0) {
      return currentStepKey;
    }

    if (idx + 1 < fgSteps.length) {
      return fgSteps[idx + 1].key;
    }

    return WORKFLOW_STATUS_FILE_CLOSED;
  }

  private async archiveJobCardDocuments(
    companyId: number,
    jobCardId: number,
  ): Promise<Record<string, unknown>> {
    const docs = await this.documentRepo.find({
      where: { jobCardId, companyId },
    });

    const archivePath = `${StorageArea.STOCK_CONTROL}/job-cards/${jobCardId}/archive`;

    const archivedPaths = await Promise.all(
      docs.map(async (doc) => {
        const sourceBuffer = await this.storageService.download(doc.fileUrl).catch(() => null);
        if (!sourceBuffer) {
          return null;
        }

        const archiveFilename = doc.originalFilename || `document-${doc.id}`;
        const destPath = `${archivePath}/${archiveFilename}`;

        await this.storageService.upload(
          {
            buffer: sourceBuffer,
            originalname: archiveFilename,
            mimetype: doc.mimeType || "application/octet-stream",
          } as Express.Multer.File,
          archivePath,
        );

        return { path: destPath, filename: archiveFilename, originalDocId: doc.id };
      }),
    );

    const validPaths = archivedPaths.filter((p) => p !== null);

    this.logger.log(`Archived ${validPaths.length} documents for job card ${jobCardId}`);

    return {
      archivedAt: now().toISO(),
      archivedPaths: validPaths,
      totalDocuments: validPaths.length,
    };
  }
}
