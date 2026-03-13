import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, MoreThanOrEqual, Repository } from "typeorm";
import { fromISO, fromJSDate, now } from "../../lib/datetime";
import {
  CreateRecurringMeetingDto,
  RecurrenceOptionsDto,
  RecurrenceUpdateScope,
  UpdateMeetingDto,
} from "../dto";
import { Meeting, MeetingStatus, MeetingType } from "../entities";

interface RRuleComponents {
  freq: string;
  interval: number;
  byDay?: string[];
  byMonthDay?: number;
  count?: number;
  until?: string;
}

@Injectable()
export class RecurringMeetingService {
  private readonly logger = new Logger(RecurringMeetingService.name);

  constructor(
    @InjectRepository(Meeting)
    private readonly meetingRepo: Repository<Meeting>,
  ) {}

  buildRRule(options: RecurrenceOptionsDto): string {
    const parts: string[] = [];

    const freqMap: Record<string, string> = {
      daily: "DAILY",
      weekly: "WEEKLY",
      monthly: "MONTHLY",
      yearly: "YEARLY",
    };

    parts.push(`FREQ=${freqMap[options.frequency]}`);

    if (options.interval && options.interval > 1) {
      parts.push(`INTERVAL=${options.interval}`);
    }

    if (options.frequency === "weekly" && options.byWeekDay && options.byWeekDay.length > 0) {
      const dayMap = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
      const days = options.byWeekDay.map((d) => dayMap[d]).join(",");
      parts.push(`BYDAY=${days}`);
    }

    if (options.frequency === "monthly" && options.byMonthDay) {
      parts.push(`BYMONTHDAY=${options.byMonthDay}`);
    }

    if (options.endType === "count" && options.count) {
      parts.push(`COUNT=${options.count}`);
    } else if (options.endType === "until" && options.until) {
      const untilDate = `${options.until.replace(/-/g, "")}T235959Z`;
      parts.push(`UNTIL=${untilDate}`);
    }

    return `RRULE:${parts.join(";")}`;
  }

  parseRRule(rule: string): RRuleComponents {
    const cleanRule = rule.replace("RRULE:", "");
    const components: RRuleComponents = {
      freq: "WEEKLY",
      interval: 1,
    };

    const parts = cleanRule.split(";");
    for (const part of parts) {
      const [key, value] = part.split("=");
      const upperKey = key.toUpperCase();

      if (upperKey === "FREQ") {
        components.freq = value;
      } else if (upperKey === "INTERVAL") {
        components.interval = parseInt(value, 10);
      } else if (upperKey === "BYDAY") {
        components.byDay = value.split(",");
      } else if (upperKey === "BYMONTHDAY") {
        components.byMonthDay = parseInt(value, 10);
      } else if (upperKey === "COUNT") {
        components.count = parseInt(value, 10);
      } else if (upperKey === "UNTIL") {
        components.until = value;
      }
    }

    return components;
  }

  generateInstances(
    parentMeeting: Meeting,
    startDate: Date,
    endDate: Date,
    maxInstances: number = 100,
  ): Date[] {
    if (!parentMeeting.recurrenceRule) {
      return [];
    }

    const rule = this.parseRRule(parentMeeting.recurrenceRule);
    const exceptions = this.parseExceptionDates(parentMeeting.recurrenceExceptionDates);
    const instances: Date[] = [];

    const meetingStart = fromJSDate(parentMeeting.scheduledStart);
    let current = meetingStart;
    let count = 0;

    const ruleUntil = rule.until
      ? fromISO(
          `${rule.until.substring(0, 4)}-${rule.until.substring(4, 6)}-${rule.until.substring(6, 8)}`,
        ).toJSDate()
      : null;
    const effectiveEndDate = ruleUntil && ruleUntil < endDate ? ruleUntil : endDate;

    while (current.toJSDate() <= effectiveEndDate && instances.length < maxInstances) {
      if (rule.count && count >= rule.count) {
        break;
      }

      const currentDate = current.toJSDate();
      const dateStr = current.toFormat("yyyy-MM-dd");

      if (currentDate >= startDate && !exceptions.has(dateStr)) {
        if (rule.freq === "WEEKLY" && rule.byDay) {
          const dayMap: Record<string, number> = {
            SU: 0,
            MO: 1,
            TU: 2,
            WE: 3,
            TH: 4,
            FR: 5,
            SA: 6,
          };
          const currentDayNum = current.weekday % 7;
          const allowedDays = rule.byDay.map((d) => dayMap[d.toUpperCase()]);
          if (allowedDays.includes(currentDayNum)) {
            instances.push(currentDate);
          }
        } else {
          instances.push(currentDate);
        }
      }

      count++;

      if (rule.freq === "DAILY") {
        current = current.plus({ days: rule.interval });
      } else if (rule.freq === "WEEKLY") {
        if (rule.byDay && rule.byDay.length > 0) {
          current = current.plus({ days: 1 });
        } else {
          current = current.plus({ weeks: rule.interval });
        }
      } else if (rule.freq === "MONTHLY") {
        current = current.plus({ months: rule.interval });
      } else if (rule.freq === "YEARLY") {
        current = current.plus({ years: rule.interval });
      }
    }

    return instances;
  }

