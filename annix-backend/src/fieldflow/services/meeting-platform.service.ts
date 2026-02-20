import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { decrypt, encrypt } from "../../secure-documents/crypto.util";
import {
  MeetingPlatform,
  MeetingPlatformConnection,
  PlatformConnectionStatus,
} from "../entities/meeting-platform-connection.entity";
import {
  PlatformMeetingRecord,
  PlatformRecordingStatus,
} from "../entities/platform-meeting-record.entity";
import { GoogleMeetProvider } from "../providers/google-meet.provider";
import type {
  IMeetingPlatformProvider,
  PlatformProviderConfig,
} from "../providers/meeting-platform-provider.interface";
import { TeamsMeetingProvider } from "../providers/teams-meeting.provider";
import { ZoomMeetingProvider } from "../providers/zoom-meeting.provider";

export interface PlatformConnectionResponseDto {
  id: number;
  userId: number;
  platform: MeetingPlatform;
  accountEmail: string;
  accountName: string | null;
  connectionStatus: PlatformConnectionStatus;
  autoFetchRecordings: boolean;
  autoTranscribe: boolean;
  autoSendSummary: boolean;
  lastRecordingSyncAt: Date | null;
  lastError: string | null;
  createdAt: Date;
}

export interface ConnectPlatformDto {
  platform: MeetingPlatform;
  authCode: string;
  redirectUri: string;
}

export interface UpdatePlatformConnectionDto {
  autoFetchRecordings?: boolean;
  autoTranscribe?: boolean;
  autoSendSummary?: boolean;
}

export interface PlatformMeetingRecordResponseDto {
  id: number;
  connectionId: number;
  meetingId: number | null;
  platformMeetingId: string;
  title: string;
  topic: string | null;
  hostEmail: string | null;
  startTime: Date;
  endTime: Date | null;
  durationSeconds: number | null;
  recordingStatus: PlatformRecordingStatus;
  participantCount: number | null;
  joinUrl: string | null;
  createdAt: Date;
}

@Injectable()
export class MeetingPlatformService {
  private readonly logger = new Logger(MeetingPlatformService.name);
  private readonly encryptionKey: string;

  constructor(
    @InjectRepository(MeetingPlatformConnection)
    private readonly connectionRepo: Repository<MeetingPlatformConnection>,
    @InjectRepository(PlatformMeetingRecord)
    private readonly recordRepo: Repository<PlatformMeetingRecord>,
    private readonly configService: ConfigService,
    private readonly zoomProvider: ZoomMeetingProvider,
    private readonly teamsProvider: TeamsMeetingProvider,
    private readonly googleMeetProvider: GoogleMeetProvider,
  ) {
    this.encryptionKey = this.configService.get<string>("TOKEN_ENCRYPTION_KEY") ?? "";
  }

  providerFor(platform: MeetingPlatform): IMeetingPlatformProvider {
    if (platform === MeetingPlatform.ZOOM) {
      return this.zoomProvider;
    } else if (platform === MeetingPlatform.TEAMS) {
      return this.teamsProvider;
    } else {
      return this.googleMeetProvider;
    }
  }

  oauthUrl(platform: MeetingPlatform, redirectUri: string, state: string): string {
    const provider = this.providerFor(platform);
    return provider.oauthUrl(redirectUri, state);
  }

  async connectPlatform(
    userId: number,
    dto: ConnectPlatformDto,
  ): Promise<PlatformConnectionResponseDto> {
    const provider = this.providerFor(dto.platform);

    const tokens = await provider.exchangeAuthCode(dto.authCode, dto.redirectUri);
    const config: PlatformProviderConfig = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };

    const userInfo = await provider.userInfo(config);

    const expiresAt = tokens.expiresIn
      ? now().plus({ seconds: tokens.expiresIn }).toJSDate()
      : null;

    const existingConnection = await this.connectionRepo.findOne({
      where: { userId, platform: dto.platform },
    });

