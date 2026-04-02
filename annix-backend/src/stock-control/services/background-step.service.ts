import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { JobCard } from "../entities/job-card.entity";
import { JobCardApproval } from "../entities/job-card-approval.entity";
import { JobCardBackgroundCompletion } from "../entities/job-card-background-completion.entity";
import {
  NotificationActionType,
  WorkflowNotification,
} from "../entities/workflow-notification.entity";
import { JobCardWorkflowService } from "./job-card-workflow.service";
import { JobFileService } from "./job-file.service";
import { QaProcessService } from "./qa-process.service";
import { ReconciliationDocumentService } from "./reconciliation-document.service";
import { WorkflowNotificationService } from "./workflow-notification.service";
import { WorkflowStepConfigService } from "./workflow-step-config.service";

interface UserContext {
  id: number;
  companyId: number;
  name: string;
}

@Injectable()
export class BackgroundStepService {
  private readonly logger = new Logger(BackgroundStepService.name);

  constructor(
    @InjectRepository(JobCardBackgroundCompletion)
    private readonly completionRepo: Repository<JobCardBackgroundCompletion>,
    @InjectRepository(JobCard)
    private readonly jobCardRepo: Repository<JobCard>,
    @InjectRepository(JobCardApproval)
    private readonly approvalRepo: Repository<JobCardApproval>,
    @InjectRepository(WorkflowNotification)
    private readonly notificationRepo: Repository<WorkflowNotification>,
    private readonly stepConfigService: WorkflowStepConfigService,
    private readonly notificationService: WorkflowNotificationService,
    @Inject(forwardRef(() => JobCardWorkflowService))
    private readonly workflowService: JobCardWorkflowService,
    private readonly jobFileService: JobFileService,
    private readonly qaProcessService: QaProcessService,
    @Inject(forwardRef(() => ReconciliationDocumentService))
    private readonly reconciliationDocService: ReconciliationDocumentService,
  ) {}

