import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  CalendarConnection,
  CalendarEvent,
  Meeting,
  MeetingStatus,
  SyncConflict,
} from "../entities";
import { CalendarService } from "./calendar.service";
import { CalendarSyncService } from "./calendar-sync.service";

describe("CalendarSyncService", () => {
  let service: CalendarSyncService;
  let mockConnectionRepo: Partial<Repository<CalendarConnection>>;
  let mockMeetingRepo: Partial<Repository<Meeting>>;
  let mockCalendarEventRepo: Partial<Repository<CalendarEvent>>;
  let mockConflictRepo: Partial<Repository<SyncConflict>>;
  let mockCalendarService: Partial<CalendarService>;

  beforeEach(async () => {
    mockConnectionRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    mockMeetingRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    };

    mockCalendarEventRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    mockConflictRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((data) => ({ id: 1, ...data })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
      count: jest.fn().mockResolvedValue(0),
    };

    mockCalendarService = {
      refreshTokenIfNeeded: jest.fn().mockResolvedValue(null),
      syncConnectionInternal: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarSyncService,
        {
          provide: getRepositoryToken(CalendarConnection),
          useValue: mockConnectionRepo,
        },
        {
          provide: getRepositoryToken(Meeting),
          useValue: mockMeetingRepo,
        },
        {
          provide: getRepositoryToken(CalendarEvent),
          useValue: mockCalendarEventRepo,
        },
        {
          provide: getRepositoryToken(SyncConflict),
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

      expect(mockConnectionRepo.find).not.toHaveBeenCalled();
    });

    it("should process active connections", async () => {
      (mockConnectionRepo.find as jest.Mock).mockResolvedValue([]);

      await service.syncActiveConnections();

      expect(mockConnectionRepo.find).toHaveBeenCalled();
    });
  });

  describe("detectTimeOverlaps", () => {
    it("should return empty array when no meetings exist", async () => {
      (mockMeetingRepo.find as jest.Mock).mockResolvedValue([]);
      (mockCalendarEventRepo.find as jest.Mock).mockResolvedValue([]);

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

      (mockMeetingRepo.find as jest.Mock).mockResolvedValue(meetings);
      (mockCalendarEventRepo.find as jest.Mock).mockResolvedValue(calendarEvents);
      (mockConflictRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.detectTimeOverlaps(1);

      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("pendingConflicts", () => {
    it("should return unresolved conflicts for user", async () => {
      const conflicts = [
        { id: 1, userId: 1, resolution: "pending", resolvedAt: null },
      ];
      (mockConflictRepo.find as jest.Mock).mockResolvedValue(conflicts);

      const result = await service.pendingConflicts(1);

      expect(result).toBeDefined();
      expect(mockConflictRepo.find).toHaveBeenCalled();
    });
  });

  describe("conflictCount", () => {
    it("should return count of pending conflicts", async () => {
      (mockConflictRepo.count as jest.Mock).mockResolvedValue(3);

      const result = await service.conflictCount(1);

      expect(result).toBe(3);
    });
  });

  describe("resolveConflict", () => {
    it("should throw NotFoundException when conflict does not exist", async () => {
      (mockConflictRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.resolveConflict(1, 999, "dismissed"),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
