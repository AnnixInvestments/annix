import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AuditService } from "../../audit/audit.service";
import { DispatchScan } from "../entities/dispatch-scan.entity";
import { JobCard } from "../entities/job-card.entity";
import { StockAllocation } from "../entities/stock-allocation.entity";
import { StockItem } from "../entities/stock-item.entity";
import { DispatchCdnRepository } from "../repositories/dispatch-cdn.repository";
import { DispatchLoadPhotoRepository } from "../repositories/dispatch-load-photo.repository";
import { DispatchScanRepository } from "../repositories/dispatch-scan.repository";
import { JobCardRepository } from "../repositories/job-card.repository";
import { StockAllocationRepository } from "../repositories/stock-allocation.repository";
import { StockItemRepository } from "../repositories/stock-item.repository";
import { DispatchService } from "./dispatch.service";

describe("DispatchService", () => {
  let service: DispatchService;

  const mockDispatchScanRepo = {
    findForJobCardItem: jest.fn(),
    findForJobCard: jest.fn(),
    findHistoryForJobCard: jest.fn(),
    findOneForCompanyWithJobCard: jest.fn(),
    create: jest.fn().mockImplementation((data) => Promise.resolve({ id: 1, ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    remove: jest.fn().mockResolvedValue(null),
  };

  const jobCardFindOne = jest.fn();
  const mockJobCardRepo = {
    findOneForCompany: jobCardFindOne,
    findOneForCompanyWithRelations: jobCardFindOne,
    updateWorkflowStatusIfMatches: jest.fn().mockResolvedValue(1),
    findByQrToken: jest.fn(),
  };

  const mockAllocationRepo = {
    findForJobCardWithStockItem: jest.fn(),
    findOneByJobAndStockItem: jest.fn(),
  };

  const mockStockItemRepo = {
    findOneByQrTokenForCompany: jest.fn(),
  };

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
        { provide: DispatchScanRepository, useValue: mockDispatchScanRepo },
        { provide: JobCardRepository, useValue: mockJobCardRepo },
        { provide: StockAllocationRepository, useValue: mockAllocationRepo },
        { provide: StockItemRepository, useValue: mockStockItemRepo },
        { provide: DispatchCdnRepository, useValue: mockCdnRepo },
        { provide: DispatchLoadPhotoRepository, useValue: mockLoadPhotoRepo },
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
      mockJobCardRepo.findOneForCompany.mockResolvedValue(jobCard);
      mockAllocationRepo.findForJobCardWithStockItem.mockResolvedValue([makeAllocation(10, 5)]);
      mockDispatchScanRepo.findForJobCard.mockResolvedValue([]);

      const result = await service.startDispatchSession(1, 1);

      expect(result.jobCard).toEqual(jobCard);
      expect(result.progress).toBeDefined();
      expect(result.progress.totalAllocated).toBe(5);
      expect(result.progress.totalDispatched).toBe(0);
    });

    it("throws NotFoundException when job card does not exist", async () => {
      mockJobCardRepo.findOneForCompany.mockResolvedValue(null);

      await expect(service.startDispatchSession(1, 999)).rejects.toThrow(NotFoundException);
    });

    it("throws BadRequestException when job card is not ready for dispatch", async () => {
      const jobCard = makeJobCard("draft");
      mockJobCardRepo.findOneForCompany.mockResolvedValue(jobCard);

      await expect(service.startDispatchSession(1, 1)).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException when job card is already dispatched", async () => {
      const jobCard = makeJobCard("dispatched");
      mockJobCardRepo.findOneForCompany.mockResolvedValue(jobCard);

      await expect(service.startDispatchSession(1, 1)).rejects.toThrow(BadRequestException);
    });
  });

  describe("scanItem", () => {
    it("creates a dispatch scan for a valid allocation", async () => {
      const jobCard = makeJobCard("ready");
      mockJobCardRepo.findOneForCompany.mockResolvedValue(jobCard);
      mockAllocationRepo.findOneByJobAndStockItem.mockResolvedValue(makeAllocation(10, 5));
      mockDispatchScanRepo.findForJobCardItem.mockResolvedValue([]);

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
      expect(result).toBeDefined();
    });

    it("includes notes when provided", async () => {
      const jobCard = makeJobCard("ready");
      mockJobCardRepo.findOneForCompany.mockResolvedValue(jobCard);
      mockAllocationRepo.findOneByJobAndStockItem.mockResolvedValue(makeAllocation(10, 5));
      mockDispatchScanRepo.findForJobCardItem.mockResolvedValue([]);

      await service.scanItem(1, 1, 10, 3, mockUser, "Checked by supervisor");

      expect(mockDispatchScanRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          dispatchNotes: "Checked by supervisor",
        }),
      );
    });

    it("throws NotFoundException when job card does not exist", async () => {
      mockJobCardRepo.findOneForCompany.mockResolvedValue(null);

      await expect(service.scanItem(1, 999, 10, 1, mockUser)).rejects.toThrow(NotFoundException);
    });

    it("throws BadRequestException when job card is not ready for dispatch", async () => {
      const jobCard = makeJobCard("allocated");
      mockJobCardRepo.findOneForCompany.mockResolvedValue(jobCard);

      await expect(service.scanItem(1, 1, 10, 1, mockUser)).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException when stock item is not allocated", async () => {
      const jobCard = makeJobCard("ready");
      mockJobCardRepo.findOneForCompany.mockResolvedValue(jobCard);
      mockAllocationRepo.findOneByJobAndStockItem.mockResolvedValue(null);

      await expect(service.scanItem(1, 1, 999, 1, mockUser)).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException when quantity exceeds remaining", async () => {
      const jobCard = makeJobCard("ready");
      mockJobCardRepo.findOneForCompany.mockResolvedValue(jobCard);
      mockAllocationRepo.findOneByJobAndStockItem.mockResolvedValue(makeAllocation(10, 5));
      mockDispatchScanRepo.findForJobCardItem.mockResolvedValue([makeScan(10, 3)]);

      await expect(service.scanItem(1, 1, 10, 3, mockUser)).rejects.toThrow(BadRequestException);
    });

    it("allows scanning exact remaining quantity", async () => {
      const jobCard = makeJobCard("ready");
      mockJobCardRepo.findOneForCompany.mockResolvedValue(jobCard);
      mockAllocationRepo.findOneByJobAndStockItem.mockResolvedValue(makeAllocation(10, 5));
      mockDispatchScanRepo.findForJobCardItem.mockResolvedValue([makeScan(10, 3)]);

      const result = await service.scanItem(1, 1, 10, 2, mockUser);

      expect(result).toBeDefined();
    });

    it("accounts for multiple existing scans", async () => {
      const jobCard = makeJobCard("ready");
      mockJobCardRepo.findOneForCompany.mockResolvedValue(jobCard);
      mockAllocationRepo.findOneByJobAndStockItem.mockResolvedValue(makeAllocation(10, 10));
      mockDispatchScanRepo.findForJobCardItem.mockResolvedValue([makeScan(10, 3), makeScan(10, 4)]);

      await expect(service.scanItem(1, 1, 10, 4, mockUser)).rejects.toThrow(BadRequestException);

      const result = await service.scanItem(1, 1, 10, 3, mockUser);
      expect(result).toBeDefined();
    });
  });

  describe("dispatchProgress", () => {
    it("returns correct progress with no scans", async () => {
      mockAllocationRepo.findForJobCardWithStockItem.mockResolvedValue([
        makeAllocation(10, 5, 1),
        makeAllocation(20, 3, 2),
      ]);
      mockDispatchScanRepo.findForJobCard.mockResolvedValue([]);

      const progress = await service.dispatchProgress(1, 1);

      expect(progress.totalAllocated).toBe(8);
      expect(progress.totalDispatched).toBe(0);
      expect(progress.isComplete).toBe(false);
      expect(progress.items).toHaveLength(2);
    });

    it("returns correct progress with partial scans", async () => {
      mockAllocationRepo.findForJobCardWithStockItem.mockResolvedValue([
        makeAllocation(10, 5, 1),
        makeAllocation(20, 3, 2),
      ]);
      mockDispatchScanRepo.findForJobCard.mockResolvedValue([makeScan(10, 5)]);

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
      mockAllocationRepo.findForJobCardWithStockItem.mockResolvedValue([
        makeAllocation(10, 5, 1),
        makeAllocation(20, 3, 2),
      ]);
      mockDispatchScanRepo.findForJobCard.mockResolvedValue([makeScan(10, 5), makeScan(20, 3)]);

      const progress = await service.dispatchProgress(1, 1);

      expect(progress.isComplete).toBe(true);
      expect(progress.totalAllocated).toBe(8);
      expect(progress.totalDispatched).toBe(8);
    });

    it("aggregates multiple scans per stock item", async () => {
      mockAllocationRepo.findForJobCardWithStockItem.mockResolvedValue([makeAllocation(10, 10, 1)]);
      mockDispatchScanRepo.findForJobCard.mockResolvedValue([
        makeScan(10, 3),
        makeScan(10, 4),
        makeScan(10, 3),
      ]);

      const progress = await service.dispatchProgress(1, 1);

      expect(progress.totalDispatched).toBe(10);
      expect(progress.isComplete).toBe(true);
    });

    it("returns empty items when no allocations exist", async () => {
      mockAllocationRepo.findForJobCardWithStockItem.mockResolvedValue([]);
      mockDispatchScanRepo.findForJobCard.mockResolvedValue([]);

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
      mockDispatchScanRepo.findHistoryForJobCard.mockResolvedValue(scans);

      const result = await service.dispatchHistory(1, 1);

      expect(mockDispatchScanRepo.findHistoryForJobCard).toHaveBeenCalledWith(1, 1);
      expect(result).toEqual(scans);
    });
  });

  describe("completeDispatch", () => {
    it("updates job card status to DISPATCHED when all items dispatched", async () => {
      mockAllocationRepo.findForJobCardWithStockItem.mockResolvedValue([makeAllocation(10, 5, 1)]);
      mockDispatchScanRepo.findForJobCard.mockResolvedValue([makeScan(10, 5)]);
      mockCdnRepo.count.mockResolvedValue(1);
      mockLoadPhotoRepo.count.mockResolvedValue(1);
      mockJobCardRepo.updateWorkflowStatusIfMatches.mockResolvedValue(1);
      const completedJobCard = makeJobCard("dispatched");
      mockJobCardRepo.findOneForCompany.mockResolvedValue(completedJobCard);

      const result = await service.completeDispatch(1, 1, mockUser);

      expect(mockJobCardRepo.updateWorkflowStatusIfMatches).toHaveBeenCalledWith(
        1,
        1,
        "ready",
        "dispatched",
      );
      expect(result.workflowStatus).toBe("dispatched");
    });

    it("throws BadRequestException when CDN and photos are missing", async () => {
      mockAllocationRepo.findForJobCardWithStockItem.mockResolvedValue([makeAllocation(10, 5, 1)]);
      mockDispatchScanRepo.findForJobCard.mockResolvedValue([makeScan(10, 5)]);
      mockCdnRepo.count.mockResolvedValue(0);
      mockLoadPhotoRepo.count.mockResolvedValue(0);

      await expect(service.completeDispatch(1, 1, mockUser)).rejects.toThrow(BadRequestException);
    });

    it("throws ConflictException when job card status changed concurrently", async () => {
      mockAllocationRepo.findForJobCardWithStockItem.mockResolvedValue([makeAllocation(10, 5, 1)]);
      mockDispatchScanRepo.findForJobCard.mockResolvedValue([makeScan(10, 5)]);
      mockCdnRepo.count.mockResolvedValue(1);
      mockLoadPhotoRepo.count.mockResolvedValue(1);
      mockJobCardRepo.updateWorkflowStatusIfMatches.mockResolvedValue(0);

      await expect(service.completeDispatch(1, 1, mockUser)).rejects.toThrow(ConflictException);
    });

    it("logs audit entry on successful dispatch", async () => {
      mockAllocationRepo.findForJobCardWithStockItem.mockResolvedValue([makeAllocation(10, 5, 1)]);
      mockDispatchScanRepo.findForJobCard.mockResolvedValue([makeScan(10, 5)]);
      mockCdnRepo.count.mockResolvedValue(1);
      mockLoadPhotoRepo.count.mockResolvedValue(1);
      mockJobCardRepo.updateWorkflowStatusIfMatches.mockResolvedValue(1);
      mockJobCardRepo.findOneForCompany.mockResolvedValue(makeJobCard("dispatched"));

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
      mockAllocationRepo.findForJobCardWithStockItem.mockResolvedValue([makeAllocation(10, 5, 1)]);
      mockDispatchScanRepo.findForJobCard.mockResolvedValue([makeScan(10, 5)]);
      mockCdnRepo.count.mockResolvedValue(1);
      mockLoadPhotoRepo.count.mockResolvedValue(1);
      mockJobCardRepo.updateWorkflowStatusIfMatches.mockResolvedValue(1);
      mockJobCardRepo.findOneForCompany.mockResolvedValue(null);

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
      mockDispatchScanRepo.findOneForCompanyWithJobCard.mockResolvedValue(scan);

      await service.reverseDispatchScan(1, 5, { id: 1, name: "Test User" });

      expect(mockDispatchScanRepo.remove).toHaveBeenCalledWith(scan);
    });

    it("throws NotFoundException when scan does not exist", async () => {
      mockDispatchScanRepo.findOneForCompanyWithJobCard.mockResolvedValue(null);

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
      mockDispatchScanRepo.findOneForCompanyWithJobCard.mockResolvedValue(scan);

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
      mockDispatchScanRepo.findOneForCompanyWithJobCard.mockResolvedValue(scan);

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
    it("returns job_card type when QR matches a job card", async () => {
      mockJobCardRepo.findByQrToken.mockResolvedValue({ id: 1 });

      const result = await service.scanByQrToken(1, "JC-001");

      expect(result).toEqual({ type: "job_card", id: 1 });
    });

    it("returns stock_item type when QR matches a stock item", async () => {
      mockJobCardRepo.findByQrToken.mockResolvedValue(null);
      mockStockItemRepo.findOneByQrTokenForCompany.mockResolvedValue({ id: 42 });

      const result = await service.scanByQrToken(1, "SKU-123");

      expect(result).toEqual({ type: "stock_item", id: 42 });
    });

    it("throws NotFoundException when QR matches nothing", async () => {
      mockJobCardRepo.findByQrToken.mockResolvedValue(null);
      mockStockItemRepo.findOneByQrTokenForCompany.mockResolvedValue(null);

      await expect(service.scanByQrToken(1, "UNKNOWN")).rejects.toThrow(NotFoundException);
    });
  });
});
