import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, Repository } from "typeorm";
import { now } from "../../lib/datetime";
import {
  GoalPeriod,
  Meeting,
  MeetingStatus,
  Prospect,
  ProspectStatus,
  SalesGoal,
  Visit,
} from "../entities";

export interface GoalProgress {
  period: GoalPeriod;
  periodStart: string;
  periodEnd: string;
  meetings: {
    target: number | null;
    actual: number;
    percentage: number | null;
  };
  visits: {
    target: number | null;
    actual: number;
    percentage: number | null;
  };
  newProspects: {
    target: number | null;
    actual: number;
    percentage: number | null;
  };
  revenue: {
    target: number | null;
    actual: number;
    percentage: number | null;
  };
  dealsWon: {
    target: number | null;
    actual: number;
    percentage: number | null;
  };
}

export interface CreateGoalDto {
  period: GoalPeriod;
  meetingsTarget?: number | null;
  visitsTarget?: number | null;
  newProspectsTarget?: number | null;
  revenueTarget?: number | null;
  dealsWonTarget?: number | null;
}

export interface UpdateGoalDto {
  meetingsTarget?: number | null;
  visitsTarget?: number | null;
  newProspectsTarget?: number | null;
  revenueTarget?: number | null;
  dealsWonTarget?: number | null;
  isActive?: boolean;
}

@Injectable()
export class GoalsService {
  constructor(
    @InjectRepository(SalesGoal)
    private readonly goalRepo: Repository<SalesGoal>,
    @InjectRepository(Meeting)
    private readonly meetingRepo: Repository<Meeting>,
    @InjectRepository(Visit)
    private readonly visitRepo: Repository<Visit>,
    @InjectRepository(Prospect)
    private readonly prospectRepo: Repository<Prospect>,
  ) {}

  async goals(userId: number): Promise<SalesGoal[]> {
    return this.goalRepo.find({
      where: { userId },
      order: { period: "ASC" },
    });
  }

  async goalByPeriod(userId: number, period: GoalPeriod): Promise<SalesGoal | null> {
    return this.goalRepo.findOne({ where: { userId, period } });
  }

  async createOrUpdateGoal(userId: number, dto: CreateGoalDto): Promise<SalesGoal> {
    const existing = await this.goalRepo.findOne({
      where: { userId, period: dto.period },
    });

    if (existing) {
      Object.assign(existing, {
        meetingsTarget: dto.meetingsTarget ?? existing.meetingsTarget,
        visitsTarget: dto.visitsTarget ?? existing.visitsTarget,
        newProspectsTarget: dto.newProspectsTarget ?? existing.newProspectsTarget,
        revenueTarget: dto.revenueTarget ?? existing.revenueTarget,
        dealsWonTarget: dto.dealsWonTarget ?? existing.dealsWonTarget,
      });
      return this.goalRepo.save(existing);
    }

    const goal = this.goalRepo.create({
      userId,
      period: dto.period,
      meetingsTarget: dto.meetingsTarget ?? null,
      visitsTarget: dto.visitsTarget ?? null,
      newProspectsTarget: dto.newProspectsTarget ?? null,
      revenueTarget: dto.revenueTarget ?? null,
      dealsWonTarget: dto.dealsWonTarget ?? null,
    });
    return this.goalRepo.save(goal);
  }

  async updateGoal(
    userId: number,
    period: GoalPeriod,
    dto: UpdateGoalDto,
  ): Promise<SalesGoal | null> {
    const goal = await this.goalRepo.findOne({ where: { userId, period } });
    if (!goal) return null;

    if (dto.meetingsTarget !== undefined) goal.meetingsTarget = dto.meetingsTarget;
    if (dto.visitsTarget !== undefined) goal.visitsTarget = dto.visitsTarget;
    if (dto.newProspectsTarget !== undefined) goal.newProspectsTarget = dto.newProspectsTarget;
    if (dto.revenueTarget !== undefined) goal.revenueTarget = dto.revenueTarget;
    if (dto.dealsWonTarget !== undefined) goal.dealsWonTarget = dto.dealsWonTarget;
    if (dto.isActive !== undefined) goal.isActive = dto.isActive;

    return this.goalRepo.save(goal);
  }

  async deleteGoal(userId: number, period: GoalPeriod): Promise<boolean> {
    const result = await this.goalRepo.delete({ userId, period });
    return (result.affected ?? 0) > 0;
  }

  async progress(userId: number, period: GoalPeriod): Promise<GoalProgress> {
    const goal = await this.goalByPeriod(userId, period);
    const { start, end } = this.periodRange(period);

    const [meetings, visits, prospects, wonProspects] = await Promise.all([
      this.meetingRepo.find({
        where: {
          salesRepId: userId,
          scheduledStart: Between(start.toJSDate(), end.toJSDate()),
          status: MeetingStatus.COMPLETED,
        },
      }),
      this.visitRepo.find({
        where: {
          salesRepId: userId,
          startedAt: Between(start.toJSDate(), end.toJSDate()),
        },
      }),
      this.prospectRepo.find({
        where: {
          ownerId: userId,
          createdAt: Between(start.toJSDate(), end.toJSDate()),
        },
      }),
      this.prospectRepo.find({
        where: {
          ownerId: userId,
          status: ProspectStatus.WON,
          updatedAt: Between(start.toJSDate(), end.toJSDate()),
        },
      }),
    ]);

    const completedMeetings = meetings.length;
    const completedVisits = visits.length;
    const newProspects = prospects.length;
    const dealsWon = wonProspects.length;
    const revenue = wonProspects.reduce((sum, p) => sum + (Number(p.estimatedValue) || 0), 0);

    const calcPercentage = (actual: number, target: number | null): number | null => {
      if (target === null || target === 0) return null;
      return Math.round((actual / target) * 100);
    };

    return {
      period,
      periodStart: start.toISODate() ?? "",
      periodEnd: end.toISODate() ?? "",
      meetings: {
        target: goal?.meetingsTarget ?? null,
        actual: completedMeetings,
        percentage: calcPercentage(completedMeetings, goal?.meetingsTarget ?? null),
      },
      visits: {
        target: goal?.visitsTarget ?? null,
        actual: completedVisits,
        percentage: calcPercentage(completedVisits, goal?.visitsTarget ?? null),
      },
      newProspects: {
        target: goal?.newProspectsTarget ?? null,
        actual: newProspects,
        percentage: calcPercentage(newProspects, goal?.newProspectsTarget ?? null),
      },
      revenue: {
        target: goal?.revenueTarget ? Number(goal.revenueTarget) : null,
        actual: revenue,
        percentage: calcPercentage(
          revenue,
          goal?.revenueTarget ? Number(goal.revenueTarget) : null,
        ),
      },
      dealsWon: {
        target: goal?.dealsWonTarget ?? null,
        actual: dealsWon,
        percentage: calcPercentage(dealsWon, goal?.dealsWonTarget ?? null),
      },
    };
  }

  private periodRange(period: GoalPeriod): {
    start: ReturnType<typeof now>;
    end: ReturnType<typeof now>;
  } {
    const current = now();

    if (period === GoalPeriod.WEEKLY) {
      return {
        start: current.startOf("week"),
        end: current.endOf("week"),
      };
    } else if (period === GoalPeriod.QUARTERLY) {
      return {
        start: current.startOf("quarter"),
        end: current.endOf("quarter"),
      };
    } else {
      return {
        start: current.startOf("month"),
        end: current.endOf("month"),
      };
    }
  }
}
