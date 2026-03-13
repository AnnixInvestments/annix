import { Body, Controller, HttpCode, HttpStatus, Logger, Post, Res } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { nowISO } from "../../lib/datetime";
import { TeamsBotSessionStatus } from "../entities/teams-bot-session.entity";
import { TeamsBotGateway } from "../gateways/teams-bot.gateway";
import { TeamsBotService } from "../services/teams-bot.service";
import { TeamsBotAudioService } from "../services/teams-bot-audio.service";

interface TeamsCommsNotification {
  value: Array<{
    changeType: string;
    resource: string;
    resourceData: {
      "@odata.type": string;
      id: string;
      state?: string;
      direction?: string;
      mediaState?: {
        audio?: string;
      };
    };
  }>;
}

interface TeamsParticipantNotification {
  value: Array<{
    changeType: string;
    resource: string;
    resourceData: {
      "@odata.type": string;
      id: string;
      info?: {
        identity?: {
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
    };
  }>;
}

interface TeamsMediaNotification {
  callId: string;
  audioBuffer: string;
  format: string;
  timestamp: string;
  speakerId?: string;
  speakerName?: string;
}

@ApiTags("Webhooks - Teams Bot")
@Controller("webhooks/teams-bot")
export class TeamsBotWebhookController {
  private readonly logger = new Logger(TeamsBotWebhookController.name);

  constructor(
    private readonly teamsBotService: TeamsBotService,
    private readonly audioService: TeamsBotAudioService,
    private readonly gateway: TeamsBotGateway,
  ) {}

  @Post("call-state")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Receive Teams bot call state notifications" })
  @ApiResponse({ status: 200, description: "Notification processed" })
  async callState(@Body() body: unknown, @Res() res: Response): Promise<void> {
    const payload = body as TeamsCommsNotification;

    if (!payload.value || payload.value.length === 0) {
      res.status(200).json({ status: "no content" });
      return;
    }

    for (const notification of payload.value) {
      const callId = notification.resourceData.id;
      const state = notification.resourceData.state;

      this.logger.debug(`Call state notification: callId=${callId}, state=${state}`);

      const session = await this.teamsBotService.sessionByCallId(callId);
      if (!session) {
        this.logger.warn(`No session found for callId: ${callId}`);
        continue;
      }

      const mappedStatus = this.mapCallStateToSessionStatus(state);
      if (mappedStatus) {
        await this.teamsBotService.updateSessionStatus(callId, mappedStatus);

        this.gateway.emitStatusUpdate({
          sessionId: session.sessionId,
          callId,
          status: mappedStatus,
        });
      }

      if (state === "terminated" || state === "disconnected") {
        await this.audioService.flushAudioBuffer(callId);
        this.audioService.clearSession(callId);
      }
    }

    res.status(200).json({ status: "processed" });
  }

  @Post("participants")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Receive Teams bot participant notifications" })
  @ApiResponse({ status: 200, description: "Notification processed" })
  async participants(@Body() body: unknown, @Res() res: Response): Promise<void> {
    const payload = body as TeamsParticipantNotification;

    if (!payload.value || payload.value.length === 0) {
      res.status(200).json({ status: "no content" });
      return;
    }

    for (const notification of payload.value) {
      const resourceParts = notification.resource.split("/");
      const callIdIndex = resourceParts.indexOf("calls") + 1;
      const callId = resourceParts[callIdIndex];

      if (!callId) {
        continue;
      }

      const participantData = notification.resourceData;
      const identity = participantData.info?.identity;
      const user = identity?.user;
      const app = identity?.application;

      const participantId = user?.id ?? app?.id ?? participantData.id;
      const displayName = user?.displayName ?? app?.displayName ?? "Unknown";

      if (notification.changeType === "created") {
        const session = await this.teamsBotService.addParticipant(callId, {
          id: participantId,
          displayName,
          joinedAt: nowISO(),
          leftAt: null,
        });

        if (session) {
          this.gateway.emitParticipantUpdate({
            sessionId: session.sessionId,
            callId,
            type: "joined",
            participant: { id: participantId, displayName },
          });
        }
      } else if (notification.changeType === "deleted") {
        const session = await this.teamsBotService.removeParticipant(callId, participantId);

        if (session) {
          this.gateway.emitParticipantUpdate({
            sessionId: session.sessionId,
            callId,
            type: "left",
            participant: { id: participantId, displayName },
          });
        }
      }
    }

    res.status(200).json({ status: "processed" });
  }

  @Post("media")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Receive Teams bot media stream data" })
  @ApiResponse({ status: 200, description: "Media processed" })
  async media(@Body() body: unknown, @Res() res: Response): Promise<void> {
    const payload = body as TeamsMediaNotification;

    if (!payload.callId || !payload.audioBuffer) {
      res.status(200).json({ status: "no content" });
      return;
    }

    const audioBuffer = Buffer.from(payload.audioBuffer, "base64");
    const pcmBuffer = this.audioService.convertTeamsAudioToPcm(audioBuffer, payload.format);

    await this.audioService.processAudioChunk(
      payload.callId,
      pcmBuffer,
      payload.speakerId ?? null,
      payload.speakerName ?? "Unknown Speaker",
    );

    res.status(200).json({ status: "processed" });
  }

  private mapCallStateToSessionStatus(state: string | undefined): TeamsBotSessionStatus | null {
    if (!state) {
      return null;
    }

    const stateMap: Record<string, TeamsBotSessionStatus> = {
      establishing: TeamsBotSessionStatus.JOINING,
      established: TeamsBotSessionStatus.ACTIVE,
      hold: TeamsBotSessionStatus.ACTIVE,
      transferring: TeamsBotSessionStatus.ACTIVE,
      transferAccepted: TeamsBotSessionStatus.ACTIVE,
      redirecting: TeamsBotSessionStatus.ACTIVE,
      terminating: TeamsBotSessionStatus.LEAVING,
      terminated: TeamsBotSessionStatus.ENDED,
      disconnected: TeamsBotSessionStatus.ENDED,
    };

    return stateMap[state] ?? null;
  }
}
