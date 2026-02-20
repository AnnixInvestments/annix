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

interface MicrosoftTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface MicrosoftUserResponse {
  id: string;
  mail?: string;
  userPrincipalName: string;
  displayName?: string;
  givenName?: string;
  surname?: string;
}

interface TeamsOnlineMeeting {
  id: string;
  creationDateTime: string;
  startDateTime: string;
  endDateTime: string;
  subject: string;
  joinWebUrl: string;
  participants?: {
    organizer?: {
      identity?: {
        user?: {
          displayName?: string;
          id?: string;
        };
      };
    };
    attendees?: Array<{
      identity?: {
        user?: {
          displayName?: string;
          id?: string;
        };
      };
    }>;
  };
  chatInfo?: {
    threadId: string;
  };
  recordingEnabled?: boolean;
}

interface TeamsOnlineMeetingsResponse {
  value: TeamsOnlineMeeting[];
  "@odata.nextLink"?: string;
}

interface TeamsCallRecordResponse {
  id: string;
  type: string;
  startDateTime: string;
  endDateTime: string;
  joinWebUrl?: string;
  participants: Array<{
    id: string;
    displayName?: string;
    userPrincipalName?: string;
  }>;
  organizer?: {
    id: string;
    displayName?: string;
  };
}

interface TeamsRecordingResponse {
  value: Array<{
    id: string;
    meetingId: string;
    recordingContentUrl: string;
    createdDateTime: string;
    content?: {
      downloadUrl: string;
    };
  }>;
}

interface TeamsDriveItem {
  id: string;
  name: string;
  size: number;
  file?: {
    mimeType: string;
  };
  "@microsoft.graph.downloadUrl"?: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
}

interface TeamsDriveItemsResponse {
  value: TeamsDriveItem[];
  "@odata.nextLink"?: string;
}

interface TeamsSubscriptionResponse {
  id: string;
  expirationDateTime: string;
  resource: string;
  changeType: string;
  notificationUrl: string;
}