    if (existingConnection) {
      existingConnection.accountEmail = userInfo.email;
      existingConnection.accountName = userInfo.name;
      existingConnection.accountId = userInfo.accountId;
      existingConnection.accessTokenEncrypted = this.encryptToken(tokens.accessToken);
      existingConnection.refreshTokenEncrypted = tokens.refreshToken
        ? this.encryptToken(tokens.refreshToken)
        : null;
      existingConnection.tokenExpiresAt = expiresAt;
      existingConnection.tokenScope = tokens.scope;
      existingConnection.connectionStatus = PlatformConnectionStatus.ACTIVE;
      existingConnection.lastError = null;
      existingConnection.lastErrorAt = null;

      const updated = await this.connectionRepo.save(existingConnection);
      this.logger.log(`Platform connection updated: ${updated.id} for user ${userId}`);
      return this.toConnectionResponse(updated);
    }

    const connection = this.connectionRepo.create({
      userId,
      platform: dto.platform,
      accountEmail: userInfo.email,
      accountName: userInfo.name,
      accountId: userInfo.accountId,
      accessTokenEncrypted: this.encryptToken(tokens.accessToken),
      refreshTokenEncrypted: tokens.refreshToken ? this.encryptToken(tokens.refreshToken) : null,
      tokenExpiresAt: expiresAt,
      tokenScope: tokens.scope,
      connectionStatus: PlatformConnectionStatus.ACTIVE,
    });

    const saved = await this.connectionRepo.save(connection);
    this.logger.log(`Platform connected: ${saved.id} (${dto.platform}) for user ${userId}`);

