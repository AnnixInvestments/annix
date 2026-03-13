import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, Repository } from "typeorm";
import { fromJSDate, now } from "../../lib/datetime";
import { Meeting, MeetingStatus, Prospect, ProspectStatus, Visit } from "../entities";

export interface MeetingsOverTime {
  period: string;
  count: number;
  completed: number;
  cancelled: number;
}

export interface ProspectFunnel {
  status: ProspectStatus;
  count: number;
  totalValue: number;
}

export interface WinLossRateTrend {
  period: string;
  won: number;
  lost: number;
  winRate: number;
}

export interface ActivityHeatmapCell {
  dayOfWeek: number;
  hour: number;
  count: number;
}

export interface RevenuePipeline {
  status: ProspectStatus;
  count: number;
  totalValue: number;
  avgValue: number;
}

export interface TopProspect {
  id: number;
  companyName: string;
  contactName: string | null;
  status: ProspectStatus;
  estimatedValue: number;
  lastContactedAt: Date | null;
}

export interface AnalyticsSummary {
  totalProspects: number;
  activeProspects: number;
  totalMeetings: number;
  completedMeetings: number;
  totalVisits: number;
  totalPipelineValue: number;
  avgDealCycledays: number | null;
  winRate: number | null;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Prospect)
    private readonly prospectRepo: Repository<Prospect>,
    @InjectRepository(Meeting)
    private readonly meetingRepo: Repository<Meeting>,
    @InjectRepository(Visit)
    private readonly visitRepo: Repository<Visit>,
  ) {}

  async summary(ownerId: number): Promise<AnalyticsSummary> {
    const [prospects, meetings, visits] = await Promise.all([
      this.prospectRepo.find({ where: { ownerId } }),
      this.meetingRepo.find({ where: { salesRepId: ownerId } }),
      this.visitRepo.find({ where: { salesRepId: ownerId } }),
    ]);

    const activeStatuses: ProspectStatus[] = [
      ProspectStatus.CONTACTED,
      ProspectStatus.QUALIFIED,
      ProspectStatus.PROPOSAL,
    ];

    const activeProspects = prospects.filter((p) => activeStatuses.includes(p.status));
    const completedMeetings = meetings.filter((m) => m.status === MeetingStatus.COMPLETED);

    const pipelineStatuses: ProspectStatus[] = [
      ProspectStatus.NEW,
      ProspectStatus.CONTACTED,
      ProspectStatus.QUALIFIED,
      ProspectStatus.PROPOSAL,
    ];
    const pipelineProspects = prospects.filter((p) => pipelineStatuses.includes(p.status));
    const totalPipelineValue = pipelineProspects.reduce(
      (sum, p) => sum + (Number(p.estimatedValue) || 0),
      0,
    );

    const wonProspects = prospects.filter((p) => p.status === ProspectStatus.WON);
    const lostProspects = prospects.filter((p) => p.status === ProspectStatus.LOST);
    const closedCount = wonProspects.length + lostProspects.length;
    const winRate = closedCount > 0 ? (wonProspects.length / closedCount) * 100 : null;

    const cycleTimes = wonProspects
      .filter((p) => p.createdAt && p.updatedAt)
      .map((p) => {
        const created = fromJSDate(p.createdAt);
        const closed = fromJSDate(p.updatedAt);
        return closed.diff(created, "days").days;
      });
    const avgDealCycledays =
      cycleTimes.length > 0 ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length : null;

    return {
      totalProspects: prospects.length,
      activeProspects: activeProspects.length,
      totalMeetings: meetings.length,
      completedMeetings: completedMeetings.length,
      totalVisits: visits.length,
      totalPipelineValue,
      avgDealCycledays: avgDealCycledays ? Math.round(avgDealCycledays) : null,
      winRate: winRate ? Math.round(winRate * 10) / 10 : null,
    };
  }

  async meetingsOverTime(
    ownerId: number,
    period: "week" | "month" = "week",
    count = 8,
  ): Promise<MeetingsOverTime[]> {
    const current = now();

    const periods = Array.from({ length: count }, (_, idx) => count - 1 - idx);

    return periods.reduce(
      async (accPromise, i) => {
        const acc = await accPromise;
        const periodStart =
          period === "week"
            ? current.minus({ weeks: i }).startOf("week")
            : current.minus({ months: i }).startOf("month");
        const periodEnd =
          period === "week"
            ? current.minus({ weeks: i }).endOf("week")
            : current.minus({ months: i }).endOf("month");

        const meetings = await this.meetingRepo.find({
          where: {
            salesRepId: ownerId,
            scheduledStart: Between(periodStart.toJSDate(), periodEnd.toJSDate()),
          },
        });

        const label =
          period === "week" ? `W${periodStart.weekNumber}` : periodStart.toFormat("MMM");

        return [
          ...acc,
          {
            period: label,
            count: meetings.length,
            completed: meetings.filter((m) => m.status === MeetingStatus.COMPLETED).length,
            cancelled: meetings.filter((m) => m.status === MeetingStatus.CANCELLED).length,
          },
        ];
      },
      Promise.resolve([] as MeetingsOverTime[]),
    );
  }

  async prospectFunnel(ownerId: number): Promise<ProspectFunnel[]> {
    const prospects = await this.prospectRepo.find({ where: { ownerId } });

    const statusOrder: ProspectStatus[] = [
      ProspectStatus.NEW,
      ProspectStatus.CONTACTED,
      ProspectStatus.QUALIFIED,
      ProspectStatus.PROPOSAL,
      ProspectStatus.WON,
      ProspectStatus.LOST,
    ];

    return statusOrder.map((status) => {
      const statusProspects = prospects.filter((p) => p.status === status);
      return {
        status,
        count: statusProspects.length,
        totalValue: statusProspects.reduce((sum, p) => sum + (Number(p.estimatedValue) || 0), 0),
      };
    });
  }

  async winLossRateTrends(ownerId: number, months = 6): Promise<WinLossRateTrend[]> {
    const current = now();

    const monthIndices = Array.from({ length: months }, (_, idx) => months - 1 - idx);

    return monthIndices.reduce(
      async (accPromise, i) => {
        const acc = await accPromise;
        const monthStart = current.minus({ months: i }).startOf("month");
        const monthEnd = current.minus({ months: i }).endOf("month");

        const prospects = await this.prospectRepo.find({
          where: {
            ownerId,
            updatedAt: Between(monthStart.toJSDate(), monthEnd.toJSDate()),
          },
        });

        const won = prospects.filter((p) => p.status === ProspectStatus.WON).length;
        const lost = prospects.filter((p) => p.status === ProspectStatus.LOST).length;
        const total = won + lost;

        return [
          ...acc,
          {
            period: monthStart.toFormat("MMM"),
            won,
            lost,
            winRate: total > 0 ? Math.round((won / total) * 100) : 0,
          },
        ];
      },
      Promise.resolve([] as WinLossRateTrend[]),
    );
  }

  async activityHeatmap(ownerId: number): Promise<ActivityHeatmapCell[]> {
    const thirtyDaysAgo = now().minus({ days: 30 }).toJSDate();

    const visits = await this.visitRepo.find({
      where: {
        salesRepId: ownerId,
      },
    });

    const recentVisits = visits.filter(
      (v) => v.startedAt && fromJSDate(v.startedAt).toJSDate() >= thirtyDaysAgo,
    );

    const heatmap: Map<string, number> = new Map(
      Array.from({ length: 7 }, (_, day) =>
        Array.from(
          { length: 14 },
          (__, hourIdx) => [`${day}-${hourIdx + 6}`, 0] as [string, number],
        ),
      ).flat(),
    );

    recentVisits.forEach((visit) => {
      if (visit.startedAt) {
        const dt = fromJSDate(visit.startedAt);
        const dayOfWeek = dt.weekday % 7;
        const hour = dt.hour;
        if (hour >= 6 && hour < 20) {
          const key = `${dayOfWeek}-${hour}`;
          heatmap.set(key, (heatmap.get(key) || 0) + 1);
        }
      }
    });

    const results: ActivityHeatmapCell[] = [];
    heatmap.forEach((count, key) => {
      const [day, hour] = key.split("-").map(Number);
      results.push({ dayOfWeek: day, hour, count });
    });

    return results.sort((a, b) => a.dayOfWeek * 24 + a.hour - (b.dayOfWeek * 24 + b.hour));
  }

  async revenuePipeline(ownerId: number): Promise<RevenuePipeline[]> {
    const prospects = await this.prospectRepo.find({ where: { ownerId } });

    const pipelineStatuses: ProspectStatus[] = [
      ProspectStatus.NEW,
      ProspectStatus.CONTACTED,
      ProspectStatus.QUALIFIED,
      ProspectStatus.PROPOSAL,
    ];

    return pipelineStatuses.map((status) => {
      const statusProspects = prospects.filter((p) => p.status === status);
      const totalValue = statusProspects.reduce(
        (sum, p) => sum + (Number(p.estimatedValue) || 0),
        0,
      );
      return {
        status,
        count: statusProspects.length,
        totalValue,
        avgValue: statusProspects.length > 0 ? Math.round(totalValue / statusProspects.length) : 0,
      };
    });
  }

  async topProspects(ownerId: number, limit = 10): Promise<TopProspect[]> {
    const prospects = await this.prospectRepo.find({
      where: { ownerId },
      order: { estimatedValue: "DESC" },
    });

    return prospects
      .filter((p) => p.estimatedValue !== null && Number(p.estimatedValue) > 0)
      .slice(0, limit)
      .map((p) => ({
        id: p.id,
        companyName: p.companyName,
        contactName: p.contactName,
        status: p.status,
        estimatedValue: Number(p.estimatedValue),
        lastContactedAt: p.lastContactedAt,
      }));
  }
}
