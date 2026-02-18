import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { In, LessThanOrEqual, MoreThanOrEqual, Repository } from "typeorm";
import { now } from "../../lib/datetime";
import {
  CalendarConnection,
  CalendarEvent,
  CalendarSyncStatus,
  type ConflictResolution,
  Meeting,
  MeetingStatus,
  SyncConflict,
} from "../entities";
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
    @InjectRepository(CalendarConnection)
    private readonly connectionRepo: Repository<CalendarConnection>,
    @InjectRepository(Meeting)
    private readonly meetingRepo: Repository<Meeting>,
    @InjectRepository(CalendarEvent)
    private readonly calendarEventRepo: Repository<CalendarEvent>,
    @InjectRepository(SyncConflict)
    private readonly conflictRepo: Repository<SyncConflict>,
    private readonly calendarService: CalendarService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async syncActiveConnections(): Promise<void> {
    if (this.isSyncing) {
      this.logger.debug("Sync already in progress, skipping");
      return;
    }

    this.isSyncing = true;

    const connections = await this.connectionRepo.find({
      where: { syncStatus: In([CalendarSyncStatus.ACTIVE, CalendarSyncStatus.ERROR]) },
    });

    if (connections.length === 0) {
      this.isSyncing = false;
      return;
    }

    this.logger.log(`Starting background sync for ${connections.length} connections`);

    for (const connection of connections) {
      await this.syncConnection(connection);
    }

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

    const meetings = await this.meetingRepo.find({
      where: {
        salesRepId: userId,
        scheduledStart: MoreThanOrEqual(today),
        scheduledEnd: LessThanOrEqual(futureDate),
      },
      order: { scheduledStart: "ASC" },
    });

    const calendarEvents = await this.calendarEventRepo.find({
      where: {
        connection: { userId },
        startTime: MoreThanOrEqual(today),
        endTime: LessThanOrEqual(futureDate),
      },
      relations: ["connection"],
      order: { startTime: "ASC" },
    });

    const newConflicts: SyncConflictDto[] = [];

    for (const meeting of meetings) {
      for (const event of calendarEvents) {
        if (meeting.calendarEventId === event.id) {
          continue;
        }

        const meetingStart = meeting.scheduledStart.getTime();
        const meetingEnd = meeting.scheduledEnd.getTime();
        const eventStart = event.startTime.getTime();
        const eventEnd = event.endTime.getTime();

        const hasOverlap =
          (meetingStart < eventEnd && meetingEnd > eventStart) ||
          (eventStart < meetingEnd && eventEnd > meetingStart);

        if (hasOverlap) {
          const existingConflict = await this.conflictRepo.findOne({
            where: {
              userId,
              meetingId: meeting.id,
              calendarEventId: event.id,
              resolution: "pending",
            },
          });

          if (!existingConflict) {
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

            const conflictEntity = this.conflictRepo.create(conflictData as Partial<SyncConflict>);
            const saved = await this.conflictRepo.save(conflictEntity);
            const savedSingle = Array.isArray(saved) ? saved[0] : saved;
            newConflicts.push({
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
            });
          }
        }
      }
    }

    if (newConflicts.length > 0) {
      this.logger.log(`Detected ${newConflicts.length} new time conflicts for user ${userId}`);
    }

    return newConflicts;
  }

  async pendingConflicts(userId: number): Promise<SyncConflictDto[]> {
    const conflicts = await this.conflictRepo.find({
      where: { userId, resolution: "pending" },
      relations: ["meeting", "calendarEvent"],
      order: { createdAt: "DESC" },
    });

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
    const conflict = await this.conflictRepo.findOne({
      where: { id: conflictId, userId },
      relations: ["meeting", "calendarEvent"],
    });

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
    const conflict = await this.conflictRepo.findOne({
      where: { id: conflictId, userId },
      relations: ["meeting", "calendarEvent"],
    });

    if (!conflict) {
      throw new NotFoundException(`Conflict ${conflictId} not found`);
    }

    conflict.resolution = resolution as ConflictResolution;
    conflict.resolvedAt = now().toJSDate();
    conflict.resolvedById = userId;

    if (resolution === "keep_local" && conflict.calendarEventId) {
      await this.calendarEventRepo.delete({ id: conflict.calendarEventId });
    } else if (resolution === "keep_remote" && conflict.meetingId) {
      await this.meetingRepo.update(
        { id: conflict.meetingId },
        { status: MeetingStatus.CANCELLED },
      );
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
    return this.conflictRepo.count({
      where: { userId, resolution: "pending" },
    });
  }
}
