import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AuditService } from "../../audit/audit.service";
import { TransactionRunner } from "../../lib/persistence/transaction-runner";
import { STORAGE_SERVICE } from "../../storage/storage.interface";
import { MovementType, ReferenceType } from "../entities/stock-movement.entity";
import { JobCardCoatingAnalysisRepository } from "../repositories/coating-analysis.repository";
import { JobCardRepository } from "../repositories/job-card.repository";
import { JobCardJobFileRepository } from "../repositories/job-card-job-file.repository";
import { JobCardLineItemRepository } from "../repositories/job-card-line-item.repository";
import { ReconciliationDocumentRepository } from "../repositories/reconciliation-document.repository";
import { ReconciliationItemRepository } from "../repositories/reconciliation-item.repository";
import { StockAllocationRepository } from "../repositories/stock-allocation.repository";
import { StockItemRepository } from "../repositories/stock-item.repository";
import { StockMovementRepository } from "../repositories/stock-movement.repository";
import { StockReturnRepository } from "../repositories/stock-return.repository";
import { JobCardService } from "./job-card.service";
import { RequisitionService } from "./requisition.service";
import { WorkflowNotificationService } from "./workflow-notification.service";

jest.mock("../../lib/datetime", () => ({
  now: () => ({
    toJSDate: () => new Date("2026-03-13T12:00:00Z"),
    minus: ({ minutes }: { minutes: number }) => ({
      toJSDate: () => new Date(new Date("2026-03-13T12:00:00Z").getTime() - minutes * 60_000),
    }),
  }),
}));