  async completeStep(
    companyId: number,
    jobCardId: number,
    stepKey: string,
    user: UserContext,
    notes?: string,
    outcomeKey?: string,
  ): Promise<JobCardBackgroundCompletion> {
    const bgSteps = await this.stepConfigService.backgroundSteps(companyId);
    const stepConfig = bgSteps.find((s) => s.key === stepKey);

    if (!stepConfig) {
      throw new NotFoundException(`Background step "${stepKey}" not found`);
    }

    const existing = await this.completionRepo.findOne({
      where: { jobCardId, stepKey },
    });

    if (existing) {
      throw new BadRequestException(
        `Background step "${stepKey}" already completed for this job card`,
      );
    }

    const outcomes = stepConfig.stepOutcomes || [];
    const chosenOutcome = outcomeKey ? outcomes.find((o) => o.key === outcomeKey) : null;

    if (outcomes.length > 0 && !chosenOutcome) {
      throw new BadRequestException(
        `Step "${stepConfig.label}" requires an outcome. Valid outcomes: ${outcomes.map((o) => o.key).join(", ")}`,
      );
    }

    if (stepConfig.triggerAfterStep) {
      const allSiblings = await this.stepConfigService.backgroundStepsForTrigger(
        companyId,
        stepConfig.triggerAfterStep,
      );
      const sameBranchSiblings = allSiblings.filter(
        (s) => (s.branchColor || null) === (stepConfig.branchColor || null),
      );
      const currentIdx = sameBranchSiblings.findIndex((s) => s.key === stepKey);
      if (currentIdx > 0) {
        const previousStep = sameBranchSiblings[currentIdx - 1];
        const previousCompletion = await this.completionRepo.findOne({
          where: { jobCardId, stepKey: previousStep.key },
        });
        if (!previousCompletion) {
          throw new BadRequestException(
            `Cannot complete "${stepConfig.label}" — previous step "${previousStep.label}" must be completed first`,
          );
        }
      }
    }

    if (stepKey === "compile_data_book") {
      const hasPhotos = await this.jobFileService.hasImageFiles(companyId, jobCardId);
      if (!hasPhotos) {
        throw new BadRequestException(
          "A photo of the completed item(s) must be uploaded before completing Data Book",
        );
      }
    }

    if (stepKey === "job_file_review") {
      const gate = await this.reconciliationDocService.gateStatus(companyId, jobCardId);
      if (!gate.satisfied) {
        throw new BadRequestException(
          "All required documents must be uploaded before completing Job File Review",
        );
      }
    }

    const completion = this.completionRepo.create({
      companyId,
      jobCardId,
      stepKey,
      completedById: user.id,
      completedByName: user.name,
      completedAt: now().toJSDate(),
      notes: notes ?? null,
      completionType: chosenOutcome ? chosenOutcome.key : "manual",
    });

    const saved = await this.completionRepo.save(completion);

    await this.notificationService.notifyBackgroundStepCompleted(
      companyId,
      jobCardId,
      stepKey,
      stepConfig.label,
      { id: user.id, name: user.name },
    );

    if (stepKey === "reception") {
      await this.autoSkipRequisitionChainIfSoh(companyId, jobCardId, user);
    }

    if (stepKey === "qa_check") {
      await this.qaProcessService.autoSkipInapplicableSteps(companyId, jobCardId, user);
    }

    if (stepKey === "qc_repairs") {
      const didReset = await this.qaProcessService.resetReviewAfterRepairs(companyId, jobCardId);
      if (didReset) {
        this.logger.log(`QA review reset after repairs completed for job card ${jobCardId}`);
      }
    }

    if (stepKey === "compile_data_book") {
      await this.qaProcessService.autoCompileDataBook(companyId, jobCardId, user);
    }

    if (stepConfig.triggerAfterStep) {
      const allSiblingsPost = await this.stepConfigService.backgroundStepsForTrigger(
        companyId,
        stepConfig.triggerAfterStep,
      );

      if (chosenOutcome?.notifyStepKey) {
        const targetStep = allSiblingsPost.find((s) => s.key === chosenOutcome.notifyStepKey);
        if (targetStep) {
          await this.notificationService.notifyBackgroundStepRequired(
            companyId,
            jobCardId,
            targetStep.key,
            targetStep.label,
            { id: user.id, name: user.name },
          );
          this.logger.log(
            `Outcome "${chosenOutcome.key}" routed to step "${targetStep.key}" for job card ${jobCardId}`,
          );
        }
      } else {
        const sameBranchPost = allSiblingsPost.filter(
          (s) => (s.branchColor || null) === (stepConfig.branchColor || null),
        );
        const currentIdx = sameBranchPost.findIndex((s) => s.key === stepKey);
        if (currentIdx >= 0 && currentIdx + 1 < sameBranchPost.length) {
          const nextStep = sameBranchPost[currentIdx + 1];
          await this.notificationService.notifyBackgroundStepRequired(
            companyId,
            jobCardId,
            nextStep.key,
            nextStep.label,
            { id: user.id, name: user.name },
          );
          this.logger.log(
            `Triggered next background step "${nextStep.key}" for job card ${jobCardId}`,
          );
        }
      }

      const allCompletions = await this.completionRepo.find({ where: { jobCardId, companyId } });
      const completedKeys = new Set(allCompletions.map((c) => c.stepKey));
      const allSiblingsComplete = allSiblingsPost.every((s) => completedKeys.has(s.key));

      if (allSiblingsComplete) {
        this.logger.log(
          `All background steps complete for trigger "${stepConfig.triggerAfterStep}" on job card ${jobCardId}, advancing foreground`,
        );
        await this.workflowService.advancePastBackgroundSteps(companyId, jobCardId, {
          id: user.id,
          name: user.name,
        });
      }
    }

    this.logger.log(
      `Background step "${stepKey}" completed for job card ${jobCardId} by ${user.name}`,
    );

    return saved;
  }

  private async autoSkipRequisitionChainIfSoh(
    companyId: number,
    jobCardId: number,
    user: UserContext,
  ): Promise<void> {
    const pmApproval = await this.approvalRepo.findOne({
      where: { companyId, jobCardId, step: "manager_approval" },
      order: { approvedAt: "DESC" },
    });

    if (pmApproval?.outcomeKey !== "soh") {
      return;
    }

    const requisitionChainKeys = ["requisition", "req_auth", "order_placement"];
    const bgSteps = await this.stepConfigService.backgroundSteps(companyId);
    const validKeys = requisitionChainKeys.filter((key) => bgSteps.some((s) => s.key === key));

    const existingCompletions = await this.completionRepo.find({
      where: { jobCardId, companyId },
    });
    const completedKeys = new Set(existingCompletions.map((c) => c.stepKey));

    const toSkip = validKeys.filter((key) => !completedKeys.has(key));

    if (toSkip.length === 0) {
      return;
    }

    const skippedCompletions = toSkip.map((key) =>
      this.completionRepo.create({
        companyId,
        jobCardId,
        stepKey: key,
        completedById: user.id,
        completedByName: "System (SOH)",
        completedAt: now().toJSDate(),
        notes: "Auto-skipped: PM approved with SOH (Stock on Hand)",
        completionType: "skipped",
      }),
    );

    await this.completionRepo.save(skippedCompletions);

    this.logger.log(
      `Auto-skipped requisition chain [${toSkip.join(", ")}] for job card ${jobCardId} (PM outcome: SOH)`,
    );
  }

