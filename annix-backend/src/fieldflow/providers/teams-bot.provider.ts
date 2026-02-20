import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

interface AppOnlyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface TeamsCallResponse {
  "@odata.type": string;
  id: string;
  state: string;
  direction: string;
  callbackUri: string;
  mediaState?: {
    audio: string;
  };
  chatInfo?: {
    threadId: string;
    messageId: string;
  };
  meetingInfo?: {
    allowConversationWithoutHost: boolean;
    organizer?: {
      user?: {
        id: string;
        displayName: string;
      };
    };
  };
  source?: {
    identity?: {
      application?: {
        id: string;
        displayName: string;
      };
    };
  };
}

interface TeamsParticipantInfo {
  "@odata.type": string;
  info: {
    identity: {
      user?: {
        id: string;
        displayName: string;
      };
      application?: {
        id: string;
        displayName: string;
      };
    };
  };
}

interface TeamsParticipantsResponse {
  value: TeamsParticipantInfo[];
}

export interface ParsedTeamsMeetingUrl {
  threadId: string;
  organizerId: string;
  tenantId: string;
  messageId: string;
}

@Injectable()
export class TeamsBotProvider {
  private readonly logger = new Logger(TeamsBotProvider.name);
  private readonly graphUrl = "https://graph.microsoft.com/v1.0";

  private readonly botAppId: string;
  private readonly botAppSecret: string;
  private readonly botTenantId: string;
  private readonly callbackUrl: string;

  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(private readonly configService: ConfigService) {
    this.botAppId = this.configService.get<string>("TEAMS_BOT_APP_ID") ?? "";
    this.botAppSecret = this.configService.get<string>("TEAMS_BOT_APP_SECRET") ?? "";
    this.botTenantId = this.configService.get<string>("TEAMS_BOT_TENANT_ID") ?? "";
    this.callbackUrl = this.configService.get<string>("TEAMS_BOT_CALLBACK_URL") ?? "";
  }

  isConfigured(): boolean {
    return Boolean(this.botAppId && this.botAppSecret && this.botTenantId && this.callbackUrl);
  }

