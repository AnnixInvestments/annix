import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import {
  CalloffStatus,
  CalloffType,
  CpoCalloffRecord,
} from "../entities/cpo-calloff-record.entity";
import { CpoStatus, CustomerPurchaseOrder } from "../entities/customer-purchase-order.entity";
import { CustomerPurchaseOrderItem } from "../entities/customer-purchase-order-item.entity";
import { DeliveryNote } from "../entities/delivery-note.entity";
import { JobCard } from "../entities/job-card.entity";
import { JobCardLineItem } from "../entities/job-card-line-item.entity";
import { Requisition } from "../entities/requisition.entity";
import { RequisitionItem } from "../entities/requisition-item.entity";
import { CoatingAnalysisService } from "./coating-analysis.service";
import { CpoService } from "./cpo.service";
import { WorkflowNotificationService } from "./workflow-notification.service";

const COMPANY_ID = 1;

const makeCpo = (overrides: Partial<CustomerPurchaseOrder> = {}): CustomerPurchaseOrder =>
  ({
    id: 1,
    companyId: COMPANY_ID,
    cpoNumber: "CPO-JOB001",
    jobNumber: "JOB001",
    jobName: "Test Job",
    customerName: "Example Corp",
    poNumber: "PO-100",
    siteLocation: null,
    contactPerson: null,
    dueDate: null,
    notes: null,
    coatingSpecs: null,
    reference: null,
    customFields: null,
    status: CpoStatus.ACTIVE,
    totalItems: 2,
    totalQuantity: 10,
    fulfilledQuantity: 0,
    sourceFilePath: null,
    sourceFileName: null,
    versionNumber: 1,
    previousVersions: [],
    createdBy: "admin",
    items: [],
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  }) as CustomerPurchaseOrder;

const makeCpoItem = (
  overrides: Partial<CustomerPurchaseOrderItem> = {},
): CustomerPurchaseOrderItem =>
  ({
    id: 1,
    cpoId: 1,
    companyId: COMPANY_ID,
    itemCode: "PIPE-001",
    itemDescription: "Steel Pipe 6 inch",
    itemNo: "1",
    quantityOrdered: 5,
    quantityFulfilled: 0,
    jtNo: null,
    m2: null,
    sortOrder: 0,
    createdAt: new Date("2025-01-01"),
    ...overrides,
  }) as CustomerPurchaseOrderItem;

const makeJobCard = (overrides: Partial<JobCard> = {}): JobCard =>
  ({
    id: 10,
    jobNumber: "JOB001",
    jcNumber: null,
    pageNumber: null,
    jobName: "Test Job",
    customerName: "Example Corp",
    description: null,
    poNumber: null,
    siteLocation: null,
    contactPerson: null,
    status: "pending",
    cpoId: null,
    isCpoCalloff: false,
    jtDnNumber: null,
    companyId: COMPANY_ID,
    lineItems: [],
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  }) as unknown as JobCard;

const makeCalloffRecord = (overrides: Partial<CpoCalloffRecord> = {}): CpoCalloffRecord =>
  ({
    id: 1,
    companyId: COMPANY_ID,
    cpoId: 1,
    jobCardId: 10,
    requisitionId: null,
    calloffType: CalloffType.PAINT,
    status: CalloffStatus.PENDING,
    calledOffAt: null,
    deliveredAt: null,
    invoicedAt: null,
    notes: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  }) as CpoCalloffRecord;