@Injectable()
export class TeamsMeetingProvider implements IMeetingPlatformProvider {
  private readonly logger = new Logger(TeamsMeetingProvider.name);
  readonly platform = MeetingPlatform.TEAMS;

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly tenantId: string;
  private readonly graphUrl = "https://graph.microsoft.com/v1.0";

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.get<string>("MS_GRAPH_CLIENT_ID") ?? "";
    this.clientSecret = this.configService.get<string>("MS_GRAPH_CLIENT_SECRET") ?? "";
    this.tenantId = this.configService.get<string>("MS_GRAPH_TENANT_ID") ?? "common";
  }

  private authUrl(): string {
    return `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0`;
  }

  oauthUrl(redirectUri: string, state: string): string {
    const scopes = [
      "openid",
      "profile",
      "email",
      "offline_access",
      "OnlineMeetings.Read",
      "OnlineMeetingRecording.Read.All",
      "User.Read",
      "Calendars.Read",
    ];

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: scopes.join(" "),
      state,
      response_mode: "query",
    });

    return `${this.authUrl()}/authorize?${params.toString()}`;
  }

  async exchangeAuthCode(
    authCode: string,
    redirectUri: string,
  ): Promise<PlatformOAuthTokenResponse> {
    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code: authCode,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });

    const response = await fetch(`${this.authUrl()}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Microsoft token exchange failed: ${error}`);
      throw new Error("Failed to exchange Microsoft authorization code");
    }

    const data: MicrosoftTokenResponse = await response.json();

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
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });

    const response = await fetch(`${this.authUrl()}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Microsoft token refresh failed: ${error}`);
      throw new Error("Failed to refresh Microsoft access token");
    }

    const data: MicrosoftTokenResponse = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
      scope: data.scope,
    };
  }

  async userInfo(config: PlatformProviderConfig): Promise<PlatformUserInfo> {
    const response = await fetch(`${this.graphUrl}/me`, {
      headers: { Authorization: `Bearer ${config.accessToken}` },
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Microsoft user info fetch failed: ${error}`);
      throw new Error("Failed to fetch Microsoft user info");
    }

    const data: MicrosoftUserResponse = await response.json();

    const name = [data.givenName, data.surname].filter(Boolean).join(" ") || data.displayName;

    return {
      email: data.mail ?? data.userPrincipalName,
      name: name ?? null,
      accountId: data.id,
      timezone: null,
      pictureUrl: null,
    };
  }

  async listRecentMeetings(
    config: PlatformProviderConfig,
    fromDate: Date,
    toDate?: Date,
  ): Promise<PlatformMeetingData[]> {
    const meetings: PlatformMeetingData[] = [];
    const to = toDate ?? new Date();

    const filter = `startDateTime ge ${fromDate.toISOString()} and startDateTime le ${to.toISOString()}`;
    const params = new URLSearchParams({
      $filter: filter,
      $orderby: "startDateTime desc",
      $top: "100",
    });

    let url: string | null = `${this.graphUrl}/me/onlineMeetings?${params.toString()}`;

    while (url) {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${config.accessToken}` },
      });

      if (!response.ok) {
        if (response.status === 403) {
          this.logger.warn("Insufficient permissions to list online meetings");
          break;
        }
        const error = await response.text();
        this.logger.error(`Teams meetings list failed: ${error}`);
        throw new Error("Failed to fetch Teams meetings");
      }

      const data: TeamsOnlineMeetingsResponse = await response.json();

      for (const meeting of data.value) {
        meetings.push(this.mapTeamsMeeting(meeting));
      }

      url = data["@odata.nextLink"] ?? null;
    }

    const calendarMeetings = await this.fetchCalendarTeamsMeetings(config, fromDate, to);
    for (const cm of calendarMeetings) {
      const exists = meetings.some((m) => m.joinUrl === cm.joinUrl);
      if (!exists) {
        meetings.push(cm);
      }
    }

    return meetings;
  }

  private async fetchCalendarTeamsMeetings(
    config: PlatformProviderConfig,
    fromDate: Date,
    toDate: Date,
  ): Promise<PlatformMeetingData[]> {
    const meetings: PlatformMeetingData[] = [];

    const params = new URLSearchParams({
      startDateTime: fromDate.toISOString(),
      endDateTime: toDate.toISOString(),
      $filter: "isOnlineMeeting eq true",
      $select: "id,subject,start,end,onlineMeeting,organizer,attendees",
      $top: "100",
    });

    const response = await fetch(`${this.graphUrl}/me/calendarView?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        Prefer: 'outlook.timezone="UTC"',
      },
    });

    if (!response.ok) {
      this.logger.warn(`Calendar view fetch failed: ${response.status}`);
      return meetings;
    }

    interface CalendarEvent {
      id: string;
      subject: string;
      start: { dateTime: string };
      end: { dateTime: string };
      onlineMeeting?: { joinUrl: string };
      organizer?: { emailAddress?: { address: string } };
      attendees?: Array<{ emailAddress?: { address: string } }>;
    }

    const data: { value: CalendarEvent[] } = await response.json();

    for (const event of data.value) {
      if (event.onlineMeeting?.joinUrl?.includes("teams.microsoft.com")) {
        meetings.push({
          platformMeetingId: event.id,
          title: event.subject,
          topic: event.subject,
          hostEmail: event.organizer?.emailAddress?.address ?? null,
          startTime: new Date(event.start.dateTime),
          endTime: new Date(event.end.dateTime),
          durationSeconds: Math.round(
            (new Date(event.end.dateTime).getTime() - new Date(event.start.dateTime).getTime()) /
              1000,
          ),
          joinUrl: event.onlineMeeting.joinUrl,
          participants: event.attendees?.map((a) => a.emailAddress?.address).filter(Boolean) as
            | string[]
            | null,
          participantCount: event.attendees?.length ?? null,
          hasRecording: false,
          timezone: "UTC",
          rawData: event as unknown as Record<string, unknown>,
        });
      }
    }

    return meetings;
  }

  private mapTeamsMeeting(meeting: TeamsOnlineMeeting): PlatformMeetingData {
    const startTime = new Date(meeting.startDateTime);
    const endTime = new Date(meeting.endDateTime);
    const durationSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

    const attendees =
      meeting.participants?.attendees?.map((a) => a.identity?.user?.displayName).filter(Boolean) ??
      null;

    return {
      platformMeetingId: meeting.id,
      title: meeting.subject,
      topic: meeting.subject,
      hostEmail: null,
      startTime,
      endTime,
      durationSeconds,
      joinUrl: meeting.joinWebUrl,
      participants: attendees as string[] | null,
      participantCount: meeting.participants?.attendees?.length ?? null,
      hasRecording: meeting.recordingEnabled ?? false,
      timezone: null,
      rawData: meeting as unknown as Record<string, unknown>,
    };
  }

  async meetingRecordings(
    config: PlatformProviderConfig,
    meetingId: string,
  ): Promise<PlatformRecordingData | null> {
    const recordingResponse = await fetch(
      `${this.graphUrl}/me/onlineMeetings/${meetingId}/recordings`,
      {
        headers: { Authorization: `Bearer ${config.accessToken}` },
      },
    );

    if (recordingResponse.status === 404) {
      return this.fetchRecordingFromOneDrive(config, meetingId);
    }

    if (!recordingResponse.ok) {
      this.logger.warn(`Meeting recordings fetch failed: ${recordingResponse.status}`);
      return this.fetchRecordingFromOneDrive(config, meetingId);
    }

    const recordings: TeamsRecordingResponse = await recordingResponse.json();

    if (!recordings.value || recordings.value.length === 0) {
      return this.fetchRecordingFromOneDrive(config, meetingId);
    }

    const recordingFiles: PlatformRecordingFile[] = recordings.value.map((rec) => ({
      recordingId: rec.id,
      fileType: "video/mp4",
      fileExtension: "mp4",
      fileSizeBytes: null,
      downloadUrl: rec.recordingContentUrl,
      playUrl: null,
      password: null,
      recordingStart: new Date(rec.createdDateTime),
      recordingEnd: null,
      durationSeconds: null,
      rawData: rec as unknown as Record<string, unknown>,
    }));

    return {
      platformMeetingId: meetingId,
      title: "Teams Meeting",
      hostEmail: null,
      startTime: new Date(recordings.value[0].createdDateTime),
      durationSeconds: null,
      shareUrl: null,
      password: null,
      recordingFiles,
      rawData: recordings as unknown as Record<string, unknown>,
    };
  }

  private async fetchRecordingFromOneDrive(
    config: PlatformProviderConfig,
    meetingId: string,
  ): Promise<PlatformRecordingData | null> {
    const response = await fetch(
      `${this.graphUrl}/me/drive/root:/Recordings:/children?$filter=contains(name,'${meetingId}')&$select=id,name,size,file,@microsoft.graph.downloadUrl,createdDateTime`,
      {
        headers: { Authorization: `Bearer ${config.accessToken}` },
      },
    );

    if (!response.ok) {
      this.logger.warn(`OneDrive recordings search failed: ${response.status}`);
      return null;
    }

    const data: TeamsDriveItemsResponse = await response.json();

    if (!data.value || data.value.length === 0) {
      return null;
    }

    const recordingFiles: PlatformRecordingFile[] = data.value
      .filter((item) => item.file?.mimeType?.startsWith("video/") || item.name.endsWith(".mp4"))
      .map((item) => ({
        recordingId: item.id,
        fileType: item.file?.mimeType ?? "video/mp4",
        fileExtension: item.name.split(".").pop() ?? "mp4",
        fileSizeBytes: item.size,
        downloadUrl: item["@microsoft.graph.downloadUrl"] ?? "",
        playUrl: null,
        password: null,
        recordingStart: new Date(item.createdDateTime),
        recordingEnd: null,
        durationSeconds: null,
        rawData: item as unknown as Record<string, unknown>,
      }));

    if (recordingFiles.length === 0) {
      return null;
    }

    return {
      platformMeetingId: meetingId,
      title: data.value[0].name,
      hostEmail: null,
      startTime: new Date(data.value[0].createdDateTime),
      durationSeconds: null,
      shareUrl: null,
      password: null,
      recordingFiles,
      rawData: data as unknown as Record<string, unknown>,
    };
  }

  async downloadRecording(config: PlatformProviderConfig, downloadUrl: string): Promise<Buffer> {
    const response = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${config.accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to download Teams recording: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async registerWebhook(
    config: PlatformProviderConfig,
    callbackUrl: string,
    events: string[],
  ): Promise<WebhookRegistrationResult> {
    const expirationDateTime = new Date();
    expirationDateTime.setDate(expirationDateTime.getDate() + 2);

    const body = {
      changeType: events.join(",") || "created,updated",
      notificationUrl: callbackUrl,
      resource: "communications/callRecords",
      expirationDateTime: expirationDateTime.toISOString(),
      clientState: "fieldflow-webhook",
    };

    const response = await fetch(`${this.graphUrl}/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Teams webhook registration failed: ${error}`);
      throw new Error("Failed to register Teams webhook");
    }

    const data: TeamsSubscriptionResponse = await response.json();

    return {
      subscriptionId: data.id,
      expiresAt: new Date(data.expirationDateTime),
    };
  }

  async unregisterWebhook(config: PlatformProviderConfig, subscriptionId: string): Promise<void> {
    const response = await fetch(`${this.graphUrl}/subscriptions/${subscriptionId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${config.accessToken}` },
    });

    if (!response.ok && response.status !== 404) {
      this.logger.warn(`Teams webhook unregistration failed: ${response.status}`);
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
    _headers: Record<string, string>,
    body: unknown,
    _secret?: string,
  ): WebhookEventPayload | null {
    interface TeamsChangeNotification {
      value: Array<{
        changeType: string;
        resourceData: {
          id: string;
          "@odata.type"?: string;
        };
        clientState?: string;
        subscriptionExpirationDateTime?: string;
      }>;
    }

    const payload = body as TeamsChangeNotification;

    if (!payload.value || payload.value.length === 0) {
      return null;
    }

    const notification = payload.value[0];

    return {
      eventType: notification.changeType,
      meetingId: notification.resourceData.id,
      accountId: null,
      timestamp: new Date(),
      rawPayload: payload as unknown as Record<string, unknown>,
    };
  }
}
