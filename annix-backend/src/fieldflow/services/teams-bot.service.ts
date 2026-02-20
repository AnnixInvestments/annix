import { randomUUID } from "node:crypto";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { now } from "../../lib/datetime";
import type {
  JoinTeamsMeetingDto,
  TeamsBotSessionResponseDto,
  TeamsBotTranscriptResponseDto,
} from "../dto/teams-bot.dto";
import {
  type TeamsBotParticipant,
  TeamsBotSession,
  TeamsBotSessionStatus,
  type TeamsBotTranscriptEntry,
} from "../entities/teams-bot-session.entity";
import { TeamsBotProvider } from "../providers/teams-bot.provider";

@Injectable()
export class TeamsBotService {
  private readonly logger = new Logger(TeamsBotService.name);

  constructor(
    @InjectRepository(TeamsBotSession)
    private readonly sessionRepo: Repository<TeamsBotSession>,
    private readonly botProvider: TeamsBotProvider,
  ) {}

  async joinMeeting(userId: number, dto: JoinTeamsMeetingDto): Promise<TeamsBotSessionResponseDto> {
    if (!this.botProvider.isConfigured()) {
      throw new Error("Teams bot is not configured. Please set TEAMS_BOT_* environment variables.");
    }

    const sessionId = randomUUID();
    const displayName = dto.botDisplayName ?? "Annix AI Meeting Assistant";

    const session = this.sessionRepo.create({
      userId,
      sessionId,
      meetingUrl: dto.meetingUrl,
      meetingId: dto.meetingId ?? null,
      botDisplayName: displayName,
      status: TeamsBotSessionStatus.JOINING,
      participants: [],
      transcriptEntries: [],
    });

    await this.sessionRepo.save(session);

    try {
      const result = await this.botProvider.joinMeeting(dto.meetingUrl, displayName);

      session.callId = result.callId;
      session.meetingThreadId = result.threadId;
      session.meetingOrganizerId = result.organizerId;
      session.status = TeamsBotSessionStatus.ACTIVE;
      session.startedAt = now().toJSDate();
      session.lastActivityAt = now().toJSDate();

      await this.sessionRepo.save(session);

      this.logger.log(`Bot joined meeting: sessionId=${sessionId}, callId=${result.callId}`);
    } catch (error) {
      session.status = TeamsBotSessionStatus.FAILED;
      session.errorMessage = error instanceof Error ? error.message : "Unknown error";
      await this.sessionRepo.save(session);
      throw error;
    }

    return this.mapToResponse(session);
  }