describe("JobCardService", () => {
  let service: JobCardService;

  const jobCardFindOne = jest.fn();
  const jobCardFind = jest.fn();
  const mockJobCardRepo = {
    create: jest.fn().mockImplementation((data) => Promise.resolve({ id: 1, ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    saveMany: jest.fn().mockImplementation((entities) => Promise.resolve(entities)),
    find: jobCardFind,
    findOne: jobCardFindOne,
    findOneForCompany: jobCardFindOne,
    findOneForCompanyWithLineItems: jobCardFindOne,
    findOneForCompanySelectId: jobCardFindOne,
    findOneForCompanySelectIdNotes: jobCardFindOne,
    findForCompanyByListPage: jobCardFind,
    findDeliveryJobCards: jobCardFind,
    findActiveJobCardsWithDedupeFields: jobCardFind,
    jtNumbersForJobCards: jest.fn().mockResolvedValue([]),
    adjacentIds: jest.fn().mockResolvedValue({ previousId: null, nextId: null }),
    remove: jest.fn().mockResolvedValue(null),
  };

  const allocFind = jest.fn();
  const allocFindOne = jest.fn();
  const mockAllocationRepo = {
    find: allocFind,
    findOne: allocFindOne,
    findActiveExistingByJobAndStockItem: allocFind,
    findPendingForCompany: allocFind,
    findForJobCardWithRelations: allocFind,
    findOnePendingForCompany: allocFindOne,
    findOneForCompanyWithRelations: allocFindOne,
    findForJobCardPaginated: jest.fn(),
    findManyWhere: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((data) => Promise.resolve({ id: 1, ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    remove: jest.fn(),
    withTransaction: jest.fn(),
  };
  mockAllocationRepo.withTransaction.mockReturnValue(mockAllocationRepo);

  const mockStockItemRepo = {
    findOne: jest.fn(),
    findOneForCompany: jest.fn(),
    save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    incrementQuantityForCompany: jest.fn().mockResolvedValue(true),
    decrementQuantityForCompany: jest.fn().mockResolvedValue(true),
    setQuantityForCompany: jest.fn().mockResolvedValue(true),
    withTransaction: jest.fn(),
  };
  mockStockItemRepo.withTransaction.mockReturnValue(mockStockItemRepo);

  const mockMovementRepo = {
    create: jest.fn().mockImplementation((data) => Promise.resolve({ id: 1, ...data })),
    withTransaction: jest.fn(),
  };
  mockMovementRepo.withTransaction.mockReturnValue(mockMovementRepo);

  const mockTxRunner = {
    run: jest.fn().mockImplementation((work) => work({})),
  };

  const mockStockReturnRepo = {
    findManyWhere: jest.fn().mockResolvedValue([]),
    remove: jest.fn(),
  };

  const mockReconciliationItemRepo = {
    findManyWhere: jest.fn().mockResolvedValue([]),
    remove: jest.fn(),
  };

  const mockReconciliationDocumentRepo = {
    findManyWhere: jest.fn().mockResolvedValue([]),
    remove: jest.fn(),
  };

  const mockCoatingAnalysisRepo = {
    findOneForJobCard: jest.fn(),
  };

  const mockStorageService = {
    upload: jest.fn(),
  };

  const mockRequisitionService = {
    createReorderRequisition: jest.fn().mockResolvedValue(null),
  };

  const mockNotificationService = {
    notifyOverAllocationApproval: jest.fn().mockResolvedValue(null),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(null),
  };

  const mockJobFileRepo = {
    create: jest.fn().mockImplementation((data) => Promise.resolve({ id: 1, ...data })),
  };

  const mockJobCardLineItemRepo = {
    countForJobCard: jest.fn().mockResolvedValue(0),
    deleteForJobCard: jest.fn().mockResolvedValue(null),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobCardService,
        { provide: JobCardRepository, useValue: mockJobCardRepo },
        { provide: StockAllocationRepository, useValue: mockAllocationRepo },
        { provide: JobCardCoatingAnalysisRepository, useValue: mockCoatingAnalysisRepo },
        { provide: JobCardJobFileRepository, useValue: mockJobFileRepo },
        { provide: JobCardLineItemRepository, useValue: mockJobCardLineItemRepo },
        { provide: StockItemRepository, useValue: mockStockItemRepo },
        { provide: StockMovementRepository, useValue: mockMovementRepo },
        { provide: StockReturnRepository, useValue: mockStockReturnRepo },
        { provide: ReconciliationItemRepository, useValue: mockReconciliationItemRepo },
        { provide: ReconciliationDocumentRepository, useValue: mockReconciliationDocumentRepo },
        { provide: STORAGE_SERVICE, useValue: mockStorageService },
        { provide: RequisitionService, useValue: mockRequisitionService },
        { provide: WorkflowNotificationService, useValue: mockNotificationService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: TransactionRunner, useValue: mockTxRunner },
      ],
    }).compile();

    service = module.get<JobCardService>(JobCardService);
    jest.clearAllMocks();
    mockStockItemRepo.withTransaction.mockReturnValue(mockStockItemRepo);
    mockMovementRepo.withTransaction.mockReturnValue(mockMovementRepo);
    mockAllocationRepo.withTransaction.mockReturnValue(mockAllocationRepo);
    mockStockItemRepo.incrementQuantityForCompany.mockResolvedValue(true);
    mockStockItemRepo.decrementQuantityForCompany.mockResolvedValue(true);
    mockStockItemRepo.setQuantityForCompany.mockResolvedValue(true);
    mockTxRunner.run.mockImplementation((work) => work({}));
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("creates a job card with company id", async () => {
      const data = { jobNumber: "JC-001", description: "Test job" };
      const result = await service.create(1, data);

      expect(mockJobCardRepo.create).toHaveBeenCalledWith({ ...data, companyId: 1 });
      expect(result).toEqual(expect.objectContaining({ companyId: 1, jobNumber: "JC-001" }));
    });
  });

  describe("findAll", () => {
    it("returns job cards for company", async () => {
      const cards = [{ id: 1, companyId: 1 }];
      jobCardFind.mockResolvedValue(cards);

      const result = await service.findAll(1);
      expect(result).toEqual(cards);
      expect(mockJobCardRepo.findForCompanyByListPage).toHaveBeenCalledWith(1, undefined, 1, 50);
    });

    it("filters by status when provided", async () => {
      jobCardFind.mockResolvedValue([]);

      await service.findAll(1, "active");
      expect(mockJobCardRepo.findForCompanyByListPage).toHaveBeenCalledWith(1, "active", 1, 50);
    });

    it("paginates correctly", async () => {
      jobCardFind.mockResolvedValue([]);

      await service.findAll(1, null as unknown as string, 3, 10);
      expect(mockJobCardRepo.findForCompanyByListPage).toHaveBeenCalledWith(1, null, 3, 10);
    });
  });

  describe("findById", () => {
    it("returns job card with relations", async () => {
      const card = { id: 1, companyId: 1 };
      mockJobCardRepo.findOne.mockResolvedValue(card);

      const result = await service.findById(1, 1);
      expect(result).toEqual(card);
    });

    it("throws NotFoundException when not found", async () => {
      mockJobCardRepo.findOne.mockResolvedValue(null);

      await expect(service.findById(1, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("update", () => {
    it("updates and saves job card", async () => {
      const existing = { id: 1, companyId: 1, jobNumber: "JC-001", description: "Old" };
      mockJobCardRepo.findOne.mockResolvedValue(existing);

      await service.update(1, 1, { description: "Updated" });
      expect(mockJobCardRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ description: "Updated" }),
      );
    });

    it("throws NotFoundException when job card missing", async () => {
      mockJobCardRepo.findOne.mockResolvedValue(null);

      await expect(service.update(1, 999, { description: "X" })).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("removes the job card and its dependents", async () => {
      const card = { id: 1, companyId: 1, jobNumber: "JC-001" };
      mockJobCardRepo.findOne.mockResolvedValue(card);

      await service.remove(1, 1);

      expect(mockStockReturnRepo.findManyWhere).toHaveBeenCalledWith({
        jobCardId: 1,
        companyId: 1,
      });
      expect(mockAllocationRepo.findManyWhere).toHaveBeenCalledWith({
        jobCardId: 1,
        companyId: 1,
      });
      expect(mockReconciliationItemRepo.findManyWhere).toHaveBeenCalledWith({
        jobCardId: 1,
        companyId: 1,
      });
      expect(mockReconciliationDocumentRepo.findManyWhere).toHaveBeenCalledWith({
        jobCardId: 1,
        companyId: 1,
      });
      expect(mockJobCardLineItemRepo.deleteForJobCard).toHaveBeenCalledWith(1);
      expect(mockJobCardRepo.remove).toHaveBeenCalledWith(card);
    });

    it("throws NotFoundException when job card missing", async () => {
      mockJobCardRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(1, 999)).rejects.toThrow(NotFoundException);
      expect(mockJobCardRepo.remove).not.toHaveBeenCalled();
    });
  });

  describe("allocateStock", () => {
    const allocationData = {
      stockItemId: 10,
      jobCardId: 1,
      quantityUsed: 5,
      allocatedBy: "admin",
    };

    it("deducts stock and creates allocation and movement", async () => {
      const stockItem = { id: 10, name: "Paint A", quantity: 100, minStockLevel: 0, companyId: 1 };
      const jobCard = { id: 1, jobNumber: "JC-001", companyId: 1 };
      mockStockItemRepo.findOneForCompany.mockResolvedValue(stockItem);
      jobCardFindOne.mockResolvedValue(jobCard);
      mockCoatingAnalysisRepo.findOneForJobCard.mockResolvedValue(null);

      const result = await service.allocateStock(1, allocationData);

      expect(mockStockItemRepo.decrementQuantityForCompany).toHaveBeenCalledWith(10, 1, 5, true);
      expect(mockAllocationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          stockItemId: 10,
          jobCardId: 1,
          quantityUsed: 5,
          pendingApproval: false,
        }),
      );
      expect(mockMovementRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          movementType: MovementType.OUT,
          quantity: 5,
          referenceType: ReferenceType.ALLOCATION,
        }),
      );
      expect(result).toBeDefined();
    });

    it("throws NotFoundException when stock item not found", async () => {
      mockStockItemRepo.findOneForCompany.mockResolvedValue(null);

      await expect(service.allocateStock(1, allocationData)).rejects.toThrow(NotFoundException);
    });

    it("throws NotFoundException when job card not found", async () => {
      const stockItem = { id: 10, quantity: 100, companyId: 1 };
      mockStockItemRepo.findOneForCompany.mockResolvedValue(stockItem);
      jobCardFindOne.mockResolvedValue(null);

      await expect(service.allocateStock(1, allocationData)).rejects.toThrow(NotFoundException);
    });

    it("throws BadRequestException when insufficient stock", async () => {
      const stockItem = { id: 10, quantity: 2, companyId: 1 };
      const jobCard = { id: 1, jobNumber: "JC-001", companyId: 1 };
      mockStockItemRepo.findOneForCompany.mockResolvedValue(stockItem);
      jobCardFindOne.mockResolvedValue(jobCard);

      await expect(
        service.allocateStock(1, { ...allocationData, quantityUsed: 10 }),
      ).rejects.toThrow(BadRequestException);
    });

    it("triggers reorder requisition when stock drops below minimum", async () => {
      const jobCard = { id: 1, jobNumber: "JC-001", companyId: 1 };
      mockStockItemRepo.findOneForCompany
        .mockResolvedValueOnce({
          id: 10,
          name: "Paint A",
          quantity: 20,
          minStockLevel: 18,
          companyId: 1,
        })
        .mockResolvedValueOnce({
          id: 10,
          name: "Paint A",
          quantity: 15,
          minStockLevel: 18,
          companyId: 1,
        });
      jobCardFindOne.mockResolvedValue(jobCard);
      mockCoatingAnalysisRepo.findOneForJobCard.mockResolvedValue(null);

      await service.allocateStock(1, allocationData);
      await new Promise((resolve) => process.nextTick(resolve));

      expect(mockRequisitionService.createReorderRequisition).toHaveBeenCalledWith(1, 10);
    });

    it("does not trigger reorder when minStockLevel is 0", async () => {
      const stockItem = { id: 10, name: "Paint A", quantity: 10, minStockLevel: 0, companyId: 1 };
      const jobCard = { id: 1, jobNumber: "JC-001", companyId: 1 };
      mockStockItemRepo.findOneForCompany.mockResolvedValue(stockItem);
      jobCardFindOne.mockResolvedValue(jobCard);
      mockCoatingAnalysisRepo.findOneForJobCard.mockResolvedValue(null);

      await service.allocateStock(1, allocationData);

      expect(mockRequisitionService.createReorderRequisition).not.toHaveBeenCalled();
    });

    it("logs audit entry after allocation", async () => {
      const stockItem = { id: 10, name: "Paint A", quantity: 100, minStockLevel: 0, companyId: 1 };
      const jobCard = { id: 1, jobNumber: "JC-001", companyId: 1 };
      mockStockItemRepo.findOneForCompany.mockResolvedValue(stockItem);
      jobCardFindOne.mockResolvedValue(jobCard);
      mockCoatingAnalysisRepo.findOneForJobCard.mockResolvedValue(null);

      await service.allocateStock(1, allocationData);

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: "stock_allocation",
          newValues: expect.objectContaining({ stockItemId: 10, quantity: 5 }),
        }),
      );
    });
  });

  describe("allocateStock - over-allocation", () => {
    const allocationData = {
      stockItemId: 10,
      jobCardId: 1,
      quantityUsed: 15,
      allocatedBy: "admin",
    };

    it("flags pending approval when exceeding allowed litres", async () => {
      const stockItem = {
        id: 10,
        name: "Primer Red",
        quantity: 100,
        minStockLevel: 0,
        companyId: 1,
      };
      const jobCard = { id: 1, jobNumber: "JC-001", companyId: 1 };
      mockStockItemRepo.findOneForCompany.mockResolvedValue(stockItem);
      jobCardFindOne.mockResolvedValue(jobCard);
      mockCoatingAnalysisRepo.findOneForJobCard.mockResolvedValue({
        jobCardId: 1,
        companyId: 1,
        coats: [{ product: "Primer Red", litersRequired: 10 }],
      });
      mockAllocationRepo.find.mockResolvedValue([]);

      await service.allocateStock(1, allocationData);

      expect(mockAllocationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ pendingApproval: true }),
      );
      expect(mockNotificationService.notifyOverAllocationApproval).toHaveBeenCalled();
    });

    it("does not deduct stock when allocation requires approval", async () => {
      const stockItem = {
        id: 10,
        name: "Primer Red",
        quantity: 100,
        minStockLevel: 0,
        companyId: 1,
      };
      const jobCard = { id: 1, jobNumber: "JC-001", companyId: 1 };
      mockStockItemRepo.findOneForCompany.mockResolvedValue(stockItem);
      jobCardFindOne.mockResolvedValue(jobCard);
      mockCoatingAnalysisRepo.findOneForJobCard.mockResolvedValue({
        jobCardId: 1,
        companyId: 1,
        coats: [{ product: "Primer Red", litersRequired: 10 }],
      });
      mockAllocationRepo.find.mockResolvedValue([]);

      await service.allocateStock(1, allocationData);

      expect(mockStockItemRepo.decrementQuantityForCompany).not.toHaveBeenCalled();
    });

    it("accounts for existing allocations when checking over-allocation", async () => {
      const stockItem = {
        id: 10,
        name: "Primer Red",
        quantity: 100,
        minStockLevel: 0,
        companyId: 1,
      };
      const jobCard = { id: 1, jobNumber: "JC-001", companyId: 1 };
      mockStockItemRepo.findOneForCompany.mockResolvedValue(stockItem);
      jobCardFindOne.mockResolvedValue(jobCard);
      mockCoatingAnalysisRepo.findOneForJobCard.mockResolvedValue({
        jobCardId: 1,
        companyId: 1,
        coats: [{ product: "Primer Red", litersRequired: 20 }],
      });
      mockAllocationRepo.find.mockResolvedValue([{ quantityUsed: 10 }]);

      await service.allocateStock(1, { ...allocationData, quantityUsed: 11 });

      expect(mockAllocationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ pendingApproval: true }),
      );
    });

    it("allows allocation within limit even with existing allocations", async () => {
      const stockItem = {
        id: 10,
        name: "Primer Red",
        quantity: 100,
        minStockLevel: 0,
        companyId: 1,
      };
      const jobCard = { id: 1, jobNumber: "JC-001", companyId: 1 };
      mockStockItemRepo.findOneForCompany.mockResolvedValue(stockItem);
      jobCardFindOne.mockResolvedValue(jobCard);
      mockCoatingAnalysisRepo.findOneForJobCard.mockResolvedValue({
        jobCardId: 1,
        companyId: 1,
        coats: [{ product: "Primer Red", litersRequired: 20 }],
      });
      mockAllocationRepo.find.mockResolvedValue([{ quantityUsed: 5 }]);

      await service.allocateStock(1, { ...allocationData, quantityUsed: 10 });

      expect(mockStockItemRepo.decrementQuantityForCompany).toHaveBeenCalledWith(10, 1, 10, true);
      expect(mockNotificationService.notifyOverAllocationApproval).not.toHaveBeenCalled();
    });

    it("skips over-allocation check when no coating analysis exists", async () => {
      const stockItem = { id: 10, name: "Paint A", quantity: 100, minStockLevel: 0, companyId: 1 };
      const jobCard = { id: 1, jobNumber: "JC-001", companyId: 1 };
      mockStockItemRepo.findOneForCompany.mockResolvedValue(stockItem);
      jobCardFindOne.mockResolvedValue(jobCard);
      mockCoatingAnalysisRepo.findOneForJobCard.mockResolvedValue(null);

      await service.allocateStock(1, allocationData);

      expect(mockStockItemRepo.decrementQuantityForCompany).toHaveBeenCalledWith(10, 1, 15, true);
    });

    it("skips over-allocation check when no fuzzy match for stock item name", async () => {
      const stockItem = {
        id: 10,
        name: "Completely Different Product",
        quantity: 100,
        minStockLevel: 0,
        companyId: 1,
      };
      const jobCard = { id: 1, jobNumber: "JC-001", companyId: 1 };
      mockStockItemRepo.findOneForCompany.mockResolvedValue(stockItem);
      jobCardFindOne.mockResolvedValue(jobCard);
      mockCoatingAnalysisRepo.findOneForJobCard.mockResolvedValue({
        jobCardId: 1,
        companyId: 1,
        coats: [{ product: "Primer Red", litersRequired: 5 }],
      });
      mockAllocationRepo.find.mockResolvedValue([]);

      await service.allocateStock(1, allocationData);

      expect(mockStockItemRepo.decrementQuantityForCompany).toHaveBeenCalledWith(10, 1, 15, true);
    });
  });

  describe("approveOverAllocation", () => {
    it("approves pending allocation and deducts stock", async () => {
      const allocation = {
        id: 5,
        companyId: 1,
        pendingApproval: true,
        quantityUsed: 10,
        stockItemId: 10,
        jobCardId: 1,
        allocatedBy: "admin",
      };
      const stockItem = { id: 10, quantity: 50, minStockLevel: 0, companyId: 1 };
      const jobCard = { id: 1, jobNumber: "JC-001", companyId: 1 };

      allocFindOne.mockResolvedValue(allocation);
      mockStockItemRepo.findOneForCompany.mockResolvedValue(stockItem);
      jobCardFindOne.mockResolvedValue(jobCard);

      const result = await service.approveOverAllocation(1, 5, 99);

      expect(mockStockItemRepo.decrementQuantityForCompany).toHaveBeenCalledWith(10, 1, 10, true);
      expect(mockAllocationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          pendingApproval: false,
          approvedByManagerId: 99,
        }),
      );
      expect(mockMovementRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          movementType: MovementType.OUT,
          quantity: 10,
          referenceType: ReferenceType.ALLOCATION,
        }),
      );
      expect(result).toBeDefined();
    });

    it("throws NotFoundException when pending allocation not found", async () => {
      allocFindOne.mockResolvedValue(null);

      await expect(service.approveOverAllocation(1, 999, 99)).rejects.toThrow(NotFoundException);
    });

    it("throws NotFoundException when stock item disappears", async () => {
      const allocation = {
        id: 5,
        pendingApproval: true,
        quantityUsed: 10,
        stockItemId: 10,
        jobCardId: 1,
      };
      allocFindOne.mockResolvedValue(allocation);
      mockStockItemRepo.findOneForCompany.mockResolvedValue(null);

      await expect(service.approveOverAllocation(1, 5, 99)).rejects.toThrow(NotFoundException);
    });

    it("throws BadRequestException when stock now insufficient", async () => {
      const allocation = {
        id: 5,
        pendingApproval: true,
        quantityUsed: 10,
        stockItemId: 10,
        jobCardId: 1,
      };
      const stockItem = { id: 10, quantity: 5, companyId: 1 };

      allocFindOne.mockResolvedValue(allocation);
      mockStockItemRepo.findOneForCompany.mockResolvedValue(stockItem);

      await expect(service.approveOverAllocation(1, 5, 99)).rejects.toThrow(BadRequestException);
    });

    it("triggers reorder if stock drops below minimum after approval", async () => {
      const allocation = {
        id: 5,
        pendingApproval: true,
        quantityUsed: 10,
        stockItemId: 10,
        jobCardId: 1,
        allocatedBy: "admin",
      };
      const jobCard = { id: 1, jobNumber: "JC-001", companyId: 1 };

      allocFindOne.mockResolvedValue(allocation);
      mockStockItemRepo.findOneForCompany
        .mockResolvedValueOnce({ id: 10, quantity: 15, minStockLevel: 10, companyId: 1 })
        .mockResolvedValueOnce({ id: 10, quantity: 5, minStockLevel: 10, companyId: 1 });
      jobCardFindOne.mockResolvedValue(jobCard);

      await service.approveOverAllocation(1, 5, 99);
      await new Promise((resolve) => process.nextTick(resolve));

      expect(mockRequisitionService.createReorderRequisition).toHaveBeenCalledWith(1, 10);
    });
  });

  describe("rejectOverAllocation", () => {
    it("marks allocation as rejected with reason", async () => {
      const allocation = { id: 5, companyId: 1, pendingApproval: true };
      mockAllocationRepo.findOne.mockResolvedValue(allocation);

      const result = await service.rejectOverAllocation(1, 5, "Exceeds budget");

      expect(mockAllocationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          pendingApproval: false,
          rejectionReason: "Exceeds budget",
        }),
      );
      expect(result).toBeDefined();
    });

    it("throws NotFoundException when pending allocation not found", async () => {
      mockAllocationRepo.findOne.mockResolvedValue(null);

      await expect(service.rejectOverAllocation(1, 999, "reason")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("undoAllocation", () => {
    const user = { id: 1, name: "Admin User" };

    it("restores stock quantity and marks allocation as undone", async () => {
      const allocation = {
        id: 5,
        companyId: 1,
        quantityUsed: 10,
        undone: false,
        pendingApproval: false,
        createdAt: new Date("2026-03-13T11:58:00Z"),
        stockItemId: 10,
        jobCardId: 1,
      };
      const stockItem = { id: 10, quantity: 40, companyId: 1 };

      mockAllocationRepo.findOne.mockResolvedValue(allocation);
      mockStockItemRepo.findOneForCompany.mockResolvedValue(stockItem);

      const result = await service.undoAllocation(1, 5, user);

      expect(mockStockItemRepo.incrementQuantityForCompany).toHaveBeenCalledWith(10, 1, 10);
      expect(mockAllocationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          undone: true,
          undoneByName: "Admin User",
        }),
      );
      expect(result.undone).toBe(true);
    });

    it("creates reverse IN movement", async () => {
      const allocation = {
        id: 5,
        companyId: 1,
        quantityUsed: 10,
        undone: false,
        pendingApproval: false,
        createdAt: new Date("2026-03-13T11:58:00Z"),
        stockItemId: 10,
        jobCardId: 1,
      };
      const stockItem = { id: 10, quantity: 40, companyId: 1 };

      mockAllocationRepo.findOne.mockResolvedValue(allocation);
      mockStockItemRepo.findOneForCompany.mockResolvedValue(stockItem);

      await service.undoAllocation(1, 5, user);

      expect(mockMovementRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          movementType: MovementType.IN,
          quantity: 10,
          referenceType: ReferenceType.ALLOCATION,
          referenceId: 5,
        }),
      );
    });

    it("throws NotFoundException when allocation not found", async () => {
      mockAllocationRepo.findOne.mockResolvedValue(null);

      await expect(service.undoAllocation(1, 999, user)).rejects.toThrow(NotFoundException);
    });

    it("throws BadRequestException when already undone", async () => {
      const allocation = {
        id: 5,
        undone: true,
        pendingApproval: false,
        createdAt: new Date("2026-03-13T11:58:00Z"),
      };
      mockAllocationRepo.findOne.mockResolvedValue(allocation);

      await expect(service.undoAllocation(1, 5, user)).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException when allocation is pending approval", async () => {
      const allocation = {
        id: 5,
        undone: false,
        pendingApproval: true,
        createdAt: new Date("2026-03-13T11:58:00Z"),
      };
      mockAllocationRepo.findOne.mockResolvedValue(allocation);

      await expect(service.undoAllocation(1, 5, user)).rejects.toThrow(BadRequestException);
    });

    it("propagates failure when stock item lookup fails", async () => {
      const allocation = {
        id: 5,
        undone: false,
        pendingApproval: false,
        createdAt: new Date("2026-03-13T11:58:00Z"),
        stockItemId: 10,
        jobCardId: 1,
      };
      mockAllocationRepo.findOne.mockResolvedValue(allocation);
      mockStockItemRepo.findOneForCompany.mockResolvedValue(null);

      await expect(service.undoAllocation(1, 5, user)).rejects.toThrow(NotFoundException);
      expect(mockStockItemRepo.incrementQuantityForCompany).not.toHaveBeenCalled();
    });

    it("logs audit entry on successful undo", async () => {
      const allocation = {
        id: 5,
        companyId: 1,
        quantityUsed: 10,
        undone: false,
        pendingApproval: false,
        createdAt: new Date("2026-03-13T11:58:00Z"),
        stockItemId: 10,
        jobCardId: 1,
      };
      const stockItem = { id: 10, quantity: 40, companyId: 1 };

      mockAllocationRepo.findOne.mockResolvedValue(allocation);
      mockStockItemRepo.findOneForCompany.mockResolvedValue(stockItem);

      await service.undoAllocation(1, 5, user);

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: "stock_allocation",
          entityId: 5,
          newValues: expect.objectContaining({ undoneBy: "Admin User" }),
        }),
      );
    });
  });

  describe("pendingAllocations", () => {
    it("returns pending allocations for company", async () => {
      const pending = [{ id: 1, pendingApproval: true }];
      mockAllocationRepo.find.mockResolvedValue(pending);

      const result = await service.pendingAllocations(1);
      expect(result).toEqual(pending);
    });
  });

  describe("allocationsByJobCard", () => {
    it("returns allocations for a specific job card", async () => {
      const allocations = [{ id: 1, jobCard: { id: 5 } }];
      mockAllocationRepo.findForJobCardPaginated.mockResolvedValue([
        allocations,
        allocations.length,
      ]);

      const result = await service.allocationsByJobCard(1, 5);
      expect(result).toEqual({
        data: allocations,
        total: allocations.length,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });
  });

  describe("uploadAllocationPhoto", () => {
    it("uploads photo and updates allocation", async () => {
      const allocation = { id: 5, companyId: 1, photoUrl: null, stockItem: { id: 10 } };
      mockAllocationRepo.findOne.mockResolvedValue(allocation);
      mockStorageService.upload.mockResolvedValue({ url: "https://s3.example.com/photo.jpg" });

      const file = {
        buffer: Buffer.from("test"),
        originalname: "photo.jpg",
      } as Express.Multer.File;
      await service.uploadAllocationPhoto(1, 5, file);

      expect(mockStorageService.upload).toHaveBeenCalledWith(file, "stock-control/allocations");
      expect(mockAllocationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ photoUrl: "https://s3.example.com/photo.jpg" }),
      );
    });

    it("throws NotFoundException when allocation not found", async () => {
      mockAllocationRepo.findOne.mockResolvedValue(null);

      const file = { buffer: Buffer.from("test") } as Express.Multer.File;
      await expect(service.uploadAllocationPhoto(1, 999, file)).rejects.toThrow(NotFoundException);
    });
  });
});
