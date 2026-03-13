import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AnnixRepAuthGuard } from "../auth";
import { CalendarProvider } from "../entities";
import { CalendarService } from "../services/calendar.service";
import { CalendarColorService } from "../services/calendar-color.service";
import { CalendarSyncService } from "../services/calendar-sync.service";
import { CalendarController } from "./calendar.controller";

describe("CalendarController", () => {
  let controller: CalendarController;
  let calendarService: jest.Mocked<CalendarService>;
  let calendarColorService: jest.Mocked<CalendarColorService>;
  let calendarSyncService: jest.Mocked<CalendarSyncService>;

  const mockRequest = {
    annixRepUser: {
      userId: 100,
      email: "rep@example.com",
      sessionToken: "test-token",
    },
  } as any;

  beforeEach(async () => {
    const mockCalendarService = {
      oauthUrl: jest.fn(),
      connectCalendar: jest.fn(),
      listConnections: jest.fn(),
      connection: jest.fn(),
      updateConnection: jest.fn(),
      disconnectCalendar: jest.fn(),
      listAvailableCalendars: jest.fn(),
      syncConnection: jest.fn(),
      eventsInRange: jest.fn(),
    };

    const mockCalendarColorService = {
      colorsForUser: jest.fn(),
      setColors: jest.fn(),
      setColor: jest.fn(),
      resetToDefaults: jest.fn(),
    };

    const mockCalendarSyncService = {
      pendingConflicts: jest.fn(),
      conflictCount: jest.fn(),
      conflictById: jest.fn(),
      resolveConflict: jest.fn(),
      detectTimeOverlaps: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CalendarController],
      providers: [
        { provide: CalendarService, useValue: mockCalendarService },
        { provide: CalendarColorService, useValue: mockCalendarColorService },
        { provide: CalendarSyncService, useValue: mockCalendarSyncService },
      ],
    })
      .overrideGuard(AnnixRepAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CalendarController>(CalendarController);
    calendarService = module.get(CalendarService);
    calendarColorService = module.get(CalendarColorService);
    calendarSyncService = module.get(CalendarSyncService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("oauthUrl", () => {
    it("should return OAuth URL for provider", () => {
      calendarService.oauthUrl.mockReturnValue("https://accounts.google.com/o/oauth2/v2/auth?foo=bar");

      const result = controller.oauthUrl(CalendarProvider.GOOGLE, "http://localhost/callback");

      expect(result).toEqual({ url: "https://accounts.google.com/o/oauth2/v2/auth?foo=bar" });
      expect(calendarService.oauthUrl).toHaveBeenCalledWith(
        CalendarProvider.GOOGLE,
        "http://localhost/callback",
      );
    });
  });

  describe("connect", () => {
    it("should connect calendar and return response", async () => {
      const dto = { provider: CalendarProvider.GOOGLE, authCode: "code-123" };
      const connectionResponse = {
        id: 1,
        userId: 100,
        provider: CalendarProvider.GOOGLE,
        accountEmail: "user@gmail.com",
        accountName: "Test User",
        syncStatus: "active",
        lastSyncAt: null,
        selectedCalendars: null,
        isPrimary: false,
        createdAt: new Date(),
      };
      calendarService.connectCalendar.mockResolvedValue(connectionResponse as any);

      const result = await controller.connect(mockRequest, dto);

      expect(result).toEqual(connectionResponse);
      expect(calendarService.connectCalendar).toHaveBeenCalledWith(100, dto);
    });
  });

  describe("listConnections", () => {
    it("should return list of connections for user", async () => {
      const connections = [
        { id: 1, provider: CalendarProvider.GOOGLE, accountEmail: "user@gmail.com" },
        { id: 2, provider: CalendarProvider.OUTLOOK, accountEmail: "user@outlook.com" },
      ];
      calendarService.listConnections.mockResolvedValue(connections as any);

      const result = await controller.listConnections(mockRequest);

      expect(result).toHaveLength(2);
      expect(calendarService.listConnections).toHaveBeenCalledWith(100);
    });
  });

  describe("connection", () => {
    it("should return a single connection", async () => {
      const connection = { id: 1, provider: CalendarProvider.GOOGLE };
      calendarService.connection.mockResolvedValue(connection as any);

      const result = await controller.connection(mockRequest, 1);

      expect(result).toEqual(connection);
      expect(calendarService.connection).toHaveBeenCalledWith(100, 1);
    });
  });

  describe("updateConnection", () => {
    it("should update connection and return response", async () => {
      const dto = { selectedCalendars: ["primary", "work"] };
      const updated = { id: 1, selectedCalendars: ["primary", "work"] };
      calendarService.updateConnection.mockResolvedValue(updated as any);

      const result = await controller.updateConnection(mockRequest, 1, dto);

      expect(result).toEqual(updated);
      expect(calendarService.updateConnection).toHaveBeenCalledWith(100, 1, dto);
    });
  });

  describe("disconnect", () => {
    it("should disconnect calendar", async () => {
      calendarService.disconnectCalendar.mockResolvedValue(undefined);

      await controller.disconnect(mockRequest, 1);

      expect(calendarService.disconnectCalendar).toHaveBeenCalledWith(100, 1);
    });
  });

  describe("listAvailableCalendars", () => {
    it("should return available calendars for connection", async () => {
      const calendars = [
        { id: "primary", name: "Primary", isPrimary: true, color: "#4285F4" },
      ];
      calendarService.listAvailableCalendars.mockResolvedValue(calendars as any);

      const result = await controller.listAvailableCalendars(mockRequest, 1);

      expect(result).toEqual(calendars);
      expect(calendarService.listAvailableCalendars).toHaveBeenCalledWith(100, 1);
    });
  });

  describe("sync", () => {
    it("should trigger sync and return result", async () => {
      const syncResult = { synced: 5, deleted: 1, errors: [] };
      calendarService.syncConnection.mockResolvedValue(syncResult);
      const dto = { fullSync: false };

      const result = await controller.sync(mockRequest, 1, dto);

      expect(result).toEqual(syncResult);
      expect(calendarService.syncConnection).toHaveBeenCalledWith(100, 1, dto);
    });
  });

  describe("events", () => {
    it("should return events in date range", async () => {
      const events = [{ id: 1, title: "Meeting" }];
      calendarService.eventsInRange.mockResolvedValue(events as any);

      const result = await controller.events(
        mockRequest,
        "2026-01-15T00:00:00Z",
        "2026-01-15T23:59:59Z",
      );

      expect(result).toEqual(events);
      expect(calendarService.eventsInRange).toHaveBeenCalledWith(
        100,
        expect.any(Date),
        expect.any(Date),
      );
    });
  });

  describe("colors", () => {
    it("should return user color scheme", async () => {
      const colorScheme = {
        meetingTypes: { prospect_visit: "#3B82F6" },
        statuses: { scheduled: "#22C55E" },
        calendars: {},
      };
      calendarColorService.colorsForUser.mockResolvedValue(colorScheme as any);

      const result = await controller.colors(mockRequest);

      expect(result).toEqual(colorScheme);
      expect(calendarColorService.colorsForUser).toHaveBeenCalledWith(100);
    });
  });

  describe("setColors", () => {
    it("should set multiple colors and return success", async () => {
      calendarColorService.setColors.mockResolvedValue(undefined);

      const body = {
        colors: [
          { colorType: "meeting_type" as const, colorKey: "prospect_visit", colorValue: "#FF0000" },
        ],
      };

      const result = await controller.setColors(mockRequest, body);

      expect(result).toEqual({ success: true });
      expect(calendarColorService.setColors).toHaveBeenCalledWith(100, body.colors);
    });
  });

  describe("setColor", () => {
    it("should set a single color", async () => {
      const colorResult = { id: 1, colorType: "meeting_type", colorKey: "visit", colorValue: "#FF0000" };
      calendarColorService.setColor.mockResolvedValue(colorResult as any);

      const result = await controller.setColor(
        mockRequest,
        "meeting_type" as any,
        "visit",
        { colorValue: "#FF0000" },
      );

      expect(result).toEqual(colorResult);
      expect(calendarColorService.setColor).toHaveBeenCalledWith(
        100,
        "meeting_type",
        "visit",
        "#FF0000",
      );
    });
  });

  describe("resetColors", () => {
    it("should reset colors to defaults", async () => {
      calendarColorService.resetToDefaults.mockResolvedValue(undefined);

      const result = await controller.resetColors(mockRequest);

      expect(result).toEqual({ success: true });
      expect(calendarColorService.resetToDefaults).toHaveBeenCalledWith(100, undefined);
    });

    it("should reset colors for specific color type", async () => {
      calendarColorService.resetToDefaults.mockResolvedValue(undefined);

      const result = await controller.resetColors(mockRequest, "meeting_type" as any);

      expect(result).toEqual({ success: true });
      expect(calendarColorService.resetToDefaults).toHaveBeenCalledWith(100, "meeting_type");
    });
  });

  describe("pendingConflicts", () => {
    it("should return pending conflicts", async () => {
      const conflicts = [{ id: 1, resolution: "pending" }];
      calendarSyncService.pendingConflicts.mockResolvedValue(conflicts as any);

      const result = await controller.pendingConflicts(mockRequest);

      expect(result).toEqual(conflicts);
      expect(calendarSyncService.pendingConflicts).toHaveBeenCalledWith(100);
    });
  });

  describe("conflictCount", () => {
    it("should return count of pending conflicts", async () => {
      calendarSyncService.conflictCount.mockResolvedValue(3);

      const result = await controller.conflictCount(mockRequest);

      expect(result).toEqual({ count: 3 });
    });
  });

  describe("conflict", () => {
    it("should return conflict by ID", async () => {
      const conflict = { id: 5, resolution: "pending" };
      calendarSyncService.conflictById.mockResolvedValue(conflict as any);

      const result = await controller.conflict(mockRequest, 5);

      expect(result).toEqual(conflict);
      expect(calendarSyncService.conflictById).toHaveBeenCalledWith(100, 5);
    });
  });

  describe("resolveConflict", () => {
    it("should resolve a conflict", async () => {
      const resolved = { id: 5, resolution: "keep_local" };
      calendarSyncService.resolveConflict.mockResolvedValue(resolved as any);

      const result = await controller.resolveConflict(mockRequest, 5, {
        resolution: "keep_local",
      });

      expect(result).toEqual(resolved);
      expect(calendarSyncService.resolveConflict).toHaveBeenCalledWith(100, 5, "keep_local");
    });
  });

  describe("detectConflicts", () => {
    it("should trigger conflict detection and return count", async () => {
      calendarSyncService.detectTimeOverlaps.mockResolvedValue([
        { id: 1 },
        { id: 2 },
      ] as any);

      const result = await controller.detectConflicts(mockRequest);

      expect(result).toEqual({ detected: 2 });
      expect(calendarSyncService.detectTimeOverlaps).toHaveBeenCalledWith(100);
    });
  });
});
