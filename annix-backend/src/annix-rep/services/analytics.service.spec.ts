import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { fromISO } from "../../lib/datetime";
import { Meeting, MeetingStatus, Prospect, ProspectStatus, Visit } from "../entities";
import { AnalyticsService } from "./analytics.service";

describe("AnalyticsService", () => {
  let service: AnalyticsService;
  let mockProspectRepo: Partial<Repository<Prospect>>;
  let mockMeetingRepo: Partial<Repository<Meeting>>;
  let mockVisitRepo: Partial<Repository<Visit>>;

  const testDate = fromISO("2026-01-15T10:00:00Z").toJSDate();
  const testDateEarlier = fromISO("2026-01-01T10:00:00Z").toJSDate();

  const mockProspect = (overrides: Partial<Prospect> = {}): Prospect =>
    ({
      id: 1,
      ownerId: 100,
      companyName: "Test Corp",
      contactName: "John Doe",
      status: ProspectStatus.NEW,
      estimatedValue: 50000,
      lastContactedAt: null,
      createdAt: testDateEarlier,
      updatedAt: testDate,
      ...overrides,
    }) as Prospect;

  const mockMeeting = (overrides: Partial<Meeting> = {}): Meeting =>
    ({
      id: 1,
      salesRepId: 100,
      title: "Test Meeting",
      status: MeetingStatus.SCHEDULED,
      scheduledStart: testDate,
      scheduledEnd: testDate,
      ...overrides,
    }) as Meeting;

  const mockVisit = (overrides: Partial<Visit> = {}): Visit =>
    ({
      id: 1,
      salesRepId: 100,
      startedAt: testDate,
      ...overrides,
    }) as Visit;

  beforeEach(async () => {
    mockProspectRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    mockMeetingRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    mockVisitRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getRepositoryToken(Prospect),
          useValue: mockProspectRepo,
        },
        {
          provide: getRepositoryToken(Meeting),
          useValue: mockMeetingRepo,
        },
        {
          provide: getRepositoryToken(Visit),
          useValue: mockVisitRepo,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("summary", () => {
    it("should return zeros when no data exists", async () => {
      (mockProspectRepo.find as jest.Mock).mockResolvedValue([]);
      (mockMeetingRepo.find as jest.Mock).mockResolvedValue([]);
      (mockVisitRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.summary(100);

      expect(result.totalProspects).toBe(0);
      expect(result.activeProspects).toBe(0);
      expect(result.totalMeetings).toBe(0);
      expect(result.completedMeetings).toBe(0);
      expect(result.totalVisits).toBe(0);
      expect(result.totalPipelineValue).toBe(0);
      expect(result.avgDealCycledays).toBeNull();
      expect(result.winRate).toBeNull();
    });

    it("should count active prospects (contacted, qualified, proposal)", async () => {
      const prospects = [
        mockProspect({ id: 1, status: ProspectStatus.NEW }),
        mockProspect({ id: 2, status: ProspectStatus.CONTACTED }),
        mockProspect({ id: 3, status: ProspectStatus.QUALIFIED }),
        mockProspect({ id: 4, status: ProspectStatus.PROPOSAL }),
        mockProspect({ id: 5, status: ProspectStatus.WON }),
        mockProspect({ id: 6, status: ProspectStatus.LOST }),
      ];
      (mockProspectRepo.find as jest.Mock).mockResolvedValue(prospects);
      (mockMeetingRepo.find as jest.Mock).mockResolvedValue([]);
      (mockVisitRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.summary(100);

      expect(result.totalProspects).toBe(6);
      expect(result.activeProspects).toBe(3);
    });

    it("should count completed meetings", async () => {
      const meetings = [
        mockMeeting({ id: 1, status: MeetingStatus.COMPLETED }),
        mockMeeting({ id: 2, status: MeetingStatus.COMPLETED }),
        mockMeeting({ id: 3, status: MeetingStatus.SCHEDULED }),
        mockMeeting({ id: 4, status: MeetingStatus.CANCELLED }),
      ];
      (mockProspectRepo.find as jest.Mock).mockResolvedValue([]);
      (mockMeetingRepo.find as jest.Mock).mockResolvedValue(meetings);
      (mockVisitRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.summary(100);

      expect(result.totalMeetings).toBe(4);
      expect(result.completedMeetings).toBe(2);
    });

    it("should calculate total pipeline value from non-closed prospects", async () => {
      const prospects = [
        mockProspect({ id: 1, status: ProspectStatus.NEW, estimatedValue: 10000 }),
        mockProspect({ id: 2, status: ProspectStatus.QUALIFIED, estimatedValue: 25000 }),
        mockProspect({ id: 3, status: ProspectStatus.WON, estimatedValue: 50000 }),
        mockProspect({ id: 4, status: ProspectStatus.LOST, estimatedValue: 30000 }),
      ];
      (mockProspectRepo.find as jest.Mock).mockResolvedValue(prospects);
      (mockMeetingRepo.find as jest.Mock).mockResolvedValue([]);
      (mockVisitRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.summary(100);

      expect(result.totalPipelineValue).toBe(35000);
    });

    it("should calculate win rate from won and lost prospects", async () => {
      const prospects = [
        mockProspect({ id: 1, status: ProspectStatus.WON }),
        mockProspect({ id: 2, status: ProspectStatus.WON }),
        mockProspect({ id: 3, status: ProspectStatus.WON }),
        mockProspect({ id: 4, status: ProspectStatus.LOST }),
      ];
      (mockProspectRepo.find as jest.Mock).mockResolvedValue(prospects);
      (mockMeetingRepo.find as jest.Mock).mockResolvedValue([]);
      (mockVisitRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.summary(100);

      expect(result.winRate).toBe(75);
    });

    it("should return null winRate when no closed prospects exist", async () => {
      const prospects = [
        mockProspect({ id: 1, status: ProspectStatus.NEW }),
        mockProspect({ id: 2, status: ProspectStatus.CONTACTED }),
      ];
      (mockProspectRepo.find as jest.Mock).mockResolvedValue(prospects);
      (mockMeetingRepo.find as jest.Mock).mockResolvedValue([]);
      (mockVisitRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.summary(100);

      expect(result.winRate).toBeNull();
    });

    it("should calculate average deal cycle days for won prospects", async () => {
      const prospects = [
        mockProspect({
          id: 1,
          status: ProspectStatus.WON,
          createdAt: fromISO("2026-01-01T10:00:00Z").toJSDate(),
          updatedAt: fromISO("2026-01-11T10:00:00Z").toJSDate(),
        }),
        mockProspect({
          id: 2,
          status: ProspectStatus.WON,
          createdAt: fromISO("2026-01-01T10:00:00Z").toJSDate(),
          updatedAt: fromISO("2026-01-21T10:00:00Z").toJSDate(),
        }),
      ];
      (mockProspectRepo.find as jest.Mock).mockResolvedValue(prospects);
      (mockMeetingRepo.find as jest.Mock).mockResolvedValue([]);
      (mockVisitRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.summary(100);

      expect(result.avgDealCycledays).toBe(15);
    });

    it("should count total visits", async () => {
      const visits = [mockVisit({ id: 1 }), mockVisit({ id: 2 }), mockVisit({ id: 3 })];
      (mockProspectRepo.find as jest.Mock).mockResolvedValue([]);
      (mockMeetingRepo.find as jest.Mock).mockResolvedValue([]);
      (mockVisitRepo.find as jest.Mock).mockResolvedValue(visits);

      const result = await service.summary(100);

      expect(result.totalVisits).toBe(3);
    });
  });

  describe("prospectFunnel", () => {
    it("should return counts and values grouped by status in order", async () => {
      const prospects = [
        mockProspect({ id: 1, status: ProspectStatus.NEW, estimatedValue: 10000 }),
        mockProspect({ id: 2, status: ProspectStatus.NEW, estimatedValue: 20000 }),
        mockProspect({ id: 3, status: ProspectStatus.QUALIFIED, estimatedValue: 50000 }),
        mockProspect({ id: 4, status: ProspectStatus.WON, estimatedValue: 75000 }),
      ];
      (mockProspectRepo.find as jest.Mock).mockResolvedValue(prospects);

      const result = await service.prospectFunnel(100);

      expect(result).toHaveLength(6);
      expect(result[0]).toEqual({ status: ProspectStatus.NEW, count: 2, totalValue: 30000 });
      expect(result[2]).toEqual({ status: ProspectStatus.QUALIFIED, count: 1, totalValue: 50000 });
      expect(result[4]).toEqual({ status: ProspectStatus.WON, count: 1, totalValue: 75000 });
    });

    it("should return zero counts for statuses with no prospects", async () => {
      (mockProspectRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.prospectFunnel(100);

      result.forEach((entry) => {
        expect(entry.count).toBe(0);
        expect(entry.totalValue).toBe(0);
      });
    });
  });

  describe("meetingsOverTime", () => {
    it("should return correct number of periods", async () => {
      (mockMeetingRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.meetingsOverTime(100, "week", 4);

      expect(result).toHaveLength(4);
    });

    it("should count completed and cancelled meetings per period", async () => {
      const meetings = [
        mockMeeting({ id: 1, status: MeetingStatus.COMPLETED }),
        mockMeeting({ id: 2, status: MeetingStatus.CANCELLED }),
        mockMeeting({ id: 3, status: MeetingStatus.SCHEDULED }),
      ];
      (mockMeetingRepo.find as jest.Mock).mockResolvedValue(meetings);

      const result = await service.meetingsOverTime(100, "week", 1);

      expect(result).toHaveLength(1);
      expect(result[0].count).toBe(3);
      expect(result[0].completed).toBe(1);
      expect(result[0].cancelled).toBe(1);
    });

    it("should use month format labels when period is month", async () => {
      (mockMeetingRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.meetingsOverTime(100, "month", 2);

      expect(result).toHaveLength(2);
      result.forEach((entry) => {
        expect(entry.period).toMatch(/^[A-Z][a-z]{2}$/);
      });
    });

    it("should use week format labels when period is week", async () => {
      (mockMeetingRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.meetingsOverTime(100, "week", 2);

      expect(result).toHaveLength(2);
      result.forEach((entry) => {
        expect(entry.period).toMatch(/^W\d+$/);
      });
    });
  });

  describe("winLossRateTrends", () => {
    it("should return correct number of months", async () => {
      (mockProspectRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.winLossRateTrends(100, 3);

      expect(result).toHaveLength(3);
    });

    it("should calculate win rate percentage", async () => {
      const prospects = [
        mockProspect({ id: 1, status: ProspectStatus.WON }),
        mockProspect({ id: 2, status: ProspectStatus.WON }),
        mockProspect({ id: 3, status: ProspectStatus.LOST }),
        mockProspect({ id: 4, status: ProspectStatus.CONTACTED }),
      ];
      (mockProspectRepo.find as jest.Mock).mockResolvedValue(prospects);

      const result = await service.winLossRateTrends(100, 1);

      expect(result[0].won).toBe(2);
      expect(result[0].lost).toBe(1);
      expect(result[0].winRate).toBe(67);
    });

    it("should return zero win rate when no won or lost prospects", async () => {
      (mockProspectRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.winLossRateTrends(100, 1);

      expect(result[0].winRate).toBe(0);
    });

    it("should use month abbreviation as period label", async () => {
      (mockProspectRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.winLossRateTrends(100, 2);

      result.forEach((entry) => {
        expect(entry.period).toMatch(/^[A-Z][a-z]{2}$/);
      });
    });
  });

  describe("activityHeatmap", () => {
    it("should return cells for all day/hour combinations (7 days x 14 hours)", async () => {
      (mockVisitRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.activityHeatmap(100);

      expect(result).toHaveLength(98);
    });

    it("should count visits in the correct day/hour cell", async () => {
      const wednesdayAt10 = fromISO("2026-03-11T10:00:00+02:00").toJSDate();
      const visits = [
        mockVisit({ id: 1, startedAt: wednesdayAt10 }),
        mockVisit({ id: 2, startedAt: wednesdayAt10 }),
      ];
      (mockVisitRepo.find as jest.Mock).mockResolvedValue(visits);

      const result = await service.activityHeatmap(100);

      const nonZeroCells = result.filter((cell) => cell.count > 0);
      expect(nonZeroCells.length).toBeGreaterThanOrEqual(1);
    });

    it("should return sorted results by day and hour", async () => {
      (mockVisitRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.activityHeatmap(100);

      const sortKeys = result.map((cell) => cell.dayOfWeek * 24 + cell.hour);
      const sorted = [...sortKeys].sort((a, b) => a - b);
      expect(sortKeys).toEqual(sorted);
    });

    it("should only include hours between 6 and 19", async () => {
      (mockVisitRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.activityHeatmap(100);

      result.forEach((cell) => {
        expect(cell.hour).toBeGreaterThanOrEqual(6);
        expect(cell.hour).toBeLessThan(20);
      });
    });
  });

  describe("revenuePipeline", () => {
    it("should return pipeline statuses only (new, contacted, qualified, proposal)", async () => {
      (mockProspectRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.revenuePipeline(100);

      expect(result).toHaveLength(4);
      const statuses = result.map((r) => r.status);
      expect(statuses).toEqual([
        ProspectStatus.NEW,
        ProspectStatus.CONTACTED,
        ProspectStatus.QUALIFIED,
        ProspectStatus.PROPOSAL,
      ]);
    });

    it("should calculate average value per status", async () => {
      const prospects = [
        mockProspect({ id: 1, status: ProspectStatus.NEW, estimatedValue: 10000 }),
        mockProspect({ id: 2, status: ProspectStatus.NEW, estimatedValue: 30000 }),
      ];
      (mockProspectRepo.find as jest.Mock).mockResolvedValue(prospects);

      const result = await service.revenuePipeline(100);

      const newStatus = result.find((r) => r.status === ProspectStatus.NEW);
      expect(newStatus?.count).toBe(2);
      expect(newStatus?.totalValue).toBe(40000);
      expect(newStatus?.avgValue).toBe(20000);
    });

    it("should return zero avgValue when no prospects in a status", async () => {
      (mockProspectRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.revenuePipeline(100);

      result.forEach((entry) => {
        expect(entry.avgValue).toBe(0);
      });
    });
  });

  describe("topProspects", () => {
    it("should return prospects sorted by estimated value descending", async () => {
      const prospects = [
        mockProspect({ id: 1, estimatedValue: 100000 }),
        mockProspect({ id: 2, estimatedValue: 50000 }),
        mockProspect({ id: 3, estimatedValue: 75000 }),
      ];
      (mockProspectRepo.find as jest.Mock).mockResolvedValue(prospects);

      const result = await service.topProspects(100);

      expect(result).toHaveLength(3);
      expect(result[0].estimatedValue).toBe(100000);
    });

    it("should respect the limit parameter", async () => {
      const prospects = Array.from({ length: 5 }, (_, i) =>
        mockProspect({ id: i + 1, estimatedValue: (5 - i) * 10000 }),
      );
      (mockProspectRepo.find as jest.Mock).mockResolvedValue(prospects);

      const result = await service.topProspects(100, 3);

      expect(result).toHaveLength(3);
    });

    it("should filter out prospects with null or zero estimated value", async () => {
      const prospects = [
        mockProspect({ id: 1, estimatedValue: 50000 }),
        mockProspect({ id: 2, estimatedValue: null }),
        mockProspect({ id: 3, estimatedValue: 0 }),
      ];
      (mockProspectRepo.find as jest.Mock).mockResolvedValue(prospects);

      const result = await service.topProspects(100);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it("should map prospect fields correctly", async () => {
      const prospect = mockProspect({
        id: 42,
        companyName: "Acme Corp",
        contactName: "Jane Smith",
        status: ProspectStatus.QUALIFIED,
        estimatedValue: 80000,
        lastContactedAt: testDate,
      });
      (mockProspectRepo.find as jest.Mock).mockResolvedValue([prospect]);

      const result = await service.topProspects(100);

      expect(result[0]).toEqual({
        id: 42,
        companyName: "Acme Corp",
        contactName: "Jane Smith",
        status: ProspectStatus.QUALIFIED,
        estimatedValue: 80000,
        lastContactedAt: testDate,
      });
    });

    it("should return empty array when no prospects have value", async () => {
      (mockProspectRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.topProspects(100);

      expect(result).toEqual([]);
    });
  });
});