  private parseExceptionDates(exceptionDatesStr: string | null): Set<string> {
    if (!exceptionDatesStr) {
      return new Set();
    }
    return new Set(exceptionDatesStr.split(",").map((d) => d.trim()));
  }

  private formatExceptionDates(dates: Set<string>): string | null {
    if (dates.size === 0) {
      return null;
    }
    return Array.from(dates).join(",");
  }

  async createRecurring(salesRepId: number, dto: CreateRecurringMeetingDto): Promise<Meeting> {
    const recurrenceRule = this.buildRRule(dto.recurrence);

    const parentMeeting = this.meetingRepo.create({
      salesRepId,
      prospectId: dto.prospectId ?? null,
      title: dto.title,
      description: dto.description ?? null,
      meetingType: dto.meetingType ?? MeetingType.IN_PERSON,
      scheduledStart: fromISO(dto.scheduledStart).toJSDate(),
      scheduledEnd: fromISO(dto.scheduledEnd).toJSDate(),
      location: dto.location ?? null,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      attendees: dto.attendees ?? null,
      agenda: dto.agenda ?? null,
      isRecurring: true,
      recurrenceRule,
      recurringParentId: null,
      recurrenceExceptionDates: null,
    });

    const saved = await this.meetingRepo.save(parentMeeting);
    this.logger.log(`Recurring meeting series created: ${saved.id} by user ${salesRepId}`);

    return saved;
  }