    return this.toConnectionResponse(saved);
  }

  async listConnections(userId: number): Promise<PlatformConnectionResponseDto[]> {
    const connections = await this.connectionRepo.find({
      where: { userId },
      order: { createdAt: "DESC" },
    });

    return connections.map((c) => this.toConnectionResponse(c));
  }

  async connection(userId: number, connectionId: number): Promise<PlatformConnectionResponseDto> {
    const connection = await this.connectionRepo.findOne({
      where: { id: connectionId, userId },
    });

    if (!connection) {
      throw new NotFoundException("Platform connection not found");
    }

    return this.toConnectionResponse(connection);
  }

  async connectionByPlatform(
    userId: number,
    platform: MeetingPlatform,
  ): Promise<MeetingPlatformConnection | null> {
    return this.connectionRepo.findOne({
      where: { userId, platform },
    });
  }

  async updateConnection(
    userId: number,
    connectionId: number,
    dto: UpdatePlatformConnectionDto,
  ): Promise<PlatformConnectionResponseDto> {
    const connection = await this.connectionRepo.findOne({
      where: { id: connectionId, userId },
    });

    if (!connection) {
      throw new NotFoundException("Platform connection not found");
    }

    if (dto.autoFetchRecordings !== undefined) {
      connection.autoFetchRecordings = dto.autoFetchRecordings;
    }

    if (dto.autoTranscribe !== undefined) {
      connection.autoTranscribe = dto.autoTranscribe;
    }

    if (dto.autoSendSummary !== undefined) {
      connection.autoSendSummary = dto.autoSendSummary;
    }

    const updated = await this.connectionRepo.save(connection);
    return this.toConnectionResponse(updated);
  }

  async disconnectPlatform(userId: number, connectionId: number): Promise<void> {
    const connection = await this.connectionRepo.findOne({
      where: { id: connectionId, userId },
    });

    if (!connection) {
      throw new NotFoundException("Platform connection not found");
    }

    await this.recordRepo.delete({ connectionId });
    await this.connectionRepo.remove(connection);

    this.logger.log(`Platform disconnected: ${connectionId} for user ${userId}`);
  }

  async refreshTokenIfNeeded(
    connection: MeetingPlatformConnection,
  ): Promise<PlatformProviderConfig> {
    if (!connection.tokenExpiresAt) {
      return this.configFor(connection);
    }

    const expiresAt = now().plus({ minutes: 5 }).toJSDate();

    if (connection.tokenExpiresAt > expiresAt) {
      return this.configFor(connection);
    }

    const refreshToken = connection.refreshTokenEncrypted
      ? this.decryptToken(connection.refreshTokenEncrypted)
      : null;

    if (!refreshToken) {
      connection.connectionStatus = PlatformConnectionStatus.TOKEN_EXPIRED;
      connection.lastError = "Refresh token not available";
      connection.lastErrorAt = now().toJSDate();
      await this.connectionRepo.save(connection);
      throw new Error("Refresh token not available");
    }

    const provider = this.providerFor(connection.platform);

    const tokens = await provider.refreshAccessToken(refreshToken);

    connection.accessTokenEncrypted = this.encryptToken(tokens.accessToken);
    if (tokens.refreshToken) {
      connection.refreshTokenEncrypted = this.encryptToken(tokens.refreshToken);
    }
    connection.tokenExpiresAt = now().plus({ seconds: tokens.expiresIn }).toJSDate();
    connection.connectionStatus = PlatformConnectionStatus.ACTIVE;
    connection.lastError = null;
    connection.lastErrorAt = null;

    await this.connectionRepo.save(connection);

    this.logger.log(`Token refreshed for platform connection ${connection.id}`);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? refreshToken,
      accountId: connection.accountId ?? undefined,
    };
  }

  async syncRecentMeetings(
    userId: number,
    connectionId: number,
    daysBack: number = 7,
  ): Promise<{ synced: number; recordings: number }> {
    const connection = await this.connectionRepo.findOne({
      where: { id: connectionId, userId },
    });

    if (!connection) {
      throw new NotFoundException("Platform connection not found");
    }

    return this.syncConnectionMeetings(connection, daysBack);
  }

  async syncConnectionMeetings(
    connection: MeetingPlatformConnection,
    daysBack: number = 7,
  ): Promise<{ synced: number; recordings: number }> {
    const config = await this.refreshTokenIfNeeded(connection);
    const provider = this.providerFor(connection.platform);

    const fromDate = now().minus({ days: daysBack }).toJSDate();
    const toDate = now().toJSDate();

    const meetings = await provider.listRecentMeetings(config, fromDate, toDate);

    let synced = 0;
    let recordings = 0;

    for (const meeting of meetings) {
      const existing = await this.recordRepo.findOne({
        where: {
          connectionId: connection.id,
          platformMeetingId: meeting.platformMeetingId,
        },
      });

      if (existing) {
        existing.title = meeting.title;
        existing.topic = meeting.topic;
        existing.hostEmail = meeting.hostEmail;
        existing.endTime = meeting.endTime;
        existing.durationSeconds = meeting.durationSeconds;
        existing.participants = meeting.participants;
        existing.participantCount = meeting.participantCount;
        existing.joinUrl = meeting.joinUrl;
        existing.rawMeetingData = meeting.rawData;
        existing.fetchedAt = now().toJSDate();

        if (meeting.hasRecording && existing.recordingStatus === PlatformRecordingStatus.PENDING) {
          recordings++;
        }

        await this.recordRepo.save(existing);
      } else {
        const record = this.recordRepo.create({
          connectionId: connection.id,
          platformMeetingId: meeting.platformMeetingId,
          title: meeting.title,
          topic: meeting.topic,
          hostEmail: meeting.hostEmail,
          startTime: meeting.startTime,
          endTime: meeting.endTime,
          durationSeconds: meeting.durationSeconds,
          participants: meeting.participants,
          participantCount: meeting.participantCount,
          joinUrl: meeting.joinUrl,
          recordingStatus: meeting.hasRecording
            ? PlatformRecordingStatus.PENDING
            : PlatformRecordingStatus.NO_RECORDING,
          rawMeetingData: meeting.rawData,
          fetchedAt: now().toJSDate(),
        });

        await this.recordRepo.save(record);

        if (meeting.hasRecording) {
          recordings++;
        }
      }

      synced++;
    }

    connection.lastRecordingSyncAt = now().toJSDate();
    await this.connectionRepo.save(connection);

    this.logger.log(
      `Platform sync completed for connection ${connection.id}: ${synced} meetings, ${recordings} with recordings`,
    );

    return { synced, recordings };
  }

  async listMeetingRecords(
    userId: number,
    connectionId: number,
    limit: number = 50,
  ): Promise<PlatformMeetingRecordResponseDto[]> {
    const connection = await this.connectionRepo.findOne({
      where: { id: connectionId, userId },
    });

    if (!connection) {
      throw new NotFoundException("Platform connection not found");
    }

    const records = await this.recordRepo.find({
      where: { connectionId },
      order: { startTime: "DESC" },
      take: limit,
    });

    return records.map((r) => this.toRecordResponse(r));
  }

  async meetingRecord(userId: number, recordId: number): Promise<PlatformMeetingRecordResponseDto> {
    const record = await this.recordRepo.findOne({
      where: { id: recordId },
      relations: ["connection"],
    });

    if (!record || record.connection.userId !== userId) {
      throw new NotFoundException("Meeting record not found");
    }

    return this.toRecordResponse(record);
  }

  async recordsWithPendingRecordings(): Promise<PlatformMeetingRecord[]> {
    return this.recordRepo.find({
      where: { recordingStatus: PlatformRecordingStatus.PENDING },
      relations: ["connection"],
    });
  }

  async activeConnections(): Promise<MeetingPlatformConnection[]> {
    return this.connectionRepo.find({
      where: { connectionStatus: PlatformConnectionStatus.ACTIVE },
    });
  }

  async connectionsNeedingTokenRefresh(): Promise<MeetingPlatformConnection[]> {
    const expiresThreshold = now().plus({ hours: 1 }).toJSDate();

    return this.connectionRepo
      .createQueryBuilder("c")
      .where("c.connection_status = :status", { status: PlatformConnectionStatus.ACTIVE })
      .andWhere("c.token_expires_at IS NOT NULL")
      .andWhere("c.token_expires_at < :threshold", { threshold: expiresThreshold })
      .andWhere("c.refresh_token_encrypted IS NOT NULL")
      .getMany();
  }

  async markConnectionError(connectionId: number, error: string): Promise<void> {
    await this.connectionRepo.update(connectionId, {
      connectionStatus: PlatformConnectionStatus.ERROR,
      lastError: error,
      lastErrorAt: now().toJSDate(),
    });
  }

  configFor(connection: MeetingPlatformConnection): PlatformProviderConfig {
    return {
      accessToken: this.decryptToken(connection.accessTokenEncrypted),
      refreshToken: connection.refreshTokenEncrypted
        ? this.decryptToken(connection.refreshTokenEncrypted)
        : null,
      accountId: connection.accountId ?? undefined,
    };
  }

  private encryptToken(token: string): string {
    if (!this.encryptionKey) {
      this.logger.warn("TOKEN_ENCRYPTION_KEY not set - storing tokens unencrypted");
      return token;
    }
    return encrypt(token, this.encryptionKey).toString("base64");
  }

  private decryptToken(encrypted: string): string {
    if (!this.encryptionKey) {
      return encrypted;
    }
    return decrypt(Buffer.from(encrypted, "base64"), this.encryptionKey);
  }

  private toConnectionResponse(
    connection: MeetingPlatformConnection,
  ): PlatformConnectionResponseDto {
    return {
      id: connection.id,
      userId: connection.userId,
      platform: connection.platform,
      accountEmail: connection.accountEmail,
      accountName: connection.accountName,
      connectionStatus: connection.connectionStatus,
      autoFetchRecordings: connection.autoFetchRecordings,
      autoTranscribe: connection.autoTranscribe,
      autoSendSummary: connection.autoSendSummary,
      lastRecordingSyncAt: connection.lastRecordingSyncAt,
      lastError: connection.lastError,
      createdAt: connection.createdAt,
    };
  }

  private toRecordResponse(record: PlatformMeetingRecord): PlatformMeetingRecordResponseDto {
    return {
      id: record.id,
      connectionId: record.connectionId,
      meetingId: record.meetingId,
      platformMeetingId: record.platformMeetingId,
      title: record.title,
      topic: record.topic,
      hostEmail: record.hostEmail,
      startTime: record.startTime,
      endTime: record.endTime,
      durationSeconds: record.durationSeconds,
      recordingStatus: record.recordingStatus,
      participantCount: record.participantCount,
      joinUrl: record.joinUrl,
      createdAt: record.createdAt,
    };
  }
}
