import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MeetingPlatform } from "../entities/meeting-platform.enums";
import type {
  IMeetingPlatformProvider,
  PlatformMeetingData,
  PlatformOAuthTokenResponse,
  PlatformProviderConfig,
  PlatformRecordingData,
  PlatformRecordingFile,
  PlatformUserInfo,
  WebhookEventPayload,
  WebhookRegistrationResult,
} from "./meeting-platform-provider.interface";

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface GoogleUserInfoResponse {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}

interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  status: string;
  hangoutLink?: string;
  conferenceData?: {
    conferenceId?: string;
    conferenceSolution?: {
      name?: string;
      key?: { type: string };
    };
    entryPoints?: Array<{
      entryPointType: string;
      uri: string;
      label?: string;
    }>;
  };
  organizer?: {
    email?: string;
    displayName?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  location?: string;
  recurringEventId?: string;
  recurrence?: string[];
}

interface GoogleCalendarEventsResponse {
  items?: GoogleCalendarEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
}

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  webViewLink?: string;
  webContentLink?: string;
  createdTime: string;
  modifiedTime: string;
  parents?: string[];
  videoMediaMetadata?: {
    durationMillis?: string;
    width?: number;
    height?: number;
  };
}

interface GoogleDriveFilesResponse {
  files: GoogleDriveFile[];
  nextPageToken?: string;
}

interface GoogleWatchResponse {
  id: string;
  resourceId: string;
  resourceUri: string;
  expiration: string;
}