  async completeMultipleSteps(
    companyId: number,
    jobCardId: number,
    stepKeys: string[],
    user: UserContext,
    notes?: string,
  ): Promise<void> {
    const bgSteps = await this.stepConfigService.backgroundSteps(companyId);
    const existingCompletions = await this.completionRepo.find({ where: { jobCardId, companyId } });
    const completedKeys = new Set(existingCompletions.map((c) => c.stepKey));

    const newCompletions = stepKeys
      .filter((key) => !completedKeys.has(key))
      .filter((key) => bgSteps.some((s) => s.key === key))
      .map((key) =>
        this.completionRepo.create({
          companyId,
          jobCardId,
          stepKey: key,
          completedById: user.id,
          completedByName: user.name,
          completedAt: now().toJSDate(),
          notes: notes ?? null,
        }),
      );

    if (newCompletions.length > 0) {
      await this.completionRepo.save(newCompletions);
      this.logger.log(
        `Auto-completed ${newCompletions.length} background step(s) [${stepKeys.join(", ")}] for job card ${jobCardId} by ${user.name}`,
      );
    }

    const allCompletions = await this.completionRepo.find({ where: { jobCardId, companyId } });
    const allCompletedKeys = new Set(allCompletions.map((c) => c.stepKey));

    const triggerGroups = bgSteps.reduce<Record<string, string[]>>((acc, s) => {
      const trigger = s.triggerAfterStep ?? "__root__";
      return { ...acc, [trigger]: [...(acc[trigger] || []), s.key] };
    }, {});

    const allGroupsComplete = Object.values(triggerGroups).every((group) =>
      group.every((key) => allCompletedKeys.has(key)),
    );

    if (allGroupsComplete) {
      await this.workflowService.advancePastBackgroundSteps(companyId, jobCardId, {
        id: user.id,
        name: user.name,
      });
    }
  }

  async statusForJobCard(
    companyId: number,
    jobCardId: number,
  ): Promise<
    Array<{
      stepKey: string;
      label: string;
      triggerAfterStep: string | null;
      completedAt: string | null;
      completedByName: string | null;
      notes: string | null;
      completionType: string | null;
      branchColor: string | null;
      actionLabel: string | null;
      stepOutcomes: Array<{
        key: string;
        label: string;
        nextStepKey: string | null;
        notifyStepKey: string | null;
        style: string;
      }> | null;
      rejoinAtStep: string | null;
    }>
  > {
    const bgSteps = await this.stepConfigService.backgroundSteps(companyId);
    const completions = await this.completionRepo.find({
      where: { jobCardId },
    });

    const completionsByKey = completions.reduce<Record<string, JobCardBackgroundCompletion>>(
      (acc, c) => ({ ...acc, [c.stepKey]: c }),
      {},
    );

    return bgSteps.map((step) => {
      const completion = completionsByKey[step.key] ?? null;
      return {
        stepKey: step.key,
        label: step.label,
        triggerAfterStep: step.triggerAfterStep,
        completedAt: completion?.completedAt?.toISOString() ?? null,
        completedByName: completion?.completedByName ?? null,
        notes: completion?.notes ?? null,
        completionType: completion?.completionType ?? null,
        branchColor: step.branchColor ?? null,
        actionLabel: step.actionLabel ?? null,
        stepOutcomes: step.stepOutcomes || null,
        rejoinAtStep: step.rejoinAtStep ?? null,
      };
    });
  }

  async pendingForUser(
    userId: number,
    companyId: number,
  ): Promise<
    Array<{
      jobCardId: number;
      jobCardNumber: string;
      stepKey: string;
      stepLabel: string;
      triggeredAt: string;
    }>
  > {
    const notifications = await this.notificationRepo.find({
      where: {
        userId,
        companyId,
        actionType: NotificationActionType.BACKGROUND_STEP_REQUIRED,
        readAt: IsNull(),
      },
      relations: ["jobCard"],
      order: { createdAt: "DESC" },
    });

    const bgSteps = await this.stepConfigService.backgroundSteps(companyId);
    const stepsByKey = bgSteps.reduce<Record<string, string>>(
      (acc, s) => ({ ...acc, [s.key]: s.label }),
      {},
    );

    const completions = await this.completionRepo.find({
      where: { companyId },
    });
    const completedSet = new Set(completions.map((c) => `${c.jobCardId}:${c.stepKey}`));

    return notifications
      .filter((n) => {
        const stepKey = this.extractStepKeyFromMessage(n.message);
        return stepKey && !completedSet.has(`${n.jobCardId}:${stepKey}`);
      })
      .map((n) => {
        const stepKey = this.extractStepKeyFromMessage(n.message) ?? "";
        return {
          jobCardId: n.jobCardId ?? 0,
          jobCardNumber: n.jobCard?.jobNumber ?? "",
          stepKey,
          stepLabel: stepsByKey[stepKey] ?? stepKey,
          triggeredAt: n.createdAt.toISOString(),
        };
      });
  }

  private extractStepKeyFromMessage(message: string | null): string | null {
    if (!message) return null;
    const match = message.match(/\[step:([^\]]+)\]/);
    return match ? match[1] : null;
  }
}