  async expandRecurringMeetings(
    salesRepId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<Meeting[]> {
    const recurringParents = await this.meetingRepo.find({
      where: {
        salesRepId,
        isRecurring: true,
        recurringParentId: null as unknown as number,
      },
      relations: ["prospect"],
    });

    const childMeetings = await this.meetingRepo.find({
      where: {
        salesRepId,
        isRecurring: false,
        recurringParentId: In(recurringParents.map((m) => m.id)),
      },
      relations: ["prospect"],
    });

    const expandedMeetings: Meeting[] = [...childMeetings];

    for (const parent of recurringParents) {
      const instances = this.generateInstances(parent, startDate, endDate);
      const duration = fromJSDate(parent.scheduledEnd).diff(
        fromJSDate(parent.scheduledStart),
        "milliseconds",
      ).milliseconds;

      for (const instanceDate of instances) {
        const existingChild = childMeetings.find((c) => {
          const childDate = fromJSDate(c.scheduledStart).toFormat("yyyy-MM-dd");
          const instanceDateStr = fromJSDate(instanceDate).toFormat("yyyy-MM-dd");
          return c.recurringParentId === parent.id && childDate === instanceDateStr;
        });

        if (!existingChild) {
          const instanceEnd = fromJSDate(instanceDate).plus({ milliseconds: duration }).toJSDate();

          const virtualMeeting: Meeting = {
            ...parent,
            id: -parent.id * 1000 - fromJSDate(instanceDate).toMillis(),
            scheduledStart: instanceDate,
            scheduledEnd: instanceEnd,
            isRecurring: false,
            recurringParentId: parent.id,
          } as Meeting;

          expandedMeetings.push(virtualMeeting);
        }
      }
    }

    return expandedMeetings.sort(
      (a, b) => fromJSDate(a.scheduledStart).toMillis() - fromJSDate(b.scheduledStart).toMillis(),
    );
  }

  async updateSeries(
    salesRepId: number,
    meetingId: number,
    dto: UpdateMeetingDto,
    scope: RecurrenceUpdateScope,
  ): Promise<Meeting> {
    const meeting = await this.meetingRepo.findOne({
      where: { id: meetingId, salesRepId },
    });

    if (!meeting) {
      throw new NotFoundException(`Meeting ${meetingId} not found`);
    }

    const parentId = meeting.recurringParentId ?? (meeting.isRecurring ? meeting.id : null);
    if (!parentId) {
      throw new BadRequestException("Meeting is not part of a recurring series");
    }

    const parent = await this.meetingRepo.findOne({
      where: { id: parentId, salesRepId },
    });

    if (!parent) {
      throw new NotFoundException("Parent meeting not found");
    }

    if (scope === "this") {
      return this.updateSingleInstance(salesRepId, meeting, dto, parent);
    } else if (scope === "future") {
      return this.updateFutureInstances(salesRepId, meeting, dto, parent);
    } else {
      return this.updateAllInstances(salesRepId, dto, parent);
    }
  }

  private async updateSingleInstance(
    salesRepId: number,
    meeting: Meeting,
    dto: UpdateMeetingDto,
    parent: Meeting,
  ): Promise<Meeting> {
    if (meeting.id > 0 && meeting.recurringParentId) {
      Object.assign(meeting, this.applyDtoToMeeting(meeting, dto));
      return this.meetingRepo.save(meeting);
    }

    const instanceDate = fromJSDate(meeting.scheduledStart).toFormat("yyyy-MM-dd");
    const exceptions = this.parseExceptionDates(parent.recurrenceExceptionDates);
    exceptions.add(instanceDate);
    parent.recurrenceExceptionDates = this.formatExceptionDates(exceptions);
    await this.meetingRepo.save(parent);

    const newInstance = this.meetingRepo.create({
      salesRepId,
      prospectId: dto.prospectId ?? meeting.prospectId,
      title: dto.title ?? meeting.title,
      description: dto.description ?? meeting.description,
      meetingType: dto.meetingType ?? meeting.meetingType,
      scheduledStart: dto.scheduledStart
        ? fromISO(dto.scheduledStart).toJSDate()
        : meeting.scheduledStart,
      scheduledEnd: dto.scheduledEnd ? fromISO(dto.scheduledEnd).toJSDate() : meeting.scheduledEnd,
      location: dto.location ?? meeting.location,
      latitude: dto.latitude ?? meeting.latitude,
      longitude: dto.longitude ?? meeting.longitude,
      attendees: dto.attendees ?? meeting.attendees,
      agenda: dto.agenda ?? meeting.agenda,
      notes: dto.notes ?? meeting.notes,
      outcomes: dto.outcomes ?? meeting.outcomes,
      actionItems: dto.actionItems ?? meeting.actionItems,
      status: dto.status ?? MeetingStatus.SCHEDULED,
      isRecurring: false,
      recurringParentId: parent.id,
    });

    return this.meetingRepo.save(newInstance);
  }

  private async updateFutureInstances(
    salesRepId: number,
    meeting: Meeting,
    dto: UpdateMeetingDto,
    parent: Meeting,
  ): Promise<Meeting> {
    const cutoffDate = meeting.scheduledStart;

    const rule = this.parseRRule(parent.recurrenceRule!);
    const cutoffStr = `${fromJSDate(cutoffDate).minus({ days: 1 }).toFormat("yyyyMMdd")}T235959Z`;
    const updatedRuleParts = parent
      .recurrenceRule!.replace("RRULE:", "")
      .split(";")
      .filter((p) => !p.startsWith("COUNT=") && !p.startsWith("UNTIL="));
    updatedRuleParts.push(`UNTIL=${cutoffStr}`);
    parent.recurrenceRule = `RRULE:${updatedRuleParts.join(";")}`;
    await this.meetingRepo.save(parent);

    const newSeriesDto: CreateRecurringMeetingDto = {
      prospectId: dto.prospectId ?? parent.prospectId ?? undefined,
      title: dto.title ?? parent.title,
      description: dto.description ?? parent.description ?? undefined,
      meetingType: dto.meetingType ?? parent.meetingType,
      scheduledStart: dto.scheduledStart ?? meeting.scheduledStart.toISOString(),
      scheduledEnd: dto.scheduledEnd ?? meeting.scheduledEnd.toISOString(),
      location: dto.location ?? parent.location ?? undefined,
      latitude: dto.latitude ?? parent.latitude ?? undefined,
      longitude: dto.longitude ?? parent.longitude ?? undefined,
      attendees: dto.attendees ?? parent.attendees ?? undefined,
      agenda: dto.agenda ?? parent.agenda ?? undefined,
      recurrence: {
        frequency: rule.freq.toLowerCase() as "daily" | "weekly" | "monthly" | "yearly",
        interval: rule.interval,
        byWeekDay: rule.byDay?.map((d) => {
          const dayMap: Record<string, number> = {
            SU: 0,
            MO: 1,
            TU: 2,
            WE: 3,
            TH: 4,
            FR: 5,
            SA: 6,
          };
          return dayMap[d];
        }),
        byMonthDay: rule.byMonthDay,
        endType: rule.count ? "count" : rule.until ? "until" : "never",
        count: rule.count,
        until: rule.until
          ? `${rule.until.substring(0, 4)}-${rule.until.substring(4, 6)}-${rule.until.substring(6, 8)}`
          : undefined,
      },
    };

    return this.createRecurring(salesRepId, newSeriesDto);
  }

  private async updateAllInstances(
    salesRepId: number,
    dto: UpdateMeetingDto,
    parent: Meeting,
  ): Promise<Meeting> {
    Object.assign(parent, this.applyDtoToMeeting(parent, dto));
    const savedParent = await this.meetingRepo.save(parent);

    const children = await this.meetingRepo.find({
      where: {
        recurringParentId: parent.id,
        salesRepId,
        status: MeetingStatus.SCHEDULED,
      },
    });

    for (const child of children) {
      if (dto.title != null) child.title = dto.title;
      if (dto.description != null) child.description = dto.description ?? null;
      if (dto.meetingType != null) child.meetingType = dto.meetingType;
      if (dto.location != null) child.location = dto.location ?? null;
      if (dto.attendees != null) child.attendees = dto.attendees ?? null;
      if (dto.agenda != null) child.agenda = dto.agenda ?? null;
    }

    if (children.length > 0) {
      await this.meetingRepo.save(children);
    }

    return savedParent;
  }

  private applyDtoToMeeting(meeting: Meeting, dto: UpdateMeetingDto): Partial<Meeting> {
    const updates: Partial<Meeting> = {};

    if (dto.title != null) updates.title = dto.title;
    if (dto.description != null) updates.description = dto.description ?? null;
    if (dto.meetingType != null) updates.meetingType = dto.meetingType;
    if (dto.status != null) updates.status = dto.status;
    if (dto.scheduledStart != null) updates.scheduledStart = fromISO(dto.scheduledStart).toJSDate();
    if (dto.scheduledEnd != null) updates.scheduledEnd = fromISO(dto.scheduledEnd).toJSDate();
    if (dto.location != null) updates.location = dto.location ?? null;
    if (dto.latitude != null) updates.latitude = dto.latitude ?? null;
    if (dto.longitude != null) updates.longitude = dto.longitude ?? null;
    if (dto.attendees != null) updates.attendees = dto.attendees ?? null;
    if (dto.agenda != null) updates.agenda = dto.agenda ?? null;
    if (dto.notes != null) updates.notes = dto.notes ?? null;
    if (dto.outcomes != null) updates.outcomes = dto.outcomes ?? null;
    if (dto.actionItems != null) updates.actionItems = dto.actionItems ?? null;

    return updates;
  }

  async deleteFromSeries(
    salesRepId: number,
    meetingId: number,
    scope: RecurrenceUpdateScope,
  ): Promise<void> {
    const meeting = await this.meetingRepo.findOne({
      where: { id: meetingId, salesRepId },
    });

    if (!meeting) {
      throw new NotFoundException(`Meeting ${meetingId} not found`);
    }

    const parentId = meeting.recurringParentId ?? (meeting.isRecurring ? meeting.id : null);

    if (scope === "this") {
      if (meeting.recurringParentId && meeting.id > 0) {
        await this.meetingRepo.remove(meeting);
      } else if (parentId) {
        const parent = await this.meetingRepo.findOne({
          where: { id: parentId },
        });
        if (parent) {
          const instanceDate = fromJSDate(meeting.scheduledStart).toFormat("yyyy-MM-dd");
          const exceptions = this.parseExceptionDates(parent.recurrenceExceptionDates);
          exceptions.add(instanceDate);
          parent.recurrenceExceptionDates = this.formatExceptionDates(exceptions);
          await this.meetingRepo.save(parent);
        }
      }
    } else if (scope === "future") {
      if (!parentId) {
        throw new BadRequestException("Meeting is not part of a recurring series");
      }

      const parent = await this.meetingRepo.findOne({
        where: { id: parentId },
      });

      if (parent?.recurrenceRule) {
        const cutoffStr = `${fromJSDate(meeting.scheduledStart).minus({ days: 1 }).toFormat("yyyyMMdd")}T235959Z`;
        const updatedRuleParts = parent.recurrenceRule
          .replace("RRULE:", "")
          .split(";")
          .filter((p) => !p.startsWith("COUNT=") && !p.startsWith("UNTIL="));
        updatedRuleParts.push(`UNTIL=${cutoffStr}`);
        parent.recurrenceRule = `RRULE:${updatedRuleParts.join(";")}`;
        await this.meetingRepo.save(parent);
      }

      await this.meetingRepo.delete({
        recurringParentId: parentId,
        salesRepId,
        scheduledStart: MoreThanOrEqual(meeting.scheduledStart),
      });
    } else {
      if (!parentId) {
        throw new BadRequestException("Meeting is not part of a recurring series");
      }

      await this.meetingRepo.delete({
        recurringParentId: parentId,
        salesRepId,
      });

      const parent = await this.meetingRepo.findOne({
        where: { id: parentId },
      });

      if (parent) {
        await this.meetingRepo.remove(parent);
      }
    }

    this.logger.log(`Deleted meeting ${meetingId} with scope: ${scope}`);
  }

  async seriesInstances(salesRepId: number, parentId: number): Promise<Meeting[]> {
    const parent = await this.meetingRepo.findOne({
      where: { id: parentId, salesRepId, isRecurring: true },
      relations: ["prospect"],
    });

    if (!parent) {
      throw new NotFoundException(`Recurring meeting series ${parentId} not found`);
    }

    const startDate = parent.scheduledStart;
    const endDate = now().plus({ years: 1 }).toJSDate();

    const childMeetings = await this.meetingRepo.find({
      where: {
        recurringParentId: parentId,
        salesRepId,
      },
      relations: ["prospect"],
      order: { scheduledStart: "ASC" },
    });

    const instances = this.generateInstances(parent, startDate, endDate, 52);
    const duration = fromJSDate(parent.scheduledEnd).diff(
      fromJSDate(parent.scheduledStart),
      "milliseconds",
    ).milliseconds;

    const allInstances: Meeting[] = [];
    const childDateMap = new Map<string, Meeting>();

    for (const child of childMeetings) {
      const dateStr = fromJSDate(child.scheduledStart).toFormat("yyyy-MM-dd");
      childDateMap.set(dateStr, child);
    }

    for (const instanceDate of instances) {
      const dateStr = fromJSDate(instanceDate).toFormat("yyyy-MM-dd");
      const existingChild = childDateMap.get(dateStr);

      if (existingChild) {
        allInstances.push(existingChild);
      } else {
        const virtualMeeting: Meeting = {
          ...parent,
          id: 0,
          scheduledStart: instanceDate,
          scheduledEnd: fromJSDate(instanceDate).plus({ milliseconds: duration }).toJSDate(),
          isRecurring: false,
          recurringParentId: parent.id,
        } as Meeting;
        allInstances.push(virtualMeeting);
      }
    }

    return allInstances.sort(
      (a, b) => fromJSDate(a.scheduledStart).toMillis() - fromJSDate(b.scheduledStart).toMillis(),
    );
  }
}
