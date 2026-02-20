import { Controller, Logger, Param, Req, Res, Sse, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { Request, Response } from "express";
import { Observable, Subject, filter, map } from "rxjs";
import { AnnixRepAuthGuard } from "../auth";
import type { TeamsBotSessionStatus, TeamsBotTranscriptEntry } from "../entities/teams-bot-session.entity";

interface AnnixRepRequest extends Request {
  annixRepUser: {
    userId: number;
    email: string;
    sessionToken: string;
  };
}

export interface TeamsBotStatusEvent {
  sessionId: string;
  callId: string;
  status: TeamsBotSessionStatus;
  errorMessage?: string;
}

export interface TeamsBotTranscriptEvent {
  sessionId: string;
  callId: string;
  entry: TeamsBotTranscriptEntry;
}

export interface TeamsBotParticipantEvent {
  sessionId: string;
  callId: string;
  type: "joined" | "left";
  participant: {
    id: string;
    displayName: string;
  };
}

type TeamsBotEvent =
  | { type: "status"; data: TeamsBotStatusEvent }
  | { type: "transcript"; data: TeamsBotTranscriptEvent }
  | { type: "participant"; data: TeamsBotParticipantEvent };

@ApiTags("Annix Rep - Teams Bot (SSE)")
@Controller("annix-rep/teams-bot/events")
export class TeamsBotGateway {
  private readonly logger = new Logger(TeamsBotGateway.name);
  private readonly eventSubject = new Subject<TeamsBotEvent>();
  private readonly sessionSubscribers = new Map<string, Set<number>>();

  emitStatusUpdate(event: TeamsBotStatusEvent): void {
    this.eventSubject.next({ type: "status", data: event });
  }

  emitTranscriptEntry(event: TeamsBotTranscriptEvent): void {
    this.eventSubject.next({ type: "transcript", data: event });
  }

  emitParticipantUpdate(event: TeamsBotParticipantEvent): void {
    this.eventSubject.next({ type: "participant", data: event });
  }

  @Sse(":sessionId")
  @UseGuards(AnnixRepAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Subscribe to real-time updates for a Teams bot session" })
  @ApiParam({ name: "sessionId", type: String })
  subscribe(
    @Param("sessionId") sessionId: string,
    @Req() req: AnnixRepRequest,
    @Res() res: Response,
  ): Observable<MessageEvent> {
    const userId = req.annixRepUser.userId;

    this.logger.log(`User ${userId} subscribed to session ${sessionId}`);

    if (!this.sessionSubscribers.has(sessionId)) {
      this.sessionSubscribers.set(sessionId, new Set());
    }
    this.sessionSubscribers.get(sessionId)!.add(userId);

    res.on("close", () => {
      this.logger.log(`User ${userId} unsubscribed from session ${sessionId}`);
      const subscribers = this.sessionSubscribers.get(sessionId);
      if (subscribers) {
        subscribers.delete(userId);
        if (subscribers.size === 0) {
          this.sessionSubscribers.delete(sessionId);
        }
      }
    });

    return this.eventSubject.pipe(
      filter((event) => event.data.sessionId === sessionId),
      map((event) => ({
        data: JSON.stringify(event),
        type: event.type,
      } as MessageEvent)),
    );
  }

  activeSubscribers(sessionId: string): number {
    return this.sessionSubscribers.get(sessionId)?.size ?? 0;
  }
}
