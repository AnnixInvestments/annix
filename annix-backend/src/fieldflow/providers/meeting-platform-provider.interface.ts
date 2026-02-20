import { MeetingPlatform } from "../entities/meeting-platform.enums";

export interface PlatformOAuthTokenResponse {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number;
  tokenType: string;
  scope: string | null;
}

export interface PlatformProviderConfig {
  accessToken: string;
  refreshToken: string | null;
  accountId?: string;
}

export interface PlatformUserInfo {
  email: string;
  name: string | null;
  accountId: string | null;
  timezone: string | null;
  pictureUrl: string | null;
}

export interface PlatformMeetingData {
  platformMeetingId: string;
  title: string;
  topic: string | null;
  hostEmail: string | null;
  startTime: Date;
  endTime: Date | null;
  durationSeconds: number | null;
  joinUrl: string | null;
  participants: string[] | null;
  participantCount: number | null;
  hasRecording: boolean;
  timezone: string | null;
  rawData: Record<string, unknown>;
}

export interface PlatformRecordingFile {
  recordingId: string;
  fileType: string;
  fileExtension: string;
  fileSizeBytes: number | null;
  downloadUrl: string;
  playUrl: string | null;
  password: string | null;
  recordingStart: Date | null;
  recordingEnd: Date | null;
  durationSeconds: number | null;
  rawData: Record<string, unknown>;
}

export interface PlatformRecordingData {
  platformMeetingId: string;
  title: string;
  hostEmail: string | null;
  startTime: Date;
  durationSeconds: number | null;
  shareUrl: string | null;
  password: string | null;
  recordingFiles: PlatformRecordingFile[];
  rawData: Record<string, unknown>;
}

export interface WebhookRegistrationResult {
  subscriptionId: string;
  expiresAt: Date | null;
}

export interface WebhookEventPayload {
  eventType: string;
  meetingId: string;
  accountId: string | null;
  timestamp: Date;
  rawPayload: Record<string, unknown>;
}

export interface IMeetingPlatformProvider {
  readonly platform: MeetingPlatform;

  oauthUrl(redirectUri: string, state: string): string;

  exchangeAuthCode(authCode: string, redirectUri: string): Promise<PlatformOAuthTokenResponse>;

  refreshAccessToken(refreshToken: string): Promise<PlatformOAuthTokenResponse>;

  userInfo(config: PlatformProviderConfig): Promise<PlatformUserInfo>;

  listRecentMeetings(
    config: PlatformProviderConfig,
    fromDate: Date,
    toDate?: Date,
  ): Promise<PlatformMeetingData[]>;

  meetingRecordings(
    config: PlatformProviderConfig,
    meetingId: string,
  ): Promise<PlatformRecordingData | null>;

  downloadRecording(config: PlatformProviderConfig, downloadUrl: string): Promise<Buffer>;

  registerWebhook?(
    config: PlatformProviderConfig,
    callbackUrl: string,
    events: string[],
  ): Promise<WebhookRegistrationResult>;

  unregisterWebhook?(config: PlatformProviderConfig, subscriptionId: string): Promise<void>;

  parseWebhookPayload?(
    headers: Record<string, string>,
    body: unknown,
    secret?: string,
  ): WebhookEventPayload | null;

  verifyWebhookSignature?(headers: Record<string, string>, body: string, secret: string): boolean;
}
