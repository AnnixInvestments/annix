import { Test, TestingModule } from "@nestjs/testing";
import { fromISO } from "../../lib/datetime";
import { AnnixRepAuthGuard } from "../auth";
import {
  MeetingPlatform,
  PlatformConnectionStatus,
} from "../entities/meeting-platform.enums";
import {
  type PlatformConnectionResponseDto,
  type PlatformMeetingRecordResponseDto,
  MeetingPlatformService,
} from "../services/meeting-platform.service";
import { MeetingSchedulerService } from "../services/meeting-scheduler.service";
import { MeetingPlatformController } from "./meeting-platform.controller";

describe("MeetingPlatformController", () => {
  let controller: MeetingPlatformController;
  let platformService: jest.Mocked<MeetingPlatformService>;
  let schedulerService: jest.Mocked<MeetingSchedulerService>;

  const testDate = fromISO("2026-01-15T10:00:00Z").toJSDate();

  const mockRequest = {
    annixRepUser: {
      userId: 100,
      email: "rep@example.com",
      sessionToken: "test-token",
    },
  };

  const mockConnectionResponse: PlatformConnectionResponseDto = {
    id: 1,
    userId: 100,
    platform: MeetingPlatform.ZOOM,
    accountEmail: "user@example.com",
    accountName: "Test User",
    connectionStatus: PlatformConnectionStatus.ACTIVE,
    autoFetchRecordings: true,
    autoTranscribe: true,
    autoSendSummary: true,
    lastRecordingSyncAt: null,
    lastError: null,
    createdAt: testDate,
  };

  beforeEach(async () => {
    const mockPlatformService = {
      oauthUrl: jest.fn(),
      connectPlatform: jest.fn(),
      listConnections: jest.fn(),
      connection: jest.fn(),
      updateConnection: jest.fn(),
      disconnectPlatform: jest.fn(),
      listMeetingRecords: jest.fn(),
      meetingRecord: jest.fn(),
    };

    const mockSchedulerService = {
      manualSync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MeetingPlatformController],
      providers: [
        { provide: MeetingPlatformService, useValue: mockPlatformService },
        { provide: MeetingSchedulerService, useValue: mockSchedulerService },
      ],
    })
      .overrideGuard(AnnixRepAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MeetingPlatformController>(MeetingPlatformController);
    platformService = module.get(MeetingPlatformService);
    schedulerService = module.get(MeetingSchedulerService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("GET /oauth/:platform/url (oauthUrl)", () => {
    it("should return oauth url and state", () => {
      platformService.oauthUrl.mockReturnValue("https://zoom.us/oauth/authorize?test=1");

      const result = controller.oauthUrl(MeetingPlatform.ZOOM, "https://redirect.com");

      expect(result.url).toBe("https://zoom.us/oauth/authorize?test=1");
      expect(result.state).toBeDefined();
      expect(typeof result.state).toBe("string");
    });

    it("should encode platform in the state", () => {
      platformService.oauthUrl.mockReturnValue("https://zoom.us/oauth/authorize");

      const result = controller.oauthUrl(MeetingPlatform.ZOOM, "https://redirect.com");

      const decoded = JSON.parse(Buffer.from(result.state, "base64").toString());
      expect(decoded.platform).toBe(MeetingPlatform.ZOOM);
      expect(decoded.timestamp).toBeDefined();
    });
  });

  describe("POST /oauth/:platform/callback (connect)", () => {
    it("should call connectPlatform with correct parameters", async () => {
      platformService.connectPlatform.mockResolvedValue(mockConnectionResponse);

      const result = await controller.connect(
        mockRequest as any,
        MeetingPlatform.ZOOM,
        { authCode: "auth-code-123", redirectUri: "https://redirect.com" },
      );

      expect(result).toEqual(mockConnectionResponse);
      expect(platformService.connectPlatform).toHaveBeenCalledWith(100, {
        platform: MeetingPlatform.ZOOM,
        authCode: "auth-code-123",
        redirectUri: "https://redirect.com",
      });
    });
  });

  describe("GET /connections (listConnections)", () => {
    it("should return list of connections", async () => {
      platformService.listConnections.mockResolvedValue([mockConnectionResponse]);

      const result = await controller.listConnections(mockRequest as any);

      expect(result).toHaveLength(1);
      expect(result[0].platform).toBe(MeetingPlatform.ZOOM);
      expect(platformService.listConnections).toHaveBeenCalledWith(100);
    });

    it("should return empty array when no connections", async () => {
      platformService.listConnections.mockResolvedValue([]);

      const result = await controller.listConnections(mockRequest as any);

      expect(result).toEqual([]);
    });
  });

  describe("GET /connections/:id (connection)", () => {
    it("should return connection by id", async () => {
      platformService.connection.mockResolvedValue(mockConnectionResponse);

      const result = await controller.connection(mockRequest as any, 1);

      expect(result.id).toBe(1);
      expect(platformService.connection).toHaveBeenCalledWith(100, 1);
    });
  });

  describe("PATCH /connections/:id (updateConnection)", () => {
    it("should update and return connection", async () => {
      const updated = { ...mockConnectionResponse, autoFetchRecordings: false };
      platformService.updateConnection.mockResolvedValue(updated);

      const result = await controller.updateConnection(mockRequest as any, 1, {
        autoFetchRecordings: false,
      });

      expect(result.autoFetchRecordings).toBe(false);
      expect(platformService.updateConnection).toHaveBeenCalledWith(100, 1, {
        autoFetchRecordings: false,
      });
    });
  });

  describe("DELETE /connections/:id (disconnect)", () => {
    it("should disconnect and return success", async () => {
      platformService.disconnectPlatform.mockResolvedValue(undefined);

      const result = await controller.disconnect(mockRequest as any, 1);

      expect(result).toEqual({ success: true });
      expect(platformService.disconnectPlatform).toHaveBeenCalledWith(100, 1);
    });
  });

  describe("POST /connections/:id/sync (sync)", () => {
    it("should call manualSync with default daysBack", async () => {
      schedulerService.manualSync.mockResolvedValue({ synced: 5, recordings: 2 });

      const result = await controller.sync(mockRequest as any, 1);

      expect(result).toEqual({ synced: 5, recordings: 2 });
      expect(schedulerService.manualSync).toHaveBeenCalledWith(100, 1, 7);
    });

    it("should parse daysBack query parameter", async () => {
      schedulerService.manualSync.mockResolvedValue({ synced: 10, recordings: 3 });

      const result = await controller.sync(mockRequest as any, 1, "14");

      expect(result).toEqual({ synced: 10, recordings: 3 });
      expect(schedulerService.manualSync).toHaveBeenCalledWith(100, 1, 14);
    });
  });

  describe("GET /connections/:id/recordings (listRecordings)", () => {
    it("should return recordings with default limit", async () => {
      const mockRecords: PlatformMeetingRecordResponseDto[] = [
        {
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
          recordingStatus: "pending" as any,
          participantCount: null,
          joinUrl: null,
          createdAt: testDate,
        },
      ];
      platformService.listMeetingRecords.mockResolvedValue(mockRecords);

      const result = await controller.listRecordings(mockRequest as any, 1);

      expect(result).toHaveLength(1);
      expect(platformService.listMeetingRecords).toHaveBeenCalledWith(100, 1, 50);
    });

    it("should parse custom limit", async () => {
      platformService.listMeetingRecords.mockResolvedValue([]);

      await controller.listRecordings(mockRequest as any, 1, "25");

      expect(platformService.listMeetingRecords).toHaveBeenCalledWith(100, 1, 25);
    });
  });

  describe("GET /recordings/:recordId (recording)", () => {
    it("should return recording by id", async () => {
      const mockRecord: PlatformMeetingRecordResponseDto = {
        id: 5,
        connectionId: 1,
        meetingId: null,
        platformMeetingId: "meeting-5",
        title: "Sales Call",
        topic: null,
        hostEmail: "rep@example.com",
        startTime: testDate,
        endTime: testDate,
        durationSeconds: 3600,
        recordingStatus: "completed" as any,
        participantCount: 2,
        joinUrl: null,
        createdAt: testDate,
      };
      platformService.meetingRecord.mockResolvedValue(mockRecord);

      const result = await controller.recording(mockRequest as any, 5);

      expect(result.id).toBe(5);
      expect(result.title).toBe("Sales Call");
      expect(platformService.meetingRecord).toHaveBeenCalledWith(100, 5);
    });
  });

  describe("GET /available (availablePlatforms)", () => {
    it("should return all three platforms", () => {
      const result = controller.availablePlatforms();

      expect(result.platforms).toHaveLength(3);
      expect(result.platforms.map((p) => p.id)).toEqual([
        MeetingPlatform.ZOOM,
        MeetingPlatform.TEAMS,
        MeetingPlatform.GOOGLE_MEET,
      ]);
    });

    it("should include name and description for each platform", () => {
      const result = controller.availablePlatforms();

      result.platforms.forEach((platform) => {
        expect(platform.name).toBeDefined();
        expect(platform.description).toBeDefined();
        expect(platform.description.length).toBeGreaterThan(0);
      });
    });
  });
});
