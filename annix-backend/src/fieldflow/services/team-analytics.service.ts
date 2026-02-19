import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, In, LessThan, Not, Repository } from "typeorm";
import { fromISO, now } from "../../lib/datetime";
import { User } from "../../user/entities/user.entity";
import { Meeting, MeetingStatus } from "../entities/meeting.entity";
import { Prospect, ProspectStatus } from "../entities/prospect.entity";
import { TeamMember, TeamMemberStatus } from "../entities/team-member.entity";
import { Territory } from "../entities/territory.entity";

export interface TeamSummary {
  totalMembers: number;
  activeMembers: number;
  totalProspects: number;
  totalPipelineValue: number;
  dealsWonThisMonth: number;
  dealsLostThisMonth: number;
  meetingsThisMonth: number;
}

export interface MemberPerformance {
  userId: number;
  userName: string;
  prospectCount: number;
  pipelineValue: number;
  dealsWon: number;
  dealsLost: number;
  meetingsCompleted: number;
  winRate: number;
}

export interface TerritoryPerformance {
  territoryId: number;
  territoryName: string;
  assignedToName: string | null;
  prospectCount: number;
  pipelineValue: number;
  dealsWon: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: number;
  userName: string;
  value: number;
}

type LeaderboardMetric =
  | "deals_won"
  | "pipeline_value"
  | "meetings_completed"
  | "prospects_created";

export interface TeamOverdueFollowUp {
  prospectId: number;
  companyName: string;
  ownerName: string;
  ownerId: number;
  nextFollowUpAt: Date;
  daysOverdue: number;
  status: ProspectStatus;
}

@Injectable()
export class TeamAnalyticsService {
  private readonly logger = new Logger(TeamAnalyticsService.name);

