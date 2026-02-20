import * as crypto from "node:crypto";
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

interface ZoomTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface ZoomUserResponse {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  timezone?: string;
  pic_url?: string;
  account_id?: string;
}

interface ZoomMeetingInstance {
  uuid: string;
  id: number;
  host_id: string;
  topic: string;
  type: number;
  start_time: string;
  duration: number;
  timezone: string;
  created_at: string;
  join_url: string;
  participant_count?: number;
}

interface ZoomMeetingsListResponse {
  page_count: number;
  page_number: number;
  page_size: number;
  total_records: number;
  meetings: ZoomMeetingInstance[];
}

interface ZoomRecordingFile {
  id: string;
  meeting_id: string;
  recording_start: string;
  recording_end: string;
  file_type: string;
  file_extension: string;
  file_size: number;
  play_url?: string;
  download_url: string;
  status: string;
  recording_type: string;
}

interface ZoomRecordingResponse {
  uuid: string;
  id: number;
  account_id: string;
  host_id: string;
  host_email: string;
  topic: string;
  type: number;
  start_time: string;
  duration: number;
  total_size: number;
  recording_count: number;
  share_url: string;
  password?: string;
  recording_files: ZoomRecordingFile[];
}

interface ZoomRecordingsListResponse {
  from: string;
  to: string;
  page_count: number;
  page_size: number;
  total_records: number;
  meetings: ZoomRecordingResponse[];
}

interface ZoomParticipantsResponse {
  page_count: number;
  page_size: number;
  total_records: number;
  participants: Array<{
    id: string;
    name: string;
    user_email: string;
    join_time: string;
    leave_time: string;
    duration: number;
  }>;
}

interface ZoomWebhookPayload {
  event: string;
  event_ts: number;
  payload: {
    account_id: string;
    object: {
      uuid?: string;
      id?: number | string;
      host_id?: string;
      topic?: string;
      type?: number;
      start_time?: string;
      timezone?: string;
      duration?: number;
      recording_files?: ZoomRecordingFile[];
    };
  };
}