@Injectable()
export class GoogleMeetProvider implements IMeetingPlatformProvider {
  private readonly logger = new Logger(GoogleMeetProvider.name);
  readonly platform = MeetingPlatform.GOOGLE_MEET;

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly tokenUrl = "https://oauth2.googleapis.com/token";
  private readonly calendarApiUrl = "https://www.googleapis.com/calendar/v3";
  private readonly driveApiUrl = "https://www.googleapis.com/drive/v3";
  private readonly userInfoUrl = "https://www.googleapis.com/oauth2/v2/userinfo";

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.get<string>("GOOGLE_CALENDAR_CLIENT_ID") ?? "";
    this.clientSecret = this.configService.get<string>("GOOGLE_CALENDAR_CLIENT_SECRET") ?? "";
  }

  oauthUrl(redirectUri: string, state: string): string {
    const scopes = [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/drive.readonly",
    ];

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: scopes.join(" "),
      state,
      access_type: "offline",
      prompt: "consent",
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeAuthCode(
    authCode: string,
    redirectUri: string,
  ): Promise<PlatformOAuthTokenResponse> {
    const params = new URLSearchParams({
      code: authCode,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });

    const response = await fetch(this.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Google Meet token exchange failed: ${error}`);
      throw new Error("Failed to exchange Google authorization code");
    }

    const data: GoogleTokenResponse = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? null,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
      scope: data.scope,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<PlatformOAuthTokenResponse> {
    const params = new URLSearchParams({
      refresh_token: refreshToken,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: "refresh_token",
    });

    const response = await fetch(this.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Google Meet token refresh failed: ${error}`);
      throw new Error("Failed to refresh Google access token");
    }

    const data: GoogleTokenResponse = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
      scope: data.scope,
    };
  }

  async userInfo(config: PlatformProviderConfig): Promise<PlatformUserInfo> {
    const response = await fetch(this.userInfoUrl, {
      headers: { Authorization: `Bearer ${config.accessToken}` },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch Google user info");
    }

    const data: GoogleUserInfoResponse = await response.json();

    return {
      email: data.email,
      name: data.name ?? null,
      accountId: data.id,
      timezone: null,
      pictureUrl: data.picture ?? null,
    };
  }

  async listRecentMeetings(
    config: PlatformProviderConfig,
    fromDate: Date,
    toDate?: Date,
  ): Promise<PlatformMeetingData[]> {
    const meetings: PlatformMeetingData[] = [];
    const to = toDate ?? new Date();

    let pageToken: string | null = null;

    do {
      const params = new URLSearchParams({
        timeMin: fromDate.toISOString(),
        timeMax: to.toISOString(),
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "100",
      });

      if (pageToken) {
        params.set("pageToken", pageToken);
      }

      const url = `${this.calendarApiUrl}/calendars/primary/events?${params.toString()}`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${config.accessToken}` },
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`Google Meet calendar events fetch failed: ${error}`);
        throw new Error("Failed to fetch Google Calendar events");
      }

      const data: GoogleCalendarEventsResponse = await response.json();

      if (data.items) {
        for (const event of data.items) {
          if (this.isGoogleMeetEvent(event)) {
            meetings.push(this.mapGoogleCalendarEvent(event));
          }
        }
      }

      pageToken = data.nextPageToken ?? null;
    } while (pageToken);

    return meetings;
  }

  private isGoogleMeetEvent(event: GoogleCalendarEvent): boolean {
    if (event.hangoutLink) {
      return true;
    }

    if (event.conferenceData?.conferenceSolution?.key?.type === "hangoutsMeet") {
      return true;
    }

    const meetEntry = event.conferenceData?.entryPoints?.find(
      (ep) => ep.entryPointType === "video" && ep.uri?.includes("meet.google.com"),
    );

    return Boolean(meetEntry);
  }

  private mapGoogleCalendarEvent(event: GoogleCalendarEvent): PlatformMeetingData {
    const isAllDay = Boolean(event.start.date);
    const startTime = isAllDay
      ? new Date(`${event.start.date}T00:00:00`)
      : new Date(event.start.dateTime!);
    const endTime = isAllDay
      ? new Date(`${event.end.date}T00:00:00`)
      : new Date(event.end.dateTime!);

    const durationSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

    let meetUrl: string | null = event.hangoutLink ?? null;
    if (!meetUrl && event.conferenceData?.entryPoints) {
      const videoEntry = event.conferenceData.entryPoints.find(
        (ep) => ep.entryPointType === "video",
      );
      meetUrl = videoEntry?.uri ?? null;
    }

    const participants = event.attendees?.map((a) => a.email) ?? null;

    return {
      platformMeetingId: event.conferenceData?.conferenceId ?? event.id,
      title: event.summary ?? "(No title)",
      topic: event.summary ?? null,
      hostEmail: event.organizer?.email ?? null,
      startTime,
      endTime,
      durationSeconds,
      joinUrl: meetUrl,
      participants,
      participantCount: participants?.length ?? null,
      hasRecording: false,
      timezone: event.start.timeZone ?? null,
      rawData: event as unknown as Record<string, unknown>,
    };
  }

  async meetingRecordings(
    config: PlatformProviderConfig,
    meetingId: string,
  ): Promise<PlatformRecordingData | null> {
    const recordings = await this.searchDriveForRecordings(config, meetingId);

    if (!recordings || recordings.length === 0) {
      const folderRecordings = await this.searchMeetRecordingsFolder(config, meetingId);
      if (!folderRecordings || folderRecordings.length === 0) {
        return null;
      }
      return this.buildRecordingData(meetingId, folderRecordings);
    }

    return this.buildRecordingData(meetingId, recordings);
  }

  private async searchDriveForRecordings(
    config: PlatformProviderConfig,
    meetingId: string,
  ): Promise<GoogleDriveFile[]> {
    const escapedMeetingId = meetingId.replace(/'/g, "\\'");

    const query = `(name contains '${escapedMeetingId}' or fullText contains '${escapedMeetingId}') and mimeType contains 'video/' and trashed = false`;

    const params = new URLSearchParams({
      q: query,
      fields:
        "files(id,name,mimeType,size,webViewLink,webContentLink,createdTime,modifiedTime,videoMediaMetadata)",
      pageSize: "20",
    });

    const response = await fetch(`${this.driveApiUrl}/files?${params.toString()}`, {
      headers: { Authorization: `Bearer ${config.accessToken}` },
    });

    if (!response.ok) {
      this.logger.warn(`Drive search failed: ${response.status}`);
      return [];
    }

    const data: GoogleDriveFilesResponse = await response.json();
    return data.files ?? [];
  }

  private async searchMeetRecordingsFolder(
    config: PlatformProviderConfig,
    meetingId: string,
  ): Promise<GoogleDriveFile[]> {
    const folderParams = new URLSearchParams({
      q: "name = 'Meet Recordings' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
      fields: "files(id,name)",
      pageSize: "1",
    });

    const folderResponse = await fetch(`${this.driveApiUrl}/files?${folderParams.toString()}`, {
      headers: { Authorization: `Bearer ${config.accessToken}` },
    });

    if (!folderResponse.ok) {
      return [];
    }

    const folderData: GoogleDriveFilesResponse = await folderResponse.json();
    const meetRecordingsFolder = folderData.files?.[0];

    if (!meetRecordingsFolder) {
      return [];
    }

    const escapedMeetingId = meetingId.replace(/'/g, "\\'");
    const filesQuery = `'${meetRecordingsFolder.id}' in parents and name contains '${escapedMeetingId}' and trashed = false`;

    const filesParams = new URLSearchParams({
      q: filesQuery,
      fields:
        "files(id,name,mimeType,size,webViewLink,webContentLink,createdTime,modifiedTime,videoMediaMetadata)",
      pageSize: "20",
    });

    const filesResponse = await fetch(`${this.driveApiUrl}/files?${filesParams.toString()}`, {
      headers: { Authorization: `Bearer ${config.accessToken}` },
    });

    if (!filesResponse.ok) {
      return [];
    }

    const filesData: GoogleDriveFilesResponse = await filesResponse.json();
    return filesData.files ?? [];
  }

  private buildRecordingData(meetingId: string, files: GoogleDriveFile[]): PlatformRecordingData {
    const recordingFiles: PlatformRecordingFile[] = files.map((file) => {
      const extension = file.name.split(".").pop() ?? "mp4";
      const durationMs = file.videoMediaMetadata?.durationMillis
        ? parseInt(file.videoMediaMetadata.durationMillis, 10)
        : null;

      return {
        recordingId: file.id,
        fileType: file.mimeType,
        fileExtension: extension,
        fileSizeBytes: file.size ? parseInt(file.size, 10) : null,
        downloadUrl: file.webContentLink ?? "",
        playUrl: file.webViewLink ?? null,
        password: null,
        recordingStart: new Date(file.createdTime),
        recordingEnd: null,
        durationSeconds: durationMs ? Math.round(durationMs / 1000) : null,
        rawData: file as unknown as Record<string, unknown>,
      };
    });

    const firstFile = files[0];

    return {
      platformMeetingId: meetingId,
      title: firstFile?.name ?? "Google Meet Recording",
      hostEmail: null,
      startTime: new Date(firstFile?.createdTime ?? new Date()),
      durationSeconds: recordingFiles[0]?.durationSeconds ?? null,
      shareUrl: firstFile?.webViewLink ?? null,
      password: null,
      recordingFiles,
      rawData: { files } as unknown as Record<string, unknown>,
    };
  }

  async downloadRecording(config: PlatformProviderConfig, downloadUrl: string): Promise<Buffer> {
    let url = downloadUrl;

    if (downloadUrl.includes("drive.google.com/file/d/")) {
      const fileIdMatch = downloadUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (fileIdMatch) {
        url = `${this.driveApiUrl}/files/${fileIdMatch[1]}?alt=media`;
      }
    }

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${config.accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to download Google Meet recording: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async registerWebhook(
    config: PlatformProviderConfig,
    callbackUrl: string,
    _events: string[],
  ): Promise<WebhookRegistrationResult> {
    const uuid = crypto.randomUUID();
    const expiration = Date.now() + 7 * 24 * 60 * 60 * 1000;

    const body = {
      id: uuid,
      type: "web_hook",
      address: callbackUrl,
      expiration: String(expiration),
    };

    const response = await fetch(`${this.calendarApiUrl}/calendars/primary/events/watch`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Google Calendar webhook registration failed: ${error}`);
      throw new Error("Failed to register Google Calendar webhook");
    }

    const data: GoogleWatchResponse = await response.json();

    return {
      subscriptionId: data.resourceId,
      expiresAt: new Date(parseInt(data.expiration, 10)),
    };
  }

  async unregisterWebhook(config: PlatformProviderConfig, subscriptionId: string): Promise<void> {
    const body = {
      id: subscriptionId,
      resourceId: subscriptionId,
    };

    const response = await fetch(`${this.calendarApiUrl}/channels/stop`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok && response.status !== 404) {
      this.logger.warn(`Google webhook unregistration failed: ${response.status}`);
    }
  }

  verifyWebhookSignature(
    _headers: Record<string, string>,
    _body: string,
    _secret: string,
  ): boolean {
    return true;
  }

  parseWebhookPayload(
    headers: Record<string, string>,
    _body: unknown,
    _secret?: string,
  ): WebhookEventPayload | null {
    const resourceState = headers["x-goog-resource-state"];
    const channelId = headers["x-goog-channel-id"];
    const resourceId = headers["x-goog-resource-id"];

    if (!resourceState || !channelId) {
      return null;
    }

    return {
      eventType: resourceState,
      meetingId: resourceId ?? channelId,
      accountId: null,
      timestamp: new Date(),
      rawPayload: { headers } as unknown as Record<string, unknown>,
    };
  }
}
