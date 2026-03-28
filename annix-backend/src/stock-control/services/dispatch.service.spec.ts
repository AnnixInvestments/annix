import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { AuditService } from "../../audit/audit.service";
import { DispatchCdn } from "../entities/dispatch-cdn.entity";
import { DispatchLoadPhoto } from "../entities/dispatch-load-photo.entity";
import { DispatchScan } from "../entities/dispatch-scan.entity";
import { JobCard } from "../entities/job-card.entity";
import { StockAllocation } from "../entities/stock-allocation.entity";
import { StockItem } from "../entities/stock-item.entity";
import { StockMovement } from "../entities/stock-movement.entity";
import { DispatchService } from "./dispatch.service";

describe("DispatchService", () => {
  let service: DispatchService;

  const mockDispatchScanRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    remove: jest.fn().mockResolvedValue(null),
  };

  const mockJobCardRepo = {
    findOne: jest.fn(),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    createQueryBuilder: jest.fn(),
  };

  const mockAllocationRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockStockItemRepo = {
    createQueryBuilder: jest.fn(),
  };

  const mockMovementRepo = {};

  const mockCdnRepo = {
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
  };

  const mockLoadPhotoRepo = {
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
  };

  const mockDataSource = {};

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(null),
  };

  const mockUser = { id: 1, companyId: 1, name: "Test User" };

  function makeJobCard(status: string, overrides: Partial<JobCard> = {}): Partial<JobCard> {
    return {
      id: 1,
      companyId: 1,
      jobNumber: "JC-001",
      workflowStatus: status,
      ...overrides,
    };
  }

  function makeStockItem(id: number): Partial<StockItem> {
    return { id, companyId: 1, description: `Item ${id}` } as Partial<StockItem>;
  }

  function makeAllocation(
    stockItemId: number,
    quantityUsed: number,
    id = 1,
  ): Partial<StockAllocation> {
    return {
      id,
      quantityUsed,
      stockItem: makeStockItem(stockItemId) as StockItem,
      companyId: 1,
    };
  }

  function makeScan(
    stockItemId: number,
    quantityDispatched: number,
    jobCardId = 1,
  ): Partial<DispatchScan> {
    return { stockItemId, quantityDispatched, jobCardId };
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DispatchService,
        { provide: getRepositoryToken(DispatchScan), useValue: mockDispatchScanRepo },
        { provide: getRepositoryToken(JobCard), useValue: mockJobCardRepo },
        { provide: getRepositoryToken(StockAllocation), useValue: mockAllocationRepo },
        { provide: getRepositoryToken(StockItem), useValue: mockStockItemRepo },
        { provide: getRepositoryToken(StockMovement), useValue: mockMovementRepo },
        { provide: getRepositoryToken(DispatchCdn), useValue: mockCdnRepo },
        { provide: getRepositoryToken(DispatchLoadPhoto), useValue: mockLoadPhotoRepo },
        { provide: DataSource, useValue: mockDataSource },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<DispatchService>(DispatchService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("startDispatchSession", () => {
    it("returns job card and progress when ready for dispatch", async () => {
      const jobCard = makeJobCard("ready", {
        allocations: [makeAllocation(10, 5) as StockAllocation],
      });
      mockJobCardRepo.findOne.mockResolvedValue(jobCard);
      mockAllocationRepo.find.mockResolvedValue([makeAllocation(10, 5)]);
      mockDispatchScanRepo.find.mockResolvedValue([]);

      const result = await service.startDispatchSession(1, 1);

      expect(result.jobCard).toEqual(jobCard);
      expect(result.progress).toBeDefined();
      expect(result.progress.totalAllocated).toBe(5);
      expect(result.progress.totalDispatched).toBe(0);
    });

    it("throws NotFoundException when job card does not exist", async () => {
      mockJobCardRepo.findOne.mockResolvedValue(null);

      await expect(service.startDispatchSession(1, 999)).rejects.toThrow(NotFoundException);
    });

    it("throws BadRequestException when job card is not ready for dispatch", async () => {
      const jobCard = makeJobCard("draft");
      mockJobCardRepo.findOne.mockResolvedValue(jobCard);

      await expect(service.startDispatchSession(1, 1)).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException when job card is already dispatched", async () => {
      const jobCard = makeJobCard("dispatched");
      mockJobCardRepo.findOne.mockResolvedValue(jobCard);

      await expect(service.startDispatchSession(1, 1)).rejects.toThrow(BadRequestException);
    });
  });

  describe("scanItem", () => {
    it("creates a dispatch scan for a valid allocation", async () => {
      const jobCard = makeJobCard("ready");
      mockJobCardRepo.findOne.mockResolvedValue(jobCard);
      mockAllocationRepo.findOne.mockResolvedValue(makeAllocation(10, 5));
      mockDispatchScanRepo.find.mockResolvedValue([]);

      const result = await service.scanItem(1, 1, 10, 3, mockUser);

      expect(mockDispatchScanRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          jobCardId: 1,
          companyId: 1,
          stockItemId: 10,
          quantityDispatched: 3,
          scannedById: 1,
          scannedByName: "Test User",
          dispatchNotes: null,
        }),
      );
      expect(mockDispatchScanRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("includes notes when provided", async () => {
      const jobCard = makeJobCard("ready");
      mockJobCardRepo.findOne.mockResolvedValue(jobCard);
      mockAllocationRepo.findOne.mockResolvedValue(makeAllocation(10, 5));
      mockDispatchScanRepo.find.mockResolvedValue([]);

      await service.scanItem(1, 1, 10, 3, mockUser, "Checked by supervisor");

      expect(mockDispatchScanRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          dispatchNotes: "Checked by supervisor",
        }),
      );
    });

    it("throws NotFoundException when job card does not exist", async () => {
      mockJobCardRepo.findOne.mockResolvedValue(null);

      await expect(service.scanItem(1, 999, 10, 1, mockUser)).rejects.toThrow(NotFoundException);
    });

    it("throws BadRequestException when job card is not ready for dispatch", async () => {
      const jobCard = makeJobCard("allocated");
      mockJobCardRepo.findOne.mockResolvedValue(jobCard);

      await expect(service.scanItem(1, 1, 10, 1, mockUser)).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException when stock item is not allocated", async () => {
      const jobCard = makeJobCard("ready");
      mockJobCardRepo.findOne.mockResolvedValue(jobCard);
      mockAllocationRepo.findOne.mockResolvedValue(null);

      await expect(service.scanItem(1, 1, 999, 1, mockUser)).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException when quantity exceeds remaining", async () => {
      const jobCard = makeJobCard("ready");
      mockJobCardRepo.findOne.mockResolvedValue(jobCard);
      mockAllocationRepo.findOne.mockResolvedValue(makeAllocation(10, 5));
      mockDispatchScanRepo.find.mockResolvedValue([makeScan(10, 3)]);

      await expect(service.scanItem(1, 1, 10, 3, mockUser)).rejects.toThrow(BadRequestException);
    });

    it("allows scanning exact remaining quantity", async () => {
      const jobCard = makeJobCard("ready");
      mockJobCardRepo.findOne.mockResolvedValue(jobCard);
      mockAllocationRepo.findOne.mockResolvedValue(makeAllocation(10, 5));
      mockDispatchScanRepo.find.mockResolvedValue([makeScan(10, 3)]);

      const result = await service.scanItem(1, 1, 10, 2, mockUser);

      expect(result).toBeDefined();
    });

    it("accounts for multiple existing scans", async () => {
      const jobCard = makeJobCard("ready");
      mockJobCardRepo.findOne.mockResolvedValue(jobCard);
      mockAllocationRepo.findOne.mockResolvedValue(makeAllocation(10, 10));
      mockDispatchScanRepo.find.mockResolvedValue([makeScan(10, 3), makeScan(10, 4)]);

      await expect(service.scanItem(1, 1, 10, 4, mockUser)).rejects.toThrow(BadRequestException);

      const result = await service.scanItem(1, 1, 10, 3, mockUser);
      expect(result).toBeDefined();
    });
  });

  describe("dispatchProgress", () => {
    it("returns correct progress with no scans", async () => {
      mockAllocationRepo.find.mockResolvedValue([
        makeAllocation(10, 5, 1),
        makeAllocation(20, 3, 2),
      ]);
      mockDispatchScanRepo.find.mockResolvedValue([]);

      const progress = await service.dispatchProgress(1, 1);

      expect(progress.totalAllocated).toBe(8);
      expect(progress.totalDispatched).toBe(0);
      expect(progress.isComplete).toBe(false);
      expect(progress.items).toHaveLength(2);
    });

    it("returns correct progress with partial scans", async () => {
      mockAllocationRepo.find.mockResolvedValue([
        makeAllocation(10, 5, 1),
        makeAllocation(20, 3, 2),
      ]);
      mockDispatchScanRepo.find.mockResolvedValue([makeScan(10, 5)]);

      const progress = await service.dispatchProgress(1, 1);

      expect(progress.totalAllocated).toBe(8);
      expect(progress.totalDispatched).toBe(5);
      expect(progress.isComplete).toBe(false);

      const item10 = progress.items.find((i) => i.stockItemId === 10);
      expect(item10?.remainingQuantity).toBe(0);

      const item20 = progress.items.find((i) => i.stockItemId === 20);
      expect(item20?.remainingQuantity).toBe(3);
    });

    it("returns isComplete true when all items fully dispatched", async () => {
      mockAllocationRepo.find.mockResolvedValue([
        makeAllocation(10, 5, 1),
        makeAllocation(20, 3, 2),
      ]);
      mockDispatchScanRepo.find.mockResolvedValue([makeScan(10, 5), makeScan(20, 3)]);

      const progress = await service.dispatchProgress(1, 1);

      expect(progress.isComplete).toBe(true);
      expect(progress.totalAllocated).toBe(8);
      expect(progress.totalDispatched).toBe(8);
    });

    it("aggregates multiple scans per stock item", async () => {
      mockAllocationRepo.find.mockResolvedValue([makeAllocation(10, 10, 1)]);
      mockDispatchScanRepo.find.mockResolvedValue([
        makeScan(10, 3),
        makeScan(10, 4),
        makeScan(10, 3),
      ]);

      const progress = await service.dispatchProgress(1, 1);

      expect(progress.totalDispatched).toBe(10);
      expect(progress.isComplete).toBe(true);
    });

    it("returns empty items when no allocations exist", async () => {
      mockAllocationRepo.find.mockResolvedValue([]);
      mockDispatchScanRepo.find.mockResolvedValue([]);

      const progress = await service.dispatchProgress(1, 1);

      expect(progress.totalAllocated).toBe(0);
      expect(progress.totalDispatched).toBe(0);
      expect(progress.isComplete).toBe(true);
      expect(progress.items).toHaveLength(0);
    });
  });

  describe("dispatchHistory", () => {
    it("returns scans ordered by scannedAt descending", async () => {
      const scans = [makeScan(10, 3), makeScan(20, 5)];
      mockDispatchScanRepo.find.mockResolvedValue(scans);

      const result = await service.dispatchHistory(1, 1);

      expect(mockDispatchScanRepo.find).toHaveBeenCalledWith({
        where: { jobCardId: 1, companyId: 1 },
        relations: ["stockItem", "scannedBy"],
        order: { scannedAt: "DESC" },
      });
      expect(result).toEqual(scans);
    });
  });

  describe("completeDispatch", () => {
    it("updates job card status to DISPATCHED when all items dispatched", async () => {
      mockAllocationRepo.find.mockResolvedValue([makeAllocation(10, 5, 1)]);
      mockDispatchScanRepo.find.mockResolvedValue([makeScan(10, 5)]);
      mockCdnRepo.count.mockResolvedValue(1);
      mockLoadPhotoRepo.count.mockResolvedValue(1);
      mockJobCardRepo.update.mockResolvedValue({ affected: 1 });
      const completedJobCard = makeJobCard("dispatched");
      mockJobCardRepo.findOne.mockResolvedValue(completedJobCard);

      const result = await service.completeDispatch(1, 1, mockUser);

      expect(mockJobCardRepo.update).toHaveBeenCalledWith(
        {
          id: 1,
          companyId: 1,
          workflowStatus: "ready",
        },
        { workflowStatus: "dispatched" },
      );
      expect(result.workflowStatus).toBe("dispatched");
    });

    it("throws BadRequestException when CDN and photos are missing", async () => {
      mockAllocationRepo.find.mockResolvedValue([makeAllocation(10, 5, 1)]);
      mockDispatchScanRepo.find.mockResolvedValue([makeScan(10, 5)]);
      mockCdnRepo.count.mockResolvedValue(0);
      mockLoadPhotoRepo.count.mockResolvedValue(0);

      await expect(service.completeDispatch(1, 1, mockUser)).rejects.toThrow(BadRequestException);
    });

    it("throws ConflictException when job card status changed concurrently", async () => {
      mockAllocationRepo.find.mockResolvedValue([makeAllocation(10, 5, 1)]);
      mockDispatchScanRepo.find.mockResolvedValue([makeScan(10, 5)]);
      mockCdnRepo.count.mockResolvedValue(1);
      mockLoadPhotoRepo.count.mockResolvedValue(1);
      mockJobCardRepo.update.mockResolvedValue({ affected: 0 });

      await expect(service.completeDispatch(1, 1, mockUser)).rejects.toThrow(ConflictException);
    });

    it("logs audit entry on successful dispatch", async () => {
      mockAllocationRepo.find.mockResolvedValue([makeAllocation(10, 5, 1)]);
      mockDispatchScanRepo.find.mockResolvedValue([makeScan(10, 5)]);
      mockCdnRepo.count.mockResolvedValue(1);
      mockLoadPhotoRepo.count.mockResolvedValue(1);
      mockJobCardRepo.update.mockResolvedValue({ affected: 1 });
      mockJobCardRepo.findOne.mockResolvedValue(makeJobCard("dispatched"));

      await service.completeDispatch(1, 1, mockUser);

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: "job_card_dispatch",
          entityId: 1,
          oldValues: { workflowStatus: "ready" },
          newValues: expect.objectContaining({
            workflowStatus: "dispatched",
            completedBy: "Test User",
          }),
        }),
      );
    });

    it("throws NotFoundException when job card disappears after update", async () => {
      mockAllocationRepo.find.mockResolvedValue([makeAllocation(10, 5, 1)]);
      mockDispatchScanRepo.find.mockResolvedValue([makeScan(10, 5)]);
      mockCdnRepo.count.mockResolvedValue(1);
      mockLoadPhotoRepo.count.mockResolvedValue(1);
      mockJobCardRepo.update.mockResolvedValue({ affected: 1 });
      mockJobCardRepo.findOne.mockResolvedValue(null);

      await expect(service.completeDispatch(1, 1, mockUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe("reverseDispatchScan", () => {
    it("removes the scan when job card is not yet dispatched", async () => {
      const scan = {
        id: 5,
        companyId: 1,
        jobCardId: 1,
        stockItemId: 10,
        quantityDispatched: 3,
        jobCard: makeJobCard("ready"),
      };
      mockDispatchScanRepo.findOne.mockResolvedValue(scan);

      await service.reverseDispatchScan(1, 5, { id: 1, name: "Test User" });

      expect(mockDispatchScanRepo.remove).toHaveBeenCalledWith(scan);
    });

    it("throws NotFoundException when scan does not exist", async () => {
      mockDispatchScanRepo.findOne.mockResolvedValue(null);

      await expect(
        service.reverseDispatchScan(1, 999, { id: 1, name: "Test User" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws BadRequestException when job card is already dispatched", async () => {
      const scan = {
        id: 5,
        companyId: 1,
        jobCardId: 1,
        stockItemId: 10,
        quantityDispatched: 3,
        jobCard: makeJobCard("dispatched"),
      };
      mockDispatchScanRepo.findOne.mockResolvedValue(scan);

      await expect(service.reverseDispatchScan(1, 5, { id: 1, name: "Test User" })).rejects.toThrow(
        BadRequestException,
      );
    });

    it("logs audit entry after reversal", async () => {
      const scan = {
        id: 5,
        companyId: 1,
        jobCardId: 1,
        stockItemId: 10,
        quantityDispatched: 3,
        jobCard: makeJobCard("ready"),
      };
      mockDispatchScanRepo.findOne.mockResolvedValue(scan);

      await service.reverseDispatchScan(1, 5, { id: 1, name: "Test User" });

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: "dispatch_scan",
          entityId: 5,
          oldValues: expect.objectContaining({
            jobCardId: 1,
            stockItemId: 10,
            quantity: 3,
          }),
          newValues: { reversedBy: "Test User" },
        }),
      );
    });
  });

  describe("scanByQrToken", () => {
    const mockJobCardQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };

    const mockStockItemQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };

    it("returns job_card type when QR matches a job card", async () => {
      mockJobCardRepo.createQueryBuilder.mockReturnValue(mockJobCardQb);
      mockJobCardQb.getOne.mockResolvedValue({ id: 1 });

      const result = await service.scanByQrToken(1, "JC-001");

      expect(result).toEqual({ type: "job_card", id: 1 });
    });

    it("returns stock_item type when QR matches a stock item", async () => {
      mockJobCardRepo.createQueryBuilder.mockReturnValue(mockJobCardQb);
      mockJobCardQb.getOne.mockResolvedValue(null);
      mockStockItemRepo.createQueryBuilder.mockReturnValue(mockStockItemQb);
      mockStockItemQb.getOne.mockResolvedValue({ id: 42 });

      const result = await service.scanByQrToken(1, "SKU-123");

      expect(result).toEqual({ type: "stock_item", id: 42 });
    });

    it("throws NotFoundException when QR matches nothing", async () => {
      mockJobCardRepo.createQueryBuilder.mockReturnValue(mockJobCardQb);
      mockJobCardQb.getOne.mockResolvedValue(null);
      mockStockItemRepo.createQueryBuilder.mockReturnValue(mockStockItemQb);
      mockStockItemQb.getOne.mockResolvedValue(null);

      await expect(service.scanByQrToken(1, "UNKNOWN")).rejects.toThrow(NotFoundException);
    });
  });
});