@Injectable()
export class ZoomMeetingProvider implements IMeetingPlatformProvider {
  private readonly logger = new Logger(ZoomMeetingProvider.name);
  readonly platform = MeetingPlatform.ZOOM;

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly webhookSecret: string;
  private readonly zoomOauthBaseUrl = "https://zoom.us/oauth";
  private readonly apiUrl = "https://api.zoom.us/v2";

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.get<string>("ZOOM_CLIENT_ID") ?? "";
    this.clientSecret = this.configService.get<string>("ZOOM_CLIENT_SECRET") ?? "";
    this.webhookSecret = this.configService.get<string>("ZOOM_WEBHOOK_SECRET_TOKEN") ?? "";
  }

  oauthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.clientId,
      redirect_uri: redirectUri,
      state,
    });
    return `${this.zoomOauthBaseUrl}/authorize?${params.toString()}`;
  }

  async exchangeAuthCode(
    authCode: string,
    redirectUri: string,
  ): Promise<PlatformOAuthTokenResponse> {
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");

    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code: authCode,
      redirect_uri: redirectUri,
    });

    const response = await fetch(`${this.zoomOauthBaseUrl}/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Zoom token exchange failed: ${error}`);
      throw new Error("Failed to exchange Zoom authorization code");
    }

    const data: ZoomTokenResponse = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? null,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
      scope: data.scope,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<PlatformOAuthTokenResponse> {
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");

    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    const response = await fetch(`${this.zoomOauthBaseUrl}/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Zoom token refresh failed: ${error}`);
      throw new Error("Failed to refresh Zoom access token");
    }

    const data: ZoomTokenResponse = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
      scope: data.scope,
    };
  }

  async userInfo(config: PlatformProviderConfig): Promise<PlatformUserInfo> {
    const response = await fetch(`${this.apiUrl}/users/me`, {
      headers: { Authorization: `Bearer ${config.accessToken}` },
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Zoom user info fetch failed: ${error}`);
      throw new Error("Failed to fetch Zoom user info");
    }

    const data: ZoomUserResponse = await response.json();
    const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || data.display_name;

    return {
      email: data.email,
      name: name ?? null,
      accountId: data.account_id ?? data.id,
      timezone: data.timezone ?? null,
      pictureUrl: data.pic_url ?? null,
    };
  }

  async listRecentMeetings(
    config: PlatformProviderConfig,
    fromDate: Date,
    toDate?: Date,
  ): Promise<PlatformMeetingData[]> {
    const to = toDate ?? new Date();
    const from = fromDate.toISOString().split("T")[0];
    const toStr = to.toISOString().split("T")[0];

    const recordings = await this.fetchRecordingsList(config, from, toStr);
    const pastMeetings = await this.fetchPastMeetings(config, from, toStr);

    const meetingMap = new Map<string, PlatformMeetingData>();

    for (const meeting of pastMeetings) {
      const data = this.mapZoomMeeting(meeting);
      meetingMap.set(data.platformMeetingId, data);
    }

    for (const recording of recordings) {
      const meetingId = String(recording.id);
      const existing = meetingMap.get(meetingId);

      if (existing) {
        existing.hasRecording = true;
      } else {
        meetingMap.set(meetingId, {
          platformMeetingId: meetingId,
          title: recording.topic,
          topic: recording.topic,
          hostEmail: recording.host_email,
          startTime: new Date(recording.start_time),
          endTime: null,
          durationSeconds: recording.duration * 60,
          joinUrl: null,
          participants: null,
          participantCount: null,
          hasRecording: true,
          timezone: null,
          rawData: recording as unknown as Record<string, unknown>,
        });
      }
    }

    return Array.from(meetingMap.values());
  }

  private async fetchPastMeetings(
    config: PlatformProviderConfig,
    from: string,
    to: string,
  ): Promise<ZoomMeetingInstance[]> {
    const meetings: ZoomMeetingInstance[] = [];

    const params = new URLSearchParams({
      type: "past",
      from,
      to,
      page_size: "100",
    });

    const response = await fetch(`${this.apiUrl}/users/me/meetings?${params.toString()}`, {
      headers: { Authorization: `Bearer ${config.accessToken}` },
    });

    if (!response.ok) {
      this.logger.warn(`Failed to fetch past meetings: ${response.status}`);
      return meetings;
    }

    const data: ZoomMeetingsListResponse = await response.json();
    meetings.push(...data.meetings);

    return meetings;
  }

  private async fetchRecordingsList(
    config: PlatformProviderConfig,
    from: string,
    to: string,
  ): Promise<ZoomRecordingResponse[]> {
    const recordings: ZoomRecordingResponse[] = [];
    let nextPageToken: string | null = null;

    do {
      const params = new URLSearchParams({
        from,
        to,
        page_size: "100",
      });

      if (nextPageToken) {
        params.set("next_page_token", nextPageToken);
      }

      const response = await fetch(`${this.apiUrl}/users/me/recordings?${params.toString()}`, {
        headers: { Authorization: `Bearer ${config.accessToken}` },
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`Zoom recordings list failed: ${error}`);
        throw new Error("Failed to fetch Zoom recordings");
      }

      const data: ZoomRecordingsListResponse = await response.json();
      recordings.push(...data.meetings);

      nextPageToken = null;
    } while (nextPageToken);

    return recordings;
  }

  private mapZoomMeeting(meeting: ZoomMeetingInstance): PlatformMeetingData {
    return {
      platformMeetingId: String(meeting.id),
      title: meeting.topic,
      topic: meeting.topic,
      hostEmail: null,
      startTime: new Date(meeting.start_time),
      endTime: null,
      durationSeconds: meeting.duration * 60,
      joinUrl: meeting.join_url,
      participants: null,
      participantCount: meeting.participant_count ?? null,
      hasRecording: false,
      timezone: meeting.timezone,
      rawData: meeting as unknown as Record<string, unknown>,
    };
  }

  async meetingRecordings(
    config: PlatformProviderConfig,
    meetingId: string,
  ): Promise<PlatformRecordingData | null> {
    const response = await fetch(`${this.apiUrl}/meetings/${meetingId}/recordings`, {
      headers: { Authorization: `Bearer ${config.accessToken}` },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Zoom recording fetch failed: ${error}`);
      throw new Error("Failed to fetch Zoom meeting recordings");
    }

    const data: ZoomRecordingResponse = await response.json();

    const audioFiles = data.recording_files.filter(
      (f) => f.file_type === "M4A" || f.file_type === "MP4" || f.recording_type === "audio_only",
    );

    const recordingFiles: PlatformRecordingFile[] = audioFiles.map((file) => ({
      recordingId: file.id,
      fileType: file.file_type,
      fileExtension: file.file_extension,
      fileSizeBytes: file.file_size,
      downloadUrl: file.download_url,
      playUrl: file.play_url ?? null,
      password: data.password ?? null,
      recordingStart: new Date(file.recording_start),
      recordingEnd: new Date(file.recording_end),
      durationSeconds: Math.round(
        (new Date(file.recording_end).getTime() - new Date(file.recording_start).getTime()) / 1000,
      ),
      rawData: file as unknown as Record<string, unknown>,
    }));

    return {
      platformMeetingId: String(data.id),
      title: data.topic,
      hostEmail: data.host_email,
      startTime: new Date(data.start_time),
      durationSeconds: data.duration * 60,
      shareUrl: data.share_url,
      password: data.password ?? null,
      recordingFiles,
      rawData: data as unknown as Record<string, unknown>,
    };
  }

  async downloadRecording(config: PlatformProviderConfig, downloadUrl: string): Promise<Buffer> {
    const urlWithToken = downloadUrl.includes("?")
      ? `${downloadUrl}&access_token=${config.accessToken}`
      : `${downloadUrl}?access_token=${config.accessToken}`;

    const response = await fetch(urlWithToken);

    if (!response.ok) {
      throw new Error(`Failed to download Zoom recording: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async fetchMeetingParticipants(
    config: PlatformProviderConfig,
    meetingUuid: string,
  ): Promise<string[]> {
    const encodedUuid = encodeURIComponent(encodeURIComponent(meetingUuid));

    const response = await fetch(`${this.apiUrl}/past_meetings/${encodedUuid}/participants`, {
      headers: { Authorization: `Bearer ${config.accessToken}` },
    });

    if (!response.ok) {
      this.logger.warn(`Failed to fetch meeting participants: ${response.status}`);
      return [];
    }

    const data: ZoomParticipantsResponse = await response.json();

    const uniqueParticipants = new Set<string>();
    for (const p of data.participants) {
      if (p.user_email) {
        uniqueParticipants.add(p.user_email);
      } else if (p.name) {
        uniqueParticipants.add(p.name);
      }
    }

    return Array.from(uniqueParticipants);
  }

  async registerWebhook(
    _config: PlatformProviderConfig,
    _callbackUrl: string,
    _events: string[],
  ): Promise<WebhookRegistrationResult> {
    this.logger.log("Zoom webhooks are configured via Zoom App Marketplace, not API");
    return {
      subscriptionId: "marketplace-configured",
      expiresAt: null,
    };
  }

  async unregisterWebhook(_config: PlatformProviderConfig, _subscriptionId: string): Promise<void> {
    this.logger.log("Zoom webhooks must be unregistered via Zoom App Marketplace");
  }

  verifyWebhookSignature(headers: Record<string, string>, body: string, secret: string): boolean {
    const timestamp = headers["x-zm-request-timestamp"];
    const signature = headers["x-zm-signature"];

    if (!timestamp || !signature) {
      return false;
    }

    const message = `v0:${timestamp}:${body}`;
    const hashForVerify = crypto
      .createHmac("sha256", secret || this.webhookSecret)
      .update(message)
      .digest("hex");

    const expectedSignature = `v0=${hashForVerify}`;

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }

  parseWebhookPayload(
    _headers: Record<string, string>,
    body: unknown,
    _secret?: string,
  ): WebhookEventPayload | null {
    const payload = body as ZoomWebhookPayload;

    if (!payload.event || !payload.payload?.object) {
      return null;
    }

    return {
      eventType: payload.event,
      meetingId: String(payload.payload.object.id ?? payload.payload.object.uuid),
      accountId: payload.payload.account_id ?? null,
      timestamp: new Date(payload.event_ts),
      rawPayload: payload as unknown as Record<string, unknown>,
    };
  }
}
