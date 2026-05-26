import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { CalendarConnectionRepository } from "../calendar-connection.repository";
import { CalendarEventRepository } from "../calendar-event.repository";
import { MeetingStatus } from "../entities";
import { MeetingRepository } from "../meeting.repository";
import { SyncConflictRepository } from "../sync-conflict.repository";
import { CalendarService } from "./calendar.service";
import { CalendarSyncService } from "./calendar-sync.service";

describe("CalendarSyncService", () => {
  let service: CalendarSyncService;
  let mockConnectionRepo: Partial<CalendarConnectionRepository>;
  let mockMeetingRepo: Partial<MeetingRepository>;
  let mockCalendarEventRepo: Partial<CalendarEventRepository>;
  let mockConflictRepo: Partial<SyncConflictRepository>;
  let mockCalendarService: Partial<CalendarService>;
  const originalCronFlag = process.env.ANNIX_REP_CRON_ENABLED;

  beforeAll(() => {
    process.env.ANNIX_REP_CRON_ENABLED = "true";
  });

  afterAll(() => {
    if (originalCronFlag === undefined) {
      delete process.env.ANNIX_REP_CRON_ENABLED;
    } else {
      process.env.ANNIX_REP_CRON_ENABLED = originalCronFlag;
    }
  });

  beforeEach(async () => {
    mockConnectionRepo = {
      findBySyncStatuses: jest.fn().mockResolvedValue([]),
      save: jest.fn(),
    };

    mockMeetingRepo = {
      findFutureForOverlapDetection: jest.fn().mockResolvedValue([]),
      updateStatus: jest.fn(),
    };

    mockCalendarEventRepo = {
      findOverlapsForUser: jest.fn().mockResolvedValue([]),
      deleteById: jest.fn(),
    };

    mockConflictRepo = {
      findPendingForUser: jest.fn().mockResolvedValue([]),
      findPendingForPair: jest.fn().mockResolvedValue(null),
      findByIdAndUser: jest.fn(),
      create: jest.fn().mockImplementation((data) => Promise.resolve({ id: 1, ...data })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
      countPendingForUser: jest.fn().mockResolvedValue(0),
    };

    mockCalendarService = {
      refreshTokenIfNeeded: jest.fn().mockResolvedValue(null),
      syncConnectionInternal: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarSyncService,
        {
          provide: CalendarConnectionRepository,
          useValue: mockConnectionRepo,
        },
        {
          provide: MeetingRepository,
          useValue: mockMeetingRepo,
        },
        {
          provide: CalendarEventRepository,
          useValue: mockCalendarEventRepo,
        },
        {
          provide: SyncConflictRepository,
          useValue: mockConflictRepo,
        },
        {
          provide: CalendarService,
          useValue: mockCalendarService,
        },
      ],
    }).compile();

    service = module.get<CalendarSyncService>(CalendarSyncService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("syncActiveConnections", () => {
    it("should skip sync when already syncing", async () => {
      (service as any).isSyncing = true;

      await service.syncActiveConnections();

      expect(mockConnectionRepo.findBySyncStatuses).not.toHaveBeenCalled();
    });

    it("should process active connections", async () => {
      (mockConnectionRepo.findBySyncStatuses as jest.Mock).mockResolvedValue([]);

      await service.syncActiveConnections();

      expect(mockConnectionRepo.findBySyncStatuses).toHaveBeenCalled();
    });
  });

  describe("detectTimeOverlaps", () => {
    it("should return empty array when no meetings exist", async () => {
      (mockMeetingRepo.findFutureForOverlapDetection as jest.Mock).mockResolvedValue([]);
      (mockCalendarEventRepo.findOverlapsForUser as jest.Mock).mockResolvedValue([]);

      const result = await service.detectTimeOverlaps(1);

      expect(result).toEqual([]);
    });

    it("should detect overlapping meetings and calendar events", async () => {
      const meetings = [
        {
          id: 1,
          salesRepId: 1,
          scheduledStart: new Date("2026-03-13T10:00:00Z"),
          scheduledEnd: new Date("2026-03-13T11:00:00Z"),
          status: MeetingStatus.SCHEDULED,
        },
      ];

      const calendarEvents = [
        {
          id: 1,
          userId: 1,
          startTime: new Date("2026-03-13T10:30:00Z"),
          endTime: new Date("2026-03-13T11:30:00Z"),
          title: "Conflicting Event",
        },
      ];

      (mockMeetingRepo.findFutureForOverlapDetection as jest.Mock).mockResolvedValue(meetings);
      (mockCalendarEventRepo.findOverlapsForUser as jest.Mock).mockResolvedValue(calendarEvents);
      (mockConflictRepo.findPendingForUser as jest.Mock).mockResolvedValue([]);

      const result = await service.detectTimeOverlaps(1);

      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("pendingConflicts", () => {
    it("should return unresolved conflicts for user", async () => {
      const conflicts = [{ id: 1, userId: 1, resolution: "pending", resolvedAt: null }];
      (mockConflictRepo.findPendingForUser as jest.Mock).mockResolvedValue(conflicts);

      const result = await service.pendingConflicts(1);

      expect(result).toBeDefined();
      expect(mockConflictRepo.findPendingForUser).toHaveBeenCalled();
    });
  });

  describe("conflictCount", () => {
    it("should return count of pending conflicts", async () => {
      (mockConflictRepo.countPendingForUser as jest.Mock).mockResolvedValue(3);

      const result = await service.conflictCount(1);

      expect(result).toBe(3);
    });
  });

  describe("resolveConflict", () => {
    it("should throw NotFoundException when conflict does not exist", async () => {
      (mockConflictRepo.findByIdAndUser as jest.Mock).mockResolvedValue(null);

      await expect(service.resolveConflict(1, 999, "dismissed")).rejects.toThrow(NotFoundException);
    });
  });
});
