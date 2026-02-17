import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SecureDocumentsService } from "../secure-documents/secure-documents.service";
import { S3StorageService } from "../storage/s3-storage.service";
import { AiExtractionService } from "./ai-providers/ai-extraction.service";
import {
  ClarificationStatus,
  ClarificationType,
  NixClarification,
  ResponseType,
} from "./entities/nix-clarification.entity";
import { DocumentType, ExtractionStatus, NixExtraction } from "./entities/nix-extraction.entity";
import { NixLearning } from "./entities/nix-learning.entity";
import { NixUserPreference } from "./entities/nix-user-preference.entity";
import { NixService } from "./nix.service";
import {
  ExcelExtractorService,
  ExtractedItem,
  ExtractionResult,
} from "./services/excel-extractor.service";
import { PdfExtractorService } from "./services/pdf-extractor.service";
import { WordExtractorService } from "./services/word-extractor.service";

describe("NixService Integration Tests", () => {
  let nixService: NixService;
  let extractionRepo: jest.Mocked<Repository<NixExtraction>>;
  let clarificationRepo: jest.Mocked<Repository<NixClarification>>;
  let learningRepo: jest.Mocked<Repository<NixLearning>>;
  let pdfExtractor: jest.Mocked<PdfExtractorService>;
  let excelExtractor: jest.Mocked<ExcelExtractorService>;
  let aiExtractor: jest.Mocked<AiExtractionService>;

  const createMockMetadata = () => ({
    projectReference: null as string | null,
    projectLocation: null as string | null,
    projectName: null as string | null,
    standard: null as string | null,
    coating: null as string | null,
    lining: null as string | null,
    materialGrade: null as string | null,
    wallThickness: null as string | null,
  });

  const createMockExtractedItem = (overrides: Partial<ExtractedItem> = {}): ExtractedItem => ({
    rowNumber: 1,
    itemNumber: "1",
    description: "200NB Pipe Carbon Steel",
    itemType: "pipe",
    material: "Carbon Steel",
    materialGrade: null,
    diameter: 200,
    diameterUnit: "mm",
    secondaryDiameter: null,
    length: null,
    wallThickness: null,
    schedule: null,
    angle: null,
    flangeConfig: null,
    quantity: 1,
    unit: "ea",
    confidence: 0.9,
    needsClarification: false,
    clarificationReason: null,
    rawData: {},
    ...overrides,
  });

  const createMockExtraction = (overrides: Partial<NixExtraction> = {}): NixExtraction =>
    ({
      id: 1,
      documentName: "test-document.pdf",
      documentPath: "/uploads/test-document.pdf",
      documentType: DocumentType.PDF,
      status: ExtractionStatus.PROCESSING,
      userId: 100,
      rfqId: null,
      extractedData: null,
      extractedItems: null,
      relevanceScore: null,
      processingTimeMs: null,
      errorMessage: null,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as NixExtraction;

  const createMockClarification = (overrides: Partial<NixClarification> = {}): NixClarification =>
    ({
      id: 1,
      extractionId: 1,
      extraction: null,
      clarificationType: ClarificationType.MISSING_INFO,
      question: "What is the material?",
      context: { field: "material", itemIndex: 0 },
      options: ["Carbon Steel", "Stainless Steel"],
      status: ClarificationStatus.PENDING,
      responseType: null,
      responseText: null,
      responseScreenshotPath: null,
      responseDocumentRef: null,
      answeredAt: null,
      createdAt: new Date(),
      ...overrides,
    }) as NixClarification;

  const createMockExtractionResult = (
    overrides: Partial<ExtractionResult> = {},
  ): ExtractionResult => ({
    sheetName: "Sheet1",
    totalRows: 10,
    items: [createMockExtractedItem()],
    clarificationsNeeded: 0,
    specificationCells: [],
    metadata: createMockMetadata(),
    ...overrides,
  });

  beforeEach(async () => {
    const mockExtractionRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };

    const mockClarificationRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
    };

    const mockLearningRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
    };

    const mockPreferenceRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const mockPdfExtractor = {
      extractFromPdf: jest.fn(),
    };

    const mockExcelExtractor = {
      extractFromExcel: jest.fn(),
    };

    const mockWordExtractor = {
      extractFromWord: jest.fn(),
    };

    const mockAiExtractor = {
      getAvailableProviders: jest.fn(),
      extractWithAi: jest.fn(),
    };

    const mockSecureDocumentsService = {};
    const mockS3StorageService = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NixService,
        { provide: getRepositoryToken(NixExtraction), useValue: mockExtractionRepo },
        { provide: getRepositoryToken(NixClarification), useValue: mockClarificationRepo },
        { provide: getRepositoryToken(NixLearning), useValue: mockLearningRepo },
        { provide: getRepositoryToken(NixUserPreference), useValue: mockPreferenceRepo },
        { provide: PdfExtractorService, useValue: mockPdfExtractor },
        { provide: ExcelExtractorService, useValue: mockExcelExtractor },
        { provide: WordExtractorService, useValue: mockWordExtractor },
        { provide: AiExtractionService, useValue: mockAiExtractor },
        { provide: SecureDocumentsService, useValue: mockSecureDocumentsService },
        { provide: S3StorageService, useValue: mockS3StorageService },
      ],
    }).compile();

    nixService = module.get<NixService>(NixService);
    extractionRepo = module.get(getRepositoryToken(NixExtraction));
    clarificationRepo = module.get(getRepositoryToken(NixClarification));
    learningRepo = module.get(getRepositoryToken(NixLearning));
    pdfExtractor = module.get(PdfExtractorService);
    excelExtractor = module.get(ExcelExtractorService);
    aiExtractor = module.get(AiExtractionService);
  });

  describe("Document Processing Pipeline - PDF", () => {
    beforeEach(() => {
      aiExtractor.getAvailableProviders.mockResolvedValue([]);
    });

    it("should process PDF document end-to-end without clarifications", async () => {
      const mockExtraction = createMockExtraction();
      extractionRepo.create.mockReturnValue(mockExtraction);
      extractionRepo.save.mockImplementation((e) => Promise.resolve(e as NixExtraction));

      pdfExtractor.extractFromPdf.mockResolvedValue({
        ...createMockExtractionResult(),
        sheetName: "PDF Document",
        items: [createMockExtractedItem({ itemNumber: "PDF-1" })],
        rawText: "Sample text",
        htmlContent: "<p>Sample</p>",
      } as any);

      const result = await nixService.processDocument({
        documentPath: "/uploads/test.pdf",
        documentName: "test.pdf",
        userId: 100,
      });

      expect(result.status).toBe(ExtractionStatus.COMPLETED);
      expect(result.items).toHaveLength(1);
      expect(result.pendingClarifications).toHaveLength(0);
      expect(extractionRepo.save).toHaveBeenCalledTimes(2);
    });

    it("should process PDF and generate clarifications for items needing them", async () => {
      const mockExtraction = createMockExtraction();
      const mockClarification = createMockClarification();

      extractionRepo.create.mockReturnValue(mockExtraction);
      extractionRepo.save.mockImplementation((e) => Promise.resolve(e as NixExtraction));
      clarificationRepo.create.mockReturnValue(mockClarification);
      clarificationRepo.save.mockResolvedValue(mockClarification);

      pdfExtractor.extractFromPdf.mockResolvedValue({
        ...createMockExtractionResult(),
        sheetName: "PDF Document",
        items: [
          createMockExtractedItem({ itemNumber: "PDF-1" }),
          createMockExtractedItem({
            itemNumber: "PDF-2",
            itemType: "bend",
            material: null,
            needsClarification: true,
            clarificationReason: "Material not specified",
          }),
        ],
        clarificationsNeeded: 1,
        rawText: "",
        htmlContent: "",
      } as any);

      const result = await nixService.processDocument({
        documentPath: "/uploads/test.pdf",
        documentName: "test.pdf",
        userId: 100,
      });

      expect(result.status).toBe(ExtractionStatus.NEEDS_CLARIFICATION);
      expect(result.items).toHaveLength(2);
      expect(clarificationRepo.create).toHaveBeenCalled();
    });

    it("should handle PDF extraction failure gracefully", async () => {
      const mockExtraction = createMockExtraction();
      extractionRepo.create.mockReturnValue(mockExtraction);
      extractionRepo.save.mockImplementation((e) => Promise.resolve(e as NixExtraction));

      pdfExtractor.extractFromPdf.mockRejectedValue(new Error("PDF parsing failed"));

      const result = await nixService.processDocument({
        documentPath: "/uploads/corrupt.pdf",
        documentName: "corrupt.pdf",
        userId: 100,
      });

      expect(result.status).toBe(ExtractionStatus.FAILED);
      expect(result.error).toContain("PDF parsing failed");
    });
  });

  describe("Document Processing Pipeline - Excel", () => {
    beforeEach(() => {
      aiExtractor.getAvailableProviders.mockResolvedValue([]);
    });

    it("should process Excel document end-to-end", async () => {
      const mockExtraction = createMockExtraction({
        documentType: DocumentType.EXCEL,
        documentName: "test.xlsx",
        documentPath: "/uploads/test.xlsx",
      });

      extractionRepo.create.mockReturnValue(mockExtraction);
      extractionRepo.save.mockImplementation((e) => Promise.resolve(e as NixExtraction));

      excelExtractor.extractFromExcel.mockResolvedValue({
        ...createMockExtractionResult(),
        sheetName: "BOQ",
        items: [
          createMockExtractedItem({ itemNumber: "1.1", diameter: 400, quantity: 10, unit: "m" }),
          createMockExtractedItem({
            itemNumber: "1.2",
            itemType: "bend",
            diameter: 400,
            angle: 45,
            quantity: 4,
          }),
        ],
        specificationCells: [
          {
            cellRef: "A1",
            rowNumber: 1,
            rawText: "Carbon Steel API 5L Grade B",
            parsedData: {
              materialGrade: "B",
              wallThickness: "10mm",
              lining: "None",
              externalCoating: "Primer",
              standard: "API 5L",
              schedule: "40",
            },
          },
        ],
      });

      const result = await nixService.processDocument({
        documentPath: "/uploads/test.xlsx",
        documentName: "test.xlsx",
        userId: 100,
        productTypes: ["pipe", "bend"],
      });

      expect(result.status).toBe(ExtractionStatus.COMPLETED);
      expect(result.items).toHaveLength(2);
      expect(excelExtractor.extractFromExcel).toHaveBeenCalledWith("/uploads/test.xlsx");
    });

    it("should preserve all items with confidence scores added", async () => {
      const mockExtraction = createMockExtraction({
        documentType: DocumentType.EXCEL,
      });

      extractionRepo.create.mockReturnValue(mockExtraction);
      extractionRepo.save.mockImplementation((e) => Promise.resolve(e as NixExtraction));

      excelExtractor.extractFromExcel.mockResolvedValue({
        ...createMockExtractionResult(),
        items: [
          createMockExtractedItem({ itemNumber: "1", itemType: "pipe" }),
          createMockExtractedItem({ itemNumber: "2", itemType: "unknown" }),
          createMockExtractedItem({ itemNumber: "3", itemType: "bend" }),
        ],
      });

      const result = await nixService.processDocument({
        documentPath: "/uploads/test.xlsx",
        documentName: "test.xlsx",
        userId: 100,
        productTypes: ["pipe"],
      });

      expect(result.items).toHaveLength(3);
      expect(result.items?.every((i: any) => typeof i.confidence === "number")).toBe(true);
    });

    it("should handle Excel extraction failure", async () => {
      const mockExtraction = createMockExtraction({
        documentType: DocumentType.EXCEL,
      });

      extractionRepo.create.mockReturnValue(mockExtraction);
      extractionRepo.save.mockImplementation((e) => Promise.resolve(e as NixExtraction));

      excelExtractor.extractFromExcel.mockRejectedValue(new Error("Invalid Excel format"));

      const result = await nixService.processDocument({
        documentPath: "/uploads/corrupt.xlsx",
        documentName: "corrupt.xlsx",
        userId: 100,
      });

      expect(result.status).toBe(ExtractionStatus.FAILED);
      expect(result.error).toContain("Invalid Excel format");
    });
  });

  describe("Document Processing Pipeline - Unsupported Types", () => {
    it("should fail for unsupported document types", async () => {
      const mockExtraction = createMockExtraction({
        documentType: DocumentType.CAD,
        documentName: "drawing.dwg",
      });

      extractionRepo.create.mockReturnValue(mockExtraction);
      extractionRepo.save.mockImplementation((e) => Promise.resolve(e as NixExtraction));

      const result = await nixService.processDocument({
        documentPath: "/uploads/drawing.dwg",
        documentName: "drawing.dwg",
        userId: 100,
      });

      expect(result.status).toBe(ExtractionStatus.FAILED);
      expect(result.error).toContain("Unsupported document type");
    });

    it("should detect document type from extension correctly", async () => {
      const testCases = [
        { name: "test.pdf", expectedType: DocumentType.PDF },
        { name: "test.xlsx", expectedType: DocumentType.EXCEL },
        { name: "test.xls", expectedType: DocumentType.EXCEL },
      ];

      for (const { name, expectedType } of testCases) {
        const mockExtraction = createMockExtraction({
          documentType: expectedType,
          documentName: name,
        });

        extractionRepo.create.mockReturnValue(mockExtraction);
        extractionRepo.save.mockImplementation((e) => Promise.resolve(e as NixExtraction));

        if (expectedType === DocumentType.PDF) {
          aiExtractor.getAvailableProviders.mockResolvedValue([]);
          pdfExtractor.extractFromPdf.mockResolvedValue({
            ...createMockExtractionResult(),
            rawText: "",
            htmlContent: "",
          } as any);
        } else if (expectedType === DocumentType.EXCEL) {
          excelExtractor.extractFromExcel.mockResolvedValue(createMockExtractionResult());
        }

        await nixService.processDocument({
          documentPath: `/uploads/${name}`,
          documentName: name,
          userId: 100,
        });

        expect(extractionRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            documentType: expectedType,
          }),
        );
      }
    });
  });

  describe("Clarification Submission Flow", () => {
    it("should submit clarification and update extraction status when all answered", async () => {
      const mockExtraction = createMockExtraction({
        status: ExtractionStatus.NEEDS_CLARIFICATION,
        extractedItems: [createMockExtractedItem()],
      });

      const mockClarification = createMockClarification({
        extraction: mockExtraction,
      });

      clarificationRepo.findOne.mockResolvedValue(mockClarification);
      clarificationRepo.save.mockResolvedValue(mockClarification);
      clarificationRepo.count.mockResolvedValue(0);
      extractionRepo.save.mockResolvedValue(mockExtraction);
      learningRepo.create.mockReturnValue({} as NixLearning);
      learningRepo.save.mockResolvedValue({} as NixLearning);

      const result = await nixService.submitClarification({
        clarificationId: 1,
        responseType: ResponseType.TEXT,
        responseText: "Carbon Steel",
      });

      expect(result.success).toBe(true);
      expect(result.remainingClarifications).toBe(0);
      expect(mockClarification.status).toBe(ClarificationStatus.ANSWERED);
      expect(mockClarification.responseText).toBe("Carbon Steel");
    });

    it("should not complete extraction if clarifications remain", async () => {
      const mockExtraction = createMockExtraction({
        status: ExtractionStatus.NEEDS_CLARIFICATION,
      });

      const mockClarification = createMockClarification({
        extraction: mockExtraction,
      });

      clarificationRepo.findOne.mockResolvedValue(mockClarification);
      clarificationRepo.save.mockResolvedValue(mockClarification);
      clarificationRepo.count.mockResolvedValue(2);
      learningRepo.create.mockReturnValue({} as NixLearning);
      learningRepo.save.mockResolvedValue({} as NixLearning);

      const result = await nixService.submitClarification({
        clarificationId: 1,
        responseType: ResponseType.TEXT,
        responseText: "Stainless Steel",
      });

      expect(result.success).toBe(true);
      expect(result.remainingClarifications).toBe(2);
      expect(mockExtraction.status).toBe(ExtractionStatus.NEEDS_CLARIFICATION);
    });

    it("should return failure for non-existent clarification", async () => {
      clarificationRepo.findOne.mockResolvedValue(null);

      const result = await nixService.submitClarification({
        clarificationId: 999,
        responseType: ResponseType.TEXT,
        responseText: "Test",
      });

      expect(result.success).toBe(false);
    });

    it("should skip learning when allowLearning is false", async () => {
      const mockClarification = createMockClarification({
        extraction: createMockExtraction(),
      });

      clarificationRepo.findOne.mockResolvedValue(mockClarification);
      clarificationRepo.save.mockResolvedValue(mockClarification);
      clarificationRepo.count.mockResolvedValue(0);
      extractionRepo.save.mockResolvedValue(mockClarification.extraction as NixExtraction);

      await nixService.submitClarification({
        clarificationId: 1,
        responseType: ResponseType.TEXT,
        responseText: "Test",
        allowLearning: false,
      });

      expect(learningRepo.create).not.toHaveBeenCalled();
    });
  });

  describe("AI-Enhanced Processing", () => {
    it("should fall back to pattern matching when no AI providers available", async () => {
      const mockExtraction = createMockExtraction();
      extractionRepo.create.mockReturnValue(mockExtraction);
      extractionRepo.save.mockImplementation((e) => Promise.resolve(e as NixExtraction));

      aiExtractor.getAvailableProviders.mockResolvedValue([]);

      pdfExtractor.extractFromPdf.mockResolvedValue({
        ...createMockExtractionResult(),
        sheetName: "PDF Document",
        items: [createMockExtractedItem(), createMockExtractedItem({ itemNumber: "2" })],
        rawText: "",
        htmlContent: "",
      } as any);

      const result = await nixService.processDocument({
        documentPath: "/uploads/test.pdf",
        documentName: "test.pdf",
        userId: 100,
      });

      expect(result.items).toHaveLength(2);
      expect(pdfExtractor.extractFromPdf).toHaveBeenCalled();
    });
  });

  describe("Extraction Retrieval", () => {
    it("should retrieve extraction by ID", async () => {
      const mockExtraction = createMockExtraction({
        status: ExtractionStatus.COMPLETED,
        extractedItems: [createMockExtractedItem()],
      });

      extractionRepo.findOne.mockResolvedValue(mockExtraction);

      const result = await nixService.extraction(1);

      expect(result).toBe(mockExtraction);
      expect(extractionRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ["user", "rfq"],
      });
    });

    it("should return null for non-existent extraction", async () => {
      extractionRepo.findOne.mockResolvedValue(null);

      const result = await nixService.extraction(999);

      expect(result).toBeNull();
    });

    it("should retrieve user extractions", async () => {
      const extractions = [createMockExtraction({ id: 1 }), createMockExtraction({ id: 2 })];

      extractionRepo.find.mockResolvedValue(extractions);

      const result = await nixService.userExtractions(100);

      expect(result).toHaveLength(2);
      expect(extractionRepo.find).toHaveBeenCalledWith({
        where: { userId: 100 },
        order: { createdAt: "DESC" },
        take: 50,
      });
    });
  });

  describe("Pending Clarifications", () => {
    it("should retrieve pending clarifications for extraction", async () => {
      const clarifications = [
        createMockClarification({ id: 1 }),
        createMockClarification({ id: 2 }),
      ];

      clarificationRepo.find.mockResolvedValue(clarifications);

      const result = await nixService.pendingClarifications(1);

      expect(result).toHaveLength(2);
      expect(clarificationRepo.find).toHaveBeenCalledWith({
        where: {
          extractionId: 1,
          status: ClarificationStatus.PENDING,
        },
        order: { createdAt: "ASC" },
      });
    });
  });

  describe("Processing Time Tracking", () => {
    beforeEach(() => {
      aiExtractor.getAvailableProviders.mockResolvedValue([]);
    });

    it("should track processing time on successful extraction", async () => {
      const mockExtraction = createMockExtraction();
      extractionRepo.create.mockReturnValue(mockExtraction);
      extractionRepo.save.mockImplementation((e) => {
        if ((e as NixExtraction).processingTimeMs) {
          expect((e as NixExtraction).processingTimeMs).toBeGreaterThanOrEqual(0);
        }
        return Promise.resolve(e as NixExtraction);
      });

      pdfExtractor.extractFromPdf.mockResolvedValue({
        ...createMockExtractionResult(),
        items: [],
        rawText: "",
        htmlContent: "",
      } as any);

      await nixService.processDocument({
        documentPath: "/uploads/test.pdf",
        documentName: "test.pdf",
        userId: 100,
      });

      expect(extractionRepo.save).toHaveBeenCalled();
    });

    it("should track processing time on failed extraction", async () => {
      const mockExtraction = createMockExtraction();
      extractionRepo.create.mockReturnValue(mockExtraction);
      extractionRepo.save.mockImplementation((e) => Promise.resolve(e as NixExtraction));

      pdfExtractor.extractFromPdf.mockRejectedValue(new Error("Extraction failed"));

      const result = await nixService.processDocument({
        documentPath: "/uploads/test.pdf",
        documentName: "test.pdf",
        userId: 100,
      });

      expect(result.status).toBe(ExtractionStatus.FAILED);
      const savedExtraction = extractionRepo.save.mock.calls[1][0] as NixExtraction;
      expect(savedExtraction.processingTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Multi-Document Type Support", () => {
    it("should correctly route PDF to PDF extractor", async () => {
      const mockExtraction = createMockExtraction();
      extractionRepo.create.mockReturnValue(mockExtraction);
      extractionRepo.save.mockImplementation((e) => Promise.resolve(e as NixExtraction));
      aiExtractor.getAvailableProviders.mockResolvedValue([]);

      pdfExtractor.extractFromPdf.mockResolvedValue({
        ...createMockExtractionResult(),
        rawText: "",
        htmlContent: "",
      } as any);

      await nixService.processDocument({
        documentPath: "/uploads/test.pdf",
        documentName: "test.pdf",
        userId: 100,
      });

      expect(pdfExtractor.extractFromPdf).toHaveBeenCalled();
      expect(excelExtractor.extractFromExcel).not.toHaveBeenCalled();
    });

    it("should correctly route Excel to Excel extractor", async () => {
      const mockExtraction = createMockExtraction({ documentType: DocumentType.EXCEL });
      extractionRepo.create.mockReturnValue(mockExtraction);
      extractionRepo.save.mockImplementation((e) => Promise.resolve(e as NixExtraction));

      excelExtractor.extractFromExcel.mockResolvedValue(createMockExtractionResult());

      await nixService.processDocument({
        documentPath: "/uploads/test.xlsx",
        documentName: "test.xlsx",
        userId: 100,
      });

      expect(excelExtractor.extractFromExcel).toHaveBeenCalled();
      expect(pdfExtractor.extractFromPdf).not.toHaveBeenCalled();
    });
  });
});
