import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prospect } from "../entities/prospect.entity";
import { ProspectActivityType } from "../entities/prospect-activity.entity";
import { ProspectRepository } from "../prospect.repository";
import { ProspectActivityRepository } from "../prospect-activity.repository";
import { TeamActivityService } from "./team-activity.service";

export interface HandoffHistory {
  id: number;
  prospectId: number;
  fromUserId: number;
  fromUserName: string;
  toUserId: number;
  toUserName: string;
  reason: string | null;
  timestamp: Date;
}

@Injectable()
export class ProspectHandoffService {
  private readonly logger = new Logger(ProspectHandoffService.name);

  constructor(
    private readonly prospectRepo: ProspectRepository,
    private readonly activityRepo: ProspectActivityRepository,
    private readonly teamActivityService: TeamActivityService,
  ) {}

  async handoff(
    prospectId: number,
    fromUserId: number,
    toUserId: number,
    reason?: string,
  ): Promise<Prospect> {
    const prospect = await this.prospectRepo.findWithOwner(prospectId);

    if (!prospect) {
      throw new NotFoundException("Prospect not found");
    }

    const previousOwnerId = prospect.ownerId;
    prospect.ownerId = toUserId;

    await Promise.all([
      this.prospectRepo.save(prospect),
      this.activityRepo.create({
        prospectId,
        userId: fromUserId,
        activityType: ProspectActivityType.OWNERSHIP_CHANGED,
        description: reason ?? `Handed off from user ${fromUserId} to user ${toUserId}`,
        metadata: {
          previousOwnerId,
          newOwnerId: toUserId,
          handoffBy: fromUserId,
          reason,
        },
      }),
    ]);

    if (prospect.organizationId) {
      await this.teamActivityService.logProspectHandoff(
        prospect.organizationId,
        fromUserId,
        toUserId,
        prospectId,
        prospect.companyName,
        reason,
      );
    }

    this.logger.log(
      `Prospect ${prospectId} (${prospect.companyName}) handed off from user ${fromUserId} to ${toUserId}`,
    );

    return prospect;
  }

  async handoffBulk(
    prospectIds: number[],
    fromUserId: number,
    toUserId: number,
    reason?: string,
  ): Promise<Prospect[]> {
    const prospects = await this.prospectRepo.findByIds(prospectIds);

    if (prospects.length === 0) {
      throw new NotFoundException("No prospects found");
    }

    return Promise.all(
      prospects.map((prospect) => this.handoff(prospect.id, fromUserId, toUserId, reason)),
    );
  }

  async handoffHistory(prospectId: number): Promise<HandoffHistory[]> {
    const activities = await this.activityRepo.findByProspectAndType(
      prospectId,
      ProspectActivityType.OWNERSHIP_CHANGED,
    );

    return activities.map((activity) => {
      const meta = activity.metadata as {
        previousOwnerId?: number;
        newOwnerId?: number;
        handoffBy?: number;
        reason?: string;
      };

      return {
        id: activity.id,
        prospectId: activity.prospectId,
        fromUserId: meta.previousOwnerId ?? 0,
        fromUserName: "",
        toUserId: meta.newOwnerId ?? 0,
        toUserName: "",
        reason: meta.reason ?? null,
        timestamp: activity.createdAt,
      };
    });
  }
}