describe("CpoService", () => {
  let service: CpoService;

  const mockCpoRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    remove: jest.fn().mockResolvedValue(null),
  };

  const mockCpoItemRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest
      .fn()
      .mockImplementation((entity) =>
        Promise.resolve(Array.isArray(entity) ? entity : { id: 1, ...entity }),
      ),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    remove: jest.fn().mockResolvedValue(null),
    delete: jest.fn().mockResolvedValue({ affected: 0 }),
  };

  const mockJobCardRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockLineItemRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockCalloffRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest
      .fn()
      .mockImplementation((entity) =>
        Promise.resolve(Array.isArray(entity) ? entity : { id: 1, ...entity }),
      ),
  };

  const mockRequisitionRepo = {
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
  };

  const mockRequisitionItemRepo = {
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((items) => Promise.resolve(items)),
  };

  const mockDeliveryNoteRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockCoatingAnalysisService = {
    analyseJobCard: jest.fn(),
    findByJobCard: jest.fn(),
  };

  const mockNotificationService = {
    notifyCpoCalloffNeeded: jest.fn().mockResolvedValue(null),
    notifyCpoInvoiceOverdue: jest.fn().mockResolvedValue(null),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CpoService,
        { provide: getRepositoryToken(CustomerPurchaseOrder), useValue: mockCpoRepo },
        { provide: getRepositoryToken(CustomerPurchaseOrderItem), useValue: mockCpoItemRepo },
        { provide: getRepositoryToken(JobCard), useValue: mockJobCardRepo },
        { provide: getRepositoryToken(JobCardLineItem), useValue: mockLineItemRepo },
        { provide: getRepositoryToken(CpoCalloffRecord), useValue: mockCalloffRepo },
        { provide: getRepositoryToken(Requisition), useValue: mockRequisitionRepo },
        { provide: getRepositoryToken(RequisitionItem), useValue: mockRequisitionItemRepo },
        { provide: getRepositoryToken(DeliveryNote), useValue: mockDeliveryNoteRepo },
        { provide: CoatingAnalysisService, useValue: mockCoatingAnalysisService },
        { provide: WorkflowNotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    service = module.get<CpoService>(CpoService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("returns paginated CPOs without status filter", async () => {
      const cpos = [makeCpo(), makeCpo({ id: 2, cpoNumber: "CPO-JOB002" })];
      mockCpoRepo.find.mockResolvedValue(cpos);

      const result = await service.findAll(COMPANY_ID);

      expect(result).toEqual(cpos);
      expect(mockCpoRepo.find).toHaveBeenCalledWith({
        where: { companyId: COMPANY_ID },
        relations: ["items"],
        order: { createdAt: "DESC" },
        take: 50,
        skip: 0,
      });
    });

    it("applies status filter when provided", async () => {
      mockCpoRepo.find.mockResolvedValue([]);

      await service.findAll(COMPANY_ID, CpoStatus.ACTIVE, 2, 10);

      expect(mockCpoRepo.find).toHaveBeenCalledWith({
        where: { companyId: COMPANY_ID, status: CpoStatus.ACTIVE },
        relations: ["items"],
        order: { createdAt: "DESC" },
        take: 10,
        skip: 10,
      });
    });

    it("calculates correct skip for page 3", async () => {
      mockCpoRepo.find.mockResolvedValue([]);

      await service.findAll(COMPANY_ID, undefined, 3, 20);

      expect(mockCpoRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 20, skip: 40 }),
      );
    });
  });

  describe("findById", () => {
    it("returns CPO when found", async () => {
      const cpo = makeCpo();
      mockCpoRepo.findOne.mockResolvedValue(cpo);

      const result = await service.findById(COMPANY_ID, 1);

      expect(result).toEqual(cpo);
      expect(mockCpoRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1, companyId: COMPANY_ID },
        relations: ["items"],
      });
    });

    it("throws NotFoundException when CPO not found", async () => {
      mockCpoRepo.findOne.mockResolvedValue(null);

      await expect(service.findById(COMPANY_ID, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("addCpoItem", () => {
    it("creates item and updates CPO totals", async () => {
      const cpo = makeCpo({ items: [makeCpoItem({ sortOrder: 2 })] });
      mockCpoRepo.findOne.mockResolvedValue(cpo);

      const itemData = {
        itemCode: "PIPE-002",
        itemDescription: "Steel Pipe 8 inch",
        quantityOrdered: 3,
      };

      const savedItem = {
        id: 2,
        ...itemData,
        cpoId: 1,
        companyId: COMPANY_ID,
        quantityFulfilled: 0,
        sortOrder: 3,
      };
      mockCpoItemRepo.save.mockResolvedValue(savedItem);

      const result = await service.addCpoItem(COMPANY_ID, 1, itemData);

      expect(result).toEqual(savedItem);
      expect(mockCpoItemRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          cpoId: 1,
          companyId: COMPANY_ID,
          itemCode: "PIPE-002",
          quantityOrdered: 3,
          quantityFulfilled: 0,
          sortOrder: 3,
        }),
      );
      expect(mockCpoRepo.update).toHaveBeenCalledWith(1, {
        totalItems: 2,
        totalQuantity: 13,
      });
    });

    it("throws NotFoundException when CPO not found", async () => {
      mockCpoRepo.findOne.mockResolvedValue(null);

      await expect(service.addCpoItem(COMPANY_ID, 999, { itemCode: "X" })).rejects.toThrow(
        NotFoundException,
      );
    });

    it("defaults quantity to 0 when not provided", async () => {
      const cpo = makeCpo({ items: [] });
      mockCpoRepo.findOne.mockResolvedValue(cpo);
      mockCpoItemRepo.save.mockResolvedValue({ id: 5 });

      await service.addCpoItem(COMPANY_ID, 1, { itemCode: "PIPE-003" });

      expect(mockCpoItemRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ quantityOrdered: 0 }),
      );
      expect(mockCpoRepo.update).toHaveBeenCalledWith(1, {
        totalItems: 1,
        totalQuantity: 10,
      });
    });
  });

  describe("updateCpoItem", () => {
    it("updates item fields and recalculates quantity when changed", async () => {
      const item = makeCpoItem({ quantityOrdered: 5 });
      mockCpoItemRepo.findOne.mockResolvedValue(item);
      mockCpoItemRepo.save.mockResolvedValue({ ...item, quantityOrdered: 8, itemCode: "PIPE-NEW" });

      const cpo = makeCpo({ totalQuantity: 10 });
      mockCpoRepo.findOne.mockResolvedValue(cpo);

      const result = await service.updateCpoItem(COMPANY_ID, 1, 1, {
        itemCode: "PIPE-NEW",
        quantityOrdered: 8,
      });

      expect(result.quantityOrdered).toBe(8);
      expect(mockCpoRepo.update).toHaveBeenCalledWith(1, {
        totalQuantity: 13,
      });
    });

    it("does not update CPO quantity when quantity unchanged", async () => {
      const item = makeCpoItem({ quantityOrdered: 5 });
      mockCpoItemRepo.findOne.mockResolvedValue(item);
      mockCpoItemRepo.save.mockResolvedValue({ ...item, itemCode: "PIPE-UPD" });

      await service.updateCpoItem(COMPANY_ID, 1, 1, { itemCode: "PIPE-UPD" });

      expect(mockCpoRepo.update).not.toHaveBeenCalled();
    });

    it("throws NotFoundException when item not found", async () => {
      mockCpoItemRepo.findOne.mockResolvedValue(null);

      await expect(service.updateCpoItem(COMPANY_ID, 1, 999, { itemCode: "X" })).rejects.toThrow(
        NotFoundException,
      );
    });

    it("clamps totalQuantity to zero minimum", async () => {
      const item = makeCpoItem({ quantityOrdered: 20 });
      mockCpoItemRepo.findOne.mockResolvedValue(item);
      mockCpoItemRepo.save.mockResolvedValue({ ...item, quantityOrdered: 1 });

      const cpo = makeCpo({ totalQuantity: 5 });
      mockCpoRepo.findOne.mockResolvedValue(cpo);

      await service.updateCpoItem(COMPANY_ID, 1, 1, { quantityOrdered: 1 });

      expect(mockCpoRepo.update).toHaveBeenCalledWith(1, {
        totalQuantity: 0,
      });
    });
  });

  describe("deleteCpoItem", () => {
    it("removes item and recalculates CPO totals", async () => {
      const item = makeCpoItem({ quantityOrdered: 3 });
      mockCpoItemRepo.findOne.mockResolvedValue(item);

      const remainingItems = [makeCpoItem({ id: 2 })];
      const cpo = makeCpo({ totalQuantity: 10, items: remainingItems });
      mockCpoRepo.findOne.mockResolvedValue(cpo);

      await service.deleteCpoItem(COMPANY_ID, 1, 1);

      expect(mockCpoItemRepo.remove).toHaveBeenCalledWith(item);
      expect(mockCpoRepo.update).toHaveBeenCalledWith(1, {
        totalItems: 1,
        totalQuantity: 7,
      });
    });

    it("throws NotFoundException when item not found", async () => {
      mockCpoItemRepo.findOne.mockResolvedValue(null);

      await expect(service.deleteCpoItem(COMPANY_ID, 1, 999)).rejects.toThrow(NotFoundException);
    });

    it("clamps totalQuantity to zero when removing large-qty item", async () => {
      const item = makeCpoItem({ quantityOrdered: 50 });
      mockCpoItemRepo.findOne.mockResolvedValue(item);

      const cpo = makeCpo({ totalQuantity: 10, items: [] });
      mockCpoRepo.findOne.mockResolvedValue(cpo);

      await service.deleteCpoItem(COMPANY_ID, 1, 1);

      expect(mockCpoRepo.update).toHaveBeenCalledWith(1, {
        totalItems: 0,
        totalQuantity: 0,
      });
    });
  });

  describe("deleteCpo", () => {
    it("deletes CPO when found", async () => {
      const cpo = makeCpo();
      mockCpoRepo.findOne.mockResolvedValue(cpo);

      await service.deleteCpo(COMPANY_ID, 1);

      expect(mockCpoRepo.remove).toHaveBeenCalledWith(cpo);
    });

    it("throws NotFoundException when CPO not found", async () => {
      mockCpoRepo.findOne.mockResolvedValue(null);

      await expect(service.deleteCpo(COMPANY_ID, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("updateStatus", () => {
    it("transitions CPO status and returns updated entity", async () => {
      const cpo = makeCpo();
      mockCpoRepo.findOne.mockResolvedValue(cpo);
      mockCpoRepo.save.mockResolvedValue({ ...cpo, status: CpoStatus.FULFILLED });

      const result = await service.updateStatus(COMPANY_ID, 1, CpoStatus.FULFILLED);

      expect(result.status).toBe(CpoStatus.FULFILLED);
      expect(mockCpoRepo.save).toHaveBeenCalled();
    });

    it("throws NotFoundException when CPO not found", async () => {
      mockCpoRepo.findOne.mockResolvedValue(null);

      await expect(service.updateStatus(COMPANY_ID, 999, CpoStatus.CANCELLED)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("updateCalloffStatus", () => {
    it("updates calloff record status to CALLED_OFF and sets calledOffAt", async () => {
      const record = makeCalloffRecord();
      mockCalloffRepo.findOne.mockResolvedValue(record);
      mockCalloffRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.updateCalloffStatus(COMPANY_ID, 1, CalloffStatus.CALLED_OFF);

      expect(result.status).toBe(CalloffStatus.CALLED_OFF);
      expect(result.calledOffAt).toBeTruthy();
    });

    it("updates calloff record status to DELIVERED and sets deliveredAt", async () => {
      const record = makeCalloffRecord({ status: CalloffStatus.CALLED_OFF });
      mockCalloffRepo.findOne.mockResolvedValue(record);
      mockCalloffRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.updateCalloffStatus(COMPANY_ID, 1, CalloffStatus.DELIVERED);

      expect(result.status).toBe(CalloffStatus.DELIVERED);
      expect(result.deliveredAt).toBeTruthy();
    });

    it("updates calloff record status to INVOICED and sets invoicedAt", async () => {
      const record = makeCalloffRecord({ status: CalloffStatus.DELIVERED });
      mockCalloffRepo.findOne.mockResolvedValue(record);
      mockCalloffRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.updateCalloffStatus(COMPANY_ID, 1, CalloffStatus.INVOICED);

      expect(result.status).toBe(CalloffStatus.INVOICED);
      expect(result.invoicedAt).toBeTruthy();
    });

    it("does not overwrite existing calledOffAt timestamp", async () => {
      const existingDate = new Date("2025-06-01");
      const record = makeCalloffRecord({
        status: CalloffStatus.PENDING,
        calledOffAt: existingDate,
      });
      mockCalloffRepo.findOne.mockResolvedValue(record);
      mockCalloffRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.updateCalloffStatus(COMPANY_ID, 1, CalloffStatus.CALLED_OFF);

      expect(result.calledOffAt).toBe(existingDate);
    });

    it("throws NotFoundException when record not found", async () => {
      mockCalloffRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateCalloffStatus(COMPANY_ID, 999, CalloffStatus.DELIVERED),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("calloffRecordsForCpo", () => {
    it("returns filtered calloff records excluding non-paint for external-only jobs", async () => {
      const records = [
        makeCalloffRecord({ id: 1, jobCardId: 10, calloffType: CalloffType.PAINT }),
        makeCalloffRecord({ id: 2, jobCardId: 10, calloffType: CalloffType.RUBBER }),
      ];
      mockCalloffRepo.find.mockResolvedValue(records);
      mockCoatingAnalysisService.findByJobCard.mockResolvedValue({
        hasInternalLining: false,
        coats: [],
      });

      const result = await service.calloffRecordsForCpo(COMPANY_ID, 1);

      expect(result).toHaveLength(1);
      expect(result[0].calloffType).toBe(CalloffType.PAINT);
    });

    it("returns all calloff records when job has internal lining", async () => {
      const records = [
        makeCalloffRecord({ id: 1, jobCardId: 10, calloffType: CalloffType.PAINT }),
        makeCalloffRecord({ id: 2, jobCardId: 10, calloffType: CalloffType.RUBBER }),
        makeCalloffRecord({ id: 3, jobCardId: 10, calloffType: CalloffType.SOLUTION }),
      ];
      mockCalloffRepo.find.mockResolvedValue(records);
      mockCoatingAnalysisService.findByJobCard.mockResolvedValue({
        hasInternalLining: true,
        coats: [],
      });

      const result = await service.calloffRecordsForCpo(COMPANY_ID, 1);

      expect(result).toHaveLength(3);
    });

    it("returns empty array when no records exist", async () => {
      mockCalloffRepo.find.mockResolvedValue([]);

      const result = await service.calloffRecordsForCpo(COMPANY_ID, 1);

      expect(result).toEqual([]);
    });

    it("includes records with null jobCardId regardless of analysis", async () => {
      const records = [
        makeCalloffRecord({ id: 1, jobCardId: null, calloffType: CalloffType.RUBBER }),
      ];
      mockCalloffRepo.find.mockResolvedValue(records);

      const result = await service.calloffRecordsForCpo(COMPANY_ID, 1);

      expect(result).toHaveLength(1);
    });
  });

  describe("overdueCalloffRecordsForCpo", () => {
    it("returns overdue delivered records awaiting invoicing", async () => {
      const overdueRecords = [
        makeCalloffRecord({
          status: CalloffStatus.DELIVERED,
          deliveredAt: new Date("2024-01-01"),
          invoicedAt: null,
        }),
      ];
      mockCalloffRepo.find.mockResolvedValue(overdueRecords);

      const result = await service.overdueCalloffRecordsForCpo(COMPANY_ID, 1);

      expect(result).toEqual(overdueRecords);
      expect(mockCalloffRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            cpoId: 1,
            companyId: COMPANY_ID,
            status: CalloffStatus.DELIVERED,
          }),
          relations: ["jobCard"],
        }),
      );
    });

    it("returns empty array when no overdue records exist", async () => {
      mockCalloffRepo.find.mockResolvedValue([]);

      const result = await service.overdueCalloffRecordsForCpo(COMPANY_ID, 1);

      expect(result).toEqual([]);
    });
  });

  describe("exportCsv", () => {
    it("returns CSV string with headers and item rows", async () => {
      const item1 = makeCpoItem({
        itemCode: "PIPE-001",
        itemDescription: "Steel Pipe",
        quantityOrdered: 10,
        quantityFulfilled: 5,
      });
      const item2 = makeCpoItem({
        id: 2,
        itemCode: "PIPE-002",
        itemDescription: "Copper Pipe",
        quantityOrdered: 20,
        quantityFulfilled: 20,
      });
      const cpo = makeCpo({ items: [item1, item2] });
      mockCpoRepo.find.mockResolvedValue([cpo]);
      mockCalloffRepo.find.mockResolvedValue([]);

      const result = await service.exportCsv(COMPANY_ID);

      const lines = result.split("\n");
      expect(lines[0]).toContain("CPO Number");
      expect(lines[0]).toContain("Item Code");
      expect(lines[0]).toContain("% Complete");
      expect(lines).toHaveLength(3);
      expect(lines[1]).toContain("PIPE-001");
      expect(lines[2]).toContain("PIPE-002");
    });

    it("returns header-only row for CPO with no items", async () => {
      const cpo = makeCpo({ items: [] });
      mockCpoRepo.find.mockResolvedValue([cpo]);
      mockCalloffRepo.find.mockResolvedValue([]);

      const result = await service.exportCsv(COMPANY_ID);

      const lines = result.split("\n");
      expect(lines).toHaveLength(2);
      expect(lines[1]).toContain("CPO-JOB001");
    });

    it("includes calloff statuses when available", async () => {
      const cpo = makeCpo({ items: [makeCpoItem()] });
      mockCpoRepo.find.mockResolvedValue([cpo]);
      mockCalloffRepo.find.mockResolvedValue([
        makeCalloffRecord({
          cpoId: 1,
          calloffType: CalloffType.PAINT,
          status: CalloffStatus.DELIVERED,
        }),
        makeCalloffRecord({
          id: 2,
          cpoId: 1,
          calloffType: CalloffType.RUBBER,
          status: CalloffStatus.PENDING,
        }),
      ]);

      const result = await service.exportCsv(COMPANY_ID);

      expect(result).toContain("delivered");
      expect(result).toContain("pending");
    });

    it("escapes double quotes in CSV cells", async () => {
      const item = makeCpoItem({ itemDescription: 'Steel "Premium" Pipe' });
      const cpo = makeCpo({ items: [item] });
      mockCpoRepo.find.mockResolvedValue([cpo]);
      mockCalloffRepo.find.mockResolvedValue([]);

      const result = await service.exportCsv(COMPANY_ID);

      expect(result).toContain('""Premium""');
    });

    it("returns only headers when no CPOs exist", async () => {
      mockCpoRepo.find.mockResolvedValue([]);
      mockCalloffRepo.find.mockResolvedValue([]);

      const result = await service.exportCsv(COMPANY_ID);

      const lines = result.split("\n");
      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain("CPO Number");
    });
  });

  describe("createFromImportRows", () => {
    it("creates a new CPO from valid import row", async () => {
      mockCpoRepo.findOne.mockResolvedValue(null);
      const savedCpo = makeCpo({ id: 42 });
      mockCpoRepo.save.mockResolvedValue(savedCpo);
      mockCpoItemRepo.save.mockResolvedValue([]);

      const rows = [
        {
          jobNumber: "JOB001",
          jobName: "Test Job",
          customerName: "Example Corp",
          lineItems: [{ itemCode: "PIPE-001", itemDescription: "Steel Pipe", quantity: "5" }],
        },
      ];

      const result = await service.createFromImportRows(COMPANY_ID, rows, "admin");

      expect(result.created).toBe(1);
      expect(result.createdCpoIds).toContain(42);
      expect(result.errors).toHaveLength(0);
      expect(mockCpoRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: COMPANY_ID,
          cpoNumber: "CPO-JOB001",
          jobNumber: "JOB001",
          status: CpoStatus.ACTIVE,
        }),
      );
    });

    it("returns error for rows missing jobNumber", async () => {
      const rows = [{ jobName: "No Number" }];

      const result = await service.createFromImportRows(COMPANY_ID, rows as any, "admin");

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain("Job Number and Job Name are required");
      expect(result.created).toBe(0);
    });

    it("returns error for rows missing jobName", async () => {
      const rows = [{ jobNumber: "JOB001" }];

      const result = await service.createFromImportRows(COMPANY_ID, rows as any, "admin");

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].row).toBe(1);
    });

    it("generates CPO number with jcNumber suffix when present", async () => {
      mockCpoRepo.findOne.mockResolvedValue(null);
      mockCpoRepo.save.mockResolvedValue(makeCpo({ id: 50, cpoNumber: "CPO-JOB001-JC01" }));

      const rows = [{ jobNumber: "JOB001", jcNumber: "JC01", jobName: "Test" }];

      await service.createFromImportRows(COMPANY_ID, rows, "admin");

      expect(mockCpoRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ cpoNumber: "CPO-JOB001-JC01" }),
      );
    });

    it("archives and overwrites existing CPO on re-import", async () => {
      const existingCpo = makeCpo({
        id: 10,
        items: [makeCpoItem()],
        versionNumber: 1,
        previousVersions: [],
      });
      mockCpoRepo.findOne.mockResolvedValue(existingCpo);
      mockCpoRepo.save.mockResolvedValue({ ...existingCpo, versionNumber: 2, id: 10 });
      mockCpoItemRepo.delete.mockResolvedValue({ affected: 1 });
      mockCpoItemRepo.save.mockResolvedValue([]);

      const rows = [
        {
          jobNumber: "JOB001",
          jobName: "Updated Job",
          customerName: "New Customer",
          lineItems: [{ itemCode: "PIPE-NEW", itemDescription: "New Pipe", quantity: "15" }],
        },
      ];

      const result = await service.createFromImportRows(COMPANY_ID, rows, "admin");

      expect(result.updated).toBe(1);
      expect(result.createdCpoIds).toContain(10);
    });

    it("reports totalRows correctly across multiple rows", async () => {
      mockCpoRepo.findOne.mockResolvedValue(null);
      mockCpoRepo.save
        .mockResolvedValueOnce(makeCpo({ id: 1 }))
        .mockResolvedValueOnce(makeCpo({ id: 2 }));

      const rows = [
        { jobNumber: "JOB001", jobName: "Job A", lineItems: [] },
        { jobNumber: "JOB002", jobName: "Job B", lineItems: [] },
      ];

      const result = await service.createFromImportRows(COMPANY_ID, rows, "admin");

      expect(result.totalRows).toBe(2);
      expect(result.created).toBe(2);
    });
  });

  describe("matchJobCardToCpo", () => {
    it("returns no match when job card not found", async () => {
      mockJobCardRepo.findOne.mockResolvedValue(null);

      const result = await service.matchJobCardToCpo(COMPANY_ID, 999);

      expect(result.matched).toBe(false);
      expect(result.cpoId).toBeNull();
      expect(result.matchedItems).toBe(0);
    });

    it("returns no match when no CPOs exist for job number", async () => {
      const jc = makeJobCard({ lineItems: [] });
      mockJobCardRepo.findOne.mockResolvedValue(jc);
      mockCpoRepo.find.mockResolvedValue([]);

      const result = await service.matchJobCardToCpo(COMPANY_ID, 10);

      expect(result.matched).toBe(false);
    });

    it("matches job card to CPO by itemCode", async () => {
      const jcLineItems = [
        { id: 100, itemCode: "PIPE-001", itemDescription: null, quantity: 3 },
      ] as unknown as JobCardLineItem[];

      const jc = makeJobCard({ lineItems: jcLineItems });
      mockJobCardRepo.findOne.mockResolvedValue(jc);

      const cpoItems = [
        makeCpoItem({ id: 50, itemCode: "PIPE-001", quantityOrdered: 10, quantityFulfilled: 0 }),
      ];
      const cpo = makeCpo({ id: 5, items: cpoItems });
      mockCpoRepo.find.mockResolvedValue([cpo]);
      mockCpoRepo.findOne.mockResolvedValue({
        ...cpo,
        items: cpoItems.map((i) => ({ ...i, quantityFulfilled: 3 })),
      });

      const result = await service.matchJobCardToCpo(COMPANY_ID, 10);

      expect(result.matched).toBe(true);
      expect(result.cpoId).toBe(5);
      expect(result.matchedItems).toBe(1);
      expect(mockJobCardRepo.update).toHaveBeenCalledWith(10, {
        cpoId: 5,
        isCpoCalloff: true,
      });
    });

    it("matches job card to CPO by itemDescription when no itemCode", async () => {
      const jcLineItems = [
        { id: 101, itemCode: null, itemDescription: "Steel Pipe 6 inch", quantity: 2 },
      ] as unknown as JobCardLineItem[];

      const jc = makeJobCard({ lineItems: jcLineItems });
      mockJobCardRepo.findOne.mockResolvedValue(jc);

      const cpoItems = [
        makeCpoItem({
          id: 60,
          itemCode: null,
          itemDescription: "Steel Pipe 6 inch",
          quantityOrdered: 10,
          quantityFulfilled: 0,
        }),
      ];
      const cpo = makeCpo({ id: 6, items: cpoItems });
      mockCpoRepo.find.mockResolvedValue([cpo]);
      mockCpoRepo.findOne.mockResolvedValue({
        ...cpo,
        items: cpoItems.map((i) => ({ ...i, quantityFulfilled: 2 })),
      });

      const result = await service.matchJobCardToCpo(COMPANY_ID, 10);

      expect(result.matched).toBe(true);
      expect(result.cpoId).toBe(6);
      expect(result.matchedItems).toBe(1);
    });

    it("returns no match when line items do not correspond to CPO items", async () => {
      const jcLineItems = [
        { id: 102, itemCode: "VALVE-999", itemDescription: "Unknown Valve", quantity: 1 },
      ] as unknown as JobCardLineItem[];

      const jc = makeJobCard({ lineItems: jcLineItems });
      mockJobCardRepo.findOne.mockResolvedValue(jc);

      const cpoItems = [
        makeCpoItem({ id: 70, itemCode: "PIPE-001", itemDescription: "Steel Pipe" }),
      ];
      const cpo = makeCpo({ id: 7, items: cpoItems });
      mockCpoRepo.find.mockResolvedValue([cpo]);

      const result = await service.matchJobCardToCpo(COMPANY_ID, 10);

      expect(result.matched).toBe(false);
    });

    it("sets CPO status to FULFILLED when total quantity met", async () => {
      const jcLineItems = [
        { id: 103, itemCode: "PIPE-001", itemDescription: null, quantity: 10 },
      ] as unknown as JobCardLineItem[];

      const jc = makeJobCard({ lineItems: jcLineItems });
      mockJobCardRepo.findOne.mockResolvedValue(jc);

      const cpoItems = [
        makeCpoItem({ id: 80, itemCode: "PIPE-001", quantityOrdered: 10, quantityFulfilled: 0 }),
      ];
      const cpo = makeCpo({ id: 8, totalQuantity: 10, items: cpoItems });
      mockCpoRepo.find.mockResolvedValue([cpo]);

      const updatedCpo = {
        ...cpo,
        items: [{ ...cpoItems[0], quantityFulfilled: 10 }],
      };
      mockCpoRepo.findOne.mockResolvedValue(updatedCpo);

      await service.matchJobCardToCpo(COMPANY_ID, 10);

      expect(mockCpoRepo.update).toHaveBeenCalledWith(
        8,
        expect.objectContaining({ status: CpoStatus.FULFILLED }),
      );
    });
  });
});
