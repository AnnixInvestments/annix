import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { fromISO } from "../../lib/datetime";
import { AnnixRepAuthGuard } from "../auth";
import { GoalPeriod, SalesGoal } from "../entities";
import { type GoalProgress, GoalsService } from "../services/goals.service";
import { GoalsController } from "./goals.controller";

describe("GoalsController", () => {
  let controller: GoalsController;
  let service: jest.Mocked<GoalsService>;

  const testDate = fromISO("2026-01-15T10:00:00Z").toJSDate();

  const mockRequest = {
    annixRepUser: {
      userId: 100,
      email: "rep@example.com",
      sessionToken: "test-token",
    },
  };

  const mockGoal: SalesGoal = {
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
    user: undefined as any,
  };

  beforeEach(async () => {
    const mockService = {
      goals: jest.fn(),
      goalByPeriod: jest.fn(),
      createOrUpdateGoal: jest.fn(),
      updateGoal: jest.fn(),
      deleteGoal: jest.fn(),
      progress: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GoalsController],
      providers: [{ provide: GoalsService, useValue: mockService }],
    })
      .overrideGuard(AnnixRepAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<GoalsController>(GoalsController);
    service = module.get(GoalsService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("goals", () => {
    it("should return all goals for the user", () => {
      const goals = [mockGoal, { ...mockGoal, id: 2, period: GoalPeriod.WEEKLY }];
      service.goals.mockResolvedValue(goals as SalesGoal[]);

      const result = controller.goals(mockRequest as any);

      expect(service.goals).toHaveBeenCalledWith(100);
      return expect(result).resolves.toHaveLength(2);
    });

    it("should return empty array when no goals exist", () => {
      service.goals.mockResolvedValue([]);

      const result = controller.goals(mockRequest as any);

      return expect(result).resolves.toEqual([]);
    });
  });

  describe("goalByPeriod", () => {
    it("should return the goal for the specified period", async () => {
      service.goalByPeriod.mockResolvedValue(mockGoal);

      const result = await controller.goalByPeriod(mockRequest as any, GoalPeriod.MONTHLY);

      expect(service.goalByPeriod).toHaveBeenCalledWith(100, GoalPeriod.MONTHLY);
      expect(result.id).toBe(1);
    });

    it("should throw NotFoundException when goal does not exist", async () => {
      service.goalByPeriod.mockResolvedValue(null);

      await expect(
        controller.goalByPeriod(mockRequest as any, GoalPeriod.QUARTERLY),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("createOrUpdateGoal", () => {
    it("should call service with userId and dto", () => {
      const dto = { period: GoalPeriod.MONTHLY, meetingsTarget: 15 };
      service.createOrUpdateGoal.mockResolvedValue(mockGoal);

      const result = controller.createOrUpdateGoal(mockRequest as any, dto);

      expect(service.createOrUpdateGoal).toHaveBeenCalledWith(100, dto);
      return expect(result).resolves.toEqual(mockGoal);
    });
  });

  describe("updateGoal", () => {
    it("should update the goal and return it", async () => {
      const updatedGoal = { ...mockGoal, meetingsTarget: 25 };
      service.updateGoal.mockResolvedValue(updatedGoal as SalesGoal);

      const result = await controller.updateGoal(mockRequest as any, GoalPeriod.MONTHLY, {
        meetingsTarget: 25,
      });

      expect(service.updateGoal).toHaveBeenCalledWith(100, GoalPeriod.MONTHLY, {
        meetingsTarget: 25,
      });
      expect(result.meetingsTarget).toBe(25);
    });

    it("should throw NotFoundException when goal does not exist", async () => {
      service.updateGoal.mockResolvedValue(null);

      await expect(
        controller.updateGoal(mockRequest as any, GoalPeriod.MONTHLY, { meetingsTarget: 25 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("deleteGoal", () => {
    it("should delete the goal when it exists", async () => {
      service.deleteGoal.mockResolvedValue(true);

      await controller.deleteGoal(mockRequest as any, GoalPeriod.MONTHLY);

      expect(service.deleteGoal).toHaveBeenCalledWith(100, GoalPeriod.MONTHLY);
    });

    it("should throw NotFoundException when goal does not exist", async () => {
      service.deleteGoal.mockResolvedValue(false);

      await expect(controller.deleteGoal(mockRequest as any, GoalPeriod.MONTHLY)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("progress", () => {
    it("should return progress data for the specified period", () => {
      const progressData: GoalProgress = {
        period: GoalPeriod.MONTHLY,
        periodStart: "2026-01-01",
        periodEnd: "2026-01-31",
        meetings: { target: 10, actual: 5, percentage: 50 },
        visits: { target: 20, actual: 8, percentage: 40 },
        newProspects: { target: 5, actual: 2, percentage: 40 },
        revenue: { target: 100000, actual: 50000, percentage: 50 },
        dealsWon: { target: 3, actual: 1, percentage: 33 },
      };
      service.progress.mockResolvedValue(progressData);

      const result = controller.progress(mockRequest as any, GoalPeriod.MONTHLY);

      expect(service.progress).toHaveBeenCalledWith(100, GoalPeriod.MONTHLY);
      return expect(result).resolves.toEqual(progressData);
    });

    it("should pass different period types to service", () => {
      service.progress.mockResolvedValue({
        period: GoalPeriod.WEEKLY,
        periodStart: "2026-01-13",
        periodEnd: "2026-01-19",
        meetings: { target: null, actual: 0, percentage: null },
        visits: { target: null, actual: 0, percentage: null },
        newProspects: { target: null, actual: 0, percentage: null },
        revenue: { target: null, actual: 0, percentage: null },
        dealsWon: { target: null, actual: 0, percentage: null },
      });

      const result = controller.progress(mockRequest as any, GoalPeriod.WEEKLY);

      expect(service.progress).toHaveBeenCalledWith(100, GoalPeriod.WEEKLY);
      return expect(result).resolves.toBeDefined();
    });
  });
});
