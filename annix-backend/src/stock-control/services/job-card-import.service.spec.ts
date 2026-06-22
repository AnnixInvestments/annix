import { Test, TestingModule } from "@nestjs/testing";
import { ExtractionMetricService } from "../../metrics/extraction-metric.service";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { NixLearningRepository } from "../../nix/nix-learning.repository";
import { STORAGE_SERVICE } from "../../storage/storage.interface";
import { JobCardStatus } from "../entities/job-card.entity";
import { QcMeasurementService } from "../qc/services/qc-measurement.service";
import { CustomerPurchaseOrderItemRepository } from "../repositories/customer-purchase-order-item.repository";
import { JobCardRepository } from "../repositories/job-card.repository";
import { JobCardExtractionCorrectionRepository } from "../repositories/job-card-extraction-correction.repository";
import { JobCardImportMappingRepository } from "../repositories/job-card-import-mapping.repository";
import { JobCardLineItemRepository } from "../repositories/job-card-line-item.repository";
import { CpoService } from "./cpo.service";
import { DrawingExtractionService } from "./drawing-extraction.service";
import { JobCardImportRow, JobCardImportService } from "./job-card-import.service";
import { JobCardVersionService } from "./job-card-version.service";
import { M2CalculationService } from "./m2-calculation.service";

