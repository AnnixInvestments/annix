import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Prospect } from "../entities/prospect.entity";
import { ProspectActivity, ProspectActivityType } from "../entities/prospect-activity.entity";
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
    @InjectRepository(Prospect)
    private readonly prospectRepo: Repository<Prospect>,
    @InjectRepository(ProspectActivity)
    private readonly activityRepo: Repository<ProspectActivity>,
    private readonly teamActivityService: TeamActivityService,
  ) {}

  async handoff(
    prospectId: number,
    fromUserId: number,
    toUserId: number,
    reason?: string,
  ): Promise<Prospect> {
    const prospect = await this.prospectRepo.findOne({
      where: { id: prospectId },
      relations: ["owner"],
    });

    if (!prospect) {
      throw new NotFoundException("Prospect not found");
    }

    const previousOwnerId = prospect.ownerId;
    prospect.ownerId = toUserId;

    const activity = this.activityRepo.create({
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
    });

    await Promise.all([this.prospectRepo.save(prospect), this.activityRepo.save(activity)]);

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
    const prospects = await this.prospectRepo.find({
      where: { id: In(prospectIds) },
    });

    if (prospects.length === 0) {
      throw new NotFoundException("No prospects found");
    }

    const results: Prospect[] = [];
    for (const prospect of prospects) {
      const handed = await this.handoff(prospect.id, fromUserId, toUserId, reason);
      results.push(handed);
    }

    return results;
  }

  async handoffHistory(prospectId: number): Promise<HandoffHistory[]> {
    const activities = await this.activityRepo.find({
      where: {
        prospectId,
        activityType: ProspectActivityType.OWNERSHIP_CHANGED,
      },
      relations: ["user"],
      order: { createdAt: "DESC" },
    });

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
