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
import type { StepOutcome } from "../entities/workflow-step-config.entity";
import { WorkflowStepConfig } from "../entities/workflow-step-config.entity";
import { JobCardRepository } from "../repositories/job-card.repository";
import { JobCardActionCompletionRepository } from "../repositories/job-card-action-completion.repository";
import { JobCardApprovalRepository } from "../repositories/job-card-approval.repository";
import { JobCardBackgroundCompletionRepository } from "../repositories/job-card-background-completion.repository";
import { JobCardDocumentRepository } from "../repositories/job-card-document.repository";
import { BackgroundStepService } from "./background-step.service";
import { RequisitionService } from "./requisition.service";
import { SignatureService } from "./signature.service";
import { WorkflowAssignmentService } from "./workflow-assignment.service";
import { WorkflowNotificationService } from "./workflow-notification.service";
import { WorkflowStepConfigService } from "./workflow-step-config.service";

interface ApprovalInput {
  signatureDataUrl?: string;
  comments?: string;
  outcomeKey?: string;
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
    private readonly jobCardRepo: JobCardRepository,
    private readonly approvalRepo: JobCardApprovalRepository,
    private readonly documentRepo: JobCardDocumentRepository,
    private readonly actionCompletionRepo: JobCardActionCompletionRepository,
    private readonly bgCompletionRepo: JobCardBackgroundCompletionRepository,
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

