import { Test, TestingModule } from "@nestjs/testing";
import { AnnixRepAuthGuard } from "../auth";
import { ProspectStatus } from "../entities";
import {
  AnalyticsService,
  type AnalyticsSummary,
  type MeetingsOverTime,
  type ProspectFunnel,
  type RevenuePipeline,
  type TopProspect,
  type WinLossRateTrend,
} from "../services/analytics.service";
import { AnalyticsController } from "./analytics.controller";

describe("AnalyticsController", () => {
  let controller: AnalyticsController;
  let service: jest.Mocked<AnalyticsService>;

  const mockRequest = {
    annixRepUser: {
      userId: 100,
      email: "rep@example.com",
      sessionToken: "test-token",
    },
  };

  beforeEach(async () => {
    const mockService = {
      summary: jest.fn(),
      meetingsOverTime: jest.fn(),
      prospectFunnel: jest.fn(),
      winLossRateTrends: jest.fn(),
      activityHeatmap: jest.fn(),
      revenuePipeline: jest.fn(),
      topProspects: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [{ provide: AnalyticsService, useValue: mockService }],
    })
      .overrideGuard(AnnixRepAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
    service = module.get(AnalyticsService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("summary", () => {
    it("should call service with userId from request", () => {
      const summaryData: AnalyticsSummary = {
        totalProspects: 10,
        activeProspects: 5,
        totalMeetings: 8,
        completedMeetings: 3,
        totalVisits: 12,
        totalPipelineValue: 500000,
        avgDealCycledays: 15,
        winRate: 60,
      };
      service.summary.mockResolvedValue(summaryData);

      const result = controller.summary(mockRequest as any);

      expect(service.summary).toHaveBeenCalledWith(100);
      return expect(result).resolves.toEqual(summaryData);
    });
  });

  describe("meetingsOverTime", () => {
    it("should call service with default period and count", () => {
      const data: MeetingsOverTime[] = [{ period: "W1", count: 3, completed: 2, cancelled: 1 }];
      service.meetingsOverTime.mockResolvedValue(data);

      const result = controller.meetingsOverTime(mockRequest as any);

      expect(service.meetingsOverTime).toHaveBeenCalledWith(100, "week", 8);
      return expect(result).resolves.toEqual(data);
    });

    it("should pass custom period and count when provided", () => {
      service.meetingsOverTime.mockResolvedValue([]);

      controller.meetingsOverTime(mockRequest as any, "month", "4");

      expect(service.meetingsOverTime).toHaveBeenCalledWith(100, "month", 4);
    });
  });

  describe("prospectFunnel", () => {
    it("should call service with userId from request", () => {
      const funnelData: ProspectFunnel[] = [
        { status: ProspectStatus.NEW, count: 5, totalValue: 100000 },
      ];
      service.prospectFunnel.mockResolvedValue(funnelData);

      const result = controller.prospectFunnel(mockRequest as any);

      expect(service.prospectFunnel).toHaveBeenCalledWith(100);
      return expect(result).resolves.toEqual(funnelData);
    });
  });

  describe("winLossRateTrends", () => {
    it("should call service with default months when not provided", () => {
      const trendData: WinLossRateTrend[] = [{ period: "Jan", won: 3, lost: 1, winRate: 75 }];
      service.winLossRateTrends.mockResolvedValue(trendData);

      const result = controller.winLossRateTrends(mockRequest as any);

      expect(service.winLossRateTrends).toHaveBeenCalledWith(100, 6);
      return expect(result).resolves.toEqual(trendData);
    });

    it("should pass custom months when provided", () => {
      service.winLossRateTrends.mockResolvedValue([]);

      controller.winLossRateTrends(mockRequest as any, "12");

      expect(service.winLossRateTrends).toHaveBeenCalledWith(100, 12);
    });
  });

  describe("activityHeatmap", () => {
    it("should call service with userId from request", () => {
      service.activityHeatmap.mockResolvedValue([]);

      const result = controller.activityHeatmap(mockRequest as any);

      expect(service.activityHeatmap).toHaveBeenCalledWith(100);
      return expect(result).resolves.toEqual([]);
    });
  });

  describe("revenuePipeline", () => {
    it("should call service with userId from request", () => {
      const pipelineData: RevenuePipeline[] = [
        { status: ProspectStatus.NEW, count: 3, totalValue: 90000, avgValue: 30000 },
      ];
      service.revenuePipeline.mockResolvedValue(pipelineData);

      const result = controller.revenuePipeline(mockRequest as any);

      expect(service.revenuePipeline).toHaveBeenCalledWith(100);
      return expect(result).resolves.toEqual(pipelineData);
    });
  });

  describe("topProspects", () => {
    it("should call service with default limit when not provided", () => {
      const topData: TopProspect[] = [
        {
          id: 1,
          companyName: "Big Corp",
          contactName: "Jane",
          status: ProspectStatus.QUALIFIED,
          estimatedValue: 100000,
          lastContactedAt: null,
        },
      ];
      service.topProspects.mockResolvedValue(topData);

      const result = controller.topProspects(mockRequest as any);

      expect(service.topProspects).toHaveBeenCalledWith(100, 10);
      return expect(result).resolves.toEqual(topData);
    });

    it("should pass custom limit when provided", () => {
      service.topProspects.mockResolvedValue([]);

      controller.topProspects(mockRequest as any, "5");

      expect(service.topProspects).toHaveBeenCalledWith(100, 5);
    });
  });
});