  async leaveMeeting(userId: number, sessionId: string): Promise<TeamsBotSessionResponseDto> {
    const session = await this.sessionRepo.findOne({
      where: { sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException(`Session not found: ${sessionId}`);
    }

    if (session.status === TeamsBotSessionStatus.ENDED) {
      return this.mapToResponse(session);
    }

    session.status = TeamsBotSessionStatus.LEAVING;
    await this.sessionRepo.save(session);

    try {
      if (session.callId) {
        await this.botProvider.leaveMeeting(session.callId);
      }

      session.status = TeamsBotSessionStatus.ENDED;
      session.endedAt = now().toJSDate();
      await this.sessionRepo.save(session);

      this.logger.log(`Bot left meeting: sessionId=${sessionId}`);
    } catch (error) {
      this.logger.warn(`Error leaving meeting: ${error}`);
      session.status = TeamsBotSessionStatus.ENDED;
      session.endedAt = now().toJSDate();
      await this.sessionRepo.save(session);
    }

    return this.mapToResponse(session);
  }

  async session(userId: number, sessionId: string): Promise<TeamsBotSessionResponseDto> {
    const session = await this.sessionRepo.findOne({
      where: { sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException(`Session not found: ${sessionId}`);
    }

    return this.mapToResponse(session);
  }

  async activeSessions(userId: number): Promise<TeamsBotSessionResponseDto[]> {
    const sessions = await this.sessionRepo.find({
      where: {
        userId,
        status: In([TeamsBotSessionStatus.JOINING, TeamsBotSessionStatus.ACTIVE]),
      },
      order: { createdAt: "DESC" },
    });

    return sessions.map((s) => this.mapToResponse(s));
  }

  async sessionHistory(userId: number, limit: number = 20): Promise<TeamsBotSessionResponseDto[]> {
    const sessions = await this.sessionRepo.find({
      where: { userId },
      order: { createdAt: "DESC" },
      take: limit,
    });

    return sessions.map((s) => this.mapToResponse(s));
  }

  async transcript(userId: number, sessionId: string): Promise<TeamsBotTranscriptResponseDto> {
    const session = await this.sessionRepo.findOne({
      where: { sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException(`Session not found: ${sessionId}`);
    }

    return {
      sessionId: session.sessionId,
      entries: session.transcriptEntries,
      totalCount: session.transcriptEntryCount,
    };
  }

  async updateSessionStatus(
    callId: string,
    status: TeamsBotSessionStatus,
    errorMessage?: string,
  ): Promise<TeamsBotSession | null> {
    const session = await this.sessionRepo.findOne({
      where: { callId },
    });

    if (!session) {
      this.logger.warn(`Session not found for callId: ${callId}`);
      return null;
    }

    session.status = status;
    session.lastActivityAt = now().toJSDate();

    if (errorMessage) {
      session.errorMessage = errorMessage;
    }

    if (status === TeamsBotSessionStatus.ENDED && !session.endedAt) {
      session.endedAt = now().toJSDate();
    }

    await this.sessionRepo.save(session);
    return session;
  }

  async addParticipant(
    callId: string,
    participant: TeamsBotParticipant,
  ): Promise<TeamsBotSession | null> {
    const session = await this.sessionRepo.findOne({
      where: { callId },
    });

    if (!session) {
      return null;
    }

    const participants = session.participants ?? [];
    const existing = participants.find((p) => p.id === participant.id);

    if (!existing) {
      participants.push(participant);
      session.participants = participants;
      session.participantCount = participants.filter((p) => !p.leftAt).length;
      session.lastActivityAt = now().toJSDate();
      await this.sessionRepo.save(session);
    }

    return session;
  }

  async removeParticipant(callId: string, participantId: string): Promise<TeamsBotSession | null> {
    const session = await this.sessionRepo.findOne({
      where: { callId },
    });

    if (!session) {
      return null;
    }

    const participants = session.participants ?? [];
    const participant = participants.find((p) => p.id === participantId);

    if (participant && !participant.leftAt) {
      participant.leftAt = now().toISO();
      session.participants = participants;
      session.participantCount = participants.filter((p) => !p.leftAt).length;
      session.lastActivityAt = now().toJSDate();
      await this.sessionRepo.save(session);
    }

    return session;
  }

  async addTranscriptEntry(
    callId: string,
    entry: TeamsBotTranscriptEntry,
  ): Promise<TeamsBotSession | null> {
    const session = await this.sessionRepo.findOne({
      where: { callId },
    });

    if (!session) {
      return null;
    }

    session.transcriptEntries.push(entry);
    session.transcriptEntryCount = session.transcriptEntries.length;
    session.lastActivityAt = now().toJSDate();
    await this.sessionRepo.save(session);

    return session;
  }

  async sessionByCallId(callId: string): Promise<TeamsBotSession | null> {
    return this.sessionRepo.findOne({
      where: { callId },
    });
  }

  private mapToResponse(session: TeamsBotSession): TeamsBotSessionResponseDto {
    return {
      id: session.id,
      sessionId: session.sessionId,
      userId: session.userId,
      meetingId: session.meetingId,
      meetingUrl: session.meetingUrl,
      status: session.status,
      botDisplayName: session.botDisplayName,
      errorMessage: session.errorMessage,
      participants: session.participants,
      participantCount: session.participantCount,
      transcriptEntryCount: session.transcriptEntryCount,
      startedAt: session.startedAt?.toISOString() ?? null,
      endedAt: session.endedAt?.toISOString() ?? null,
      createdAt: session.createdAt.toISOString(),
    };
  }
}
