import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { STORAGE_SERVICE } from "../../storage/storage.interface";
import { CustomerPurchaseOrderItem } from "../entities/customer-purchase-order-item.entity";
import { JobCard, JobCardStatus } from "../entities/job-card.entity";
import { JobCardExtractionCorrection } from "../entities/job-card-extraction-correction.entity";
import { JobCardImportMapping } from "../entities/job-card-import-mapping.entity";
import { JobCardLineItem } from "../entities/job-card-line-item.entity";
import { QcMeasurementService } from "../qc/services/qc-measurement.service";
import { CpoService } from "./cpo.service";
import { DrawingExtractionService } from "./drawing-extraction.service";
import { JobCardImportRow, JobCardImportService } from "./job-card-import.service";
import { JobCardVersionService } from "./job-card-version.service";

describe("JobCardImportService", () => {
  let service: JobCardImportService;

  const mockJobCardRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
  };

  const mockLineItemRepo = {
    find: jest.fn().mockResolvedValue([]),
    save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    create: jest
      .fn()
      .mockImplementation((data) =>
        Array.isArray(data) ? data.map((d) => ({ ...d })) : { ...data },
      ),
    delete: jest.fn().mockResolvedValue({ affected: 0 }),
  };

  const mockMappingRepo = {
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
  };

  const mockCpoItemRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockCorrectionRepo = {
    find: jest.fn().mockResolvedValue([]),
  };

  const mockAiChatService = {
    chat: jest.fn(),
    chatWithImage: jest.fn(),
  };

  const mockDrawingExtractionService = {
    extractFromPdfBuffers: jest.fn(),
  };

  const mockCpoService = {
    matchJobCardToCpo: jest.fn().mockResolvedValue(null),
    findById: jest.fn(),
    updateStatus: jest.fn(),
  };

  const mockVersionService = {
    archiveCurrentVersion: jest.fn(),
    resetWorkflow: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobCardImportService,
        { provide: getRepositoryToken(JobCard), useValue: mockJobCardRepo },
        { provide: getRepositoryToken(JobCardLineItem), useValue: mockLineItemRepo },
        { provide: getRepositoryToken(JobCardImportMapping), useValue: mockMappingRepo },
        { provide: getRepositoryToken(CustomerPurchaseOrderItem), useValue: mockCpoItemRepo },
        { provide: getRepositoryToken(JobCardExtractionCorrection), useValue: mockCorrectionRepo },
        { provide: AiChatService, useValue: mockAiChatService },
        { provide: DrawingExtractionService, useValue: mockDrawingExtractionService },
        { provide: CpoService, useValue: mockCpoService },
        { provide: JobCardVersionService, useValue: mockVersionService },
        {
          provide: STORAGE_SERVICE,
          useValue: { download: jest.fn(), upload: jest.fn(), presignedUrl: jest.fn() },
        },
        { provide: QcMeasurementService, useValue: {} },
      ],
    }).compile();

    service = module.get<JobCardImportService>(JobCardImportService);
    jest.resetAllMocks();

    mockJobCardRepo.create.mockImplementation((data) => ({ ...data }));
    mockJobCardRepo.save.mockImplementation((entity) => Promise.resolve({ id: 1, ...entity }));
    mockLineItemRepo.find.mockResolvedValue([]);
    mockLineItemRepo.save.mockImplementation((entity) => Promise.resolve(entity));
    mockLineItemRepo.create.mockImplementation((data) =>
      Array.isArray(data) ? data.map((d) => ({ ...d })) : { ...data },
    );
    mockLineItemRepo.delete.mockResolvedValue({ affected: 0 });
    mockMappingRepo.create.mockImplementation((data) => ({ ...data }));
    mockMappingRepo.save.mockImplementation((entity) => Promise.resolve({ id: 1, ...entity }));
    mockCpoItemRepo.find.mockResolvedValue([]);
    mockCpoService.matchJobCardToCpo.mockResolvedValue(null);
    mockVersionService.archiveCurrentVersion.mockResolvedValue(null);
    mockVersionService.resetWorkflow.mockResolvedValue(null);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("importJobCards", () => {
    it("creates a new job card when none exists with same job number", async () => {
      mockJobCardRepo.findOne.mockResolvedValue(null);
      mockJobCardRepo.save.mockResolvedValue({ id: 10, jobNumber: "JOB-001" });

      const rows: JobCardImportRow[] = [
        {
          jobNumber: "JOB-001",
          jobName: "Test Job",
          customerName: "Test Customer",
          lineItems: [{ itemCode: "IC-01", itemDescription: "Widget A", quantity: "5" }],
        },
      ];

      const result = await service.importJobCards(1, rows);

      expect(result.created).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(result.createdJobCardIds).toContain(10);
      expect(mockJobCardRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          jobNumber: "JOB-001",
          jobName: "Test Job",
          customerName: "Test Customer",
          status: JobCardStatus.DRAFT,
          companyId: 1,
        }),
      );
    });

    it("creates delivery job card when existing job and JT/DN number detected", async () => {
      const existing = {
        id: 5,
        jobNumber: "JOB-001",
        companyId: 1,
        jobName: "Parent Job",
        customerName: "Acme",
        poNumber: "PO-100",
        siteLocation: "Site A",
        contactPerson: "John",
        cpoId: null,
        parentJobCardId: null,
        lineItems: [],
      };
      mockJobCardRepo.findOne.mockResolvedValueOnce(existing).mockResolvedValueOnce(null);
      mockJobCardRepo.save.mockResolvedValue({
        id: 20,
        jobNumber: "JOB-001",
        jtDnNumber: "JT-100",
      });

      const rows: JobCardImportRow[] = [
        {
          jobNumber: "JOB-001",
          jcNumber: "JT-100",
          jobName: "Delivery Batch",
          lineItems: [],
        },
      ];

      const result = await service.importJobCards(1, rows);

      expect(result.created).toBe(1);
    });

    it("reports error for rows missing jobNumber or jobName", async () => {
      const rows: JobCardImportRow[] = [{ jobNumber: "", jobName: "" }, { jobNumber: "JOB-002" }];

      const result = await service.importJobCards(1, rows);

      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].message).toContain("Job Number and Job Name are required");
    });

    it("handles multiple rows with mixed create and update", async () => {
      mockJobCardRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: 5,
        jobNumber: "JOB-002",
        companyId: 1,
        jobName: "Old Job",
        versionNumber: 1,
        parentJobCardId: null,
        lineItems: [],
      });
      mockJobCardRepo.save.mockImplementation((entity) =>
        Promise.resolve({ ...entity, id: entity.id || 10 }),
      );
      mockVersionService.archiveCurrentVersion.mockResolvedValue(null);
      mockVersionService.resetWorkflow.mockResolvedValue(null);

      const rows: JobCardImportRow[] = [
        { jobNumber: "JOB-001", jobName: "New Job" },
        { jobNumber: "JOB-002", jobName: "Updated Job" },
      ];

      const result = await service.importJobCards(1, rows);

      expect(result.errors).toHaveLength(0);
      expect(result.totalRows).toBe(2);
      expect(result.created + result.updated).toBe(2);
    });
  });

  describe("parseFile - Excel", () => {
    it("parses xlsx buffer into grid", async () => {
      const xlsx = await import("xlsx");
      const workbook = xlsx.utils.book_new();
      const data = [
        ["Job Number", "Job Name", "Qty"],
        ["JOB-001", "Test Job", "5"],
      ];
      const worksheet = xlsx.utils.aoa_to_sheet(data);
      xlsx.utils.book_append_sheet(workbook, worksheet, "Sheet1");
      const buffer = Buffer.from(xlsx.write(workbook, { type: "buffer", bookType: "xlsx" }));

      const result = await service.parseFile(
        buffer,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "test.xlsx",
      );

      expect(result.grid).toHaveLength(2);
      expect(result.grid[0]).toContain("Job Number");
      expect(result.grid[1]).toContain("JOB-001");
    });

    it("returns empty grid for unsupported mime type", async () => {
      const result = await service.parseFile(Buffer.from("test"), "text/plain", "test.txt");

      expect(result.grid).toEqual([]);
    });
  });

  describe("autoDetectMapping", () => {
    it("calls AI and converts response to mapping config", async () => {
      const aiMapping = {
        jobNumber: { column: 0, row: 1 },
        jobName: { column: 1, row: 1 },
        customerName: { column: 2, row: 1 },
        lineItemsStartRow: 3,
        lineItemsEndRow: 10,
        lineItems: {
          itemCode: { column: 0 },
          itemDescription: { column: 1 },
          quantity: { column: 2 },
        },
      };

      mockAiChatService.chat.mockResolvedValue({
        content: JSON.stringify(aiMapping),
      });

      const grid = [
        ["Job Number", "Job Name", "Customer"],
        ["JOB-001", "Test Job", "Acme"],
        ["", "", ""],
        ["Code", "Description", "Qty"],
        ["IC-01", "Widget A", "5"],
      ];

      const result = await service.autoDetectMapping(grid);

      expect(result.jobNumber).toEqual({ column: 0, startRow: 1, endRow: 1 });
      expect(result.jobName).toEqual({ column: 1, startRow: 1, endRow: 1 });
      expect(result.lineItems.itemCode).toEqual({ column: 0, startRow: 3, endRow: 10 });
      expect(result.lineItems.itemDescription).toEqual({ column: 1, startRow: 3, endRow: 10 });
    });

    it("returns default mapping when AI fails", async () => {
      mockAiChatService.chat.mockRejectedValue(new Error("AI unavailable"));

      const result = await service.autoDetectMapping([["Header1"], ["Value1"]]);

      expect(result.jobNumber).toBeNull();
      expect(result.jobName).toBeNull();
      expect(result.lineItems.itemCode).toBeNull();
    });

    it("returns default mapping when AI returns no JSON", async () => {
      mockAiChatService.chat.mockResolvedValue({
        content: "I cannot understand this grid",
      });

      const result = await service.autoDetectMapping([["Header1"], ["Value1"]]);

      expect(result.jobNumber).toBeNull();
    });
  });

  describe("saveMapping and mapping", () => {
    it("creates new mapping when none exists", async () => {
      mockMappingRepo.findOne.mockResolvedValue(null);

      const config = {
        jobNumber: { column: 0, startRow: 0, endRow: 0 },
        jobName: null,
        jcNumber: null,
        pageNumber: null,
        customerName: null,
        description: null,
        poNumber: null,
        siteLocation: null,
        contactPerson: null,
        dueDate: null,
        notes: null,
        reference: null,
        customFields: [],
        lineItems: {
          itemCode: null,
          itemDescription: null,
          itemNo: null,
          quantity: null,
          jtNo: null,
        },
      };

      await service.saveMapping(1, config);

      expect(mockMappingRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: 1, mappingConfig: config }),
      );
    });

    it("updates existing mapping", async () => {
      const existing = { id: 5, companyId: 1, mappingConfig: {} };
      mockMappingRepo.findOne.mockResolvedValue(existing);

      const config = {
        jobNumber: { column: 1, startRow: 0, endRow: 0 },
        jobName: null,
        jcNumber: null,
        pageNumber: null,
        customerName: null,
        description: null,
        poNumber: null,
        siteLocation: null,
        contactPerson: null,
        dueDate: null,
        notes: null,
        reference: null,
        customFields: [],
        lineItems: {
          itemCode: null,
          itemDescription: null,
          itemNo: null,
          quantity: null,
          jtNo: null,
        },
      };

      await service.saveMapping(1, config);

      expect(mockMappingRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 5, mappingConfig: config }),
      );
    });
  });

  describe("line item filtering", () => {
    it("filters out footer labels like Production, Foreman Sign", async () => {
      mockJobCardRepo.findOne.mockResolvedValue(null);

      const rows: JobCardImportRow[] = [
        {
          jobNumber: "JOB-001",
          jobName: "Test",
          lineItems: [
            { itemCode: "IC-01", itemDescription: "Widget A", quantity: "5" },
            { itemCode: "Production", itemDescription: "" },
            { itemCode: "Foreman Sign", itemDescription: "" },
            { itemCode: "IC-02", itemDescription: "Widget B", quantity: "3" },
          ],
        },
      ];

      const result = await service.importJobCards(1, rows);

      expect(result.errors).toEqual([]);
      expect(result.created).toBe(1);
      const saveCall = mockLineItemRepo.save.mock.calls[0][0];
      const descriptions = saveCall.map(
        (item: { itemDescription: string }) => item.itemDescription,
      );
      expect(descriptions).toContain("Widget A");
      expect(descriptions).toContain("Widget B");
      expect(descriptions).not.toContain("");
    });

    it("merges note rows into preceding items", async () => {
      mockJobCardRepo.findOne.mockResolvedValue(null);
      mockJobCardRepo.create.mockImplementation((data) => ({ ...data }));
      mockJobCardRepo.save.mockImplementation((entity) =>
        Promise.resolve({ ...entity, id: entity.id || 10 }),
      );

      const rows: JobCardImportRow[] = [
        {
          jobNumber: "JOB-001",
          jobName: "Test",
          lineItems: [
            { itemCode: "IC-01", itemDescription: "Steel Pipe", quantity: "2" },
            { itemCode: "INT : R/L rubber lining 6mm" },
            { itemCode: "EXT : blast & paint" },
          ],
        },
      ];

      const result = await service.importJobCards(1, rows);

      expect(result.created).toBe(1);
      const saveCall = mockLineItemRepo.save.mock.calls[0][0];
      expect(saveCall).toHaveLength(1);
      expect(saveCall[0].notes).toContain("INT : R/L rubber lining 6mm");
      expect(saveCall[0].notes).toContain("EXT : blast & paint");
    });
  });

  describe("confirmDeliveryMatches", () => {
    it("does nothing when job card not found or has no CPO", async () => {
      mockJobCardRepo.findOne.mockResolvedValue(null);

      await service.confirmDeliveryMatches(1, 999, []);

      expect(mockCpoItemRepo.update).not.toHaveBeenCalled();
    });
  });
});
