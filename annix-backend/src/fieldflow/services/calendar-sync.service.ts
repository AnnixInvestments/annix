import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { CalendarConnection, CalendarSyncStatus } from "../entities";
import { CalendarService } from "./calendar.service";

@Injectable()
export class CalendarSyncService {
  private readonly logger = new Logger(CalendarSyncService.name);
  private isSyncing = false;

  constructor(
    @InjectRepository(CalendarConnection)
    private readonly connectionRepo: Repository<CalendarConnection>,
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
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Sync failed for connection ${connection.id}: ${message}`);

      connection.syncStatus = CalendarSyncStatus.ERROR;
      connection.lastSyncError = message;

      await this.connectionRepo.save(connection);
    }
  }
}
