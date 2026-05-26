import { Test, TestingModule } from "@nestjs/testing";
import { fromISO } from "../../lib/datetime";
import { GoalPeriod, MeetingStatus, ProspectStatus, SalesGoal } from "../entities";
import { MeetingRepository } from "../meeting.repository";
import { ProspectRepository } from "../prospect.repository";
import { SalesGoalRepository } from "../sales-goal.repository";
import { VisitRepository } from "../visit.repository";
import { GoalsService } from "./goals.service";

describe("GoalsService", () => {
  let service: GoalsService;
  let mockGoalRepo: Partial<SalesGoalRepository>;
  let mockMeetingRepo: Partial<MeetingRepository>;
  let mockVisitRepo: Partial<VisitRepository>;
  let mockProspectRepo: Partial<ProspectRepository>;

  const testDate = fromISO("2026-01-15T10:00:00Z").toJSDate();

  const mockGoal = (overrides: Partial<SalesGoal> = {}): SalesGoal =>
    ({
      id: 1,
      userId: 100,
      period: GoalPeriod.MONTHLY,
      meetingsTarget: 10,
      visitsTarget: 20,
      newProspectsTarget: 5,
      revenueTarget: 100000,
      dealsWonTarget: 3,
      isActive: true,
      createdAt: testDate,
      updatedAt: testDate,
      ...overrides,
    }) as SalesGoal;

  beforeEach(async () => {
    mockGoalRepo = {
      findByUser: jest.fn().mockResolvedValue([]),
      findByUserAndPeriod: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      save: jest.fn(),
      deleteByUserAndPeriod: jest.fn(),
    };

    mockMeetingRepo = {
      findCompletedInRange: jest.fn().mockResolvedValue([]),
    };

    mockVisitRepo = {
      findBySalesRepStartedInRange: jest.fn().mockResolvedValue([]),
    };

    mockProspectRepo = {
      findByOwnerCreatedInRange: jest.fn().mockResolvedValue([]),
      findWonByOwnerUpdatedInRange: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoalsService,
        {
          provide: SalesGoalRepository,
          useValue: mockGoalRepo,
        },
        {
          provide: MeetingRepository,
          useValue: mockMeetingRepo,
        },
        {
          provide: VisitRepository,
          useValue: mockVisitRepo,
        },
        {
          provide: ProspectRepository,
          useValue: mockProspectRepo,
        },
      ],
    }).compile();

    service = module.get<GoalsService>(GoalsService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("goals", () => {
    it("should return all goals for a user ordered by period ASC", async () => {
      const goals = [
        mockGoal({ id: 1, period: GoalPeriod.MONTHLY }),
        mockGoal({ id: 2, period: GoalPeriod.WEEKLY }),
      ];
      (mockGoalRepo.findByUser as jest.Mock).mockResolvedValue(goals);

      const result = await service.goals(100);

      expect(result).toHaveLength(2);
      expect(mockGoalRepo.findByUser).toHaveBeenCalledWith(100);
    });

    it("should return empty array when user has no goals", async () => {
      (mockGoalRepo.findByUser as jest.Mock).mockResolvedValue([]);

      const result = await service.goals(100);

      expect(result).toEqual([]);
    });
  });

  describe("goalByPeriod", () => {
    it("should return the goal for the specified period", async () => {
      const goal = mockGoal();
      (mockGoalRepo.findByUserAndPeriod as jest.Mock).mockResolvedValue(goal);

      const result = await service.goalByPeriod(100, GoalPeriod.MONTHLY);

      expect(result).toEqual(goal);
      expect(mockGoalRepo.findByUserAndPeriod).toHaveBeenCalledWith(100, GoalPeriod.MONTHLY);
    });

    it("should return null when no goal exists for the period", async () => {
      (mockGoalRepo.findByUserAndPeriod as jest.Mock).mockResolvedValue(null);

      const result = await service.goalByPeriod(100, GoalPeriod.QUARTERLY);

      expect(result).toBeNull();
    });
  });

  describe("createOrUpdateGoal", () => {
    it("should create a new goal when none exists for the period", async () => {
      (mockGoalRepo.findByUserAndPeriod as jest.Mock).mockResolvedValue(null);
      const created = mockGoal();
      (mockGoalRepo.create as jest.Mock).mockResolvedValue(created);

      const result = await service.createOrUpdateGoal(100, {
        period: GoalPeriod.MONTHLY,
        meetingsTarget: 10,
        visitsTarget: 20,
      });

      expect(result).toEqual(created);
      expect(mockGoalRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 100,
          period: GoalPeriod.MONTHLY,
          meetingsTarget: 10,
          visitsTarget: 20,
        }),
      );
    });

    it("should update existing goal when one exists for the period", async () => {
      const existing = mockGoal({ meetingsTarget: 5 });
      (mockGoalRepo.findByUserAndPeriod as jest.Mock).mockResolvedValue(existing);
      (mockGoalRepo.save as jest.Mock).mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.createOrUpdateGoal(100, {
        period: GoalPeriod.MONTHLY,
        meetingsTarget: 15,
      });

      expect(result.meetingsTarget).toBe(15);
      expect(mockGoalRepo.create).not.toHaveBeenCalled();
    });

    it("should preserve existing values when dto fields are not provided", async () => {
      const existing = mockGoal({ meetingsTarget: 10, visitsTarget: 20 });
      (mockGoalRepo.findByUserAndPeriod as jest.Mock).mockResolvedValue(existing);
      (mockGoalRepo.save as jest.Mock).mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.createOrUpdateGoal(100, {
        period: GoalPeriod.MONTHLY,
        meetingsTarget: 15,
      });

      expect(result.meetingsTarget).toBe(15);
      expect(result.visitsTarget).toBe(20);
    });

    it("should default null for unspecified targets on new goals", async () => {
      (mockGoalRepo.findByUserAndPeriod as jest.Mock).mockResolvedValue(null);
      (mockGoalRepo.create as jest.Mock).mockImplementation((data) => Promise.resolve(data));

      await service.createOrUpdateGoal(100, {
        period: GoalPeriod.WEEKLY,
        meetingsTarget: 5,
      });

      expect(mockGoalRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          visitsTarget: null,
          newProspectsTarget: null,
          revenueTarget: null,
          dealsWonTarget: null,
        }),
      );
    });
  });

  describe("updateGoal", () => {
    it("should update specified fields on existing goal", async () => {
      const goal = mockGoal();
      (mockGoalRepo.findByUserAndPeriod as jest.Mock).mockResolvedValue(goal);
      (mockGoalRepo.save as jest.Mock).mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.updateGoal(100, GoalPeriod.MONTHLY, {
        meetingsTarget: 25,
        isActive: false,
      });

      expect(result?.meetingsTarget).toBe(25);
      expect(result?.isActive).toBe(false);
    });

    it("should return null when goal does not exist", async () => {
      (mockGoalRepo.findByUserAndPeriod as jest.Mock).mockResolvedValue(null);

      const result = await service.updateGoal(100, GoalPeriod.MONTHLY, { meetingsTarget: 25 });

      expect(result).toBeNull();
    });

    it("should only update fields that are non-null in dto", async () => {
      const goal = mockGoal({ meetingsTarget: 10, visitsTarget: 20 });
      (mockGoalRepo.findByUserAndPeriod as jest.Mock).mockResolvedValue(goal);
      (mockGoalRepo.save as jest.Mock).mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.updateGoal(100, GoalPeriod.MONTHLY, { meetingsTarget: 30 });

      expect(result?.meetingsTarget).toBe(30);
      expect(result?.visitsTarget).toBe(20);
    });
  });

  describe("deleteGoal", () => {
    it("should return true when goal is deleted", async () => {
      (mockGoalRepo.deleteByUserAndPeriod as jest.Mock).mockResolvedValue(1);

      const result = await service.deleteGoal(100, GoalPeriod.MONTHLY);

      expect(result).toBe(true);
      expect(mockGoalRepo.deleteByUserAndPeriod).toHaveBeenCalledWith(100, GoalPeriod.MONTHLY);
    });

    it("should return false when no goal was found to delete", async () => {
      (mockGoalRepo.deleteByUserAndPeriod as jest.Mock).mockResolvedValue(0);

      const result = await service.deleteGoal(100, GoalPeriod.MONTHLY);

      expect(result).toBe(false);
    });
  });

  describe("progress", () => {
    it("should return progress with null percentages when no goal exists", async () => {
      (mockGoalRepo.findByUserAndPeriod as jest.Mock).mockResolvedValue(null);
      (mockMeetingRepo.findCompletedInRange as jest.Mock).mockResolvedValue([]);
      (mockVisitRepo.findBySalesRepStartedInRange as jest.Mock).mockResolvedValue([]);
      (mockProspectRepo.findByOwnerCreatedInRange as jest.Mock).mockResolvedValue([]);
      (mockProspectRepo.findWonByOwnerUpdatedInRange as jest.Mock).mockResolvedValue([]);

      const result = await service.progress(100, GoalPeriod.MONTHLY);

      expect(result.period).toBe(GoalPeriod.MONTHLY);
      expect(result.meetings.target).toBeNull();
      expect(result.meetings.actual).toBe(0);
      expect(result.meetings.percentage).toBeNull();
      expect(result.visits.target).toBeNull();
      expect(result.visits.percentage).toBeNull();
      expect(result.newProspects.target).toBeNull();
      expect(result.revenue.target).toBeNull();
      expect(result.dealsWon.target).toBeNull();
    });

    it("should calculate percentages when goal targets exist", async () => {
      const goal = mockGoal({
        meetingsTarget: 10,
        visitsTarget: 20,
        newProspectsTarget: 5,
        revenueTarget: 100000,
        dealsWonTarget: 3,
      });
      (mockGoalRepo.findByUserAndPeriod as jest.Mock).mockResolvedValue(goal);

      const meetings = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        status: MeetingStatus.COMPLETED,
      }));
      const visits = Array.from({ length: 8 }, (_, i) => ({ id: i + 1 }));
      const newProspects = Array.from({ length: 2 }, (_, i) => ({ id: i + 1 }));
      const wonProspects = [{ id: 1, estimatedValue: 50000, status: ProspectStatus.WON }];

      (mockMeetingRepo.findCompletedInRange as jest.Mock).mockResolvedValue(meetings);
      (mockVisitRepo.findBySalesRepStartedInRange as jest.Mock).mockResolvedValue(visits);
      (mockProspectRepo.findByOwnerCreatedInRange as jest.Mock).mockResolvedValue(newProspects);
      (mockProspectRepo.findWonByOwnerUpdatedInRange as jest.Mock).mockResolvedValue(wonProspects);

      const result = await service.progress(100, GoalPeriod.MONTHLY);

      expect(result.meetings.actual).toBe(5);
      expect(result.meetings.percentage).toBe(50);
      expect(result.visits.actual).toBe(8);
      expect(result.visits.percentage).toBe(40);
      expect(result.newProspects.actual).toBe(2);
      expect(result.newProspects.percentage).toBe(40);
      expect(result.revenue.actual).toBe(50000);
      expect(result.revenue.percentage).toBe(50);
      expect(result.dealsWon.actual).toBe(1);
      expect(result.dealsWon.percentage).toBe(33);
    });

    it("should include period start and end dates", async () => {
      (mockGoalRepo.findByUserAndPeriod as jest.Mock).mockResolvedValue(null);
      (mockMeetingRepo.findCompletedInRange as jest.Mock).mockResolvedValue([]);
      (mockVisitRepo.findBySalesRepStartedInRange as jest.Mock).mockResolvedValue([]);
      (mockProspectRepo.findByOwnerCreatedInRange as jest.Mock).mockResolvedValue([]);
      (mockProspectRepo.findWonByOwnerUpdatedInRange as jest.Mock).mockResolvedValue([]);

      const result = await service.progress(100, GoalPeriod.MONTHLY);

      expect(result.periodStart).toBeTruthy();
      expect(result.periodEnd).toBeTruthy();
      expect(result.periodStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.periodEnd).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should return null percentage when target is zero", async () => {
      const goal = mockGoal({ meetingsTarget: 0 });
      (mockGoalRepo.findByUserAndPeriod as jest.Mock).mockResolvedValue(goal);
      (mockMeetingRepo.findCompletedInRange as jest.Mock).mockResolvedValue([]);
      (mockVisitRepo.findBySalesRepStartedInRange as jest.Mock).mockResolvedValue([]);
      (mockProspectRepo.findByOwnerCreatedInRange as jest.Mock).mockResolvedValue([]);
      (mockProspectRepo.findWonByOwnerUpdatedInRange as jest.Mock).mockResolvedValue([]);

      const result = await service.progress(100, GoalPeriod.MONTHLY);

      expect(result.meetings.percentage).toBeNull();
    });

    it("should handle weekly period", async () => {
      (mockGoalRepo.findByUserAndPeriod as jest.Mock).mockResolvedValue(null);
      (mockMeetingRepo.findCompletedInRange as jest.Mock).mockResolvedValue([]);
      (mockVisitRepo.findBySalesRepStartedInRange as jest.Mock).mockResolvedValue([]);
      (mockProspectRepo.findByOwnerCreatedInRange as jest.Mock).mockResolvedValue([]);
      (mockProspectRepo.findWonByOwnerUpdatedInRange as jest.Mock).mockResolvedValue([]);

      const result = await service.progress(100, GoalPeriod.WEEKLY);

      expect(result.period).toBe(GoalPeriod.WEEKLY);
      expect(result.periodStart).toBeTruthy();
    });

    it("should handle quarterly period", async () => {
      (mockGoalRepo.findByUserAndPeriod as jest.Mock).mockResolvedValue(null);
      (mockMeetingRepo.findCompletedInRange as jest.Mock).mockResolvedValue([]);
      (mockVisitRepo.findBySalesRepStartedInRange as jest.Mock).mockResolvedValue([]);
      (mockProspectRepo.findByOwnerCreatedInRange as jest.Mock).mockResolvedValue([]);
      (mockProspectRepo.findWonByOwnerUpdatedInRange as jest.Mock).mockResolvedValue([]);

      const result = await service.progress(100, GoalPeriod.QUARTERLY);

      expect(result.period).toBe(GoalPeriod.QUARTERLY);
      expect(result.periodStart).toBeTruthy();
    });

    it("should sum revenue from won prospects estimated values", async () => {
      const goal = mockGoal({ revenueTarget: 200000 });
      (mockGoalRepo.findByUserAndPeriod as jest.Mock).mockResolvedValue(goal);
      (mockMeetingRepo.findCompletedInRange as jest.Mock).mockResolvedValue([]);
      (mockVisitRepo.findBySalesRepStartedInRange as jest.Mock).mockResolvedValue([]);

      const wonProspects = [
        { id: 1, estimatedValue: 50000, status: ProspectStatus.WON },
        { id: 2, estimatedValue: 75000, status: ProspectStatus.WON },
      ];
      (mockProspectRepo.findByOwnerCreatedInRange as jest.Mock).mockResolvedValue([]);
      (mockProspectRepo.findWonByOwnerUpdatedInRange as jest.Mock).mockResolvedValue(wonProspects);

      const result = await service.progress(100, GoalPeriod.MONTHLY);

      expect(result.revenue.actual).toBe(125000);
      expect(result.revenue.percentage).toBe(63);
    });
  });
});
