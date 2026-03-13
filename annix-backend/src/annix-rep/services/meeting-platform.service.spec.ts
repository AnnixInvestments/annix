import { NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { fromISO } from "../../lib/datetime";
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
  PlatformMeetingData,
  PlatformOAuthTokenResponse,
  PlatformProviderConfig,
  PlatformUserInfo,
} from "../providers/meeting-platform-provider.interface";
import { TeamsMeetingProvider } from "../providers/teams-meeting.provider";
import { ZoomMeetingProvider } from "../providers/zoom-meeting.provider";
import { MeetingPlatformService } from "./meeting-platform.service";

describe("MeetingPlatformService", () => {
  let service: MeetingPlatformService;
  let mockConnectionRepo: Partial<Repository<MeetingPlatformConnection>>;
  let mockRecordRepo: Partial<Repository<PlatformMeetingRecord>>;
  let mockZoomProvider: Partial<ZoomMeetingProvider>;
  let mockTeamsProvider: Partial<TeamsMeetingProvider>;
  let mockGoogleMeetProvider: Partial<GoogleMeetProvider>;

  const testDate = fromISO("2026-01-15T10:00:00Z").toJSDate();

  const mockConnection: MeetingPlatformConnection = {
    id: 1,
    userId: 100,
    platform: MeetingPlatform.ZOOM,
    accountEmail: "user@example.com",
    accountName: "Test User",
    accountId: "acc-123",
    accessTokenEncrypted: "encrypted-access-token",
    refreshTokenEncrypted: "encrypted-refresh-token",
    tokenExpiresAt: fromISO("2026-01-15T12:00:00Z").toJSDate(),
    tokenScope: "meeting:read",
    webhookSubscriptionId: null,
    webhookExpiry: null,
    connectionStatus: PlatformConnectionStatus.ACTIVE,
    lastError: null,
    lastErrorAt: null,
    autoFetchRecordings: true,
    autoTranscribe: true,
    autoSendSummary: true,
    lastRecordingSyncAt: null,
    meetingRecords: [],
    createdAt: testDate,
    updatedAt: testDate,
    user: {} as any,
  };

  beforeEach(async () => {
    mockConnectionRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      create: jest.fn().mockImplementation((data) => ({ ...data })),
      remove: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }),
    };

    mockRecordRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      create: jest.fn().mockImplementation((data) => ({ ...data })),
      delete: jest.fn().mockResolvedValue({ affected: 0 }),
    };

    mockZoomProvider = {
      platform: MeetingPlatform.ZOOM,
      oauthUrl: jest.fn().mockReturnValue("https://zoom.us/oauth/authorize?test=1"),
      exchangeAuthCode: jest.fn(),
      refreshAccessToken: jest.fn(),
      userInfo: jest.fn(),
      listRecentMeetings: jest.fn(),
    };

    mockTeamsProvider = {
      platform: MeetingPlatform.TEAMS,
      oauthUrl: jest.fn().mockReturnValue("https://login.microsoftonline.com/authorize?test=1"),
    };

    mockGoogleMeetProvider = {
      platform: MeetingPlatform.GOOGLE_MEET,
      oauthUrl: jest.fn().mockReturnValue("https://accounts.google.com/o/oauth2/v2/auth?test=1"),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeetingPlatformService,
        {
          provide: getRepositoryToken(MeetingPlatformConnection),
          useValue: mockConnectionRepo,
        },
        {
          provide: getRepositoryToken(PlatformMeetingRecord),
          useValue: mockRecordRepo,
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue("") },
        },
        {
          provide: ZoomMeetingProvider,
          useValue: mockZoomProvider,
        },
        {
          provide: TeamsMeetingProvider,
          useValue: mockTeamsProvider,
        },
        {
          provide: GoogleMeetProvider,
          useValue: mockGoogleMeetProvider,
        },
      ],
    }).compile();

    service = module.get<MeetingPlatformService>(MeetingPlatformService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("providerFor", () => {
    it("should return zoom provider for ZOOM platform", () => {
      const provider = service.providerFor(MeetingPlatform.ZOOM);
      expect(provider).toBe(mockZoomProvider);
    });

    it("should return teams provider for TEAMS platform", () => {
      const provider = service.providerFor(MeetingPlatform.TEAMS);
      expect(provider).toBe(mockTeamsProvider);
    });

    it("should return google meet provider for GOOGLE_MEET platform", () => {
      const provider = service.providerFor(MeetingPlatform.GOOGLE_MEET);
      expect(provider).toBe(mockGoogleMeetProvider);
    });
  });

  describe("oauthUrl", () => {
    it("should return oauth url from the correct provider", () => {
      const result = service.oauthUrl(MeetingPlatform.ZOOM, "https://redirect.com", "state-123");
      expect(result).toBe("https://zoom.us/oauth/authorize?test=1");
      expect(mockZoomProvider.oauthUrl).toHaveBeenCalledWith("https://redirect.com", "state-123");
    });
  });

  describe("connectPlatform", () => {
    const tokenResponse: PlatformOAuthTokenResponse = {
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
      expiresIn: 3600,
      tokenType: "Bearer",
      scope: "meeting:read",
    };

    const userInfo: PlatformUserInfo = {
      email: "user@example.com",
      name: "Test User",
      accountId: "acc-123",
      timezone: "Africa/Johannesburg",
      pictureUrl: null,
    };

    it("should create a new connection when none exists", async () => {
      (mockZoomProvider.exchangeAuthCode as jest.Mock).mockResolvedValue(tokenResponse);
      (mockZoomProvider.userInfo as jest.Mock).mockResolvedValue(userInfo);
      (mockConnectionRepo.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.connectPlatform(100, {
        platform: MeetingPlatform.ZOOM,
        authCode: "auth-code-123",
        redirectUri: "https://redirect.com",
      });

      expect(result.platform).toBe(MeetingPlatform.ZOOM);
      expect(result.accountEmail).toBe("user@example.com");
      expect(result.connectionStatus).toBe(PlatformConnectionStatus.ACTIVE);
      expect(mockConnectionRepo.create).toHaveBeenCalled();
      expect(mockConnectionRepo.save).toHaveBeenCalled();
    });

    it("should update an existing connection", async () => {
      (mockZoomProvider.exchangeAuthCode as jest.Mock).mockResolvedValue(tokenResponse);
      (mockZoomProvider.userInfo as jest.Mock).mockResolvedValue(userInfo);
      (mockConnectionRepo.findOne as jest.Mock).mockResolvedValue({ ...mockConnection });

      const result = await service.connectPlatform(100, {
        platform: MeetingPlatform.ZOOM,
        authCode: "auth-code-123",
        redirectUri: "https://redirect.com",
      });

      expect(result.accountEmail).toBe("user@example.com");
      expect(result.connectionStatus).toBe(PlatformConnectionStatus.ACTIVE);
      expect(mockConnectionRepo.create).not.toHaveBeenCalled();
      expect(mockConnectionRepo.save).toHaveBeenCalled();
    });

    it("should handle tokens without expiresIn", async () => {
      const noExpiryTokens = { ...tokenResponse, expiresIn: 0 };
      (mockZoomProvider.exchangeAuthCode as jest.Mock).mockResolvedValue(noExpiryTokens);
      (mockZoomProvider.userInfo as jest.Mock).mockResolvedValue(userInfo);
      (mockConnectionRepo.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.connectPlatform(100, {
        platform: MeetingPlatform.ZOOM,
        authCode: "auth-code-123",
        redirectUri: "https://redirect.com",
      });

      expect(result.connectionStatus).toBe(PlatformConnectionStatus.ACTIVE);
    });
  });

  describe("listConnections", () => {
    it("should return mapped connections for user", async () => {
      (mockConnectionRepo.find as jest.Mock).mockResolvedValue([mockConnection]);

      const result = await service.listConnections(100);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].platform).toBe(MeetingPlatform.ZOOM);
      expect(mockConnectionRepo.find).toHaveBeenCalledWith({
        where: { userId: 100 },
        order: { createdAt: "DESC" },
      });
    });

    it("should return empty array when no connections exist", async () => {
      (mockConnectionRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.listConnections(100);

      expect(result).toEqual([]);
    });
  });

  describe("connection", () => {
    it("should return connection by id and userId", async () => {
      (mockConnectionRepo.findOne as jest.Mock).mockResolvedValue(mockConnection);

      const result = await service.connection(100, 1);

      expect(result.id).toBe(1);
      expect(result.platform).toBe(MeetingPlatform.ZOOM);
    });

    it("should throw NotFoundException when not found", async () => {
      (mockConnectionRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.connection(100, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("updateConnection", () => {
    it("should update connection settings", async () => {
      const conn = { ...mockConnection };
      (mockConnectionRepo.findOne as jest.Mock).mockResolvedValue(conn);

      const result = await service.updateConnection(100, 1, {
        autoFetchRecordings: false,
        autoTranscribe: false,
      });

      expect(result.autoFetchRecordings).toBe(false);
      expect(result.autoTranscribe).toBe(false);
    });

    it("should throw NotFoundException when connection not found", async () => {
      (mockConnectionRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateConnection(100, 999, { autoFetchRecordings: false }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should only update provided fields", async () => {
      const conn = { ...mockConnection };
      (mockConnectionRepo.findOne as jest.Mock).mockResolvedValue(conn);

      const result = await service.updateConnection(100, 1, { autoSendSummary: false });

      expect(result.autoFetchRecordings).toBe(true);
      expect(result.autoTranscribe).toBe(true);
      expect(result.autoSendSummary).toBe(false);
    });
  });

  describe("disconnectPlatform", () => {
    it("should delete records and remove connection", async () => {
      (mockConnectionRepo.findOne as jest.Mock).mockResolvedValue(mockConnection);

      await service.disconnectPlatform(100, 1);

      expect(mockRecordRepo.delete).toHaveBeenCalledWith({ connectionId: 1 });
      expect(mockConnectionRepo.remove).toHaveBeenCalledWith(mockConnection);
    });

    it("should throw NotFoundException when connection not found", async () => {
      (mockConnectionRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.disconnectPlatform(100, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("refreshTokenIfNeeded", () => {
    it("should return existing config when token has no expiry", async () => {
      const conn = { ...mockConnection, tokenExpiresAt: null };

      const result = await service.refreshTokenIfNeeded(conn);

      expect(result).toBeDefined();
      expect(mockZoomProvider.refreshAccessToken).not.toHaveBeenCalled();
    });

    it("should return existing config when token is not expiring soon", async () => {
      const conn = {
        ...mockConnection,
        tokenExpiresAt: fromISO("2099-01-01T00:00:00Z").toJSDate(),
      };

      const result = await service.refreshTokenIfNeeded(conn);

      expect(result).toBeDefined();
      expect(mockZoomProvider.refreshAccessToken).not.toHaveBeenCalled();
    });

    it("should refresh token when expiring within 5 minutes", async () => {
      const conn = {
        ...mockConnection,
        tokenExpiresAt: fromISO("2020-01-01T00:00:00Z").toJSDate(),
      };

      const newTokens: PlatformOAuthTokenResponse = {
        accessToken: "refreshed-token",
        refreshToken: "new-refresh-token",
        expiresIn: 3600,
        tokenType: "Bearer",
        scope: "meeting:read",
      };

      (mockZoomProvider.refreshAccessToken as jest.Mock).mockResolvedValue(newTokens);

      const result = await service.refreshTokenIfNeeded(conn);

      expect(result.accessToken).toBe("refreshed-token");
      expect(mockConnectionRepo.save).toHaveBeenCalled();
    });

    it("should mark connection as TOKEN_EXPIRED when no refresh token available", async () => {
      const conn = {
        ...mockConnection,
        tokenExpiresAt: fromISO("2020-01-01T00:00:00Z").toJSDate(),
        refreshTokenEncrypted: null,
      };

      await expect(service.refreshTokenIfNeeded(conn)).rejects.toThrow(
        "Refresh token not available",
      );
      expect(conn.connectionStatus).toBe(PlatformConnectionStatus.TOKEN_EXPIRED);
      expect(mockConnectionRepo.save).toHaveBeenCalled();
    });
  });

  describe("syncRecentMeetings", () => {
    it("should throw NotFoundException when connection not found", async () => {
      (mockConnectionRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.syncRecentMeetings(100, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("syncConnectionMeetings", () => {
    it("should sync meetings and create new records", async () => {
      const conn = {
        ...mockConnection,
        tokenExpiresAt: null,
      };

      const meetings: PlatformMeetingData[] = [
        {
          platformMeetingId: "meeting-1",
          title: "Team Standup",
          topic: "Daily standup",
          hostEmail: "host@example.com",
          startTime: testDate,
          endTime: testDate,
          durationSeconds: 1800,
          joinUrl: "https://zoom.us/j/123",
          participants: ["user1@example.com"],
          participantCount: 3,
          hasRecording: true,
          timezone: "Africa/Johannesburg",
          rawData: {},
        },
      ];

      (mockZoomProvider.listRecentMeetings as jest.Mock).mockResolvedValue(meetings);
      (mockRecordRepo.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.syncConnectionMeetings(conn);

      expect(result.synced).toBe(1);
      expect(result.recordings).toBe(1);
      expect(mockRecordRepo.create).toHaveBeenCalled();
      expect(mockRecordRepo.save).toHaveBeenCalled();
    });

    it("should update existing records", async () => {
      const conn = {
        ...mockConnection,
        tokenExpiresAt: null,
      };

      const meetings: PlatformMeetingData[] = [
        {
          platformMeetingId: "meeting-1",
          title: "Updated Title",
          topic: null,
          hostEmail: "host@example.com",
          startTime: testDate,
          endTime: testDate,
          durationSeconds: 3600,
          joinUrl: null,
          participants: null,
          participantCount: null,
          hasRecording: false,
          timezone: null,
          rawData: {},
        },
      ];

      const existingRecord = {
        id: 10,
        connectionId: 1,
        platformMeetingId: "meeting-1",
        title: "Old Title",
        recordingStatus: PlatformRecordingStatus.NO_RECORDING,
      };

      (mockZoomProvider.listRecentMeetings as jest.Mock).mockResolvedValue(meetings);
      (mockRecordRepo.findOne as jest.Mock).mockResolvedValue(existingRecord);

      const result = await service.syncConnectionMeetings(conn);

      expect(result.synced).toBe(1);
      expect(result.recordings).toBe(0);
      expect(existingRecord.title).toBe("Updated Title");
    });
  });

  describe("listMeetingRecords", () => {
    it("should throw NotFoundException when connection not found", async () => {
      (mockConnectionRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.listMeetingRecords(100, 999)).rejects.toThrow(NotFoundException);
    });

    it("should return mapped records for valid connection", async () => {
      (mockConnectionRepo.findOne as jest.Mock).mockResolvedValue(mockConnection);

      const records = [
        {
          id: 1,
          connectionId: 1,
          meetingId: null,
          platformMeetingId: "meeting-1",
          title: "Test Meeting",
          topic: null,
          hostEmail: "host@example.com",
          startTime: testDate,
          endTime: testDate,
          durationSeconds: 1800,
          recordingStatus: PlatformRecordingStatus.PENDING,
          participantCount: 3,
          joinUrl: "https://zoom.us/j/123",
          createdAt: testDate,
        },
      ];

      (mockRecordRepo.find as jest.Mock).mockResolvedValue(records);

      const result = await service.listMeetingRecords(100, 1);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Test Meeting");
    });
  });

  describe("meetingRecord", () => {
    it("should throw NotFoundException when record not found", async () => {
      (mockRecordRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.meetingRecord(100, 999)).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException when record belongs to different user", async () => {
      (mockRecordRepo.findOne as jest.Mock).mockResolvedValue({
        id: 1,
        connection: { userId: 200 },
      });

      await expect(service.meetingRecord(100, 1)).rejects.toThrow(NotFoundException);
    });

    it("should return record when it belongs to user", async () => {
      const record = {
        id: 1,
        connectionId: 1,
        meetingId: null,
        platformMeetingId: "meeting-1",
        title: "Test Meeting",
        topic: null,
        hostEmail: null,
        startTime: testDate,
        endTime: null,
        durationSeconds: null,
        recordingStatus: PlatformRecordingStatus.PENDING,
        participantCount: null,
        joinUrl: null,
        createdAt: testDate,
        connection: { userId: 100 },
      };

      (mockRecordRepo.findOne as jest.Mock).mockResolvedValue(record);

      const result = await service.meetingRecord(100, 1);

      expect(result.id).toBe(1);
      expect(result.title).toBe("Test Meeting");
    });
  });

  describe("recordsWithPendingRecordings", () => {
    it("should query records with PENDING status", async () => {
      (mockRecordRepo.find as jest.Mock).mockResolvedValue([]);

      await service.recordsWithPendingRecordings();

      expect(mockRecordRepo.find).toHaveBeenCalledWith({
        where: { recordingStatus: PlatformRecordingStatus.PENDING },
        relations: ["connection"],
      });
    });
  });

  describe("activeConnections", () => {
    it("should query connections with ACTIVE status", async () => {
      (mockConnectionRepo.find as jest.Mock).mockResolvedValue([]);

      await service.activeConnections();

      expect(mockConnectionRepo.find).toHaveBeenCalledWith({
        where: { connectionStatus: PlatformConnectionStatus.ACTIVE },
      });
    });
  });

  describe("markConnectionError", () => {
    it("should update connection with error status", async () => {
      await service.markConnectionError(1, "API rate limit exceeded");

      expect(mockConnectionRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          connectionStatus: PlatformConnectionStatus.ERROR,
          lastError: "API rate limit exceeded",
        }),
      );
    });
  });

  describe("configFor", () => {
    it("should return decrypted config from connection", () => {
      const result = service.configFor(mockConnection);

      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
      expect(result.accountId).toBe("acc-123");
    });

    it("should return null refreshToken when not set", () => {
      const conn = { ...mockConnection, refreshTokenEncrypted: null };

      const result = service.configFor(conn);

      expect(result.refreshToken).toBeNull();
    });
  });
});
