import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { AuditService } from "../../audit/audit.service";
import { JobCardCoatingAnalysis } from "../entities/coating-analysis.entity";
import { CustomerPurchaseOrder } from "../entities/customer-purchase-order.entity";
import { IssuanceBatchRecord } from "../entities/issuance-batch-record.entity";
import { IssuanceSession } from "../entities/issuance-session.entity";
import { JobCard } from "../entities/job-card.entity";
import { JobCardDataBook } from "../entities/job-card-data-book.entity";
import { StaffMember } from "../entities/staff-member.entity";
import { StockAllocation } from "../entities/stock-allocation.entity";
import { StockIssuance } from "../entities/stock-issuance.entity";
import { StockItem } from "../entities/stock-item.entity";
import { MovementType, ReferenceType, StockMovement } from "../entities/stock-movement.entity";
import { SupplierCertificate } from "../entities/supplier-certificate.entity";
import { CertificateService } from "./certificate.service";
import { IssuanceService } from "./issuance.service";
import { WorkflowNotificationService } from "./workflow-notification.service";

describe("IssuanceService", () => {
  let service: IssuanceService;

  const mockIssuanceRepo = {
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
  };

  const mockStaffRepo = {
    findOne: jest.fn(),
  };

  const mockStockItemRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockJobCardRepo = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
  };

  const mockMovementRepo = {
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
  };

  const mockAllocationRepo = {
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    find: jest.fn().mockResolvedValue([]),
    createQueryBuilder: jest.fn(),
  };

  const mockBatchRecordRepo = {
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    find: jest.fn().mockResolvedValue([]),
  };

  const mockCertRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
  };

  const mockDataBookRepo = {
    findOne: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
  };

  const mockCoatingAnalysisRepo = {
    findOne: jest.fn().mockResolvedValue(null),
    find: jest.fn().mockResolvedValue([]),
  };

  const mockSessionRepo = {
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
  };

  const mockCpoRepo = {
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
  };

  const mockNotificationService = {
    notifyOverAllocationApproval: jest.fn().mockResolvedValue(undefined),
  };

  const mockCertificateService = {
    findMatchingCertificate: jest.fn().mockResolvedValue(null),
  };

  const mockQueryRunnerManager = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    save: jest.fn().mockImplementation((_entity, data) => Promise.resolve({ id: 1, ...data })),
    create: jest.fn().mockImplementation((_entity, data) => ({ ...data })),
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: mockQueryRunnerManager,
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  const mockUser = { id: 1, companyId: 1, name: "Test User" };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IssuanceService,
        { provide: getRepositoryToken(StockIssuance), useValue: mockIssuanceRepo },
        { provide: getRepositoryToken(StaffMember), useValue: mockStaffRepo },
        { provide: getRepositoryToken(StockItem), useValue: mockStockItemRepo },
        { provide: getRepositoryToken(JobCard), useValue: mockJobCardRepo },
        { provide: getRepositoryToken(StockMovement), useValue: mockMovementRepo },
        { provide: getRepositoryToken(StockAllocation), useValue: mockAllocationRepo },
        { provide: getRepositoryToken(IssuanceBatchRecord), useValue: mockBatchRecordRepo },
        { provide: getRepositoryToken(SupplierCertificate), useValue: mockCertRepo },
        { provide: getRepositoryToken(JobCardDataBook), useValue: mockDataBookRepo },
        { provide: getRepositoryToken(JobCardCoatingAnalysis), useValue: mockCoatingAnalysisRepo },
        { provide: getRepositoryToken(IssuanceSession), useValue: mockSessionRepo },
        { provide: getRepositoryToken(CustomerPurchaseOrder), useValue: mockCpoRepo },
        { provide: DataSource, useValue: mockDataSource },
        { provide: AuditService, useValue: mockAuditService },
        { provide: WorkflowNotificationService, useValue: mockNotificationService },
        { provide: CertificateService, useValue: mockCertificateService },
      ],
    }).compile();

    service = module.get<IssuanceService>(IssuanceService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("parseAndValidateQr", () => {
    it("parses 'staff:token' format", async () => {
      const staff = { id: 1, name: "John", active: true, qrToken: "abc123" };
      mockStaffRepo.findOne.mockResolvedValue(staff);

      const result = await service.parseAndValidateQr(1, "staff:abc123");
      expect(result.type).toBe("staff");
      expect(result.id).toBe(1);
      expect(result.data).toBe(staff);
    });

    it("parses 'stock:id' format", async () => {
      const stockItem = { id: 5, name: "Paint" };
      mockStockItemRepo.findOne.mockResolvedValue(stockItem);

      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(stockItem),
      };
      mockStockItemRepo.findOne.mockResolvedValue(null);
      (mockStockItemRepo as any).createQueryBuilder = jest.fn().mockReturnValue(qb);

      const result = await service.parseAndValidateQr(1, "stock:5");
      expect(result.type).toBe("stock_item");
      expect(result.id).toBe(5);
    });

    it("parses 'job:id' format", async () => {
      const jobCard = { id: 10, jobNumber: "JC-001" };
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(jobCard),
      };
      mockJobCardRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.parseAndValidateQr(1, "job:10");
      expect(result.type).toBe("job_card");
      expect(result.id).toBe(10);
    });

    it("parses JSON QR with id field as stock item", async () => {
      const stockItem = { id: 7, name: "Item" };
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(stockItem),
      };
      (mockStockItemRepo as any).createQueryBuilder = jest.fn().mockReturnValue(qb);

      const result = await service.parseAndValidateQr(1, '{"id": 7}');
      expect(result.type).toBe("stock_item");
      expect(result.id).toBe(7);
    });

    it("parses JSON QR with jobNumber field", async () => {
      const stockQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      (mockStockItemRepo as any).createQueryBuilder = jest.fn().mockReturnValue(stockQb);

      const jobCard = { id: 15, jobNumber: "JC-005" };
      const jobQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(jobCard),
      };
      mockJobCardRepo.createQueryBuilder.mockReturnValue(jobQb);

      const result = await service.parseAndValidateQr(1, '{"jobNumber": "JC-005"}');
      expect(result.type).toBe("job_card");
      expect(result.id).toBe(15);
    });

    it("extracts JSON from brace-enclosed content", async () => {
      const stockItem = { id: 3, name: "Item" };
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(stockItem),
      };
      (mockStockItemRepo as any).createQueryBuilder = jest.fn().mockReturnValue(qb);

      const result = await service.parseAndValidateQr(1, 'prefix{"id": 3}suffix');
      expect(result.type).toBe("stock_item");
      expect(result.id).toBe(3);
    });

    it("falls back to raw token staff lookup", async () => {
      const staff = { id: 2, name: "Jane", active: true, qrToken: "rawtoken" };
      mockStaffRepo.findOne.mockResolvedValue(staff);

      const result = await service.parseAndValidateQr(1, "rawtoken");
      expect(result.type).toBe("staff");
    });

    it("trims whitespace from QR input", async () => {
      const staff = { id: 1, name: "John", active: true, qrToken: "token1" };
      mockStaffRepo.findOne.mockResolvedValue(staff);

      const result = await service.parseAndValidateQr(1, "  staff:token1  ");
      expect(result.type).toBe("staff");
    });

    it("throws NotFoundException when no match found", async () => {
      mockStaffRepo.findOne.mockResolvedValue(null);
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      (mockStockItemRepo as any).createQueryBuilder = jest.fn().mockReturnValue(qb);
      mockJobCardRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      });

      await expect(service.parseAndValidateQr(1, "unknown_code")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("throws BadRequestException for inactive staff", async () => {
      const staff = { id: 1, name: "Inactive", active: false, qrToken: "abc" };
      mockStaffRepo.findOne.mockResolvedValue(staff);

      await expect(service.parseAndValidateQr(1, "staff:abc")).rejects.toThrow(BadRequestException);
    });
  });

  describe("createIssuance", () => {
    const issuer = { id: 1, name: "Issuer" };
    const recipient = { id: 2, name: "Recipient" };
    const stockItem = { id: 10, name: "Paint", quantity: 50 };
    const jobCard = { id: 5, jobNumber: "JC-001" };

    function setupCreateMocks(overrides?: { stockQuantity?: number; jobCardId?: number | null }) {
      mockStaffRepo.findOne.mockResolvedValueOnce(issuer).mockResolvedValueOnce(recipient);
      mockStockItemRepo.findOne.mockResolvedValue({
        ...stockItem,
        quantity: overrides?.stockQuantity ?? 50,
      });
      mockStockItemRepo.save.mockResolvedValue(true);
      mockJobCardRepo.findOne.mockResolvedValue(overrides?.jobCardId !== null ? jobCard : null);
      mockIssuanceRepo.findOne.mockResolvedValue({ id: 1 });
      mockQueryRunnerManager.findOne.mockResolvedValue({
        ...stockItem,
        quantity: overrides?.stockQuantity ?? 50,
      });
      mockQueryRunnerManager.save.mockImplementation((_entity, data) =>
        Promise.resolve({ id: 1, ...data }),
      );
    }

    it("throws BadRequestException when quantity <= 0", async () => {
      setupCreateMocks();

      await expect(
        service.createIssuance(
          1,
          {
            issuerStaffId: 1,
            recipientStaffId: 2,
            stockItemId: 10,
            quantity: 0,
          },
          mockUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException when insufficient stock", async () => {
      setupCreateMocks({ stockQuantity: 5 });

      await expect(
        service.createIssuance(
          1,
          {
            issuerStaffId: 1,
            recipientStaffId: 2,
            stockItemId: 10,
            quantity: 10,
          },
          mockUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("decrements stock quantity on successful issuance", async () => {
      setupCreateMocks();

      await service.createIssuance(
        1,
        {
          issuerStaffId: 1,
          recipientStaffId: 2,
          stockItemId: 10,
          quantity: 5,
        },
        mockUser,
      );

      expect(mockQueryRunnerManager.save).toHaveBeenCalledWith(
        StockItem,
        expect.objectContaining({ quantity: 45 }),
      );
    });

    it("creates OUT movement record", async () => {
      setupCreateMocks();

      await service.createIssuance(
        1,
        {
          issuerStaffId: 1,
          recipientStaffId: 2,
          stockItemId: 10,
          quantity: 5,
        },
        mockUser,
      );

      expect(mockQueryRunnerManager.create).toHaveBeenCalledWith(
        StockMovement,
        expect.objectContaining({
          movementType: MovementType.OUT,
          quantity: 5,
          referenceType: ReferenceType.ISSUANCE,
        }),
      );
    });

    it("creates stock allocation when jobCardId is provided", async () => {
      setupCreateMocks();

      await service.createIssuance(
        1,
        {
          issuerStaffId: 1,
          recipientStaffId: 2,
          stockItemId: 10,
          jobCardId: 5,
          quantity: 5,
        },
        mockUser,
      );

      const allocationCreateCalls = mockQueryRunnerManager.create.mock.calls.filter(
        (call) => call[0] === StockAllocation,
      );
      expect(allocationCreateCalls.length).toBe(1);
    });

    it("does not create allocation without jobCardId", async () => {
      setupCreateMocks({ jobCardId: null });

      await service.createIssuance(
        1,
        {
          issuerStaffId: 1,
          recipientStaffId: 2,
          stockItemId: 10,
          quantity: 5,
        },
        mockUser,
      );

      const allocationCreateCalls = mockQueryRunnerManager.create.mock.calls.filter(
        (call) => call[0] === StockAllocation,
      );
      expect(allocationCreateCalls.length).toBe(0);
    });

    it("throws NotFoundException when issuer not found", async () => {
      mockStaffRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.createIssuance(
          1,
          {
            issuerStaffId: 999,
            recipientStaffId: 2,
            stockItemId: 10,
            quantity: 1,
          },
          mockUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("createBatchIssuance", () => {
    it("throws BadRequestException for empty items array", async () => {
      await expect(
        service.createBatchIssuance(
          1,
          {
            issuerStaffId: 1,
            recipientStaffId: 2,
            items: [],
          },
          mockUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("accumulates errors for invalid items", async () => {
      mockStaffRepo.findOne
        .mockResolvedValueOnce({ id: 1, name: "Issuer" })
        .mockResolvedValueOnce({ id: 2, name: "Recipient" });
      mockJobCardRepo.findOne.mockResolvedValue(null);
      mockQueryRunnerManager.find.mockResolvedValue([{ id: 2, name: "Item 2", quantity: 100 }]);
      mockQueryRunnerManager.save.mockImplementation((_entity, data) =>
        Promise.resolve({ id: 1, ...data }),
      );
      mockIssuanceRepo.findOne.mockResolvedValue(null);

      const result = await service.createBatchIssuance(
        1,
        {
          issuerStaffId: 1,
          recipientStaffId: 2,
          items: [
            { stockItemId: 999, quantity: 1 },
            { stockItemId: 2, quantity: 1 },
          ],
        },
        mockUser,
      );

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].stockItemId).toBe(999);
      expect(result.created).toBe(1);
    });

    it("reports error for quantity <= 0", async () => {
      mockStaffRepo.findOne
        .mockResolvedValueOnce({ id: 1, name: "Issuer" })
        .mockResolvedValueOnce({ id: 2, name: "Recipient" });
      mockJobCardRepo.findOne.mockResolvedValue(null);
      mockQueryRunnerManager.find.mockResolvedValue([{ id: 1, name: "Item", quantity: 100 }]);

      const result = await service.createBatchIssuance(
        1,
        {
          issuerStaffId: 1,
          recipientStaffId: 2,
          items: [{ stockItemId: 1, quantity: 0 }],
        },
        mockUser,
      );

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain("greater than 0");
    });
  });

  describe("CPO batch issuance", () => {
    const mockCpo = {
      id: 10,
      companyId: 1,
      cpoNumber: "CPO-001",
      jobName: "Test Job",
      customerName: "Test Customer",
    };

    beforeEach(() => {
      mockCpoRepo.findOne.mockResolvedValue(mockCpo);
      mockStaffRepo.findOne
        .mockResolvedValueOnce({ id: 1, name: "Issuer" })
        .mockResolvedValueOnce({ id: 2, name: "Recipient" });
    });

    describe("validateCpoBatchDto (via createCpoBatchIssuance)", () => {
      it("rejects empty items", async () => {
        await expect(
          service.createCpoBatchIssuance(
            1,
            {
              cpoId: 10,
              jobCardIds: [100, 101],
              issuerStaffId: 1,
              recipientStaffId: 2,
              items: [],
            },
            mockUser,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it("rejects empty jobCardIds", async () => {
        await expect(
          service.createCpoBatchIssuance(
            1,
            {
              cpoId: 10,
              jobCardIds: [],
              issuerStaffId: 1,
              recipientStaffId: 2,
              items: [
                {
                  stockItemId: 1,
                  totalQuantity: 10,
                  splits: [{ jobCardId: 100, quantity: 10 }],
                },
              ],
            },
            mockUser,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it("rejects splits that do not sum to totalQuantity", async () => {
        mockJobCardRepo.find = jest.fn().mockResolvedValue([
          { id: 100, cpoId: 10, jobNumber: "JC-001" },
          { id: 101, cpoId: 10, jobNumber: "JC-002" },
        ]);

        await expect(
          service.createCpoBatchIssuance(
            1,
            {
              cpoId: 10,
              jobCardIds: [100, 101],
              issuerStaffId: 1,
              recipientStaffId: 2,
              items: [
                {
                  stockItemId: 1,
                  totalQuantity: 30,
                  splits: [
                    { jobCardId: 100, quantity: 10 },
                    { jobCardId: 101, quantity: 15 },
                  ],
                },
              ],
            },
            mockUser,
          ),
        ).rejects.toThrow(/split sum/i);
      });

      it("rejects splits that reference a job card not in jobCardIds", async () => {
        mockJobCardRepo.find = jest
          .fn()
          .mockResolvedValue([{ id: 100, cpoId: 10, jobNumber: "JC-001" }]);

        await expect(
          service.createCpoBatchIssuance(
            1,
            {
              cpoId: 10,
              jobCardIds: [100],
              issuerStaffId: 1,
              recipientStaffId: 2,
              items: [
                {
                  stockItemId: 1,
                  totalQuantity: 20,
                  splits: [
                    { jobCardId: 100, quantity: 10 },
                    { jobCardId: 999, quantity: 10 },
                  ],
                },
              ],
            },
            mockUser,
          ),
        ).rejects.toThrow(/not in the session/i);
      });
    });

    describe("checkCpoBatchCoatingLimit", () => {
      it("aggregates allowed litres across multiple JCs", async () => {
        mockCoatingAnalysisRepo.find.mockResolvedValue([
          {
            jobCardId: 100,
            companyId: 1,
            coats: [{ product: "Jotun Primer", litersRequired: 10 }],
          },
          {
            jobCardId: 101,
            companyId: 1,
            coats: [{ product: "Jotun Primer", litersRequired: 15 }],
          },
          {
            jobCardId: 102,
            companyId: 1,
            coats: [{ product: "Jotun Primer", litersRequired: 5 }],
          },
        ]);
        mockAllocationRepo.find = jest.fn().mockResolvedValue([]);

        const stockItem = { id: 1, name: "Jotun Primer 20L" } as StockItem;
        const result = await service.checkCpoBatchCoatingLimit(1, [100, 101, 102], stockItem, 25);

        expect(result.allowedLitres).toBe(30);
        expect(result.alreadyAllocated).toBe(0);
        expect(result.requiresApproval).toBe(false);
        expect(result.perJobCard).toHaveLength(3);
      });

      it("requires approval when aggregate request exceeds aggregate allowance", async () => {
        mockCoatingAnalysisRepo.find.mockResolvedValue([
          {
            jobCardId: 100,
            companyId: 1,
            coats: [{ product: "Jotun Primer", litersRequired: 10 }],
          },
          {
            jobCardId: 101,
            companyId: 1,
            coats: [{ product: "Jotun Primer", litersRequired: 10 }],
          },
        ]);
        mockAllocationRepo.find = jest.fn().mockResolvedValue([]);

        const stockItem = { id: 1, name: "Jotun Primer 20L" } as StockItem;
        const result = await service.checkCpoBatchCoatingLimit(1, [100, 101], stockItem, 25);

        expect(result.allowedLitres).toBe(20);
        expect(result.requiresApproval).toBe(true);
      });

      it("subtracts previously allocated litres from the remaining budget", async () => {
        mockCoatingAnalysisRepo.find.mockResolvedValue([
          {
            jobCardId: 100,
            companyId: 1,
            coats: [{ product: "Jotun Primer", litersRequired: 10 }],
          },
          {
            jobCardId: 101,
            companyId: 1,
            coats: [{ product: "Jotun Primer", litersRequired: 10 }],
          },
        ]);
        mockAllocationRepo.find = jest
          .fn()
          .mockResolvedValue([{ quantityUsed: 12 }, { quantityUsed: 3 }]);

        const stockItem = { id: 1, name: "Jotun Primer 20L" } as StockItem;
        const result = await service.checkCpoBatchCoatingLimit(1, [100, 101], stockItem, 10);

        expect(result.allowedLitres).toBe(20);
        expect(result.alreadyAllocated).toBe(15);
        expect(result.requiresApproval).toBe(true);
      });

      it("returns no approval required when no coats match the stock item", async () => {
        mockCoatingAnalysisRepo.find.mockResolvedValue([
          {
            jobCardId: 100,
            companyId: 1,
            coats: [{ product: "Something Else", litersRequired: 10 }],
          },
        ]);

        const stockItem = { id: 1, name: "Jotun Primer 20L" } as StockItem;
        const result = await service.checkCpoBatchCoatingLimit(1, [100], stockItem, 10);

        expect(result.requiresApproval).toBe(false);
        expect(result.allowedLitres).toBeNull();
      });

      it("handles empty job card list gracefully", async () => {
        const stockItem = { id: 1, name: "Jotun Primer 20L" } as StockItem;
        const result = await service.checkCpoBatchCoatingLimit(1, [], stockItem, 10);

        expect(result.requiresApproval).toBe(false);
        expect(result.allowedLitres).toBeNull();
        expect(result.alreadyAllocated).toBe(0);
      });
    });

    describe("cpoBatchIssueContext", () => {
      it("throws when CPO is not found", async () => {
        mockCpoRepo.findOne.mockResolvedValue(null);
        await expect(service.cpoBatchIssueContext(1, 999)).rejects.toThrow(NotFoundException);
      });

      it("returns empty lists when CPO has no linked JCs", async () => {
        mockCpoRepo.findOne.mockResolvedValue(mockCpo);
        const qb = {
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          addOrderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([]),
        };
        mockJobCardRepo.createQueryBuilder.mockReturnValue(qb);

        const result = await service.cpoBatchIssueContext(1, 10);
        expect(result.cpo.id).toBe(10);
        expect(result.jobCards).toHaveLength(0);
        expect(result.aggregatedCoats).toHaveLength(0);
      });
    });
  });
});