  private async appOnlyToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && this.tokenExpiresAt > now + 60000) {
      return this.cachedToken;
    }

    const tokenUrl = `https://login.microsoftonline.com/${this.botTenantId}/oauth2/v2.0/token`;

    const params = new URLSearchParams({
      client_id: this.botAppId,
      client_secret: this.botAppSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    });

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`App-only token acquisition failed: ${error}`);
      throw new Error("Failed to acquire app-only token for Teams bot");
    }

    const data: AppOnlyTokenResponse = await response.json();

    this.cachedToken = data.access_token;
    this.tokenExpiresAt = now + data.expires_in * 1000;

    return data.access_token;
  }

  parseMeetingUrl(meetingUrl: string): ParsedTeamsMeetingUrl | null {
    try {
      const url = new URL(meetingUrl);

      if (
        !url.hostname.includes("teams.microsoft.com") &&
        !url.hostname.includes("teams.live.com")
      ) {
        return null;
      }

      const pathMatch = url.pathname.match(/\/l\/meetup-join\/([^/]+)/);
      if (!pathMatch) {
        const contextParam = url.searchParams.get("context");
        if (contextParam) {
          const decoded = JSON.parse(decodeURIComponent(contextParam)) as {
            Tid?: string;
            Oid?: string;
          };
          return {
            threadId: url.searchParams.get("threadId") ?? "",
            organizerId: decoded.Oid ?? "",
            tenantId: decoded.Tid ?? "",
            messageId: url.searchParams.get("messageId") ?? "0",
          };
        }
        return null;
      }

      const encodedPart = pathMatch[1];
      const decoded = Buffer.from(encodedPart, "base64").toString("utf-8");
      const parsed = JSON.parse(decoded) as {
        Tid?: string;
        Oid?: string;
        threadId?: string;
        messageId?: string;
      };

      return {
        threadId: parsed.threadId ?? "",
        organizerId: parsed.Oid ?? "",
        tenantId: parsed.Tid ?? "",
        messageId: parsed.messageId ?? "0",
      };
    } catch (error) {
      this.logger.warn(`Failed to parse Teams meeting URL: ${meetingUrl}`, error);
      return null;
    }
  }

  async joinMeeting(
    meetingUrl: string,
    displayName: string,
  ): Promise<{ callId: string; threadId: string | null; organizerId: string | null }> {
    const token = await this.appOnlyToken();

    const parsedUrl = this.parseMeetingUrl(meetingUrl);

    const requestBody = {
      "@odata.type": "#microsoft.graph.call",
      callbackUri: this.callbackUrl,
      requestedModalities: ["audio"],
      mediaConfig: {
        "@odata.type": "#microsoft.graph.serviceHostedMediaConfig",
      },
      chatInfo: parsedUrl
        ? {
            "@odata.type": "#microsoft.graph.chatInfo",
            threadId: parsedUrl.threadId,
            messageId: parsedUrl.messageId,
          }
        : undefined,
      meetingInfo: {
        "@odata.type": "#microsoft.graph.organizerMeetingInfo",
        organizer: parsedUrl
          ? {
              "@odata.type": "#microsoft.graph.identitySet",
              user: {
                "@odata.type": "#microsoft.graph.identity",
                id: parsedUrl.organizerId,
                tenantId: parsedUrl.tenantId,
              },
            }
          : undefined,
        allowConversationWithoutHost: true,
      },
      tenantId: parsedUrl?.tenantId ?? this.botTenantId,
      source: {
        "@odata.type": "#microsoft.graph.participantInfo",
        identity: {
          "@odata.type": "#microsoft.graph.identitySet",
          application: {
            "@odata.type": "#microsoft.graph.identity",
            id: this.botAppId,
            displayName: displayName,
          },
        },
      },
    };

    const response = await fetch(`${this.graphUrl}/communications/calls`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Failed to join Teams meeting: ${error}`);
      throw new Error(`Failed to join Teams meeting: ${response.status}`);
    }

    const callData: TeamsCallResponse = await response.json();

    return {
      callId: callData.id,
      threadId: callData.chatInfo?.threadId ?? parsedUrl?.threadId ?? null,
      organizerId: callData.meetingInfo?.organizer?.user?.id ?? parsedUrl?.organizerId ?? null,
    };
  }

  async leaveMeeting(callId: string): Promise<void> {
    const token = await this.appOnlyToken();

    const response = await fetch(`${this.graphUrl}/communications/calls/${callId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok && response.status !== 404) {
      const error = await response.text();
      this.logger.warn(`Failed to leave Teams meeting: ${error}`);
    }
  }

  async callParticipants(
    callId: string,
  ): Promise<Array<{ id: string; displayName: string; type: "user" | "application" }>> {
    const token = await this.appOnlyToken();

    const response = await fetch(`${this.graphUrl}/communications/calls/${callId}/participants`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      this.logger.warn(`Failed to get call participants: ${response.status}`);
      return [];
    }

    const data: TeamsParticipantsResponse = await response.json();

    return data.value.map((p) => {
      const user = p.info.identity.user;
      const app = p.info.identity.application;

      if (user) {
        return {
          id: user.id,
          displayName: user.displayName ?? "Unknown User",
          type: "user" as const,
        };
      }

      return {
        id: app?.id ?? "unknown",
        displayName: app?.displayName ?? "Unknown Application",
        type: "application" as const,
      };
    });
  }

  async callState(callId: string): Promise<string | null> {
    const token = await this.appOnlyToken();

    const response = await fetch(`${this.graphUrl}/communications/calls/${callId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      this.logger.warn(`Failed to get call state: ${response.status}`);
      return null;
    }

    const data: TeamsCallResponse = await response.json();
    return data.state;
  }

  async subscribeToMediaStream(callId: string): Promise<void> {
    const token = await this.appOnlyToken();

    const requestBody = {
      clientContext: `subscribe-${callId}`,
      modalities: ["audio"],
    };

    const response = await fetch(
      `${this.graphUrl}/communications/calls/${callId}/subscribeToTone`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      this.logger.warn(`Failed to subscribe to media stream: ${error}`);
    }
  }
}
