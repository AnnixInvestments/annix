import { Injectable, Logger } from "@nestjs/common";
import { fromISO, fromJSDate, now } from "../../lib/datetime";
import { ProspectStatus } from "../entities/prospect.entity";
import { MeetingRepository } from "../meeting.repository";
import { ProspectRepository } from "../prospect.repository";
import { TeamMemberRepository } from "../team-member.repository";
import { TerritoryRepository } from "../territory.repository";

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
    private readonly teamMemberRepo: TeamMemberRepository,
    private readonly prospectRepo: ProspectRepository,
    private readonly meetingRepo: MeetingRepository,
    private readonly territoryRepo: TerritoryRepository,
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
      this.teamMemberRepo.countByOrganization(orgId),
      this.teamMemberRepo.countActiveByOrganization(orgId),
      this.prospectRepo.countByOrganization(orgId),
      this.prospectRepo.findByOrganizationSelectValueStatus(orgId),
      this.prospectRepo.countByOrganizationAndStatusInRange(
        orgId,
        ProspectStatus.WON,
        monthStart,
        monthEnd,
      ),
      this.prospectRepo.countByOrganizationAndStatusInRange(
        orgId,
        ProspectStatus.LOST,
        monthStart,
        monthEnd,
      ),
      this.meetingRepo.countByOrganizationInRange(orgId, monthStart, monthEnd),
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
    const members = await this.teamMemberRepo.findActiveByOrganizationWithUser(orgId);

    const startDate = period?.start
      ? fromISO(period.start).toJSDate()
      : now().minus({ months: 1 }).toJSDate();
    const endDate = period?.end ? fromISO(period.end).toJSDate() : now().toJSDate();

    const results: MemberPerformance[] = await Promise.all(
      members.map(async (member) => {
        const [prospects, dealsWon, dealsLost, meetingsCompleted] = await Promise.all([
          this.prospectRepo.findByOwnerAndOrganizationSelectValueStatus(member.userId, orgId),
          this.prospectRepo.countByOwnerOrganizationStatusInRange(
            member.userId,
            orgId,
            ProspectStatus.WON,
            startDate,
            endDate,
          ),
          this.prospectRepo.countByOwnerOrganizationStatusInRange(
            member.userId,
            orgId,
            ProspectStatus.LOST,
            startDate,
            endDate,
          ),
          this.meetingRepo.countCompletedBySalesRepInRange(
            member.userId,
            orgId,
            startDate,
            endDate,
          ),
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
    const territories = await this.territoryRepo.findByOrganizationWithAssignedTo(orgId);

    const results: TerritoryPerformance[] = await Promise.all(
      territories.map(async (territory) => {
        const prospects = await this.prospectRepo.findByTerritorySelectValueStatus(territory.id);

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
    const members = await this.teamMemberRepo.findActiveByOrganizationWithUser(orgId);

    const results = await Promise.all(
      members.map(async (member) => {
        const prospects = await this.prospectRepo.findByOwnerAndOrganizationSelectValueStatus(
          member.userId,
          orgId,
        );

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

    const prospects = await this.prospectRepo.findOrganizationOverdueFollowUps(
      orgId,
      currentTime,
      limit,
    );

    return prospects.map((prospect) => {
      const followUpDate = prospect.nextFollowUpAt as Date;
      const daysOverdue = Math.floor(
        fromJSDate(currentTime).diff(fromJSDate(followUpDate), "milliseconds").milliseconds /
          (1000 * 60 * 60 * 24),
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
