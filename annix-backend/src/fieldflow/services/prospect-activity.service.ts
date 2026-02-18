import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { keys } from "es-toolkit/compat";
import { Repository } from "typeorm";
import { ProspectActivity, ProspectActivityType } from "../entities";

export interface LogActivityParams {
  prospectId: number;
  userId: number;
  activityType: ProspectActivityType;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  description?: string | null;
}

@Injectable()
export class ProspectActivityService {
  private readonly logger = new Logger(ProspectActivityService.name);

  constructor(
    @InjectRepository(ProspectActivity)
    private readonly activityRepo: Repository<ProspectActivity>,
  ) {}

  async logActivity(params: LogActivityParams): Promise<ProspectActivity> {
    const activity = this.activityRepo.create({
      prospectId: params.prospectId,
      userId: params.userId,
      activityType: params.activityType,
      oldValues: params.oldValues ?? null,
      newValues: params.newValues ?? null,
      description: params.description ?? null,
    });

    const saved = await this.activityRepo.save(activity);
    this.logger.debug(
      `Activity logged: ${params.activityType} for prospect ${params.prospectId} by user ${params.userId}`,
    );
    return saved;
  }

  async findByProspect(prospectId: number, limit = 50): Promise<ProspectActivity[]> {
    return this.activityRepo.find({
      where: { prospectId },
      order: { createdAt: "DESC" },
      take: limit,
      relations: ["user"],
    });
  }

  async logCreated(prospectId: number, userId: number, companyName: string): Promise<void> {
    await this.logActivity({
      prospectId,
      userId,
      activityType: ProspectActivityType.CREATED,
      newValues: { companyName },
      description: `Created prospect: ${companyName}`,
    });
  }

  async logStatusChange(
    prospectId: number,
    userId: number,
    oldStatus: string,
    newStatus: string,
  ): Promise<void> {
    await this.logActivity({
      prospectId,
      userId,
      activityType: ProspectActivityType.STATUS_CHANGE,
      oldValues: { status: oldStatus },
      newValues: { status: newStatus },
      description: `Changed status from ${oldStatus} to ${newStatus}`,
    });
  }

  async logFieldsUpdated(
    prospectId: number,
    userId: number,
    oldValues: Record<string, unknown>,
    newValues: Record<string, unknown>,
  ): Promise<void> {
    const changedFields = keys(newValues).filter(
      (key) => JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key]),
    );

    if (changedFields.length === 0) {
      return;
    }

    const relevantOldValues = changedFields.reduce(
      (acc, key) => {
        acc[key] = oldValues[key];
        return acc;
      },
      {} as Record<string, unknown>,
    );

    const relevantNewValues = changedFields.reduce(
      (acc, key) => {
        acc[key] = newValues[key];
        return acc;
      },
      {} as Record<string, unknown>,
    );

    await this.logActivity({
      prospectId,
      userId,
      activityType: ProspectActivityType.FIELD_UPDATED,
      oldValues: relevantOldValues,
      newValues: relevantNewValues,
      description: `Updated fields: ${changedFields.join(", ")}`,
    });
  }

  async logFollowUpCompleted(prospectId: number, userId: number): Promise<void> {
    await this.logActivity({
      prospectId,
      userId,
      activityType: ProspectActivityType.FOLLOW_UP_COMPLETED,
      description: "Completed follow-up",
    });
  }

  async logContacted(prospectId: number, userId: number): Promise<void> {
    await this.logActivity({
      prospectId,
      userId,
      activityType: ProspectActivityType.CONTACTED,
      description: "Marked as contacted",
    });
  }

  async logTagsChanged(
    prospectId: number,
    userId: number,
    oldTags: string[] | null,
    newTags: string[] | null,
  ): Promise<void> {
    const oldSet = new Set(oldTags ?? []);
    const newSet = new Set(newTags ?? []);

    const addedTags = (newTags ?? []).filter((t) => !oldSet.has(t));
    const removedTags = (oldTags ?? []).filter((t) => !newSet.has(t));

    if (addedTags.length > 0) {
      await this.logActivity({
        prospectId,
        userId,
        activityType: ProspectActivityType.TAG_ADDED,
        newValues: { tags: addedTags },
        description: `Added tags: ${addedTags.join(", ")}`,
      });
    }

    if (removedTags.length > 0) {
      await this.logActivity({
        prospectId,
        userId,
        activityType: ProspectActivityType.TAG_REMOVED,
        oldValues: { tags: removedTags },
        description: `Removed tags: ${removedTags.join(", ")}`,
      });
    }
  }

  async logMerged(primaryProspectId: number, userId: number, mergedIds: number[]): Promise<void> {
    await this.logActivity({
      prospectId: primaryProspectId,
      userId,
      activityType: ProspectActivityType.MERGED,
      newValues: { mergedFromIds: mergedIds },
      description: `Merged ${mergedIds.length} duplicate prospect(s) into this record`,
    });
  }

  async logFollowUpSnoozed(
    prospectId: number,
    userId: number,
    days: number,
    newFollowUpAt: Date,
  ): Promise<void> {
    await this.logActivity({
      prospectId,
      userId,
      activityType: ProspectActivityType.FOLLOW_UP_SNOOZED,
      newValues: { days, newFollowUpAt: newFollowUpAt.toISOString() },
      description: `Snoozed follow-up by ${days} day${days === 1 ? "" : "s"}`,
    });
  }
}
