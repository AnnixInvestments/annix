import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, Repository } from "typeorm";
import { DateTime, fromISO } from "../../lib/datetime";
import {
  MeetingOutcomesReport,
  MonthlySalesReport,
  TerritoryCoverageReport,
  WeeklyActivityReport,
} from "../dto/report.dto";
import {
  Meeting,
  MeetingStatus,
  MeetingType,
  Prospect,
  ProspectActivity,
  ProspectActivityType,
  ProspectStatus,
  Visit,
  VisitOutcome,
} from "../entities";

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Meeting)
    private readonly meetingRepo: Repository<Meeting>,
    @InjectRepository(Prospect)
    private readonly prospectRepo: Repository<Prospect>,
    @InjectRepository(Visit)
    private readonly visitRepo: Repository<Visit>,
    @InjectRepository(ProspectActivity)
    private readonly activityRepo: Repository<ProspectActivity>,
  ) {}

  async weeklyActivityReport(
    userId: number,
    startDate: string,
    endDate: string,
  ): Promise<WeeklyActivityReport> {
    const start = fromISO(startDate).startOf("day").toJSDate();
    const end = fromISO(endDate).endOf("day").toJSDate();

    const [meetings, visits, prospects, activities] = await Promise.all([
      this.meetingRepo.find({
        where: {
          salesRepId: userId,
          scheduledStart: Between(start, end),
        },
      }),
      this.visitRepo.find({
        where: {
          salesRepId: userId,
        },
      }),
      this.prospectRepo.find({
        where: {
          ownerId: userId,
        },
      }),
      this.activityRepo.find({
        where: {
          userId,
          activityType: ProspectActivityType.STATUS_CHANGE,
          createdAt: Between(start, end),
        },
        relations: ["prospect"],
      }),
    ]);

    const filteredVisits = visits.filter(
      (v) => v.startedAt && v.startedAt >= start && v.startedAt <= end,
    );

    const newProspects = prospects.filter((p) => p.createdAt >= start && p.createdAt <= end);

    const contactedProspects = activities.filter(
      (a) =>
        a.newValues && (a.newValues as Record<string, unknown>).status === ProspectStatus.CONTACTED,
    );

    const dealsWon = activities.filter(
      (a) => a.newValues && (a.newValues as Record<string, unknown>).status === ProspectStatus.WON,
    );

    const dealsLost = activities.filter(
      (a) => a.newValues && (a.newValues as Record<string, unknown>).status === ProspectStatus.LOST,
    );

    const revenueWon = dealsWon.reduce((sum, a) => {
      const prospect = prospects.find((p) => p.id === a.prospectId);
      return sum + (Number(prospect?.estimatedValue) || 0);
    }, 0);

    const meetingsByDay = this.groupByDay(start, end, meetings, (m) => m.scheduledStart);
    const visitsByDay = this.groupVisitsByDay(start, end, filteredVisits);

    const prospectStatusChanges = activities
      .filter((a) => a.prospect)
      .map((a) => ({
        prospectId: a.prospectId,
        companyName: a.prospect?.companyName ?? "Unknown",
        fromStatus: ((a.oldValues as Record<string, unknown>)?.status as string) ?? "unknown",
        toStatus: ((a.newValues as Record<string, unknown>)?.status as string) ?? "unknown",
        date: DateTime.fromJSDate(a.createdAt).toISO() ?? "",
      }));

    return {
      period: { startDate, endDate },
      summary: {
        totalMeetings: meetings.length,
        completedMeetings: meetings.filter((m) => m.status === MeetingStatus.COMPLETED).length,
        cancelledMeetings: meetings.filter((m) => m.status === MeetingStatus.CANCELLED).length,
        totalVisits: filteredVisits.length,
        successfulVisits: filteredVisits.filter((v) => v.outcome === VisitOutcome.SUCCESSFUL)
          .length,
        newProspects: newProspects.length,
        contactedProspects: contactedProspects.length,
        dealsWon: dealsWon.length,
        dealsLost: dealsLost.length,
        revenueWon,
      },
      meetingsByDay: meetingsByDay.map((d) => ({
        date: d.date,
        count: d.items.length,
        completed: d.items.filter((m) => m.status === MeetingStatus.COMPLETED).length,
      })),
      visitsByDay: visitsByDay.map((d) => ({
        date: d.date,
        count: d.items.length,
        successful: d.items.filter((v) => v.outcome === VisitOutcome.SUCCESSFUL).length,
      })),
      prospectStatusChanges,
    };
  }

  async monthlySalesReport(userId: number, month: string): Promise<MonthlySalesReport> {
    const monthStart = fromISO(`${month}-01`).startOf("month");
    const monthEnd = monthStart.endOf("month");
    const start = monthStart.toJSDate();
    const end = monthEnd.toJSDate();

    const [meetings, visits, prospects, activities] = await Promise.all([
      this.meetingRepo.find({
        where: {
          salesRepId: userId,
          scheduledStart: Between(start, end),
        },
      }),
      this.visitRepo.find({
        where: {
          salesRepId: userId,
        },
      }),
      this.prospectRepo.find({
        where: {
          ownerId: userId,
        },
      }),
      this.activityRepo.find({
        where: {
          userId,
          activityType: ProspectActivityType.STATUS_CHANGE,
          createdAt: Between(start, end),
        },
        relations: ["prospect"],
      }),
    ]);

    const filteredVisits = visits.filter(
      (v) => v.startedAt && v.startedAt >= start && v.startedAt <= end,
    );

    const newProspects = prospects.filter((p) => p.createdAt >= start && p.createdAt <= end);

    const dealsWon = activities.filter(
      (a) => a.newValues && (a.newValues as Record<string, unknown>).status === ProspectStatus.WON,
    );

    const dealsLost = activities.filter(
      (a) => a.newValues && (a.newValues as Record<string, unknown>).status === ProspectStatus.LOST,
    );

    const totalRevenue = dealsWon.reduce((sum, a) => {
      const prospect = prospects.find((p) => p.id === a.prospectId);
      return sum + (Number(prospect?.estimatedValue) || 0);
    }, 0);

    const dealsClosed = dealsWon.length;
    const closedCount = dealsWon.length + dealsLost.length;
    const winRate = closedCount > 0 ? Math.round((dealsWon.length / closedCount) * 100) : 0;

    const pipelineStatuses: ProspectStatus[] = [
      ProspectStatus.NEW,
      ProspectStatus.CONTACTED,
      ProspectStatus.QUALIFIED,
      ProspectStatus.PROPOSAL,
    ];

    const pipelineProspects = prospects.filter((p) => pipelineStatuses.includes(p.status));
    const pipelineValue = pipelineProspects.reduce(
      (sum, p) => sum + (Number(p.estimatedValue) || 0),
      0,
    );

    const revenueByWeek = this.calculateRevenueByWeek(
      monthStart,
      monthEnd,
      dealsWon,
      prospects,
      activities,
    );

    const statusOrder: ProspectStatus[] = [
      ProspectStatus.NEW,
      ProspectStatus.CONTACTED,
      ProspectStatus.QUALIFIED,
      ProspectStatus.PROPOSAL,
      ProspectStatus.WON,
      ProspectStatus.LOST,
    ];

    const prospectsByStatus = statusOrder.map((status) => {
      const statusProspects = prospects.filter((p) => p.status === status);
      return {
        status,
        count: statusProspects.length,
        value: statusProspects.reduce((sum, p) => sum + (Number(p.estimatedValue) || 0), 0),
      };
    });

    const topDeals = dealsWon
      .map((a) => {
        const prospect = prospects.find((p) => p.id === a.prospectId);
        return {
          prospectId: a.prospectId,
          companyName: prospect?.companyName ?? "Unknown",
          value: Number(prospect?.estimatedValue) || 0,
          closedDate: DateTime.fromJSDate(a.createdAt).toISO() ?? "",
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    return {
      period: {
        startDate: monthStart.toISO() ?? "",
        endDate: monthEnd.toISO() ?? "",
      },
      summary: {
        totalRevenue,
        dealsClosed,
        averageDealSize: dealsClosed > 0 ? Math.round(totalRevenue / dealsClosed) : 0,
        winRate,
        pipelineValue,
        meetingsHeld: meetings.filter((m) => m.status === MeetingStatus.COMPLETED).length,
        visitsCompleted: filteredVisits.length,
        newProspectsAdded: newProspects.length,
      },
      revenueByWeek,
      prospectsByStatus,
      topDeals,
    };
  }

  async territoryCoverageReport(
    userId: number,
    startDate: string,
    endDate: string,
  ): Promise<TerritoryCoverageReport> {
    const start = fromISO(startDate).startOf("day").toJSDate();
    const end = fromISO(endDate).endOf("day").toJSDate();

    const [prospects, visits] = await Promise.all([
      this.prospectRepo.find({
        where: {
          ownerId: userId,
        },
      }),
      this.visitRepo.find({
        where: {
          salesRepId: userId,
        },
        relations: ["prospect"],
      }),
    ]);

    const filteredVisits = visits.filter(
      (v) => v.startedAt && v.startedAt >= start && v.startedAt <= end,
    );

    const prospectsWithLocation = prospects.filter(
      (p) => p.latitude !== null && p.longitude !== null,
    );

    const visitCountByProspect = new Map<number, number>();
    const lastVisitByProspect = new Map<number, Date>();

    visits.forEach((v) => {
      visitCountByProspect.set(v.prospectId, (visitCountByProspect.get(v.prospectId) || 0) + 1);
      const current = lastVisitByProspect.get(v.prospectId);
      if (v.startedAt && (!current || v.startedAt > current)) {
        lastVisitByProspect.set(v.prospectId, v.startedAt);
      }
    });

    const visitedProspectIds = new Set(filteredVisits.map((v) => v.prospectId));

    const bounds = this.calculateBounds(prospectsWithLocation, filteredVisits);

    return {
      period: { startDate, endDate },
      bounds,
      prospects: prospectsWithLocation.map((p) => {
        const lastVisit = lastVisitByProspect.get(p.id);
        return {
          id: p.id,
          companyName: p.companyName,
          latitude: Number(p.latitude),
          longitude: Number(p.longitude),
          status: p.status,
          lastVisitDate: lastVisit ? DateTime.fromJSDate(lastVisit).toISO() : null,
          visitCount: visitCountByProspect.get(p.id) || 0,
        };
      }),
      visits: filteredVisits
        .filter((v) => v.checkInLatitude !== null && v.checkInLongitude !== null)
        .map((v) => ({
          id: v.id,
          prospectId: v.prospectId,
          latitude: Number(v.checkInLatitude),
          longitude: Number(v.checkInLongitude),
          date: v.startedAt ? (DateTime.fromJSDate(v.startedAt).toISO() ?? "") : "",
          outcome: v.outcome,
        })),
      coverage: {
        totalProspectsWithLocation: prospectsWithLocation.length,
        visitedProspects: prospectsWithLocation.filter((p) => visitedProspectIds.has(p.id)).length,
        coveragePercentage:
          prospectsWithLocation.length > 0
            ? Math.round(
                (prospectsWithLocation.filter((p) => visitedProspectIds.has(p.id)).length /
                  prospectsWithLocation.length) *
                  100,
              )
            : 0,
      },
    };
  }

  async meetingOutcomesReport(
    userId: number,
    startDate: string,
    endDate: string,
  ): Promise<MeetingOutcomesReport> {
    const start = fromISO(startDate).startOf("day").toJSDate();
    const end = fromISO(endDate).endOf("day").toJSDate();

    const meetings = await this.meetingRepo.find({
      where: {
        salesRepId: userId,
        scheduledStart: Between(start, end),
      },
      relations: ["prospect"],
    });

    const completed = meetings.filter((m) => m.status === MeetingStatus.COMPLETED);
    const cancelled = meetings.filter((m) => m.status === MeetingStatus.CANCELLED);
    const noShow = meetings.filter((m) => m.status === MeetingStatus.NO_SHOW);

    const durations = completed
      .filter((m) => m.actualStart && m.actualEnd)
      .map((m) => {
        const startTime = DateTime.fromJSDate(m.actualStart!);
        const endTime = DateTime.fromJSDate(m.actualEnd!);
        return endTime.diff(startTime, "minutes").minutes;
      });

    const averageDuration =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : null;

    const meetingTypes: MeetingType[] = [
      MeetingType.IN_PERSON,
      MeetingType.PHONE,
      MeetingType.VIDEO,
    ];

    const outcomesByType = meetingTypes.map((type) => {
      const typeMeetings = meetings.filter((m) => m.meetingType === type);
      return {
        meetingType: type,
        total: typeMeetings.length,
        completed: typeMeetings.filter((m) => m.status === MeetingStatus.COMPLETED).length,
        cancelled: typeMeetings.filter((m) => m.status === MeetingStatus.CANCELLED).length,
      };
    });

    const detailedMeetings = meetings.map((m) => {
      let duration: number | null = null;
      if (m.actualStart && m.actualEnd) {
        const startTime = DateTime.fromJSDate(m.actualStart);
        const endTime = DateTime.fromJSDate(m.actualEnd);
        duration = Math.round(endTime.diff(startTime, "minutes").minutes);
      }

      return {
        id: m.id,
        title: m.title,
        prospectName: m.prospect?.companyName ?? null,
        scheduledDate: DateTime.fromJSDate(m.scheduledStart).toISO() ?? "",
        status: m.status,
        duration,
        outcomes: m.outcomes,
      };
    });

    return {
      period: { startDate, endDate },
      summary: {
        totalMeetings: meetings.length,
        completed: completed.length,
        cancelled: cancelled.length,
        noShow: noShow.length,
        completionRate:
          meetings.length > 0 ? Math.round((completed.length / meetings.length) * 100) : 0,
        averageDurationMinutes: averageDuration,
      },
      outcomesByType,
      detailedMeetings,
    };
  }

  private groupByDay<T>(
    start: Date,
    end: Date,
    items: T[],
    dateExtractor: (item: T) => Date,
  ): Array<{ date: string; items: T[] }> {
    const result: Array<{ date: string; items: T[] }> = [];
    let current = DateTime.fromJSDate(start).startOf("day");
    const endDt = DateTime.fromJSDate(end).endOf("day");

    while (current <= endDt) {
      const dayStart = current.startOf("day");
      const dayEnd = current.endOf("day");
      const dayItems = items.filter((item) => {
        const itemDate = DateTime.fromJSDate(dateExtractor(item));
        return itemDate >= dayStart && itemDate <= dayEnd;
      });

      result.push({
        date: current.toISODate() ?? "",
        items: dayItems,
      });

      current = current.plus({ days: 1 });
    }

    return result;
  }

  private groupVisitsByDay(
    start: Date,
    end: Date,
    visits: Visit[],
  ): Array<{ date: string; items: Visit[] }> {
    const result: Array<{ date: string; items: Visit[] }> = [];
    let current = DateTime.fromJSDate(start).startOf("day");
    const endDt = DateTime.fromJSDate(end).endOf("day");

    while (current <= endDt) {
      const dayStart = current.startOf("day");
      const dayEnd = current.endOf("day");
      const dayVisits = visits.filter((v) => {
        if (!v.startedAt) return false;
        const visitDate = DateTime.fromJSDate(v.startedAt);
        return visitDate >= dayStart && visitDate <= dayEnd;
      });

      result.push({
        date: current.toISODate() ?? "",
        items: dayVisits,
      });

      current = current.plus({ days: 1 });
    }

    return result;
  }

  private calculateRevenueByWeek(
    monthStart: DateTime,
    monthEnd: DateTime,
    dealsWon: ProspectActivity[],
    prospects: Prospect[],
    _activities: ProspectActivity[],
  ): Array<{ week: string; revenue: number; deals: number }> {
    const result: Array<{ week: string; revenue: number; deals: number }> = [];
    let weekNum = 1;
    let current = monthStart.startOf("week");

    while (current <= monthEnd) {
      const weekStart = current < monthStart ? monthStart : current;
      const weekEnd = current.endOf("week") > monthEnd ? monthEnd : current.endOf("week");

      const weekDeals = dealsWon.filter((a) => {
        const dealDate = DateTime.fromJSDate(a.createdAt);
        return dealDate >= weekStart && dealDate <= weekEnd;
      });

      const weekRevenue = weekDeals.reduce((sum, a) => {
        const prospect = prospects.find((p) => p.id === a.prospectId);
        return sum + (Number(prospect?.estimatedValue) || 0);
      }, 0);

      result.push({
        week: `Week ${weekNum}`,
        revenue: weekRevenue,
        deals: weekDeals.length,
      });

      weekNum++;
      current = current.plus({ weeks: 1 });
    }

    return result;
  }

  private calculateBounds(
    prospects: Prospect[],
    visits: Visit[],
  ): { north: number; south: number; east: number; west: number } {
    const southAfricaCenter = { lat: -30.5595, lng: 22.9375 };
    const defaultBounds = {
      north: southAfricaCenter.lat + 5,
      south: southAfricaCenter.lat - 5,
      east: southAfricaCenter.lng + 5,
      west: southAfricaCenter.lng - 5,
    };

    const coordinates: Array<{ lat: number; lng: number }> = [];

    prospects.forEach((p) => {
      if (p.latitude !== null && p.longitude !== null) {
        coordinates.push({ lat: Number(p.latitude), lng: Number(p.longitude) });
      }
    });

    visits.forEach((v) => {
      if (v.checkInLatitude !== null && v.checkInLongitude !== null) {
        coordinates.push({ lat: Number(v.checkInLatitude), lng: Number(v.checkInLongitude) });
      }
    });

    if (coordinates.length === 0) {
      return defaultBounds;
    }

    const lats = coordinates.map((c) => c.lat);
    const lngs = coordinates.map((c) => c.lng);

    const padding = 0.1;
    return {
      north: Math.max(...lats) + padding,
      south: Math.min(...lats) - padding,
      east: Math.max(...lngs) + padding,
      west: Math.min(...lngs) - padding,
    };
  }
}
