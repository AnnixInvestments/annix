import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { now } from "../../lib/datetime";
import {
  MeetingPlatform,
  MeetingPlatformConnection,
  PlatformConnectionStatus,
} from "../entities/meeting-platform-connection.entity";
import {
  PlatformMeetingRecord,
  PlatformRecordingStatus,
} from "../entities/platform-meeting-record.entity";
import type { WebhookEventPayload } from "../providers/meeting-platform-provider.interface";
import { MeetingPlatformService } from "./meeting-platform.service";

export interface WebhookProcessResult {
  success: boolean;
  action: string;
  recordId: number | null;
  error: string | null;
}

@Injectable()
export class CalendarWebhookService {
  private readonly logger = new Logger(CalendarWebhookService.name);
  private readonly zoomWebhookSecret: string;

  constructor(
    @InjectRepository(MeetingPlatformConnection)
    private readonly connectionRepo: Repository<MeetingPlatformConnection>,
    @InjectRepository(PlatformMeetingRecord)
    private readonly recordRepo: Repository<PlatformMeetingRecord>,
    private readonly platformService: MeetingPlatformService,
    private readonly configService: ConfigService,
  ) {
    this.zoomWebhookSecret = this.configService.get<string>("ZOOM_WEBHOOK_SECRET_TOKEN") ?? "";
  }

  async processZoomWebhook(
    headers: Record<string, string>,
    body: unknown,
  ): Promise<WebhookProcessResult> {
    const payload = body as Record<string, unknown>;

    if (payload.event === "endpoint.url_validation") {
      const plainToken = payload.payload as { plainToken: string } | undefined;
      if (plainToken?.plainToken) {
        return {
          success: true,
          action: "url_validation",
          recordId: null,
          error: null,
        };
      }
    }

    const provider = this.platformService.providerFor(MeetingPlatform.ZOOM);

    if (this.zoomWebhookSecret && provider.verifyWebhookSignature) {
      const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
      const isValid = provider.verifyWebhookSignature(headers, bodyStr, this.zoomWebhookSecret);

      if (!isValid) {
        this.logger.warn("Invalid Zoom webhook signature");
        return {
          success: false,
          action: "signature_verification",
          recordId: null,
          error: "Invalid webhook signature",
        };
      }
    }

    const event = provider.parseWebhookPayload!(headers, body);

    if (!event) {
      return {
        success: false,
        action: "parse",
        recordId: null,
        error: "Could not parse webhook payload",
      };
    }

    return this.handlePlatformEvent(MeetingPlatform.ZOOM, event);
  }

  async processTeamsWebhook(
    headers: Record<string, string>,
    body: unknown,
  ): Promise<WebhookProcessResult> {
    const payload = body as Record<string, unknown>;

    if (payload.validationToken) {
      return {
        success: true,
        action: "validation",
        recordId: null,
        error: null,
      };
    }

    const provider = this.platformService.providerFor(MeetingPlatform.TEAMS);
    const event = provider.parseWebhookPayload!(headers, body);

    if (!event) {
      return {
        success: false,
        action: "parse",
        recordId: null,
        error: "Could not parse webhook payload",
      };
    }

    return this.handlePlatformEvent(MeetingPlatform.TEAMS, event);
  }

  async processGoogleWebhook(
    headers: Record<string, string>,
    _body: unknown,
  ): Promise<WebhookProcessResult> {
    const resourceState = headers["x-goog-resource-state"];
    const channelId = headers["x-goog-channel-id"];

    if (resourceState === "sync") {
      return {
        success: true,
        action: "sync_notification",
        recordId: null,
        error: null,
      };
    }

    const provider = this.platformService.providerFor(MeetingPlatform.GOOGLE_MEET);
    const event = provider.parseWebhookPayload!(headers, {});

    if (!event) {
      return {
        success: false,
        action: "parse",
        recordId: null,
        error: "Could not parse webhook payload",
      };
    }

    return this.handlePlatformEvent(MeetingPlatform.GOOGLE_MEET, event);
  }

  private async handlePlatformEvent(
    platform: MeetingPlatform,
    event: WebhookEventPayload,
  ): Promise<WebhookProcessResult> {
    this.logger.log(
      `Processing ${platform} event: ${event.eventType} for meeting ${event.meetingId}`,
    );

    if (event.eventType === "meeting.ended" || event.eventType === "updated") {
      return this.handleMeetingEnded(platform, event);
    } else if (
      event.eventType === "recording.completed" ||
      event.eventType === "recording.transcript_completed"
    ) {
      return this.handleRecordingCompleted(platform, event);
    } else {
      this.logger.debug(`Unhandled event type: ${event.eventType}`);
      return {
        success: true,
        action: "ignored",
        recordId: null,
        error: null,
      };
    }
  }