describe("JobCardImportService", () => {
  let service: JobCardImportService;

  const jobCardFindOne = jest.fn();
  const jobCardFind = jest.fn();
  const mockJobCardRepo = {
    findOne: jobCardFindOne,
    findOneForCompany: jobCardFindOne,
    findById: jobCardFindOne,
    find: jobCardFind,
    findChildJobCardsByJobNumber: jobCardFind,
    findActiveByJobAndJcNumber: jest.fn().mockResolvedValue([]),
    findDeliveryJobCards: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((data) => Promise.resolve({ id: 1, ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    saveForCompany: jest
      .fn()
      .mockImplementation((_companyId, entity) => Promise.resolve({ id: 1, ...entity })),
  };

  const mockM2CalculationService = {
    calculateM2ForItems: jest.fn().mockResolvedValue([]),
  };

  const lineItemFind = jest.fn().mockResolvedValue([]);
  const lineItemSave = jest.fn().mockImplementation((entity) => Promise.resolve(entity));
  const mockLineItemRepo = {
    find: lineItemFind,
    findForJobCardAndCompany: lineItemFind,
    findForJobCardOrderedBySort: lineItemFind,
    findOne: jest.fn(),
    findOneByIdAndJobCard: jest.fn(),
    countForJobCard: jest.fn().mockResolvedValue(0),
    save: lineItemSave,
    saveMany: lineItemSave,
    buildMany: jest.fn().mockImplementation((rows) => rows.map((r: object) => ({ ...r }))),
    deleteForJobCard: jest.fn().mockResolvedValue(undefined),
  };

  const mockMappingRepo = {
    findForCompany: jest.fn(),
    create: jest.fn().mockImplementation((data) => Promise.resolve({ id: 1, ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    saveForCompany: jest
      .fn()
      .mockImplementation((_companyId, entity) => Promise.resolve({ id: 1, ...entity })),
  };

  const mockCpoItemRepo = {
    findForCpoOrdered: jest.fn().mockResolvedValue([]),
    findOneForCpo: jest.fn(),
    updateById: jest.fn(),
  };

  const mockCorrectionRepo = {
    findRecentForCompany: jest.fn().mockResolvedValue([]),
  };

  const mockAiChatService = {
    chat: jest.fn(),
    chatWithImage: jest.fn(),
  };

  const mockNixLearningRepo = {
    findActiveCorrectionsByCategoryTopByConfidence: jest.fn().mockResolvedValue([]),
    findActiveCorrectionByPatternKeyAndCategory: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation((data) => Promise.resolve({ id: 1, ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
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
        { provide: JobCardRepository, useValue: mockJobCardRepo },
        { provide: JobCardLineItemRepository, useValue: mockLineItemRepo },
        { provide: JobCardImportMappingRepository, useValue: mockMappingRepo },
        { provide: CustomerPurchaseOrderItemRepository, useValue: mockCpoItemRepo },
        { provide: JobCardExtractionCorrectionRepository, useValue: mockCorrectionRepo },
        { provide: AiChatService, useValue: mockAiChatService },
        { provide: NixLearningRepository, useValue: mockNixLearningRepo },
        { provide: DrawingExtractionService, useValue: mockDrawingExtractionService },
        { provide: CpoService, useValue: mockCpoService },
        { provide: JobCardVersionService, useValue: mockVersionService },
        {
          provide: STORAGE_SERVICE,
          useValue: { download: jest.fn(), upload: jest.fn(), presignedUrl: jest.fn() },
        },
        { provide: QcMeasurementService, useValue: {} },
        {
          provide: ExtractionMetricService,
          useValue: { time: jest.fn((_c, _o, fn) => fn()) },
        },
        { provide: M2CalculationService, useValue: mockM2CalculationService },
      ],
    }).compile();

    service = module.get<JobCardImportService>(JobCardImportService);
    jest.resetAllMocks();

    mockJobCardRepo.create.mockImplementation((data) => Promise.resolve({ id: 1, ...data }));
    mockJobCardRepo.save.mockImplementation((entity) => Promise.resolve({ id: 1, ...entity }));
    mockJobCardRepo.saveForCompany.mockImplementation((_companyId, entity) =>
      Promise.resolve({ id: 1, ...entity }),
    );
    mockJobCardRepo.findActiveByJobAndJcNumber.mockResolvedValue([]);
    mockJobCardRepo.findDeliveryJobCards.mockResolvedValue([]);
    mockM2CalculationService.calculateM2ForItems.mockResolvedValue([]);
    lineItemFind.mockResolvedValue([]);
    lineItemSave.mockImplementation((entity) => Promise.resolve(entity));
    mockLineItemRepo.buildMany.mockImplementation((rows) => rows.map((r: object) => ({ ...r })));
    mockLineItemRepo.countForJobCard.mockResolvedValue(0);
    mockLineItemRepo.deleteForJobCard.mockResolvedValue(undefined);
    mockMappingRepo.create.mockImplementation((data) => Promise.resolve({ id: 1, ...data }));
    mockMappingRepo.save.mockImplementation((entity) => Promise.resolve({ id: 1, ...entity }));
    mockMappingRepo.saveForCompany.mockImplementation((_companyId, entity) =>
      Promise.resolve({ id: 1, ...entity }),
    );
    mockNixLearningRepo.findActiveCorrectionsByCategoryTopByConfidence.mockResolvedValue([]);
    mockNixLearningRepo.findActiveCorrectionByPatternKeyAndCategory.mockResolvedValue(null);
    mockNixLearningRepo.create.mockImplementation((data) => Promise.resolve({ id: 1, ...data }));
    mockNixLearningRepo.save.mockImplementation((entity) => Promise.resolve(entity));
    mockCpoItemRepo.findForCpoOrdered.mockResolvedValue([]);
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
      mockJobCardRepo.create.mockResolvedValue({ id: 10, jobNumber: "JOB-001" });

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
      mockJobCardRepo.saveForCompany.mockResolvedValue({
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
      mockJobCardRepo.saveForCompany.mockImplementation((_companyId, entity) =>
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
      mockMappingRepo.findForCompany.mockResolvedValue(null);

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
      mockMappingRepo.findForCompany.mockResolvedValue(existing);

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

      expect(mockMappingRepo.saveForCompany).toHaveBeenCalledWith(
        1,
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

      expect(mockCpoItemRepo.updateById).not.toHaveBeenCalled();
    });
  });
});
