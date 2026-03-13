import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { now } from "../../lib/datetime";
import { MeetingPlatformService } from "./meeting-platform.service";
import { PlatformRecordingService } from "./platform-recording.service";

@Injectable()
export class MeetingSchedulerService {
  private readonly logger = new Logger(MeetingSchedulerService.name);
  private readonly enabled: boolean;

  constructor(
    private readonly platformService: MeetingPlatformService,
    private readonly recordingService: PlatformRecordingService,
    private readonly configService: ConfigService,
  ) {
    this.enabled = this.configService.get<string>("MEETING_SCHEDULER_ENABLED") !== "false";
    if (!this.enabled) {
      this.logger.warn("Meeting scheduler is disabled");
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async syncCompletedMeetings(): Promise<void> {
    if (!this.enabled) return;

    this.logger.debug("Starting completed meetings sync...");

    const connections = await this.platformService.activeConnections();

    const totals = await connections
      .filter((connection) => connection.autoFetchRecordings)
      .reduce(
        async (accPromise, connection) => {
          const acc = await accPromise;
          const result = await this.platformService.syncConnectionMeetings(connection, 1);
          return {
            synced: acc.synced + result.synced,
            recordings: acc.recordings + result.recordings,
          };
        },
        Promise.resolve({ synced: 0, recordings: 0 }),
      );

    if (totals.synced > 0) {
      this.logger.log(
        `Completed meetings sync: ${totals.synced} meetings, ${totals.recordings} recordings found`,
      );
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async downloadPendingRecordings(): Promise<void> {
    if (!this.enabled) return;

    this.logger.debug("Starting pending recordings download...");

    const results = await this.recordingService.processPendingRecordings(5);

    const successful = results.filter((r) => r.success && r.s3Path);
    const failed = results.filter((r) => !r.success);

    if (results.length > 0) {
      this.logger.log(
        `Recordings download: ${successful.length} successful, ${failed.length} failed`,
      );
    }

    failed.forEach((fail) => {
      this.logger.error(`Failed to download recording ${fail.recordId}: ${fail.error}`);
    });
  }

  @Cron(CronExpression.EVERY_HOUR)
  async refreshExpiringTokens(): Promise<void> {
    if (!this.enabled) return;

    this.logger.debug("Starting token refresh check...");

    const connections = await this.platformService.connectionsNeedingTokenRefresh();

    const refreshTotals = await connections.reduce(
      async (accPromise, connection) => {
        const acc = await accPromise;
        try {
          await this.platformService.refreshTokenIfNeeded(connection);
          return { refreshed: acc.refreshed + 1, failed: acc.failed };
        } catch (error) {
          await this.platformService.markConnectionError(
            connection.id,
            error instanceof Error ? error.message : "Token refresh failed",
          );
          return { refreshed: acc.refreshed, failed: acc.failed + 1 };
        }
      },
      Promise.resolve({ refreshed: 0, failed: 0 }),
    );

    if (connections.length > 0) {
      this.logger.log(
        `Token refresh: ${refreshTotals.refreshed} refreshed, ${refreshTotals.failed} failed`,
      );
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async weeklyFullSync(): Promise<void> {
    if (!this.enabled) return;

    const dayOfWeek = now().weekday % 7;
    if (dayOfWeek !== 0) {
      return;
    }

    this.logger.log("Starting weekly full sync...");

    const connections = await this.platformService.activeConnections();

    await connections
      .filter((connection) => connection.autoFetchRecordings)
      .reduce(async (accPromise, connection) => {
        await accPromise;
        try {
          await this.platformService.syncConnectionMeetings(connection, 30);
        } catch (error) {
          this.logger.error(
            `Weekly sync failed for connection ${connection.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      }, Promise.resolve());

    this.logger.log("Weekly full sync completed");
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupOldRecords(): Promise<void> {
    if (!this.enabled) return;

    this.logger.debug("Cleanup job - placeholder for future implementation");
  }

  async manualSync(
    userId: number,
    connectionId: number,
    daysBack: number = 7,
  ): Promise<{
    synced: number;
    recordings: number;
  }> {
    return this.platformService.syncRecentMeetings(userId, connectionId, daysBack);
  }

  async manualDownload(recordId: number): Promise<{
    success: boolean;
    s3Path: string | null;
    error: string | null;
  }> {
    const records = await this.recordingService.downloadedRecordingsForTranscription();
    const record = records.find((r) => r.id === recordId);

    if (!record) {
      return {
        success: false,
        s3Path: null,
        error: "Record not found or not in pending state",
      };
    }

    const result = await this.recordingService.fetchAndStoreRecording(record);

    return {
      success: result.success,
      s3Path: result.s3Path,
      error: result.error,
    };
  }
}
