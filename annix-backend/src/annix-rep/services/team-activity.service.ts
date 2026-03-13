import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TeamActivity, TeamActivityType } from "../entities/team-activity.entity";
import { TeamService } from "./team.service";

export interface LogActivityParams {
  organizationId: number;
  userId: number;
  activityType: TeamActivityType;
  entityType: string;
  entityId?: number;
  metadata?: Record<string, unknown>;
  description?: string;
  isVisibleToTeam?: boolean;
}

export interface ActivityFeedOptions {
  limit?: number;
  offset?: number;
  activityTypes?: TeamActivityType[];
  userId?: number;
}

@Injectable()
export class TeamActivityService {
  private readonly logger = new Logger(TeamActivityService.name);

  constructor(
    @InjectRepository(TeamActivity)
    private readonly activityRepo: Repository<TeamActivity>,
    private readonly teamService: TeamService,
  ) {}

  async log(params: LogActivityParams): Promise<TeamActivity> {
    const activity = this.activityRepo.create({
      organizationId: params.organizationId,
      userId: params.userId,
      activityType: params.activityType,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      metadata: params.metadata ?? null,
      description: params.description ?? null,
      isVisibleToTeam: params.isVisibleToTeam ?? true,
    });

    return this.activityRepo.save(activity);
  }

  async feed(orgId: number, options: ActivityFeedOptions = {}): Promise<TeamActivity[]> {
    const { limit = 50, offset = 0, activityTypes, userId } = options;

    const qb = this.activityRepo
      .createQueryBuilder("activity")
      .leftJoinAndSelect("activity.user", "user")
      .where("activity.organization_id = :orgId", { orgId })
      .andWhere("activity.is_visible_to_team = true");

    if (activityTypes?.length) {
      qb.andWhere("activity.activity_type IN (:...types)", { types: activityTypes });
    }

    if (userId) {
      qb.andWhere("activity.user_id = :userId", { userId });
    }

    return qb.orderBy("activity.created_at", "DESC").take(limit).skip(offset).getMany();
  }

  async feedForManager(orgId: number, managerId: number, limit = 50): Promise<TeamActivity[]> {
    const directReports = await this.teamService.directReports(orgId, managerId);
    const reportUserIds = directReports.map((r) => r.userId);

    if (reportUserIds.length === 0) {
      return [];
    }

    return this.activityRepo
      .createQueryBuilder("activity")
      .leftJoinAndSelect("activity.user", "user")
      .where("activity.organization_id = :orgId", { orgId })
      .andWhere("activity.user_id IN (:...userIds)", { userIds: reportUserIds })
      .andWhere("activity.is_visible_to_team = true")
      .orderBy("activity.created_at", "DESC")
      .take(limit)
      .getMany();
  }

  async userActivity(orgId: number, userId: number, limit = 50): Promise<TeamActivity[]> {
    return this.activityRepo.find({
      where: { organizationId: orgId, userId },
      relations: ["user"],
      order: { createdAt: "DESC" },
      take: limit,
    });
  }

  async logMemberJoined(orgId: number, userId: number, userName: string): Promise<void> {
    await this.log({
      organizationId: orgId,
      userId,
      activityType: TeamActivityType.MEMBER_JOINED,
      entityType: "member",
      entityId: userId,
      description: `${userName} joined the team`,
    });
  }

  async logMemberLeft(orgId: number, userId: number, userName: string): Promise<void> {
    await this.log({
      organizationId: orgId,
      userId,
      activityType: TeamActivityType.MEMBER_LEFT,
      entityType: "member",
      entityId: userId,
      description: `${userName} left the team`,
    });
  }

  async logProspectCreated(
    orgId: number,
    userId: number,
    prospectId: number,
    companyName: string,
  ): Promise<void> {
    await this.log({
      organizationId: orgId,
      userId,
      activityType: TeamActivityType.PROSPECT_CREATED,
      entityType: "prospect",
      entityId: prospectId,
      description: `Created prospect: ${companyName}`,
      metadata: { companyName },
    });
  }

  async logProspectStatusChanged(
    orgId: number,
    userId: number,
    prospectId: number,
    companyName: string,
    oldStatus: string,
    newStatus: string,
  ): Promise<void> {
    await this.log({
      organizationId: orgId,
      userId,
      activityType: TeamActivityType.PROSPECT_STATUS_CHANGED,
      entityType: "prospect",
      entityId: prospectId,
      description: `${companyName}: ${oldStatus} → ${newStatus}`,
      metadata: { companyName, oldStatus, newStatus },
    });
  }

  async logProspectHandoff(
    orgId: number,
    fromUserId: number,
    toUserId: number,
    prospectId: number,
    companyName: string,
    reason?: string,
  ): Promise<void> {
    await this.log({
      organizationId: orgId,
      userId: fromUserId,
      activityType: TeamActivityType.PROSPECT_HANDOFF,
      entityType: "prospect",
      entityId: prospectId,
      description: `Handed off ${companyName}`,
      metadata: { companyName, toUserId, reason },
    });
  }

  async logMeetingCompleted(
    orgId: number,
    userId: number,
    meetingId: number,
    title: string,
  ): Promise<void> {
    await this.log({
      organizationId: orgId,
      userId,
      activityType: TeamActivityType.MEETING_COMPLETED,
      entityType: "meeting",
      entityId: meetingId,
      description: `Completed meeting: ${title}`,
    });
  }

  async logDealWon(
    orgId: number,
    userId: number,
    prospectId: number,
    companyName: string,
    value?: number,
  ): Promise<void> {
    await this.log({
      organizationId: orgId,
      userId,
      activityType: TeamActivityType.DEAL_WON,
      entityType: "prospect",
      entityId: prospectId,
      description: `Won deal: ${companyName}`,
      metadata: { companyName, value },
    });
  }

  async logDealLost(
    orgId: number,
    userId: number,
    prospectId: number,
    companyName: string,
  ): Promise<void> {
    await this.log({
      organizationId: orgId,
      userId,
      activityType: TeamActivityType.DEAL_LOST,
      entityType: "prospect",
      entityId: prospectId,
      description: `Lost deal: ${companyName}`,
      metadata: { companyName },
    });
  }

  async logTerritoryAssigned(
    orgId: number,
    userId: number,
    territoryId: number,
    territoryName: string,
  ): Promise<void> {
    await this.log({
      organizationId: orgId,
      userId,
      activityType: TeamActivityType.TERRITORY_ASSIGNED,
      entityType: "territory",
      entityId: territoryId,
      description: `Assigned to territory: ${territoryName}`,
    });
  }
}
