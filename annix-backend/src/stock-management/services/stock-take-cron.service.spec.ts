import { Test, TestingModule } from "@nestjs/testing";
import { StockTakeRepository } from "../repositories/stock-take.repository";
import { StockTakeService } from "./stock-take.service";
import { StockTakeCronService } from "./stock-take-cron.service";

describe("StockTakeCronService", () => {
  let service: StockTakeCronService;

  const mockStockTakeRepo = {
    distinctCompanyIds: jest.fn().mockResolvedValue([]),
    findDraftForPeriod: jest.fn(),
  };

  const mockStockTakeService = {
    createSession: jest.fn().mockResolvedValue({ id: 1 }),
    captureSnapshot: jest.fn().mockResolvedValue({ id: 1 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockTakeCronService,
        { provide: StockTakeRepository, useValue: mockStockTakeRepo },
        { provide: StockTakeService, useValue: mockStockTakeService },
      ],
    }).compile();

    service = module.get<StockTakeCronService>(StockTakeCronService);
    jest.clearAllMocks();
    mockStockTakeRepo.distinctCompanyIds.mockResolvedValue([]);
    mockStockTakeService.createSession.mockResolvedValue({ id: 1 });
    mockStockTakeService.captureSnapshot.mockResolvedValue({ id: 1 });
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("monthlySnapshot", () => {
    it("does nothing when no companies exist", async () => {
      mockStockTakeRepo.distinctCompanyIds.mockResolvedValueOnce([]);
      await service.monthlySnapshot();
      expect(mockStockTakeService.createSession).not.toHaveBeenCalled();
    });
  });
});
