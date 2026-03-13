import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { fromISO } from "../../lib/datetime";
import {
  CalendarConnection,
  CalendarEvent,
  CalendarEventStatus,
  CalendarProvider,
  CalendarSyncStatus,
} from "../entities";
import {
  CaldavCalendarProvider,
  GoogleCalendarProvider,
  OutlookCalendarProvider,
} from "../providers";
import { CalendarService } from "./calendar.service";

jest.mock("../../secure-documents/crypto.util", () => ({
  encrypt: jest.fn().mockReturnValue(Buffer.from("encrypted")),
  decrypt: jest.fn().mockReturnValue("decrypted-token"),
}));

describe("CalendarService", () => {
  let service: CalendarService;
  let mockConnectionRepo: Partial<Repository<CalendarConnection>>;
  let mockEventRepo: Partial<Repository<CalendarEvent>>;
  let mockConfigService: Partial<ConfigService>;
  let mockGoogleProvider: Partial<GoogleCalendarProvider>;
  let mockOutlookProvider: Partial<OutlookCalendarProvider>;
  let mockCaldavProvider: Partial<CaldavCalendarProvider>;

  const testDate = fromISO("2026-01-15T10:00:00Z").toJSDate();
  const testDateEnd = fromISO("2026-01-15T11:00:00Z").toJSDate();

  const mockConnection: CalendarConnection = {
    id: 1,
    userId: 100,
    provider: CalendarProvider.GOOGLE,
    accountEmail: "user@example.com",
    accountName: "Test User",
    accessTokenEncrypted: "encrypted-access",
    refreshTokenEncrypted: "encrypted-refresh",
    tokenExpiresAt: fromISO("2026-02-01T10:00:00Z").toJSDate(),
    caldavUrl: null,
    syncStatus: CalendarSyncStatus.ACTIVE,
    lastSyncAt: testDate,
    lastSyncError: null,
    syncToken: "sync-token-123",
    selectedCalendars: ["primary"],
    isPrimary: true,
    displayColor: "#3B82F6",
    events: [],
    createdAt: testDate,
    updatedAt: testDate,
    user: undefined as any,
  };

  const mockEvent: CalendarEvent = {
    id: 1,
    connectionId: 1,
    externalId: "ext-event-1",
    calendarId: "primary",
    provider: CalendarProvider.GOOGLE,
    title: "Test Meeting",
    description: "A test meeting",
    startTime: testDate,
    endTime: testDateEnd,
    isAllDay: false,
    timezone: "Africa/Johannesburg",
    location: "Office",
    status: CalendarEventStatus.CONFIRMED,
    attendees: ["user@example.com"],
    organizerEmail: "organizer@example.com",
    meetingUrl: "https://meet.google.com/abc",
    isRecurring: false,
    recurrenceRule: null,
    rawData: null,
    etag: "etag-123",
    createdAt: testDate,
    updatedAt: testDate,
    connection: undefined as any,
  };

  const mockRequest = {
    annixRepUser: { userId: 100, email: "rep@example.com", sessionToken: "token" },
  };

  beforeEach(async () => {
    mockConnectionRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((data) => ({ id: 1, ...data })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      update: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    mockEventRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((data) => ({ id: 1, ...data })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }),
    };

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        const config: Record<string, string> = {
          TOKEN_ENCRYPTION_KEY: "test-encryption-key",
          GOOGLE_CALENDAR_CLIENT_ID: "google-client-id",
          MICROSOFT_CLIENT_ID: "microsoft-client-id",
        };
        return config[key] ?? null;
      }),
    };

    mockGoogleProvider = {
      exchangeAuthCode: jest.fn().mockResolvedValue({
        accessToken: "google-access-token",
        refreshToken: "google-refresh-token",
        expiresIn: 3600,
      }),
      userInfo: jest.fn().mockResolvedValue({
        email: "user@gmail.com",
        name: "Google User",
      }),
      listCalendars: jest
        .fn()
        .mockResolvedValue([{ id: "primary", name: "Primary", isPrimary: true, color: "#4285F4" }]),
      syncEvents: jest.fn().mockResolvedValue({
        events: [],
        deletedEventIds: [],
        nextSyncToken: "new-sync-token",
        requiresFullSync: false,
      }),
      refreshAccessToken: jest.fn().mockResolvedValue({
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
        expiresIn: 3600,
      }),
    };

    mockOutlookProvider = {
      exchangeAuthCode: jest.fn().mockResolvedValue({
        accessToken: "outlook-access-token",
        refreshToken: "outlook-refresh-token",
        expiresIn: 3600,
      }),
      userInfo: jest.fn().mockResolvedValue({
        email: "user@outlook.com",
        name: "Outlook User",
      }),
      listCalendars: jest.fn().mockResolvedValue([]),
      syncEvents: jest.fn().mockResolvedValue({
        events: [],
        deletedEventIds: [],
        nextSyncToken: "outlook-sync-token",
        requiresFullSync: false,
      }),
    };

    mockCaldavProvider = {
      listCalendars: jest.fn().mockResolvedValue([]),
      syncEvents: jest.fn().mockResolvedValue({
        events: [],
        deletedEventIds: [],
        nextSyncToken: null,
        requiresFullSync: false,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarService,
        { provide: getRepositoryToken(CalendarConnection), useValue: mockConnectionRepo },
        { provide: getRepositoryToken(CalendarEvent), useValue: mockEventRepo },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: GoogleCalendarProvider, useValue: mockGoogleProvider },
        { provide: OutlookCalendarProvider, useValue: mockOutlookProvider },
        { provide: CaldavCalendarProvider, useValue: mockCaldavProvider },
      ],
    }).compile();

    service = module.get<CalendarService>(CalendarService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("oauthUrl", () => {
    it("should generate Google OAuth URL", () => {
      const url = service.oauthUrl(CalendarProvider.GOOGLE, "http://localhost/callback");

      expect(url).toContain("accounts.google.com");
      expect(url).toContain("google-client-id");
      expect(url).toContain(encodeURIComponent("http://localhost/callback"));
    });

    it("should generate Outlook OAuth URL", () => {
      const url = service.oauthUrl(CalendarProvider.OUTLOOK, "http://localhost/callback");

      expect(url).toContain("login.microsoftonline.com");
      expect(url).toContain("microsoft-client-id");
    });

    it("should throw BadRequestException for CalDAV provider", () => {
      expect(() => service.oauthUrl(CalendarProvider.CALDAV, "http://localhost/callback")).toThrow(
        BadRequestException,
      );
    });
  });

  describe("connectCalendar", () => {
    it("should connect a Google calendar with OAuth", async () => {
      const dto = {
        provider: CalendarProvider.GOOGLE,
        authCode: "auth-code-123",
        redirectUri: "http://localhost/callback",
      };

      const result = await service.connectCalendar(100, dto);

      expect(mockGoogleProvider.exchangeAuthCode).toHaveBeenCalledWith(
        "auth-code-123",
        "http://localhost/callback",
      );
      expect(mockGoogleProvider.userInfo).toHaveBeenCalled();
      expect(mockConnectionRepo.create).toHaveBeenCalled();
      expect(mockConnectionRepo.save).toHaveBeenCalled();
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("provider");
    });

    it("should connect a CalDAV calendar with username:password", async () => {
      const dto = {
        provider: CalendarProvider.CALDAV,
        authCode: "user@icloud.com:app-specific-password",
        caldavUrl: "https://caldav.icloud.com/",
      };

      const result = await service.connectCalendar(100, dto);

      expect(mockConnectionRepo.create).toHaveBeenCalled();
      expect(result).toHaveProperty("accountEmail", "user@icloud.com");
    });

    it("should throw BadRequestException for invalid CalDAV credentials", async () => {
      const dto = {
        provider: CalendarProvider.CALDAV,
        authCode: "no-colon-separator",
      };

      await expect(service.connectCalendar(100, dto)).rejects.toThrow(BadRequestException);
    });

    it("should update existing connection if one already exists", async () => {
      const existingConnection = { ...mockConnection };
      (mockConnectionRepo.findOne as jest.Mock).mockResolvedValue(existingConnection);

      const dto = {
        provider: CalendarProvider.GOOGLE,
        authCode: "new-auth-code",
        redirectUri: "http://localhost/callback",
      };

      await service.connectCalendar(100, dto);

      expect(mockConnectionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ syncStatus: CalendarSyncStatus.ACTIVE }),
      );
      expect(mockConnectionRepo.create).not.toHaveBeenCalled();
    });
  });

  describe("listConnections", () => {
    it("should return connections for user", async () => {
      (mockConnectionRepo.find as jest.Mock).mockResolvedValue([mockConnection]);

      const result = await service.listConnections(100);

      expect(result).toHaveLength(1);
      expect(result[0].accountEmail).toBe("user@example.com");
      expect(mockConnectionRepo.find).toHaveBeenCalledWith({
        where: { userId: 100 },
        order: { createdAt: "DESC" },
      });
    });

    it("should return empty array when no connections exist", async () => {
      const result = await service.listConnections(100);

      expect(result).toEqual([]);
    });
  });

  describe("connection", () => {
    it("should return a single connection", async () => {
      (mockConnectionRepo.findOne as jest.Mock).mockResolvedValue(mockConnection);

      const result = await service.connection(100, 1);

      expect(result.id).toBe(1);
      expect(result.provider).toBe(CalendarProvider.GOOGLE);
    });

    it("should throw NotFoundException when connection does not exist", async () => {
      await expect(service.connection(100, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("updateConnection", () => {
    it("should update selected calendars", async () => {
      (mockConnectionRepo.findOne as jest.Mock).mockResolvedValue({ ...mockConnection });

      const result = await service.updateConnection(100, 1, {
        selectedCalendars: ["primary", "work"],
      });

      expect(mockConnectionRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("should set connection as primary and clear other primaries", async () => {
      (mockConnectionRepo.findOne as jest.Mock).mockResolvedValue({ ...mockConnection });

      await service.updateConnection(100, 1, { isPrimary: true });

      expect(mockConnectionRepo.update).toHaveBeenCalledWith({ userId: 100 }, { isPrimary: false });
    });

    it("should throw NotFoundException when connection does not exist", async () => {
      await expect(service.updateConnection(100, 999, { selectedCalendars: [] })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("disconnectCalendar", () => {
    it("should delete events and remove connection", async () => {
      (mockConnectionRepo.findOne as jest.Mock).mockResolvedValue(mockConnection);

      await service.disconnectCalendar(100, 1);

      expect(mockEventRepo.delete).toHaveBeenCalledWith({ connectionId: 1 });
      expect(mockConnectionRepo.remove).toHaveBeenCalledWith(mockConnection);
    });

    it("should throw NotFoundException when connection does not exist", async () => {
      await expect(service.disconnectCalendar(100, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("listAvailableCalendars", () => {
    it("should list calendars from provider", async () => {
      (mockConnectionRepo.findOne as jest.Mock).mockResolvedValue(mockConnection);

      const result = await service.listAvailableCalendars(100, 1);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: "primary",
        name: "Primary",
        isPrimary: true,
        color: "#4285F4",
      });
    });

    it("should throw NotFoundException when connection does not exist", async () => {
      await expect(service.listAvailableCalendars(100, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("syncConnection", () => {
    it("should sync events for a connection", async () => {
      (mockConnectionRepo.findOne as jest.Mock).mockResolvedValue({
        ...mockConnection,
        selectedCalendars: ["primary"],
      });

      const result = await service.syncConnection(100, 1);

      expect(result).toEqual({ synced: 0, deleted: 0, errors: [] });
      expect(mockConnectionRepo.save).toHaveBeenCalled();
    });

    it("should throw NotFoundException when connection does not exist", async () => {
      await expect(service.syncConnection(100, 999)).rejects.toThrow(NotFoundException);
    });

    it("should auto-discover calendars when none are selected", async () => {
      (mockConnectionRepo.findOne as jest.Mock).mockResolvedValue({
        ...mockConnection,
        selectedCalendars: [],
      });

      await service.syncConnection(100, 1);

      expect(mockGoogleProvider.listCalendars).toHaveBeenCalled();
    });
  });

  describe("eventsInRange", () => {
    it("should return events within date range", async () => {
      (mockConnectionRepo.find as jest.Mock).mockResolvedValue([mockConnection]);
      const qb = (mockEventRepo.createQueryBuilder as jest.Mock)();
      qb.getMany.mockResolvedValue([mockEvent]);

      const start = fromISO("2026-01-15T00:00:00Z").toJSDate();
      const end = fromISO("2026-01-15T23:59:59Z").toJSDate();

      const result = await service.eventsInRange(100, start, end);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Test Meeting");
    });

    it("should return empty array when no active connections exist", async () => {
      const start = fromISO("2026-01-15T00:00:00Z").toJSDate();
      const end = fromISO("2026-01-15T23:59:59Z").toJSDate();

      const result = await service.eventsInRange(100, start, end);

      expect(result).toEqual([]);
    });
  });

  describe("refreshTokenIfNeeded", () => {
    it("should return config without refresh for CalDAV connections", async () => {
      const caldavConnection = {
        ...mockConnection,
        provider: CalendarProvider.CALDAV,
      };

      const result = await service.refreshTokenIfNeeded(caldavConnection as CalendarConnection);

      expect(result).toHaveProperty("accessToken");
      expect(mockGoogleProvider.refreshAccessToken).not.toHaveBeenCalled();
    });

    it("should return config without refresh when token is not expired", async () => {
      const connection = {
        ...mockConnection,
        tokenExpiresAt: fromISO("2027-01-01T00:00:00Z").toJSDate(),
      };

      const result = await service.refreshTokenIfNeeded(connection as CalendarConnection);

      expect(result).toHaveProperty("accessToken");
      expect(mockGoogleProvider.refreshAccessToken).not.toHaveBeenCalled();
    });

    it("should throw when refresh token is not available and token is expired", async () => {
      const connection = {
        ...mockConnection,
        tokenExpiresAt: fromISO("2020-01-01T00:00:00Z").toJSDate(),
        refreshTokenEncrypted: null,
      };

      await expect(service.refreshTokenIfNeeded(connection as CalendarConnection)).rejects.toThrow(
        "Refresh token not available",
      );
    });
  });
});