    const saved = await this.documentRepo.create({
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

    if (jobCard.workflowStatus === WORKFLOW_STATUS_DRAFT) {
      jobCard.workflowStatus = firstFgKey;
      await this.jobCardRepo.saveForCompany(companyId, jobCard);

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

    const fgOutcomes = currentStep.stepOutcomes || [];
    const chosenOutcome = input.outcomeKey
      ? fgOutcomes.find((o) => o.key === input.outcomeKey)
      : null;
    if (fgOutcomes.length > 0 && !chosenOutcome) {
      throw new BadRequestException(
        `Step "${currentStep.label}" requires an outcome. Valid outcomes: ${fgOutcomes.map((o) => o.key).join(", ")}`,
      );
    }

    const currentIdx = fgSteps.findIndex((s) => s.key === currentStep.key);
    if (currentIdx > 0) {
      const prevFgKey = fgSteps[currentIdx - 1].key;
      const prevBgSteps = await this.stepConfigService.backgroundStepsForTrigger(
        companyId,
        prevFgKey,
      );
      const prevRequired = prevBgSteps.filter((s) => s.rejoinAtStep === null);
      if (prevRequired.length > 0) {
        const completions = await this.bgCompletionRepo.findForJobCardAndCompany(
          jobCardId,
          companyId,
        );
        const completedKeys = new Set(completions.map((c) => c.stepKey));
        const incomplete = prevRequired.filter((s) => !completedKeys.has(s.key));
        if (incomplete.length > 0) {
          throw new BadRequestException(
            `Background steps from the previous stage must be completed first: ${incomplete.map((s) => s.label).join(", ")}`,
          );
        }
      }
    }

    const phases = await this.stepConfigService.phasesForFgStep(companyId, currentStep.key);
    if (phases.length > 1) {
      const phase1Keys = phases[0].bgStepKeys;
      const completions = await this.bgCompletionRepo.findForJobCardAndCompany(
        jobCardId,
        companyId,
      );
      const completedKeys = new Set(completions.map((c) => c.stepKey));
      const phase1Incomplete = phase1Keys.filter((key) => !completedKeys.has(key));
      if (phase1Incomplete.length > 0) {
        throw new BadRequestException(
          `Phase 1 background steps must be completed before approval: ${phase1Incomplete.join(", ")}`,
        );
      }
    }

    const actionCompletion = await this.actionCompletionRepo.findOneForStepAction(
      jobCardId,
      currentStep.key,
      "primary",
    );

    if (!actionCompletion) {
      await this.actionCompletionRepo.create({
        jobCardId,
        companyId,
        stepKey: currentStep.key,
        actionType: "primary",
        completedById: user.id,
        completedByName: user.name,
        completedAt: now().toJSDate(),
        metadata: { autoCreatedByApproval: true },
      });
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
      chosenOutcome?.key ?? null,
    );

    const nextStatus = this.nextFgStatus(currentStep.key, fgSteps);

    const updateAffected = await this.jobCardRepo.updateWorkflowStatusIfMatches(
      jobCardId,
      companyId,
      jobCard.workflowStatus,
      nextStatus,
    );

    if (updateAffected === 0) {
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

    const existing = await this.actionCompletionRepo.findOneForStepAction(
      jobCardId,
      stepKey,
      actionType,
    );

    if (existing) {
      throw new BadRequestException(`Action already completed for step "${stepKey}"`);
    }

    if (stepKey === "job_file_review" && actionType === "secondary") {
      const saved = await this.actionCompletionRepo.create({
        jobCardId,
        companyId,
        stepKey,
        actionType: "secondary",
        completedById: user.id,
        completedByName: user.name,
        completedAt: now().toJSDate(),
        metadata: { choice: "job_file_still_open", ...metadata },
      });
      this.logger.log(
        `Job file review marked as "still open" for job card ${jobCardId} by ${user.name}`,
      );
      return saved;
    }

    if (stepKey === "file_sign_off") {
      const archiveMetadata = await this.archiveJobCardDocuments(companyId, jobCardId);
      metadata = { ...metadata, ...archiveMetadata };
    }

    const saved = await this.actionCompletionRepo.create({
      jobCardId,
      companyId,
      stepKey,
      actionType,
      completedById: user.id,
      completedByName: user.name,
      completedAt: now().toJSDate(),
      metadata: metadata ?? null,
    });

    if (actionType === "primary" && !stepConfig.isBackground) {
      const phases = await this.stepConfigService.phasesForFgStep(companyId, stepKey);
      if (phases.length > 1) {
        const phase1 = phases[0];
        const bgSteps = await this.stepConfigService.backgroundStepsForTrigger(companyId, stepKey);
        const coloredSteps = bgSteps.filter((s) => phase1.bgStepKeys.includes(s.key));
        const firstPerBranch = this.stepConfigService.firstStepPerBranch(coloredSteps);

        await Promise.all(
          firstPerBranch.map((step) =>
            this.notificationService.notifyBackgroundStepRequired(
              companyId,
              jobCardId,
              step.key,
              step.label,
              { id: user.id, name: user.name },
            ),
          ),
        );
        this.logger.log(
          `Phase 1 bg steps triggered for step "${stepKey}" on job card ${jobCardId}: [${firstPerBranch.map((s) => s.key).join(", ")}]`,
        );
      }
    }

    this.logger.log(
      `Action "${actionType}" completed for step "${stepKey}" on job card ${jobCardId} by ${user.name}`,
    );

    return saved;
  }

  async actionCompletions(
    companyId: number,
    jobCardId: number,
  ): Promise<JobCardActionCompletion[]> {
    return this.actionCompletionRepo.findForJobCardOrdered(jobCardId, companyId);
  }

  async archiveUrls(
    companyId: number,
    jobCardId: number,
  ): Promise<Array<{ filename: string; url: string }>> {
    const completion = await this.actionCompletionRepo.findOneForJobCardStepAction(
      jobCardId,
      companyId,
      "file_sign_off",
      "primary",
    );

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
    const phases = await this.stepConfigService.phasesForFgStep(companyId, completedStepKey);
    const bgSteps = await this.stepConfigService.backgroundStepsForTrigger(
      companyId,
      completedStepKey,
    );

    if (bgSteps.length === 0) {
      return;
    }

    if (phases.length > 1) {
      const phase2 = phases[1];
      const nullColoredSteps = bgSteps.filter((s) => phase2.bgStepKeys.includes(s.key));
      const firstPerBranch = this.stepConfigService.firstStepPerBranch(nullColoredSteps);

      await Promise.all(
        firstPerBranch.map((step) =>
          this.notificationService.notifyBackgroundStepRequired(
            companyId,
            jobCardId,
            step.key,
            step.label,
            sender,
          ),
        ),
      );
    } else {
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

    await this.approvalRepo.rejectPendingStep(jobCardId, currentStep.key, {
      status: ApprovalStatus.REJECTED,
      rejectedReason: reason,
      approvedById: user.id,
      approvedByName: user.name,
      approvedAt: now().toJSDate(),
    });

    const firstFgKey = fgSteps.length > 0 ? fgSteps[0].key : WORKFLOW_STATUS_DRAFT;

    const updateAffected = await this.jobCardRepo.updateWorkflowStatusIfMatches(
      jobCardId,
      companyId,
      jobCard.workflowStatus,
      firstFgKey,
    );

    if (updateAffected === 0) {
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
      firstFgKey,
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
    stepAssignments: Record<
      string,
      { name: string; unifiedUserId: number | null; isPrimary: boolean }[]
    >;
    foregroundSteps: Array<{
      key: string;
      label: string;
      sortOrder: number;
      actionLabel: string | null;
      stepOutcomes: StepOutcome[] | null;
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
    phaseInfo: Record<
      string,
      {
        phases: Array<{ phase: number; actionLabel: string; bgStepKeys: string[] }>;
        currentPhase: number;
      }
    > | null;
  }> {
    const jobCard = await this.jobCardForWorkflow(companyId, jobCardId);

    const [allAssignments, fgConfigs, bgStatuses, actions] = await Promise.all([
      this.assignmentService.allAssignments(companyId),
      this.stepConfigService.orderedSteps(companyId),
      this.backgroundStepService.statusForJobCard(companyId, jobCardId),
      this.actionCompletionRepo.findForJobCardOrdered(jobCardId, companyId),
    ]);

    if (
      jobCard.status === JobCardStatus.ACTIVE &&
      jobCard.workflowStatus === WORKFLOW_STATUS_DRAFT &&
      fgConfigs.length > 0
    ) {
      jobCard.workflowStatus = fgConfigs[0].key;
      await this.jobCardRepo.saveForCompany(companyId, jobCard);
      this.logger.warn(
        `Auto-repaired workflow status for active job card ${jobCardId}: draft -> ${fgConfigs[0].key}`,
      );
    }

    const currentStep = this.currentFgStep(jobCard.workflowStatus, fgConfigs);

    const stepAssignments = allAssignments.reduce(
      (acc, sa) => ({
        ...acc,
        [sa.step]: sa.users.map((u) => ({
          name: u.name,
          unifiedUserId: u.unifiedUserId,
          isPrimary: sa.primaryUserId === u.id,
        })),
      }),
      {} as Record<string, { name: string; unifiedUserId: number | null; isPrimary: boolean }[]>,
    );

    const foregroundSteps = fgConfigs.map((s) => ({
      key: s.key,
      label: s.label,
      sortOrder: s.sortOrder,
      actionLabel: s.actionLabel,
      stepOutcomes: s.stepOutcomes,
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
            if (!assigned || assigned.users.length === 0) return false;
            return assigned.users.some((u) => u.unifiedUserId === requestingUserId);
          })()
        : true;

    const phaseInfo = await this.buildPhaseInfo(companyId, fgConfigs, bgStepConfigs, actions);

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
      phaseInfo,
    };
  }

  async approvalHistory(companyId: number, jobCardId: number): Promise<JobCardApproval[]> {
    const approvals = await this.approvalRepo.findForJobCardWithApprovedBy(companyId, jobCardId);

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

    return this.jobCardRepo.findPendingApprovalsForCompany(user.companyId, statuses, page, limit);
  }

  /**
   * Job cards genuinely awaiting THIS user RIGHT NOW. A card awaits the user iff
   * the user is the PRIMARY assignee of an ACTIVE FRONTIER step:
   *   - frontier background steps: incomplete AND their trigger is satisfied
   *     (trigger is the workflow root, OR a foreground step already approved, OR
   *     a background step already completed);
   *   - the current foreground step (workflowStatus), UNLESS it is blocked by an
   *     active blocking (rejoinAtStep === null) background step.
   *
   * Using PRIMARY assignee (the one shown on the workflow node) is essential:
   * an admin is a secondary assignee on most steps, so an "assigned to the step"
   * rule would mark almost every card as theirs. A card whose pointer sits at a
   * step the user is assigned to but whose live work is a background step owned
   * by someone else (e.g. `manager_final` still awaiting Requisition) is excluded.
   */
  async actionableJobCardsForUser(
    user: UserContext,
  ): Promise<Array<{ id: number; label: string }>> {
    const fgSteps = await this.stepConfigService.orderedSteps(user.companyId);
    const bgSteps = await this.stepConfigService.backgroundSteps(user.companyId);
    const assignments = await this.assignmentService.allAssignments(user.companyId);

    const primaryByStep = new Map(assignments.map((a) => [a.step, a.primaryUserId]));
    const userIsPrimaryOfAnyStep = assignments.some((a) => a.primaryUserId === user.id);
    if (!userIsPrimaryOfAnyStep) {
      return [];
    }

    const fgKeySet = new Set(fgSteps.map((s) => s.key));
    const bgByKey = new Map(bgSteps.map((s) => [s.key, s]));

    // All active cards (every active card's workflowStatus is a foreground key).
    const cards = await this.jobCardRepo.findPendingApprovalsForCompany(
      user.companyId,
      fgSteps.map((s) => s.key),
      1,
      2000,
    );
    if (cards.length === 0) {
      return [];
    }

    const cardIds = cards.map((card) => card.id);
    const [approvedRows, completionRows] = await Promise.all([
      this.approvalRepo.findApprovedStepsForJobCardIds(user.companyId, cardIds),
      this.bgCompletionRepo.findForCompanyAndJobCardIds(user.companyId, cardIds),
    ]);
    const approvedByCard = approvedRows.reduce<Map<number, Set<string>>>((acc, row) => {
      const set = acc.get(row.jobCardId) ?? new Set<string>();
      set.add(row.step);
      acc.set(row.jobCardId, set);
      return acc;
    }, new Map());
    const completedByCard = completionRows.reduce<Map<number, Set<string>>>((acc, row) => {
      const set = acc.get(row.jobCardId) ?? new Set<string>();
      set.add(row.stepKey);
      acc.set(row.jobCardId, set);
      return acc;
    }, new Map());

    return cards
      .filter((card) => {
        const approved = approvedByCard.get(card.id) ?? new Set<string>();
        const completed = completedByCard.get(card.id) ?? new Set<string>();
        return (
          this.primaryFrontierStepKeys({
            card,
            approved,
            completed,
            fgKeySet,
            bgSteps,
            bgByKey,
            primaryByStep,
            userId: user.id,
          }).length > 0
        );
      })
      .map((card) => {
        const base = card.jcNumber || card.jobNumber;
        const label = card.jtDnNumber ? `${base} / ${card.jtDnNumber}` : base;
        return { id: card.id, label };
      });
  }

  /**
   * The active frontier step keys on a card for which `userId` is the PRIMARY
   * assignee — the single source of truth for "is this card awaiting this user"
   * (the list) and "which task here is theirs" (the detail-page banner).
   */
  private primaryFrontierStepKeys(params: {
    card: JobCard;
    approved: Set<string>;
    completed: Set<string>;
    fgKeySet: Set<string>;
    bgSteps: WorkflowStepConfig[];
    bgByKey: Map<string, WorkflowStepConfig>;
    primaryByStep: Map<string, number | null>;
    userId: number;
  }): string[] {
    const { card, approved, completed, fgKeySet, bgSteps, bgByKey, primaryByStep, userId } = params;
    const triggerSatisfied = (trigger: string | null): boolean => {
      if (!trigger) return true;
      if (fgKeySet.has(trigger)) return approved.has(trigger);
      if (bgByKey.has(trigger)) return completed.has(trigger);
      return true;
    };
    const activeBg = bgSteps.filter(
      (s) => !completed.has(s.key) && triggerSatisfied(s.triggerAfterStep),
    );
    const foregroundBlocked = activeBg.some((s) => !s.rejoinAtStep);
    const frontierKeys = activeBg.map((s) => s.key);
    if (card.workflowStatus && !foregroundBlocked) {
      frontierKeys.push(card.workflowStatus);
    }
    return frontierKeys.filter((key) => primaryByStep.get(key) === userId);
  }

  /**
   * The step(s) on a single card where the current user is the primary assignee
   * of an active frontier step — i.e. exactly why "Next" routed them here. Drives
   * the "Your task on this card" banner on the job-card detail page.
   */
  async myActionableStepsForCard(
    user: UserContext,
    jobCardId: number,
  ): Promise<Array<{ stepKey: string; label: string }>> {
    const card = await this.jobCardRepo.findOneForCompany(jobCardId, user.companyId);
    if (!card || card.status !== JobCardStatus.ACTIVE) {
      return [];
    }
    const fgSteps = await this.stepConfigService.orderedSteps(user.companyId);
    const bgSteps = await this.stepConfigService.backgroundSteps(user.companyId);
    const assignments = await this.assignmentService.allAssignments(user.companyId);
    const primaryByStep = new Map(assignments.map((a) => [a.step, a.primaryUserId]));
    const fgKeySet = new Set(fgSteps.map((s) => s.key));
    const bgByKey = new Map(bgSteps.map((s) => [s.key, s]));
    const labelByStep = new Map([...fgSteps, ...bgSteps].map((s) => [s.key, s.label]));

    const [approvedRows, completions] = await Promise.all([
      this.approvalRepo.findApprovedStepsForJobCardIds(user.companyId, [jobCardId]),
      this.bgCompletionRepo.findForJobCardAndCompany(jobCardId, user.companyId),
    ]);
    const approved = new Set(approvedRows.map((r) => r.step));
    const completed = new Set(completions.map((c) => c.stepKey));

    const keys = this.primaryFrontierStepKeys({
      card,
      approved,
      completed,
      fgKeySet,
      bgSteps,
      bgByKey,
      primaryByStep,
      userId: user.id,
    });
    return keys.map((key) => ({ stepKey: key, label: labelByStep.get(key) ?? key }));
  }

  async canUserApprove(user: UserContext, jobCardId: number): Promise<boolean> {
    const jobCard = await this.jobCardRepo.findOneForCompany(jobCardId, user.companyId);

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
    if (!hasExplicit) {
      return false;
    }
    const assignedIds = await this.assignmentService.assignedUserIdsForStep(
      user.companyId,
      currentStep.key,
    );
    return assignedIds.includes(user.id);
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

    const firstDocument = await this.documentRepo.findFirstForJobCard(jobCardId, companyId);

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
      await this.jobCardRepo.saveForCompany(companyId, jobCard);

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
    return this.documentRepo.findForJobCardOrdered(jobCardId, companyId);
  }

  private async jobCardForWorkflow(companyId: number, jobCardId: number): Promise<JobCard> {
    const jobCard = await this.jobCardRepo.findOneForCompany(jobCardId, companyId);

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
    outcomeKey?: string | null,
  ): Promise<JobCardApproval> {
    return this.approvalRepo.create({
      jobCardId,
      companyId,
      step,
      status,
      approvedById: user.id,
      approvedByName: user.name,
      signatureUrl: signatureUrl ?? null,
      comments: comments ?? null,
      outcomeKey: outcomeKey ?? null,
      approvedAt: status === ApprovalStatus.APPROVED ? now().toJSDate() : null,
    });
  }

  private async validateUserIsAssigned(user: UserContext, stepKey: string): Promise<void> {
    const hasExplicit = await this.assignmentService.hasExplicitAssignments(
      user.companyId,
      stepKey,
    );

    if (!hasExplicit) {
      return;
    }

    const assignedUnifiedIds = await this.assignmentService.assignedUnifiedUserIdsForStep(
      user.companyId,
      stepKey,
    );

    if (!assignedUnifiedIds.includes(user.id)) {
      throw new ForbiddenException(
        "You are not assigned to this workflow step. Only the assigned person can approve.",
      );
    }
  }

  async effectiveWorkflowStatuses(
    companyId: number,
    jobCards: Array<{ id: number; workflowStatus: string }>,
  ): Promise<Record<number, string>> {
    if (jobCards.length === 0) {
      return {};
    }

    const [fgSteps, bgSteps] = await Promise.all([
      this.stepConfigService.orderedSteps(companyId),
      this.stepConfigService.backgroundSteps(companyId),
    ]);

    const jobCardIds = jobCards.map((jc) => jc.id);

    const completions =
      jobCardIds.length > 0
        ? await this.bgCompletionRepo.findForCompanyAndJobCardIds(companyId, jobCardIds)
        : [];

    const completedByJob = completions.reduce<Record<number, Set<string>>>((acc, c) => {
      const set = acc[c.jobCardId] || new Set<string>();
      set.add(c.stepKey);
      return { ...acc, [c.jobCardId]: set };
    }, {});

    const bgByTrigger = bgSteps
      .filter((s) => s.rejoinAtStep === null)
      .reduce<Record<string, string[]>>((acc, s) => {
        const trigger = s.triggerAfterStep;
        if (!trigger) {
          return acc;
        }
        return { ...acc, [trigger]: [...(acc[trigger] || []), s.key] };
      }, {});

    return jobCards.reduce<Record<number, string>>((acc, jc) => {
      const currentStep = this.currentFgStep(jc.workflowStatus, fgSteps);
      if (!currentStep) {
        return { ...acc, [jc.id]: jc.workflowStatus };
      }

      const currentIdx = fgSteps.findIndex((s) => s.key === currentStep.key);
      if (currentIdx <= 0) {
        return { ...acc, [jc.id]: jc.workflowStatus };
      }

      const previousFgKey = fgSteps[currentIdx - 1].key;
      const requiredBgKeys = bgByTrigger[previousFgKey] || [];

      if (requiredBgKeys.length === 0) {
        return { ...acc, [jc.id]: jc.workflowStatus };
      }

      const completed = completedByJob[jc.id] || new Set<string>();
      const allBgDone = requiredBgKeys.every((key) => completed.has(key));

      if (allBgDone) {
        return { ...acc, [jc.id]: jc.workflowStatus };
      }

      return { ...acc, [jc.id]: previousFgKey };
    }, {});
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

  private async buildPhaseInfo(
    companyId: number,
    fgConfigs: WorkflowStepConfig[],
    bgStepConfigs: WorkflowStepConfig[],
    actions: JobCardActionCompletion[],
  ): Promise<Record<
    string,
    {
      phases: Array<{ phase: number; actionLabel: string; bgStepKeys: string[] }>;
      currentPhase: number;
    }
  > | null> {
    const entries = await Promise.all(
      fgConfigs.map(async (fg) => {
        const phases = await this.stepConfigService.phasesForFgStep(companyId, fg.key);
        if (phases.length <= 1) {
          return null;
        }

        const fgConfig = await this.stepConfigService.fgStepConfig(companyId, fg.key);
        const labels = fgConfig?.phaseActionLabels || {};

        const hasPrimaryAction = actions.some(
          (a) => a.stepKey === fg.key && a.actionType === "primary",
        );
        const currentPhase = hasPrimaryAction ? 2 : 1;

        const phaseData = phases.map((p) => ({
          phase: p.phase,
          actionLabel:
            labels[String(p.phase)] ||
            (p.phase === 1 ? fg.actionLabel || fg.label : `${fg.label} Release`),
          bgStepKeys: p.bgStepKeys,
        }));

        return [fg.key, { phases: phaseData, currentPhase }] as const;
      }),
    );

    const validEntries = entries.filter((e) => e !== null);

    if (validEntries.length === 0) {
      return null;
    }

    return validEntries.reduce<
      Record<
        string,
        {
          phases: Array<{ phase: number; actionLabel: string; bgStepKeys: string[] }>;
          currentPhase: number;
        }
      >
    >((acc, entry) => ({ ...acc, [entry[0]]: entry[1] }), {});
  }

  private async archiveJobCardDocuments(
    companyId: number,
    jobCardId: number,
  ): Promise<Record<string, unknown>> {
    const docs = await this.documentRepo.findForJobCard(jobCardId, companyId);

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
