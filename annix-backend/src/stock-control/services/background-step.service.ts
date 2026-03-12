import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { JobCard } from "../entities/job-card.entity";
import { JobCardBackgroundCompletion } from "../entities/job-card-background-completion.entity";
import { WorkflowNotification } from "../entities/workflow-notification.entity";
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
    @InjectRepository(WorkflowNotification)
    private readonly notificationRepo: Repository<WorkflowNotification>,
    private readonly stepConfigService: WorkflowStepConfigService,
    private readonly notificationService: WorkflowNotificationService,
  ) {}

  async completeStep(
    companyId: number,
    jobCardId: number,
    stepKey: string,
    user: UserContext,
    notes?: string,
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

    const completion = this.completionRepo.create({
      companyId,
      jobCardId,
      stepKey,
      completedById: user.id,
      completedByName: user.name,
      completedAt: now().toJSDate(),
      notes: notes ?? null,
    });

    const saved = await this.completionRepo.save(completion);

    await this.notificationService.notifyBackgroundStepCompleted(
      companyId,
      jobCardId,
      stepKey,
      stepConfig.label,
      { id: user.id, name: user.name },
    );

    this.logger.log(
      `Background step "${stepKey}" completed for job card ${jobCardId} by ${user.name}`,
    );

    return saved;
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
        actionType: "background_step_required" as any,
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
