import { Test, TestingModule } from "@nestjs/testing";
import { StockIssuance } from "../entities/stock-issuance.entity";
import { StockItem } from "../entities/stock-item.entity";
import { StockMovement } from "../entities/stock-movement.entity";
import { StockAllocationRepository } from "../repositories/stock-allocation.repository";
import { StockIssuanceRepository } from "../repositories/stock-issuance.repository";
import { StockItemRepository } from "../repositories/stock-item.repository";
import { StockMovementRepository } from "../repositories/stock-movement.repository";
import { ReportsService } from "./reports.service";

describe("ReportsService", () => {
  let service: ReportsService;

  const mockAllocationRepo = {
    costByJob: jest.fn().mockResolvedValue([]),
  };

  const mockStockItemRepo = {
    findAllForCompanyOrderedByName: jest.fn().mockResolvedValue([]),
  };

  const mockMovementRepo = {
    movementHistoryForCompany: jest.fn().mockResolvedValue([]),
  };

  const mockIssuanceRepo = {
    staffStockReportRows: jest.fn().mockResolvedValue([]),
    staffItemBreakdownRows: jest.fn().mockResolvedValue([]),
    staffStockDetail: jest.fn().mockResolvedValue([]),
  };

  const createStockItem = (overrides: Partial<StockItem> = {}): StockItem =>
    ({
      id: 1,
      sku: "SKU-001",
      name: "Test Item",
      description: null,
      category: "Consumables",
      unitOfMeasure: "each",
      costPerUnit: 50,
      quantity: 100,
      minStockLevel: 10,
      location: null,
      locationId: null,
      photoUrl: null,
      needsQrPrint: false,
      companyId: 1,
      thicknessMm: null,
      widthMm: null,
      lengthM: null,
      color: null,
      compoundCode: null,
      packSizeLitres: null,
      componentGroup: null,
      componentRole: null,
      mixRatio: null,
      rollNumber: null,
      isLeftover: false,
      sourceJobCardId: null,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
      ...overrides,
    }) as StockItem;

  const createMovement = (overrides: Partial<StockMovement> = {}): StockMovement =>
    ({
      id: 1,
      movementType: "in",
      quantity: 10,
      referenceType: null,
      referenceId: null,
      notes: null,
      createdBy: null,
      companyId: 1,
      createdAt: new Date("2026-01-15"),
      stockItem: createStockItem(),
      ...overrides,
    }) as StockMovement;

  const createIssuance = (overrides: Partial<StockIssuance> = {}): StockIssuance =>
    ({
      id: 1,
      companyId: 1,
      stockItemId: 1,
      issuerStaffId: 1,
      recipientStaffId: 2,
      jobCardId: null,
      quantity: 5,
      notes: null,
      issuedByUserId: null,
      issuedByName: "Admin",
      issuedAt: new Date("2026-01-15"),
      undone: false,
      undoneAt: null,
      undoneByName: null,
      createdAt: new Date("2026-01-15"),
      ...overrides,
    }) as StockIssuance;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockAllocationRepo.costByJob.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: StockAllocationRepository, useValue: mockAllocationRepo },
        { provide: StockItemRepository, useValue: mockStockItemRepo },
        { provide: StockMovementRepository, useValue: mockMovementRepo },
        { provide: StockIssuanceRepository, useValue: mockIssuanceRepo },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("costByJob", () => {
    it("should return cost aggregation by job from the repository", async () => {
      const rows = [
        {
          jobCardId: 1,
          jobNumber: "JC-001",
          jobName: "Widget Assembly",
          customerName: "Example Corp",
          totalCost: 2500,
          totalItemsAllocated: 50,
        },
        {
          jobCardId: 2,
          jobNumber: "JC-002",
          jobName: "Pipe Fabrication",
          customerName: null,
          totalCost: 1200.5,
          totalItemsAllocated: 25,
        },
      ];
      mockAllocationRepo.costByJob.mockResolvedValue(rows);

      const result = await service.costByJob(1);

      expect(result).toEqual(rows);
      expect(mockAllocationRepo.costByJob).toHaveBeenCalledWith(1);
    });

    it("should return an empty array when no allocations exist", async () => {
      mockAllocationRepo.costByJob.mockResolvedValue([]);

      const result = await service.costByJob(1);

      expect(result).toEqual([]);
    });
  });

  describe("stockValuation", () => {
    it("should return items with calculated total value", async () => {
      mockStockItemRepo.findAllForCompanyOrderedByName.mockResolvedValue([
        createStockItem({ id: 1, sku: "SKU-001", name: "Bolts", quantity: 200, costPerUnit: 5.5 }),
        createStockItem({
          id: 2,
          sku: "SKU-002",
          name: "Nuts",
          quantity: 100,
          costPerUnit: 2.25,
        }),
      ]);

      const result = await service.stockValuation(1);

      expect(result.items).toEqual([
        {
          id: 1,
          sku: "SKU-001",
          name: "Bolts",
          category: "Consumables",
          quantity: 200,
          costPerUnit: 5.5,
          totalValue: 1100,
        },
        {
          id: 2,
          sku: "SKU-002",
          name: "Nuts",
          category: "Consumables",
          quantity: 100,
          costPerUnit: 2.25,
          totalValue: 225,
        },
      ]);
      expect(result.totalValue).toBe(1325);
      expect(mockStockItemRepo.findAllForCompanyOrderedByName).toHaveBeenCalledWith(1);
    });

    it("should return zero total when no items exist", async () => {
      mockStockItemRepo.findAllForCompanyOrderedByName.mockResolvedValue([]);

      const result = await service.stockValuation(1);

      expect(result.items).toEqual([]);
      expect(result.totalValue).toBe(0);
    });

    it("should handle items with zero quantity", async () => {
      mockStockItemRepo.findAllForCompanyOrderedByName.mockResolvedValue([
        createStockItem({ id: 1, quantity: 0, costPerUnit: 100 }),
      ]);

      const result = await service.stockValuation(1);

      expect(result.items[0].totalValue).toBe(0);
      expect(result.totalValue).toBe(0);
    });

    it("should handle items with zero cost", async () => {
      mockStockItemRepo.findAllForCompanyOrderedByName.mockResolvedValue([
        createStockItem({ id: 1, quantity: 50, costPerUnit: 0 }),
      ]);

      const result = await service.stockValuation(1);

      expect(result.items[0].totalValue).toBe(0);
      expect(result.totalValue).toBe(0);
    });

    it("should handle null category", async () => {
      mockStockItemRepo.findAllForCompanyOrderedByName.mockResolvedValue([
        createStockItem({ id: 1, category: null, quantity: 10, costPerUnit: 5 }),
      ]);

      const result = await service.stockValuation(1);

      expect(result.items[0].category).toBeNull();
    });
  });

  describe("movementHistory", () => {
    it("should return movements without filters", async () => {
      const movements = [
        createMovement({ id: 1, movementType: "in" as any, quantity: 10 }),
        createMovement({ id: 2, movementType: "out" as any, quantity: 5 }),
      ];
      mockMovementRepo.movementHistoryForCompany.mockResolvedValue(movements);

      const result = await service.movementHistory(1);

      expect(result).toEqual(movements);
      expect(mockMovementRepo.movementHistoryForCompany).toHaveBeenCalledWith(1, undefined);
    });

    it("should pass startDate filter to the repository", async () => {
      await service.movementHistory(1, { startDate: "2026-01-01" });

      expect(mockMovementRepo.movementHistoryForCompany).toHaveBeenCalledWith(1, {
        startDate: "2026-01-01",
      });
    });

    it("should pass endDate filter to the repository", async () => {
      await service.movementHistory(1, { endDate: "2026-12-31" });

      expect(mockMovementRepo.movementHistoryForCompany).toHaveBeenCalledWith(1, {
        endDate: "2026-12-31",
      });
    });

    it("should pass movementType filter to the repository", async () => {
      await service.movementHistory(1, { movementType: "in" });

      expect(mockMovementRepo.movementHistoryForCompany).toHaveBeenCalledWith(1, {
        movementType: "in",
      });
    });

    it("should pass stockItemId filter to the repository", async () => {
      await service.movementHistory(1, { stockItemId: 42 });

      expect(mockMovementRepo.movementHistoryForCompany).toHaveBeenCalledWith(1, {
        stockItemId: 42,
      });
    });

    it("should pass all filters simultaneously to the repository", async () => {
      const filters = {
        startDate: "2026-01-01",
        endDate: "2026-06-30",
        movementType: "out",
        stockItemId: 10,
      };
      await service.movementHistory(1, filters);

      expect(mockMovementRepo.movementHistoryForCompany).toHaveBeenCalledWith(1, filters);
    });

    it("should return empty array when no movements match", async () => {
      mockMovementRepo.movementHistoryForCompany.mockResolvedValue([]);

      const result = await service.movementHistory(1, { movementType: "adjustment" });

      expect(result).toEqual([]);
    });
  });

  describe("staffStockReport", () => {
    const createStaffRawRow = (overrides: Record<string, unknown> = {}) => ({
      staffMemberId: "1",
      staffName: "John Doe",
      employeeNumber: "EMP-001",
      department: "Warehouse",
      departmentId: "10",
      totalQuantityReceived: "50",
      totalValue: "500.00",
      issuanceCount: "3",
      ...overrides,
    });

    it("should return a report with summaries and totals", async () => {
      mockIssuanceRepo.staffStockReportRows.mockResolvedValue([
        createStaffRawRow(),
        createStaffRawRow({
          staffMemberId: "2",
          staffName: "Jane Smith",
          employeeNumber: "EMP-002",
          department: "Production",
          departmentId: "20",
          totalQuantityReceived: "30",
          totalValue: "300.00",
          issuanceCount: "2",
        }),
      ]);
      mockIssuanceRepo.staffItemBreakdownRows.mockResolvedValue([
        {
          staffMemberId: "1",
          stockItemId: "100",
          stockItemName: "Bolts",
          sku: "SKU-100",
          category: "Fasteners",
          totalQuantity: "50",
          totalValue: "500.00",
        },
        {
          staffMemberId: "2",
          stockItemId: "101",
          stockItemName: "Nuts",
          sku: "SKU-101",
          category: "Fasteners",
          totalQuantity: "30",
          totalValue: "300.00",
        },
      ]);

      const result = await service.staffStockReport(1);

      expect(result.totals.totalStaff).toBe(2);
      expect(result.totals.totalQuantityIssued).toBe(80);
      expect(result.totals.totalValue).toBe(800);
      expect(result.summaries).toHaveLength(2);
      expect(result.summaries[0].staffMemberId).toBe(1);
      expect(result.summaries[0].staffName).toBe("John Doe");
      expect(result.summaries[0].totalQuantityReceived).toBe(50);
      expect(result.summaries[0].items).toHaveLength(1);
      expect(result.summaries[0].items[0].stockItemName).toBe("Bolts");
      expect(result.summaries[1].items).toHaveLength(1);
      expect(result.anomalyThreshold).toBe(2.0);
      expect(typeof result.averagePerStaff).toBe("number");
      expect(typeof result.standardDeviation).toBe("number");
    });

    it("should use custom anomaly threshold from filters", async () => {
      mockIssuanceRepo.staffStockReportRows.mockResolvedValue([]);

      const result = await service.staffStockReport(1, { anomalyThreshold: 1.5 });

      expect(result.anomalyThreshold).toBe(1.5);
    });

    it("should detect anomalies based on z-score", async () => {
      mockIssuanceRepo.staffStockReportRows.mockResolvedValue([
        createStaffRawRow({ staffMemberId: "1", totalQuantityReceived: "10" }),
        createStaffRawRow({ staffMemberId: "2", totalQuantityReceived: "12" }),
        createStaffRawRow({ staffMemberId: "3", totalQuantityReceived: "11" }),
        createStaffRawRow({ staffMemberId: "4", totalQuantityReceived: "100" }),
      ]);
      mockIssuanceRepo.staffItemBreakdownRows.mockResolvedValue([]);

      const result = await service.staffStockReport(1, { anomalyThreshold: 1.5 });

      const anomalous = result.summaries.filter((s) => s.isAnomaly);
      expect(anomalous.length).toBeGreaterThanOrEqual(1);

      const outlier = result.summaries.find((s) => s.staffMemberId === 4);
      expect(outlier?.isAnomaly).toBe(true);
      expect(outlier?.anomalyScore).toBeGreaterThan(1.5);
    });

    it("should return zero anomaly score when standard deviation is zero", async () => {
      mockIssuanceRepo.staffStockReportRows.mockResolvedValue([
        createStaffRawRow({ staffMemberId: "1", totalQuantityReceived: "50" }),
      ]);
      mockIssuanceRepo.staffItemBreakdownRows.mockResolvedValue([]);

      const result = await service.staffStockReport(1);

      expect(result.summaries[0].anomalyScore).toBe(0);
      expect(result.summaries[0].isAnomaly).toBe(false);
      expect(result.standardDeviation).toBe(0);
    });

    it("should return empty report when no issuances exist", async () => {
      mockIssuanceRepo.staffStockReportRows.mockResolvedValue([]);

      const result = await service.staffStockReport(1);

      expect(result.summaries).toEqual([]);
      expect(result.totals).toEqual({
        totalStaff: 0,
        totalQuantityIssued: 0,
        totalValue: 0,
        anomalyCount: 0,
      });
      expect(result.averagePerStaff).toBe(0);
      expect(result.standardDeviation).toBe(0);
    });

    it("should pass filters to the repository", async () => {
      mockIssuanceRepo.staffStockReportRows.mockResolvedValue([]);

      const filters = {
        startDate: "2026-01-01",
        endDate: "2026-06-30",
        staffMemberId: 5,
        departmentId: 10,
        stockItemId: 42,
      };
      await service.staffStockReport(1, filters);

      expect(mockIssuanceRepo.staffStockReportRows).toHaveBeenCalledWith(1, filters);
    });

    it("should handle null departmentId in raw results", async () => {
      mockIssuanceRepo.staffStockReportRows.mockResolvedValue([
        createStaffRawRow({ departmentId: null, department: null }),
      ]);
      mockIssuanceRepo.staffItemBreakdownRows.mockResolvedValue([]);

      const result = await service.staffStockReport(1);

      expect(result.summaries[0].departmentId).toBeNull();
      expect(result.summaries[0].department).toBeNull();
    });

    it("should handle null totalValue and totalQuantityReceived in raw results", async () => {
      mockIssuanceRepo.staffStockReportRows.mockResolvedValue([
        createStaffRawRow({ totalQuantityReceived: null, totalValue: null, issuanceCount: null }),
      ]);
      mockIssuanceRepo.staffItemBreakdownRows.mockResolvedValue([]);

      const result = await service.staffStockReport(1);

      expect(result.summaries[0].totalQuantityReceived).toBe(0);
      expect(result.summaries[0].totalValue).toBe(0);
      expect(result.summaries[0].issuanceCount).toBe(0);
    });

    it("should assign item breakdowns to correct staff members", async () => {
      mockIssuanceRepo.staffStockReportRows.mockResolvedValue([
        createStaffRawRow({ staffMemberId: "1", staffName: "Alice" }),
        createStaffRawRow({ staffMemberId: "2", staffName: "Bob" }),
      ]);
      mockIssuanceRepo.staffItemBreakdownRows.mockResolvedValue([
        {
          staffMemberId: "2",
          stockItemId: "200",
          stockItemName: "Pipe",
          sku: "PIPE-001",
          category: "Piping",
          totalQuantity: "20",
          totalValue: "400.00",
        },
      ]);

      const result = await service.staffStockReport(1);

      const alice = result.summaries.find((s) => s.staffMemberId === 1);
      const bob = result.summaries.find((s) => s.staffMemberId === 2);
      expect(alice?.items).toEqual([]);
      expect(bob?.items).toHaveLength(1);
      expect(bob?.items[0].stockItemName).toBe("Pipe");
    });

    it("should calculate correct mean and standard deviation", async () => {
      mockIssuanceRepo.staffStockReportRows.mockResolvedValue([
        createStaffRawRow({ staffMemberId: "1", totalQuantityReceived: "10" }),
        createStaffRawRow({ staffMemberId: "2", totalQuantityReceived: "20" }),
        createStaffRawRow({ staffMemberId: "3", totalQuantityReceived: "30" }),
      ]);
      mockIssuanceRepo.staffItemBreakdownRows.mockResolvedValue([]);

      const result = await service.staffStockReport(1);

      expect(result.averagePerStaff).toBe(20);
      const expectedStdDev = Math.round(Math.sqrt((100 + 0 + 100) / 3) * 100) / 100;
      expect(result.standardDeviation).toBe(expectedStdDev);
    });
  });

  describe("staffStockDetail", () => {
    it("should return issuances for a staff member", async () => {
      const issuances = [
        createIssuance({ id: 1, recipientStaffId: 5, quantity: 10 }),
        createIssuance({ id: 2, recipientStaffId: 5, quantity: 3 }),
      ];
      mockIssuanceRepo.staffStockDetail.mockResolvedValue(issuances);

      const result = await service.staffStockDetail(1, 5);

      expect(result).toEqual(issuances);
      expect(mockIssuanceRepo.staffStockDetail).toHaveBeenCalledWith(1, 5, undefined);
    });

    it("should pass startDate filter to the repository", async () => {
      await service.staffStockDetail(1, 5, { startDate: "2026-01-01" });

      expect(mockIssuanceRepo.staffStockDetail).toHaveBeenCalledWith(1, 5, {
        startDate: "2026-01-01",
      });
    });

    it("should pass endDate filter to the repository", async () => {
      await service.staffStockDetail(1, 5, { endDate: "2026-12-31" });

      expect(mockIssuanceRepo.staffStockDetail).toHaveBeenCalledWith(1, 5, {
        endDate: "2026-12-31",
      });
    });

    it("should pass both date filters simultaneously to the repository", async () => {
      const filters = { startDate: "2026-01-01", endDate: "2026-12-31" };
      await service.staffStockDetail(1, 5, filters);

      expect(mockIssuanceRepo.staffStockDetail).toHaveBeenCalledWith(1, 5, filters);
    });

    it("should return empty array when no issuances match", async () => {
      mockIssuanceRepo.staffStockDetail.mockResolvedValue([]);

      const result = await service.staffStockDetail(1, 999);

      expect(result).toEqual([]);
    });
  });
});
