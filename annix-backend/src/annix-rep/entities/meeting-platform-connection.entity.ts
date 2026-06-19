import { User } from "../../user/entities/user.entity";
import { MeetingPlatform, PlatformConnectionStatus } from "./meeting-platform.enums";
import { PlatformMeetingRecord } from "./platform-meeting-record.entity";

export { MeetingPlatform, PlatformConnectionStatus };

export class MeetingPlatformConnection {
  id: number;

  user: User;

  userId: number;

  platform: MeetingPlatform;

  accountEmail: string;

  accountName: string | null;

  accountId: string | null;

  accessTokenEncrypted: string;

  refreshTokenEncrypted: string | null;

  tokenExpiresAt: Date | null;

  tokenScope: string | null;

  webhookSubscriptionId: string | null;

  webhookExpiry: Date | null;

  connectionStatus: PlatformConnectionStatus;

  lastError: string | null;

  lastErrorAt: Date | null;

  autoFetchRecordings: boolean;

  autoTranscribe: boolean;

  autoSendSummary: boolean;

  lastRecordingSyncAt: Date | null;

  meetingRecords: PlatformMeetingRecord[];

  createdAt: Date;

  updatedAt: Date;
}