  private async handleMeetingEnded(
    platform: MeetingPlatform,
    event: WebhookEventPayload,
  ): Promise<WebhookProcessResult> {
    const connection = await this.findConnectionByAccountId(platform, event.accountId);

    if (!connection) {
      this.logger.warn(`No connection found for ${platform} account ${event.accountId}`);
      return {
        success: false,
        action: "meeting_ended",
        recordId: null,
        error: "Connection not found",
      };
    }

    const existingRecord = await this.recordRepo.findOne({
      where: {
        connectionId: connection.id,
        platformMeetingId: event.meetingId,
      },
    });

    if (existingRecord) {
      existingRecord.recordingStatus = PlatformRecordingStatus.PENDING;
      await this.recordRepo.save(existingRecord);

      return {
        success: true,
        action: "meeting_ended",
        recordId: existingRecord.id,
        error: null,
      };
    }

    const rawData = event.rawPayload as Record<string, unknown>;
    const meetingData = (rawData.payload as Record<string, unknown> | undefined)?.object as
      | Record<string, unknown>
      | undefined;

    const record = this.recordRepo.create({
      connectionId: connection.id,
      platformMeetingId: event.meetingId,
      title: (meetingData?.topic as string) ?? "Meeting",
      topic: (meetingData?.topic as string) ?? null,
      startTime: event.timestamp,
      recordingStatus: PlatformRecordingStatus.PENDING,
      rawMeetingData: meetingData ?? null,
      fetchedAt: now().toJSDate(),
    });

    const saved = await this.recordRepo.save(record);

    this.logger.log(`Created platform record ${saved.id} from webhook event`);

    return {
      success: true,
      action: "meeting_ended",
      recordId: saved.id,
      error: null,
    };
  }

  private async handleRecordingCompleted(
    platform: MeetingPlatform,
    event: WebhookEventPayload,
  ): Promise<WebhookProcessResult> {
    const connection = await this.findConnectionByAccountId(platform, event.accountId);

    if (!connection) {
      return {
        success: false,
        action: "recording_completed",
        recordId: null,
        error: "Connection not found",
      };
    }

    const record = await this.recordRepo.findOne({
      where: {
        connectionId: connection.id,
        platformMeetingId: event.meetingId,
      },
    });

    if (record) {
      if (record.recordingStatus === PlatformRecordingStatus.NO_RECORDING) {
        record.recordingStatus = PlatformRecordingStatus.PENDING;
        await this.recordRepo.save(record);
      }

      return {
        success: true,
        action: "recording_completed",
        recordId: record.id,
        error: null,
      };
    }

    const rawData = event.rawPayload as Record<string, unknown>;
    const recordingData = (rawData.payload as Record<string, unknown> | undefined)?.object as
      | Record<string, unknown>
      | undefined;

    const newRecord = this.recordRepo.create({
      connectionId: connection.id,
      platformMeetingId: event.meetingId,
      title: (recordingData?.topic as string) ?? "Recording",
      startTime: event.timestamp,
      recordingStatus: PlatformRecordingStatus.PENDING,
      rawRecordingData: recordingData ?? null,
      fetchedAt: now().toJSDate(),
    });

    const saved = await this.recordRepo.save(newRecord);

    this.logger.log(`Created platform record ${saved.id} from recording completed webhook`);

    return {
      success: true,
      action: "recording_completed",
      recordId: saved.id,
      error: null,
    };
  }

  private async findConnectionByAccountId(
    platform: MeetingPlatform,
    accountId: string | null,
  ): Promise<MeetingPlatformConnection | null> {
    if (!accountId) {
      return null;
    }

    return this.connectionRepo.findOne({
      where: {
        platform,
        accountId,
        connectionStatus: PlatformConnectionStatus.ACTIVE,
      },
    });
  }

  zoomUrlValidationResponse(plainToken: string): { plainToken: string; encryptedToken: string } {
    const crypto = require("node:crypto");
    const hashForValidation = crypto
      .createHmac("sha256", this.zoomWebhookSecret)
      .update(plainToken)
      .digest("hex");

    return {
      plainToken,
      encryptedToken: hashForValidation,
    };
  }
}
