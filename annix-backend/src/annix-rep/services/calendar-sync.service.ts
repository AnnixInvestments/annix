import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { fromJSDate, now } from "../../lib/datetime";
import { isAnnixRepCronEnabled } from "../annix-rep-cron.config";
import { CalendarConnectionRepository } from "../calendar-connection.repository";
import { CalendarEventRepository } from "../calendar-event.repository";
import {
  CalendarConnection,
  CalendarEvent,
  CalendarSyncStatus,
  type ConflictResolution,
  Meeting,
  MeetingStatus,
  SyncConflict,
} from "../entities";
import { MeetingRepository } from "../meeting.repository";
import { SyncConflictRepository } from "../sync-conflict.repository";
import { CalendarService } from "./calendar.service";

export interface SyncConflictDto {
  id: number;
  userId: number;
  meetingId: number | null;
  calendarEventId: number | null;
  conflictType: string;
  localData: Record<string, unknown>;
  remoteData: Record<string, unknown>;
  resolution: string;
  resolvedAt: Date | null;
  createdAt: Date;
  meeting?: Meeting | null;
  calendarEvent?: CalendarEvent | null;
}

@Injectable()
export class CalendarSyncService {
  private readonly logger = new Logger(CalendarSyncService.name);
  private isSyncing = false;

  constructor(
    private readonly connectionRepo: CalendarConnectionRepository,
    private readonly meetingRepo: MeetingRepository,
    private readonly calendarEventRepo: CalendarEventRepository,
    private readonly conflictRepo: SyncConflictRepository,
    private readonly calendarService: CalendarService,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES, { name: "fieldflow:calendar-sync" })
  async syncActiveConnections(): Promise<void> {
    if (!isAnnixRepCronEnabled()) return;

    if (this.isSyncing) {
      this.logger.debug("Sync already in progress, skipping");
      return;
    }

    this.isSyncing = true;

    const connections = await this.connectionRepo.findBySyncStatuses([
      CalendarSyncStatus.ACTIVE,
      CalendarSyncStatus.ERROR,
    ]);

    if (connections.length === 0) {
      this.isSyncing = false;
      return;
    }

    this.logger.log(`Starting background sync for ${connections.length} connections`);

    await connections.reduce(async (accPromise, connection) => {
      await accPromise;
      await this.syncConnection(connection);
    }, Promise.resolve());

    this.isSyncing = false;
    this.logger.log("Background sync completed");
  }

