import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { decrypt, encrypt } from "../../secure-documents/crypto.util";
import {
  CalendarConnectionResponseDto,
  CalendarEventResponseDto,
  CalendarListResponseDto,
  ConnectCalendarDto,
  SyncCalendarDto,
  UpdateCalendarConnectionDto,
} from "../dto";
import {
  CalendarConnection,
  CalendarEvent,
  CalendarEventStatus,
  CalendarProvider,
  CalendarSyncStatus,
} from "../entities";
import {
  CaldavCalendarProvider,
  type CalendarEventData,
  type CalendarProviderConfig,
  GoogleCalendarProvider,
  type ICalendarProvider,
  OutlookCalendarProvider,
} from "../providers";

interface SyncResult {
  synced: number;
  deleted: number;
  errors: string[];
}

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);
  private readonly encryptionKey: string;

  constructor(
    @InjectRepository(CalendarConnection)
    private readonly connectionRepo: Repository<CalendarConnection>,
    @InjectRepository(CalendarEvent)
    private readonly eventRepo: Repository<CalendarEvent>,
    private readonly configService: ConfigService,
    private readonly googleProvider: GoogleCalendarProvider,
    private readonly outlookProvider: OutlookCalendarProvider,
    private readonly caldavProvider: CaldavCalendarProvider,
  ) {
    this.encryptionKey = this.configService.get<string>("TOKEN_ENCRYPTION_KEY") ?? "";
  }

  private providerFor(provider: CalendarProvider): ICalendarProvider {
    if (provider === CalendarProvider.GOOGLE) {
      return this.googleProvider;
    } else if (provider === CalendarProvider.OUTLOOK) {
      return this.outlookProvider;
    } else {
      return this.caldavProvider;
    }
  }

  oauthUrl(provider: CalendarProvider, redirectUri: string): string {
    if (provider === CalendarProvider.GOOGLE) {
      const clientId = this.configService.get<string>("GOOGLE_CALENDAR_CLIENT_ID");
      const scopes = [
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
      ].join(" ");
      const params = new URLSearchParams({
        client_id: clientId ?? "",
        redirect_uri: redirectUri,
        response_type: "code",
        scope: scopes,
        access_type: "offline",
        prompt: "consent",
      });
      return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    } else if (provider === CalendarProvider.OUTLOOK) {
      const clientId = this.configService.get<string>("MICROSOFT_CLIENT_ID");
      const scopes = ["offline_access", "Calendars.Read", "User.Read"].join(" ");
      const params = new URLSearchParams({
        client_id: clientId ?? "",
        redirect_uri: redirectUri,
        response_type: "code",
        scope: scopes,
        prompt: "consent",
      });
      return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
    } else {
      throw new BadRequestException("CalDAV does not use OAuth");
    }
  }

  async connectCalendar(
    userId: number,
    dto: ConnectCalendarDto,
  ): Promise<CalendarConnectionResponseDto> {
    const providerInstance = this.providerFor(dto.provider);

    let accessToken: string;
    let refreshToken: string | null = null;
    let expiresAt: Date | null = null;
    let accountEmail: string;
    let accountName: string | null = null;
    let caldavUrl: string | null = null;

    if (dto.provider === CalendarProvider.CALDAV || dto.provider === CalendarProvider.APPLE) {
      const [username, password] = dto.authCode.split(":");
      if (!username || !password) {
        throw new BadRequestException("CalDAV credentials must be in format username:password");
      }
      accessToken = dto.authCode;
      refreshToken = dto.caldavUrl ?? null;
      caldavUrl = dto.caldavUrl ?? null;
      accountEmail = username.includes("@") ? username : `${username}@icloud.com`;
    } else {
      const tokens = await providerInstance.exchangeAuthCode(dto.authCode, dto.redirectUri ?? "");
      accessToken = tokens.accessToken;
      refreshToken = tokens.refreshToken;

      if (tokens.expiresIn) {
        expiresAt = now().plus({ seconds: tokens.expiresIn }).toJSDate();
      }

      const userInfo = await providerInstance.userInfo({
        accessToken,
        refreshToken,
      });
      accountEmail = userInfo.email;
      accountName = userInfo.name;
    }

    const existingConnection = await this.connectionRepo.findOne({
      where: { userId, provider: dto.provider, accountEmail },
    });

    if (existingConnection) {
      existingConnection.accessTokenEncrypted = this.encryptToken(accessToken);
      existingConnection.refreshTokenEncrypted = refreshToken
        ? this.encryptToken(refreshToken)
        : null;
      existingConnection.tokenExpiresAt = expiresAt;
      existingConnection.syncStatus = CalendarSyncStatus.ACTIVE;
      existingConnection.lastSyncError = null;
      existingConnection.caldavUrl = caldavUrl;

      const updated = await this.connectionRepo.save(existingConnection);
      this.logger.log(`Calendar connection updated: ${updated.id} for user ${userId}`);
      return this.toConnectionResponse(updated);
    }

    const connection = this.connectionRepo.create({
      userId,
      provider: dto.provider,
      accountEmail,
      accountName,
      accessTokenEncrypted: this.encryptToken(accessToken),
      refreshTokenEncrypted: refreshToken ? this.encryptToken(refreshToken) : null,
      tokenExpiresAt: expiresAt,
      caldavUrl,
      syncStatus: CalendarSyncStatus.ACTIVE,
    });

    const saved = await this.connectionRepo.save(connection);
    this.logger.log(`Calendar connected: ${saved.id} (${dto.provider}) for user ${userId}`);

    return this.toConnectionResponse(saved);
  }

  async listConnections(userId: number): Promise<CalendarConnectionResponseDto[]> {
    const connections = await this.connectionRepo.find({
      where: { userId },
      order: { createdAt: "DESC" },
    });

    return connections.map((c) => this.toConnectionResponse(c));
  }

  async connection(userId: number, connectionId: number): Promise<CalendarConnectionResponseDto> {
    const connection = await this.connectionRepo.findOne({
      where: { id: connectionId, userId },
    });

    if (!connection) {
      throw new NotFoundException("Calendar connection not found");
    }

    return this.toConnectionResponse(connection);
  }

  async updateConnection(
    userId: number,
    connectionId: number,
    dto: UpdateCalendarConnectionDto,
  ): Promise<CalendarConnectionResponseDto> {
    const connection = await this.connectionRepo.findOne({
      where: { id: connectionId, userId },
    });

    if (!connection) {
      throw new NotFoundException("Calendar connection not found");
    }

    if (dto.selectedCalendars !== undefined) {
      connection.selectedCalendars = dto.selectedCalendars;
    }

    if (dto.isPrimary !== undefined && dto.isPrimary) {
      await this.connectionRepo.update({ userId }, { isPrimary: false });
      connection.isPrimary = true;
    }

    const updated = await this.connectionRepo.save(connection);
    return this.toConnectionResponse(updated);
  }

  async disconnectCalendar(userId: number, connectionId: number): Promise<void> {
    const connection = await this.connectionRepo.findOne({
      where: { id: connectionId, userId },
    });

    if (!connection) {
      throw new NotFoundException("Calendar connection not found");
    }

    await this.eventRepo.delete({ connectionId });
    await this.connectionRepo.remove(connection);

    this.logger.log(`Calendar disconnected: ${connectionId} for user ${userId}`);
  }

  async listAvailableCalendars(
    userId: number,
    connectionId: number,
  ): Promise<CalendarListResponseDto[]> {
    const connection = await this.connectionRepo.findOne({
      where: { id: connectionId, userId },
    });

    if (!connection) {
      throw new NotFoundException("Calendar connection not found");
    }

    const config = await this.configFor(connection);
    const provider = this.providerFor(connection.provider);

    const calendars = await provider.listCalendars(config);

    return calendars.map((cal) => ({
      id: cal.id,
      name: cal.name,
      isPrimary: cal.isPrimary,
      color: cal.color,
    }));
  }

  async syncConnection(
    userId: number,
    connectionId: number,
    dto?: SyncCalendarDto,
  ): Promise<SyncResult> {
    const connection = await this.connectionRepo.findOne({
      where: { id: connectionId, userId },
    });

    if (!connection) {
      throw new NotFoundException("Calendar connection not found");
    }

    return this.syncConnectionInternal(connection, dto?.fullSync ?? false);
  }

  async syncConnectionInternal(
    connection: CalendarConnection,
    fullSync: boolean = false,
  ): Promise<SyncResult> {
    const result: SyncResult = { synced: 0, deleted: 0, errors: [] };

    const config = await this.configFor(connection);
    const provider = this.providerFor(connection.provider);

    const calendarIds = connection.selectedCalendars ?? [];
    if (calendarIds.length === 0) {
      const calendars = await provider.listCalendars(config);
      calendarIds.push(...calendars.map((c) => c.id));

      connection.selectedCalendars = calendarIds;
      await this.connectionRepo.save(connection);
    }

    const syncResult = await provider.syncEvents(
      config,
      calendarIds,
      fullSync ? null : connection.syncToken,
      fullSync,
    );

    if (syncResult.requiresFullSync) {
      connection.syncToken = null;
      await this.connectionRepo.save(connection);
      return this.syncConnectionInternal(connection, true);
    }

    for (const deletedId of syncResult.deletedEventIds) {
      await this.eventRepo.delete({
        connectionId: connection.id,
        externalId: deletedId,
      });
      result.deleted++;
    }

    for (const eventData of syncResult.events) {
      await this.upsertEvent(connection, eventData);
      result.synced++;
    }

    connection.syncToken = syncResult.nextSyncToken;
    connection.lastSyncAt = now().toJSDate();
    connection.syncStatus = CalendarSyncStatus.ACTIVE;
    connection.lastSyncError = null;

    await this.connectionRepo.save(connection);

    this.logger.log(
      `Calendar sync completed for connection ${connection.id}: ${result.synced} synced, ${result.deleted} deleted`,
    );

    return result;
  }

  async eventsInRange(
    userId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<CalendarEventResponseDto[]> {
    const connections = await this.connectionRepo.find({
      where: { userId, syncStatus: CalendarSyncStatus.ACTIVE },
    });

    const connectionIds = connections.map((c) => c.id);

    if (connectionIds.length === 0) {
      return [];
    }

    const events = await this.eventRepo
      .createQueryBuilder("event")
      .where("event.connection_id IN (:...connectionIds)", { connectionIds })
      .andWhere("event.start_time >= :startDate", { startDate })
      .andWhere("event.end_time <= :endDate", { endDate })
      .orderBy("event.start_time", "ASC")
      .getMany();

    return events.map((e) => this.toEventResponse(e));
  }

  async refreshTokenIfNeeded(connection: CalendarConnection): Promise<CalendarProviderConfig> {
    if (
      connection.provider === CalendarProvider.CALDAV ||
      connection.provider === CalendarProvider.APPLE
    ) {
      return this.configFor(connection);
    }

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
      connection.syncStatus = CalendarSyncStatus.EXPIRED;
      await this.connectionRepo.save(connection);
      throw new Error("Refresh token not available");
    }

    const provider = this.providerFor(connection.provider);
    const tokens = await provider.refreshAccessToken(refreshToken);

    connection.accessTokenEncrypted = this.encryptToken(tokens.accessToken);
    if (tokens.refreshToken) {
      connection.refreshTokenEncrypted = this.encryptToken(tokens.refreshToken);
    }
    connection.tokenExpiresAt = now().plus({ seconds: tokens.expiresIn }).toJSDate();

    await this.connectionRepo.save(connection);

    this.logger.log(`Token refreshed for connection ${connection.id}`);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? refreshToken,
    };
  }

  private async configFor(connection: CalendarConnection): Promise<CalendarProviderConfig> {
    return {
      accessToken: this.decryptToken(connection.accessTokenEncrypted),
      refreshToken: connection.refreshTokenEncrypted
        ? this.decryptToken(connection.refreshTokenEncrypted)
        : null,
    };
  }

  private async upsertEvent(
    connection: CalendarConnection,
    data: CalendarEventData,
  ): Promise<CalendarEvent> {
    let event = await this.eventRepo.findOne({
      where: {
        connectionId: connection.id,
        externalId: data.externalId,
      },
    });

    const status = this.mapEventStatus(data.status);

    if (event) {
      event.calendarId = data.calendarId;
      event.title = data.title;
      event.description = data.description;
      event.startTime = data.startTime;
      event.endTime = data.endTime;
      event.isAllDay = data.isAllDay;
      event.timezone = data.timezone;
      event.location = data.location;
      event.status = status;
      event.attendees = data.attendees;
      event.organizerEmail = data.organizerEmail;
      event.meetingUrl = data.meetingUrl;
      event.isRecurring = data.isRecurring;
      event.recurrenceRule = data.recurrenceRule;
      event.rawData = data.rawData;
      event.etag = data.etag;
    } else {
      event = this.eventRepo.create({
        connectionId: connection.id,
        externalId: data.externalId,
        calendarId: data.calendarId,
        provider: connection.provider,
        title: data.title,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        isAllDay: data.isAllDay,
        timezone: data.timezone,
        location: data.location,
        status,
        attendees: data.attendees,
        organizerEmail: data.organizerEmail,
        meetingUrl: data.meetingUrl,
        isRecurring: data.isRecurring,
        recurrenceRule: data.recurrenceRule,
        rawData: data.rawData,
        etag: data.etag,
      });
    }

    return this.eventRepo.save(event);
  }

  private mapEventStatus(status: "confirmed" | "tentative" | "cancelled"): CalendarEventStatus {
    if (status === "confirmed") {
      return CalendarEventStatus.CONFIRMED;
    } else if (status === "tentative") {
      return CalendarEventStatus.TENTATIVE;
    } else {
      return CalendarEventStatus.CANCELLED;
    }
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

  private toConnectionResponse(connection: CalendarConnection): CalendarConnectionResponseDto {
    return {
      id: connection.id,
      userId: connection.userId,
      provider: connection.provider,
      accountEmail: connection.accountEmail,
      accountName: connection.accountName,
      syncStatus: connection.syncStatus,
      lastSyncAt: connection.lastSyncAt,
      selectedCalendars: connection.selectedCalendars,
      isPrimary: connection.isPrimary,
      createdAt: connection.createdAt,
    };
  }

  private toEventResponse(event: CalendarEvent): CalendarEventResponseDto {
    return {
      id: event.id,
      connectionId: event.connectionId,
      externalId: event.externalId,
      provider: event.provider,
      title: event.title,
      description: event.description,
      startTime: event.startTime,
      endTime: event.endTime,
      isAllDay: event.isAllDay,
      location: event.location,
      status: event.status,
      attendees: event.attendees,
      meetingUrl: event.meetingUrl,
      isRecurring: event.isRecurring,
    };
  }
}