  constructor(
    @InjectRepository(TeamMember)
    private readonly teamMemberRepo: Repository<TeamMember>,
    @InjectRepository(Prospect)
    private readonly prospectRepo: Repository<Prospect>,
    @InjectRepository(Meeting)
    private readonly meetingRepo: Repository<Meeting>,
    @InjectRepository(Territory)
    private readonly territoryRepo: Repository<Territory>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async teamSummary(orgId: number): Promise<TeamSummary> {
    const monthStart = now().startOf("month").toJSDate();
    const monthEnd = now().endOf("month").toJSDate();

    const [
      totalMembers,
      activeMembers,
      totalProspects,
      prospects,
      dealsWon,
      dealsLost,
      meetingsThisMonth,
    ] = await Promise.all([
      this.teamMemberRepo.count({ where: { organizationId: orgId } }),
      this.teamMemberRepo.count({
        where: { organizationId: orgId, status: TeamMemberStatus.ACTIVE },
      }),
      this.prospectRepo.count({ where: { organizationId: orgId } }),
      this.prospectRepo.find({
        where: { organizationId: orgId },
        select: ["estimatedValue", "status"],
      }),
      this.prospectRepo.count({
        where: {
          organizationId: orgId,
          status: ProspectStatus.WON,
          updatedAt: Between(monthStart, monthEnd),
        },
      }),
      this.prospectRepo.count({
        where: {
          organizationId: orgId,
          status: ProspectStatus.LOST,
          updatedAt: Between(monthStart, monthEnd),
        },
      }),
      this.meetingRepo.count({
        where: {
          organizationId: orgId,
          scheduledStart: Between(monthStart, monthEnd),
        },
      }),
    ]);

    const totalPipelineValue = prospects
      .filter((p) => p.status !== ProspectStatus.WON && p.status !== ProspectStatus.LOST)
      .reduce((sum, p) => sum + (Number(p.estimatedValue) || 0), 0);

    return {
      totalMembers,
      activeMembers,
      totalProspects,
      totalPipelineValue,
      dealsWonThisMonth: dealsWon,
      dealsLostThisMonth: dealsLost,
      meetingsThisMonth,
    };
  }

  async memberPerformance(
    orgId: number,
    period?: { start: string; end: string },
  ): Promise<MemberPerformance[]> {
    const members = await this.teamMemberRepo.find({
      where: { organizationId: orgId, status: TeamMemberStatus.ACTIVE },
      relations: ["user"],
    });

    const startDate = period?.start
      ? fromISO(period.start).toJSDate()
      : now().minus({ months: 1 }).toJSDate();
    const endDate = period?.end ? fromISO(period.end).toJSDate() : now().toJSDate();

    const results: MemberPerformance[] = await Promise.all(
      members.map(async (member) => {
        const [prospects, dealsWon, dealsLost, meetingsCompleted] = await Promise.all([
          this.prospectRepo.find({
            where: { ownerId: member.userId, organizationId: orgId },
            select: ["estimatedValue", "status"],
          }),
          this.prospectRepo.count({
            where: {
              ownerId: member.userId,
              organizationId: orgId,
              status: ProspectStatus.WON,
              updatedAt: Between(startDate, endDate),
            },
          }),
          this.prospectRepo.count({
            where: {
              ownerId: member.userId,
              organizationId: orgId,
              status: ProspectStatus.LOST,
              updatedAt: Between(startDate, endDate),
            },
          }),
          this.meetingRepo.count({
            where: {
              salesRepId: member.userId,
              organizationId: orgId,
              status: MeetingStatus.COMPLETED,
              actualEnd: Between(startDate, endDate),
            },
          }),
        ]);

        const pipelineValue = prospects
          .filter((p) => p.status !== ProspectStatus.WON && p.status !== ProspectStatus.LOST)
          .reduce((sum, p) => sum + (Number(p.estimatedValue) || 0), 0);

        const totalDeals = dealsWon + dealsLost;
        const winRate = totalDeals > 0 ? (dealsWon / totalDeals) * 100 : 0;

        return {
          userId: member.userId,
          userName: `${member.user.firstName ?? ""} ${member.user.lastName ?? ""}`.trim(),
          prospectCount: prospects.length,
          pipelineValue,
          dealsWon,
          dealsLost,
          meetingsCompleted,
          winRate: Math.round(winRate * 10) / 10,
        };
      }),
    );

    return results;
  }

  async territoryPerformance(orgId: number): Promise<TerritoryPerformance[]> {
    const territories = await this.territoryRepo.find({
      where: { organizationId: orgId },
      relations: ["assignedTo"],
    });

    const results: TerritoryPerformance[] = await Promise.all(
      territories.map(async (territory) => {
        const prospects = await this.prospectRepo.find({
          where: { territoryId: territory.id },
          select: ["estimatedValue", "status"],
        });

        const pipelineValue = prospects
          .filter((p) => p.status !== ProspectStatus.WON && p.status !== ProspectStatus.LOST)
          .reduce((sum, p) => sum + (Number(p.estimatedValue) || 0), 0);

        const dealsWon = prospects.filter((p) => p.status === ProspectStatus.WON).length;

        return {
          territoryId: territory.id,
          territoryName: territory.name,
          assignedToName: territory.assignedTo
            ? `${territory.assignedTo.firstName ?? ""} ${territory.assignedTo.lastName ?? ""}`.trim()
            : null,
          prospectCount: prospects.length,
          pipelineValue,
          dealsWon,
        };
      }),
    );

    return results;
  }

  async pipelineByRep(
    orgId: number,
  ): Promise<Array<{ userId: number; userName: string; pipeline: number }>> {
    const members = await this.teamMemberRepo.find({
      where: { organizationId: orgId, status: TeamMemberStatus.ACTIVE },
      relations: ["user"],
    });

    const results = await Promise.all(
      members.map(async (member) => {
        const prospects = await this.prospectRepo.find({
          where: {
            ownerId: member.userId,
            organizationId: orgId,
          },
          select: ["estimatedValue", "status"],
        });

        const pipeline = prospects
          .filter((p) => p.status !== ProspectStatus.WON && p.status !== ProspectStatus.LOST)
          .reduce((sum, p) => sum + (Number(p.estimatedValue) || 0), 0);

        return {
          userId: member.userId,
          userName: `${member.user.firstName ?? ""} ${member.user.lastName ?? ""}`.trim(),
          pipeline,
        };
      }),
    );

    return results.sort((a, b) => b.pipeline - a.pipeline);
  }

  async leaderboard(
    orgId: number,
    metric: LeaderboardMetric = "deals_won",
  ): Promise<LeaderboardEntry[]> {
    const performance = await this.memberPerformance(orgId);

    const sorted = performance
      .map((p) => {
        let value = 0;
        if (metric === "deals_won") {
          value = p.dealsWon;
        } else if (metric === "pipeline_value") {
          value = p.pipelineValue;
        } else if (metric === "meetings_completed") {
          value = p.meetingsCompleted;
        } else if (metric === "prospects_created") {
          value = p.prospectCount;
        }
        return { userId: p.userId, userName: p.userName, value };
      })
      .sort((a, b) => b.value - a.value);

    return sorted.map((entry, index) => ({
      rank: index + 1,
      ...entry,
    }));
  }

  async teamOverdueFollowUps(orgId: number, limit = 20): Promise<TeamOverdueFollowUp[]> {
    const currentTime = now().toJSDate();

    const prospects = await this.prospectRepo.find({
      where: {
        organizationId: orgId,
        nextFollowUpAt: LessThan(currentTime),
        status: Not(In([ProspectStatus.WON, ProspectStatus.LOST])),
      },
      relations: ["owner"],
      order: { nextFollowUpAt: "ASC" },
      take: limit,
    });

    return prospects.map((prospect) => {
      const followUpDate = prospect.nextFollowUpAt as Date;
      const daysOverdue = Math.floor(
        (currentTime.getTime() - followUpDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      return {
        prospectId: prospect.id,
        companyName: prospect.companyName,
        ownerName: prospect.owner
          ? `${prospect.owner.firstName ?? ""} ${prospect.owner.lastName ?? ""}`.trim()
          : "Unassigned",
        ownerId: prospect.ownerId,
        nextFollowUpAt: followUpDate,
        daysOverdue: Math.max(0, daysOverdue),
        status: prospect.status,
      };
    });
  }
}
