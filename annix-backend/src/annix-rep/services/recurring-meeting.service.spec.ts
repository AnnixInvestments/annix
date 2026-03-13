import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Meeting, MeetingType } from "../entities";
import { RecurringMeetingService } from "./recurring-meeting.service";

describe("RecurringMeetingService", () => {
  let service: RecurringMeetingService;
  let mockMeetingRepo: Partial<Repository<Meeting>>;

  beforeEach(async () => {
    mockMeetingRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((data) => ({ id: 1, ...data })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecurringMeetingService,
        {
          provide: getRepositoryToken(Meeting),
          useValue: mockMeetingRepo,
        },
      ],
    }).compile();

    service = module.get<RecurringMeetingService>(RecurringMeetingService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("buildRRule", () => {
    it("should build a daily RRULE", () => {
      const result = service.buildRRule({
        frequency: "daily",
        interval: 1,
      } as any);

      expect(result).toContain("FREQ=DAILY");
    });

    it("should build a weekly RRULE with specific days", () => {
      const result = service.buildRRule({
        frequency: "weekly",
        interval: 1,
        byWeekDay: [1, 3, 5],
      } as any);

      expect(result).toContain("FREQ=WEEKLY");
      expect(result).toContain("BYDAY=MO,WE,FR");
    });

    it("should build a monthly RRULE with day of month", () => {
      const result = service.buildRRule({
        frequency: "monthly",
        interval: 1,
        byMonthDay: 15,
      } as any);

      expect(result).toContain("FREQ=MONTHLY");
      expect(result).toContain("BYMONTHDAY=15");
    });

    it("should include count when provided", () => {
      const result = service.buildRRule({
        frequency: "daily",
        interval: 1,
        endType: "count",
        count: 10,
      } as any);

      expect(result).toContain("COUNT=10");
    });

    it("should include until date when provided", () => {
      const result = service.buildRRule({
        frequency: "weekly",
        interval: 1,
        endType: "until",
        until: "2026-12-31",
      } as any);

      expect(result).toContain("UNTIL=");
    });
  });

  describe("parseRRule", () => {
    it("should parse a daily RRULE", () => {
      const result = service.parseRRule("FREQ=DAILY;INTERVAL=2");

      expect(result.freq).toBe("DAILY");
      expect(result.interval).toBe(2);
    });

    it("should parse a weekly RRULE with BYDAY", () => {
      const result = service.parseRRule("FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR");

      expect(result.freq).toBe("WEEKLY");
      expect(result.byDay).toEqual(["MO", "WE", "FR"]);
    });

    it("should parse a monthly RRULE with BYMONTHDAY", () => {
      const result = service.parseRRule("FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=15");

      expect(result.freq).toBe("MONTHLY");
      expect(result.byMonthDay).toBe(15);
    });

    it("should parse COUNT", () => {
      const result = service.parseRRule("FREQ=DAILY;INTERVAL=1;COUNT=5");

      expect(result.count).toBe(5);
    });

    it("should strip RRULE: prefix", () => {
      const result = service.parseRRule("RRULE:FREQ=DAILY;INTERVAL=1");

      expect(result.freq).toBe("DAILY");
    });
  });

  describe("generateInstances", () => {
    it("should generate daily instances within date range", () => {
      const parentMeeting = {
        id: 1,
        recurrenceRule: "FREQ=DAILY;INTERVAL=1",
        scheduledStart: new Date("2026-03-01T10:00:00Z"),
        recurrenceExceptions: null,
      } as unknown as Meeting;

      const startDate = new Date("2026-03-01T00:00:00Z");
      const endDate = new Date("2026-03-05T23:59:59Z");

      const result = service.generateInstances(parentMeeting, startDate, endDate);

      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(5);
    });

    it("should respect maxInstances limit", () => {
      const parentMeeting = {
        id: 1,
        recurrenceRule: "FREQ=DAILY;INTERVAL=1",
        scheduledStart: new Date("2026-03-01T10:00:00Z"),
        recurrenceExceptions: null,
      } as unknown as Meeting;

      const startDate = new Date("2026-03-01T00:00:00Z");
      const endDate = new Date("2026-12-31T23:59:59Z");

      const result = service.generateInstances(parentMeeting, startDate, endDate, 3);

      expect(result.length).toBeLessThanOrEqual(3);
    });
  });

  describe("createRecurring", () => {
    it("should create a parent meeting with recurrence rule", async () => {
      const dto = {
        title: "Weekly Standup",
        meetingType: MeetingType.VIDEO,
        scheduledStart: "2026-03-02T10:00:00Z",
        scheduledEnd: "2026-03-02T10:30:00Z",
        recurrence: {
          frequency: "weekly",
          interval: 1,
          byWeekDay: [1],
        },
      };

      (mockMeetingRepo.create as jest.Mock).mockReturnValue({
        id: 1,
        ...dto,
        salesRepId: 100,
        isRecurring: true,
      });

      const result = await service.createRecurring(100, dto as any);

      expect(result).toBeDefined();
      expect(mockMeetingRepo.create).toHaveBeenCalled();
      expect(mockMeetingRepo.save).toHaveBeenCalled();
    });
  });

  describe("deleteFromSeries", () => {
    it("should throw when meeting is not found", async () => {
      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteFromSeries(100, 999, "this")).rejects.toThrow();
    });
  });
});