  private async syncConnection(connection: CalendarConnection): Promise<void> {
    try {
      await this.calendarService.refreshTokenIfNeeded(connection);
      await this.calendarService.syncConnectionInternal(connection, false);

      await this.detectTimeOverlaps(connection.userId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Sync failed for connection ${connection.id}: ${message}`);

      connection.syncStatus = CalendarSyncStatus.ERROR;
      connection.lastSyncError = message;

      await this.connectionRepo.save(connection);
    }
  }

  async detectTimeOverlaps(userId: number): Promise<SyncConflictDto[]> {
    const today = now().startOf("day").toJSDate();
    const futureDate = now().plus({ days: 30 }).endOf("day").toJSDate();

    const meetings = await this.meetingRepo.findFutureForOverlapDetection(
      userId,
      today,
      futureDate,
    );

    const calendarEvents = await this.calendarEventRepo.findOverlapsForUser(
      userId,
      today,
      futureDate,
    );

    const meetingEventPairs = meetings.flatMap((meeting) =>
      calendarEvents
        .filter((event) => meeting.calendarEventId !== event.id)
        .map((event) => ({ meeting, event })),
    );

    const overlappingPairs = meetingEventPairs.filter(({ meeting, event }) => {
      const meetingStart = fromJSDate(meeting.scheduledStart).toMillis();
      const meetingEnd = fromJSDate(meeting.scheduledEnd).toMillis();
      const eventStart = fromJSDate(event.startTime).toMillis();
      const eventEnd = fromJSDate(event.endTime).toMillis();

      return (
        (meetingStart < eventEnd && meetingEnd > eventStart) ||
        (eventStart < meetingEnd && eventEnd > meetingStart)
      );
    });

    const newConflicts = await overlappingPairs.reduce(
      async (accPromise, { meeting, event }) => {
        const acc = await accPromise;

        const existingConflict = await this.conflictRepo.findPendingForPair(
          userId,
          meeting.id,
          event.id,
        );

        if (existingConflict) {
          return acc;
        }

        const conflictData = {
          userId,
          meetingId: meeting.id,
          calendarEventId: event.id,
          conflictType: "time_overlap" as const,
          localData: {
            title: meeting.title,
            startTime: meeting.scheduledStart.toISOString(),
            endTime: meeting.scheduledEnd.toISOString(),
            location: meeting.location,
          },
          remoteData: {
            title: event.title,
            startTime: event.startTime.toISOString(),
            endTime: event.endTime.toISOString(),
            location: event.location,
          },
          resolution: "pending" as const,
        };

        const savedSingle = await this.conflictRepo.create(conflictData as Partial<SyncConflict>);
        return [
          ...acc,
          {
            id: savedSingle.id,
            userId: savedSingle.userId,
            meetingId: savedSingle.meetingId,
            calendarEventId: savedSingle.calendarEventId,
            conflictType: savedSingle.conflictType,
            localData: savedSingle.localData,
            remoteData: savedSingle.remoteData,
            resolution: savedSingle.resolution,
            resolvedAt: savedSingle.resolvedAt,
            createdAt: savedSingle.createdAt,
            meeting: null,
            calendarEvent: null,
          },
        ];
      },
      Promise.resolve([] as SyncConflictDto[]),
    );

    if (newConflicts.length > 0) {
      this.logger.log(`Detected ${newConflicts.length} new time conflicts for user ${userId}`);
    }

    return newConflicts;
  }

  async pendingConflicts(userId: number): Promise<SyncConflictDto[]> {
    const conflicts = await this.conflictRepo.findPendingForUser(userId);

    return conflicts.map((c) => ({
      id: c.id,
      userId: c.userId,
      meetingId: c.meetingId,
      calendarEventId: c.calendarEventId,
      conflictType: c.conflictType,
      localData: c.localData,
      remoteData: c.remoteData,
      resolution: c.resolution,
      resolvedAt: c.resolvedAt,
      createdAt: c.createdAt,
      meeting: c.meeting,
      calendarEvent: c.calendarEvent,
    }));
  }

  async conflictById(userId: number, conflictId: number): Promise<SyncConflictDto> {
    const conflict = await this.conflictRepo.findByIdAndUser(conflictId, userId);

    if (!conflict) {
      throw new NotFoundException(`Conflict ${conflictId} not found`);
    }

    return {
      id: conflict.id,
      userId: conflict.userId,
      meetingId: conflict.meetingId,
      calendarEventId: conflict.calendarEventId,
      conflictType: conflict.conflictType,
      localData: conflict.localData,
      remoteData: conflict.remoteData,
      resolution: conflict.resolution,
      resolvedAt: conflict.resolvedAt,
      createdAt: conflict.createdAt,
      meeting: conflict.meeting,
      calendarEvent: conflict.calendarEvent,
    };
  }

  async resolveConflict(
    userId: number,
    conflictId: number,
    resolution: "keep_local" | "keep_remote" | "dismissed",
  ): Promise<SyncConflictDto> {
    const conflict = await this.conflictRepo.findByIdAndUser(conflictId, userId);

    if (!conflict) {
      throw new NotFoundException(`Conflict ${conflictId} not found`);
    }

    conflict.resolution = resolution as ConflictResolution;
    conflict.resolvedAt = now().toJSDate();
    conflict.resolvedById = userId;

    if (resolution === "keep_local" && conflict.calendarEventId) {
      await this.calendarEventRepo.deleteById(conflict.calendarEventId);
    } else if (resolution === "keep_remote" && conflict.meetingId) {
      await this.meetingRepo.updateStatus(conflict.meetingId, MeetingStatus.CANCELLED);
    }

    const saved = await this.conflictRepo.save(conflict);

    return {
      id: saved.id,
      userId: saved.userId,
      meetingId: saved.meetingId,
      calendarEventId: saved.calendarEventId,
      conflictType: saved.conflictType,
      localData: saved.localData,
      remoteData: saved.remoteData,
      resolution: saved.resolution,
      resolvedAt: saved.resolvedAt,
      createdAt: saved.createdAt,
      meeting: conflict.meeting,
      calendarEvent: conflict.calendarEvent,
    };
  }

  async conflictCount(userId: number): Promise<number> {
    return this.conflictRepo.countPendingForUser(userId);
  }
}
