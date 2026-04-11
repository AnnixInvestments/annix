import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { StockTake } from "../entities/stock-take.entity";
import { StockTakeService } from "./stock-take.service";
import { StockTakeCronService } from "./stock-take-cron.service";

describe("StockTakeCronService", () => {
  let service: StockTakeCronService;

  const mockStockTakeRepo = {
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    })),
    findOne: jest.fn(),
  };

  const mockStockTakeService = {
    createSession: jest.fn().mockResolvedValue({ id: 1 }),
    captureSnapshot: jest.fn().mockResolvedValue({ id: 1 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockTakeCronService,
        { provide: getRepositoryToken(StockTake), useValue: mockStockTakeRepo },
        { provide: StockTakeService, useValue: mockStockTakeService },
      ],
    }).compile();

    service = module.get<StockTakeCronService>(StockTakeCronService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("monthlySnapshot", () => {
    it("does nothing when no companies exist", async () => {
      mockStockTakeRepo.createQueryBuilder.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      } as never);
      await service.monthlySnapshot();
      expect(mockStockTakeService.createSession).not.toHaveBeenCalled();
    });
  });
});
