import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { StockAllocation } from "../entities/stock-allocation.entity";
import { StockIssuance } from "../entities/stock-issuance.entity";
import { StockItem } from "../entities/stock-item.entity";
import { StockMovement } from "../entities/stock-movement.entity";
import { ReportsService } from "./reports.service";

describe("ReportsService", () => {
  let service: ReportsService;

  const mockAllocationQueryBuilder = {
    innerJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
  };

  const mockAllocationRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(mockAllocationQueryBuilder),
  };

  const mockStockItemRepo = {
    find: jest.fn().mockResolvedValue([]),
  };

  const mockMovementQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };

  const mockMovementRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(mockMovementQueryBuilder),
  };

  const mockIssuanceQueryBuilder = {
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
    getMany: jest.fn().mockResolvedValue([]),
  };

  const mockIssuanceRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(mockIssuanceQueryBuilder),
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

    mockAllocationRepo.createQueryBuilder.mockReturnValue(mockAllocationQueryBuilder);
    mockMovementRepo.createQueryBuilder.mockReturnValue(mockMovementQueryBuilder);
    mockIssuanceRepo.createQueryBuilder.mockReturnValue(mockIssuanceQueryBuilder);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: getRepositoryToken(StockAllocation), useValue: mockAllocationRepo },
        { provide: getRepositoryToken(StockItem), useValue: mockStockItemRepo },
        { provide: getRepositoryToken(StockMovement), useValue: mockMovementRepo },
        { provide: getRepositoryToken(StockIssuance), useValue: mockIssuanceRepo },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("costByJob", () => {
    it("should return cost aggregation by job", async () => {
      mockAllocationQueryBuilder.getRawMany.mockResolvedValue([
        {
          jobCardId: "1",
          jobNumber: "JC-001",
          jobName: "Widget Assembly",
          customerName: "Example Corp",
          totalCost: "2500.00",
          totalItemsAllocated: "50",
        },
        {
          jobCardId: "2",
          jobNumber: "JC-002",
          jobName: "Pipe Fabrication",
          customerName: null,
          totalCost: "1200.50",
          totalItemsAllocated: "25",
        },
      ]);

      const result = await service.costByJob(1);

      expect(result).toEqual([
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
      ]);
      expect(mockAllocationRepo.createQueryBuilder).toHaveBeenCalledWith("a");
      expect(mockAllocationQueryBuilder.where).toHaveBeenCalledWith("a.company_id = :companyId", {
        companyId: 1,
      });
    });

    it("should return an empty array when no allocations exist", async () => {
      mockAllocationQueryBuilder.getRawMany.mockResolvedValue([]);

      const result = await service.costByJob(1);

      expect(result).toEqual([]);
    });

    it("should handle null totalCost and totalItemsAllocated gracefully", async () => {
      mockAllocationQueryBuilder.getRawMany.mockResolvedValue([
        {
          jobCardId: "5",
          jobNumber: "JC-005",
          jobName: "Empty Job",
          customerName: null,
          totalCost: null,
          totalItemsAllocated: null,
        },
      ]);

      const result = await service.costByJob(1);

      expect(result).toEqual([
        {
          jobCardId: 5,
          jobNumber: "JC-005",
          jobName: "Empty Job",
          customerName: null,
          totalCost: 0,
          totalItemsAllocated: 0,
        },
      ]);
    });
  });

  describe("stockValuation", () => {
    it("should return items with calculated total value", async () => {
      mockStockItemRepo.find.mockResolvedValue([
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
      expect(mockStockItemRepo.find).toHaveBeenCalledWith({
        where: { companyId: 1 },
        order: { name: "ASC" },
      });
    });

    it("should return zero total when no items exist", async () => {
      mockStockItemRepo.find.mockResolvedValue([]);

      const result = await service.stockValuation(1);

      expect(result.items).toEqual([]);
      expect(result.totalValue).toBe(0);
    });

    it("should handle items with zero quantity", async () => {
      mockStockItemRepo.find.mockResolvedValue([
        createStockItem({ id: 1, quantity: 0, costPerUnit: 100 }),
      ]);

      const result = await service.stockValuation(1);

      expect(result.items[0].totalValue).toBe(0);
      expect(result.totalValue).toBe(0);
    });

    it("should handle items with zero cost", async () => {
      mockStockItemRepo.find.mockResolvedValue([
        createStockItem({ id: 1, quantity: 50, costPerUnit: 0 }),
      ]);

      const result = await service.stockValuation(1);

      expect(result.items[0].totalValue).toBe(0);
      expect(result.totalValue).toBe(0);
    });

    it("should handle null category", async () => {
      mockStockItemRepo.find.mockResolvedValue([
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
      mockMovementQueryBuilder.getMany.mockResolvedValue(movements);

      const result = await service.movementHistory(1);

      expect(result).toEqual(movements);
      expect(mockMovementRepo.createQueryBuilder).toHaveBeenCalledWith("m");
      expect(mockMovementQueryBuilder.where).toHaveBeenCalledWith("m.company_id = :companyId", {
        companyId: 1,
      });
      expect(mockMovementQueryBuilder.take).toHaveBeenCalledWith(500);
      expect(mockMovementQueryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it("should apply startDate filter", async () => {
      mockMovementQueryBuilder.getMany.mockResolvedValue([]);

      await service.movementHistory(1, { startDate: "2026-01-01" });

      expect(mockMovementQueryBuilder.andWhere).toHaveBeenCalledWith("m.created_at >= :startDate", {
        startDate: "2026-01-01",
      });
    });

    it("should apply endDate filter", async () => {
      mockMovementQueryBuilder.getMany.mockResolvedValue([]);

      await service.movementHistory(1, { endDate: "2026-12-31" });

      expect(mockMovementQueryBuilder.andWhere).toHaveBeenCalledWith("m.created_at <= :endDate", {
        endDate: "2026-12-31",
      });
    });

    it("should apply movementType filter", async () => {
      mockMovementQueryBuilder.getMany.mockResolvedValue([]);

      await service.movementHistory(1, { movementType: "in" });

      expect(mockMovementQueryBuilder.andWhere).toHaveBeenCalledWith(
        "m.movement_type = :movementType",
        { movementType: "in" },
      );
    });

    it("should apply stockItemId filter", async () => {
      mockMovementQueryBuilder.getMany.mockResolvedValue([]);

      await service.movementHistory(1, { stockItemId: 42 });

      expect(mockMovementQueryBuilder.andWhere).toHaveBeenCalledWith(
        "m.stock_item_id = :stockItemId",
        { stockItemId: 42 },
      );
    });

    it("should apply all filters simultaneously", async () => {
      mockMovementQueryBuilder.getMany.mockResolvedValue([]);

      await service.movementHistory(1, {
        startDate: "2026-01-01",
        endDate: "2026-06-30",
        movementType: "out",
        stockItemId: 10,
      });

      expect(mockMovementQueryBuilder.andWhere).toHaveBeenCalledTimes(4);
    });

    it("should return empty array when no movements match", async () => {
      mockMovementQueryBuilder.getMany.mockResolvedValue([]);

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
      mockIssuanceQueryBuilder.getRawMany
        .mockResolvedValueOnce([
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
        ])
        .mockResolvedValueOnce([
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
      mockIssuanceQueryBuilder.getRawMany.mockResolvedValue([]);

      const result = await service.staffStockReport(1, { anomalyThreshold: 1.5 });

      expect(result.anomalyThreshold).toBe(1.5);
    });

    it("should detect anomalies based on z-score", async () => {
      mockIssuanceQueryBuilder.getRawMany
        .mockResolvedValueOnce([
          createStaffRawRow({ staffMemberId: "1", totalQuantityReceived: "10" }),
          createStaffRawRow({ staffMemberId: "2", totalQuantityReceived: "12" }),
          createStaffRawRow({ staffMemberId: "3", totalQuantityReceived: "11" }),
          createStaffRawRow({ staffMemberId: "4", totalQuantityReceived: "100" }),
        ])
        .mockResolvedValueOnce([]);

      const result = await service.staffStockReport(1, { anomalyThreshold: 1.5 });

      const anomalous = result.summaries.filter((s) => s.isAnomaly);
      expect(anomalous.length).toBeGreaterThanOrEqual(1);

      const outlier = result.summaries.find((s) => s.staffMemberId === 4);
      expect(outlier?.isAnomaly).toBe(true);
      expect(outlier?.anomalyScore).toBeGreaterThan(1.5);
    });

    it("should return zero anomaly score when standard deviation is zero", async () => {
      mockIssuanceQueryBuilder.getRawMany
        .mockResolvedValueOnce([
          createStaffRawRow({ staffMemberId: "1", totalQuantityReceived: "50" }),
        ])
        .mockResolvedValueOnce([]);

      const result = await service.staffStockReport(1);

      expect(result.summaries[0].anomalyScore).toBe(0);
      expect(result.summaries[0].isAnomaly).toBe(false);
      expect(result.standardDeviation).toBe(0);
    });

    it("should return empty report when no issuances exist", async () => {
      mockIssuanceQueryBuilder.getRawMany.mockResolvedValue([]);

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

    it("should apply startDate filter", async () => {
      mockIssuanceQueryBuilder.getRawMany.mockResolvedValue([]);

      await service.staffStockReport(1, { startDate: "2026-01-01" });

      expect(mockIssuanceQueryBuilder.andWhere).toHaveBeenCalledWith("i.issued_at >= :startDate", {
        startDate: "2026-01-01",
      });
    });

    it("should apply endDate filter", async () => {
      mockIssuanceQueryBuilder.getRawMany.mockResolvedValue([]);

      await service.staffStockReport(1, { endDate: "2026-06-30" });

      expect(mockIssuanceQueryBuilder.andWhere).toHaveBeenCalledWith("i.issued_at <= :endDate", {
        endDate: "2026-06-30",
      });
    });

    it("should apply staffMemberId filter", async () => {
      mockIssuanceQueryBuilder.getRawMany.mockResolvedValue([]);

      await service.staffStockReport(1, { staffMemberId: 5 });

      expect(mockIssuanceQueryBuilder.andWhere).toHaveBeenCalledWith(
        "i.recipient_staff_id = :staffMemberId",
        { staffMemberId: 5 },
      );
    });

    it("should apply departmentId filter", async () => {
      mockIssuanceQueryBuilder.getRawMany.mockResolvedValue([]);

      await service.staffStockReport(1, { departmentId: 10 });

      expect(mockIssuanceQueryBuilder.andWhere).toHaveBeenCalledWith(
        "staff.department_id = :departmentId",
        { departmentId: 10 },
      );
    });

    it("should apply stockItemId filter", async () => {
      mockIssuanceQueryBuilder.getRawMany.mockResolvedValue([]);

      await service.staffStockReport(1, { stockItemId: 42 });

      expect(mockIssuanceQueryBuilder.andWhere).toHaveBeenCalledWith(
        "i.stock_item_id = :stockItemId",
        { stockItemId: 42 },
      );
    });

    it("should handle null departmentId in raw results", async () => {
      mockIssuanceQueryBuilder.getRawMany
        .mockResolvedValueOnce([createStaffRawRow({ departmentId: null, department: null })])
        .mockResolvedValueOnce([]);

      const result = await service.staffStockReport(1);

      expect(result.summaries[0].departmentId).toBeNull();
      expect(result.summaries[0].department).toBeNull();
    });

    it("should handle null totalValue and totalQuantityReceived in raw results", async () => {
      mockIssuanceQueryBuilder.getRawMany
        .mockResolvedValueOnce([
          createStaffRawRow({ totalQuantityReceived: null, totalValue: null, issuanceCount: null }),
        ])
        .mockResolvedValueOnce([]);

      const result = await service.staffStockReport(1);

      expect(result.summaries[0].totalQuantityReceived).toBe(0);
      expect(result.summaries[0].totalValue).toBe(0);
      expect(result.summaries[0].issuanceCount).toBe(0);
    });

    it("should assign item breakdowns to correct staff members", async () => {
      mockIssuanceQueryBuilder.getRawMany
        .mockResolvedValueOnce([
          createStaffRawRow({ staffMemberId: "1", staffName: "Alice" }),
          createStaffRawRow({ staffMemberId: "2", staffName: "Bob" }),
        ])
        .mockResolvedValueOnce([
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
      mockIssuanceQueryBuilder.getRawMany
        .mockResolvedValueOnce([
          createStaffRawRow({ staffMemberId: "1", totalQuantityReceived: "10" }),
          createStaffRawRow({ staffMemberId: "2", totalQuantityReceived: "20" }),
          createStaffRawRow({ staffMemberId: "3", totalQuantityReceived: "30" }),
        ])
        .mockResolvedValueOnce([]);

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
      mockIssuanceQueryBuilder.getMany.mockResolvedValue(issuances);

      const result = await service.staffStockDetail(1, 5);

      expect(result).toEqual(issuances);
      expect(mockIssuanceRepo.createQueryBuilder).toHaveBeenCalledWith("i");
      expect(mockIssuanceQueryBuilder.where).toHaveBeenCalledWith("i.company_id = :companyId", {
        companyId: 1,
      });
      expect(mockIssuanceQueryBuilder.andWhere).toHaveBeenCalledWith(
        "i.recipient_staff_id = :staffMemberId",
        { staffMemberId: 5 },
      );
    });

    it("should apply startDate filter", async () => {
      mockIssuanceQueryBuilder.getMany.mockResolvedValue([]);

      await service.staffStockDetail(1, 5, { startDate: "2026-01-01" });

      expect(mockIssuanceQueryBuilder.andWhere).toHaveBeenCalledWith("i.issued_at >= :startDate", {
        startDate: "2026-01-01",
      });
    });

    it("should apply endDate filter", async () => {
      mockIssuanceQueryBuilder.getMany.mockResolvedValue([]);

      await service.staffStockDetail(1, 5, { endDate: "2026-12-31" });

      expect(mockIssuanceQueryBuilder.andWhere).toHaveBeenCalledWith("i.issued_at <= :endDate", {
        endDate: "2026-12-31",
      });
    });

    it("should apply both date filters simultaneously", async () => {
      mockIssuanceQueryBuilder.getMany.mockResolvedValue([]);

      await service.staffStockDetail(1, 5, {
        startDate: "2026-01-01",
        endDate: "2026-12-31",
      });

      expect(mockIssuanceQueryBuilder.andWhere).toHaveBeenCalledWith("i.issued_at >= :startDate", {
        startDate: "2026-01-01",
      });
      expect(mockIssuanceQueryBuilder.andWhere).toHaveBeenCalledWith("i.issued_at <= :endDate", {
        endDate: "2026-12-31",
      });
    });

    it("should return empty array when no issuances match", async () => {
      mockIssuanceQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.staffStockDetail(1, 999);

      expect(result).toEqual([]);
    });

    it("should not apply date filters when none provided", async () => {
      mockIssuanceQueryBuilder.getMany.mockResolvedValue([]);

      await service.staffStockDetail(1, 5);

      const andWhereCalls = mockIssuanceQueryBuilder.andWhere.mock.calls;
      const dateFilterCalls = andWhereCalls.filter(
        (call: string[]) =>
          call[0].includes("issued_at >= :startDate") || call[0].includes("issued_at <= :endDate"),
      );
      expect(dateFilterCalls).toHaveLength(0);
    });

    it("should join stockItem, jobCard, and issuerStaff relations", async () => {
      mockIssuanceQueryBuilder.getMany.mockResolvedValue([]);

      await service.staffStockDetail(1, 5);

      expect(mockIssuanceQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        "i.stockItem",
        "item",
      );
      expect(mockIssuanceQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        "i.jobCard",
        "jobCard",
      );
      expect(mockIssuanceQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        "i.issuerStaff",
        "issuer",
      );
    });
  });
});
