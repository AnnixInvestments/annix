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
import { LearningSource, LearningType, NixLearning } from "./entities/nix-learning.entity";
import { NixUserPreference } from "./entities/nix-user-preference.entity";
import { NixService } from "./nix.service";
import { ExcelExtractorService } from "./services/excel-extractor.service";
import { PdfExtractorService } from "./services/pdf-extractor.service";
import { WordExtractorService } from "./services/word-extractor.service";

describe("NixService", () => {
  let service: NixService;
  let extractionRepo: jest.Mocked<Repository<NixExtraction>>;
  let learningRepo: jest.Mocked<Repository<NixLearning>>;
  let clarificationRepo: jest.Mocked<Repository<NixClarification>>;
  let pdfExtractor: jest.Mocked<PdfExtractorService>;
  let excelExtractor: jest.Mocked<ExcelExtractorService>;
  let aiExtractor: jest.Mocked<AiExtractionService>;

  const mockExtraction = {
    id: 1,
    documentName: "test.pdf",
    documentPath: "/path/to/test.pdf",
    documentType: DocumentType.PDF,
    status: ExtractionStatus.PROCESSING,
    userId: 100,
    rfqId: undefined as unknown as number,
    extractedData: {},
    extractedItems: [],
    relevanceScore: 0,
    processingTimeMs: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as NixExtraction;

  const mockClarification = {
    id: 1,
    extractionId: 1,
    userId: 100,
    clarificationType: ClarificationType.MISSING_INFO,
    status: ClarificationStatus.PENDING,
    question: "What material is this?",
    context: { itemDescription: "200NB Pipe" },
    extraction: mockExtraction,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as NixClarification;

  const mockLearning = {
    id: 1,
    learningType: LearningType.CORRECTION,
    source: LearningSource.USER_CORRECTION,
    patternKey: "test-pattern",
    learnedValue: "Carbon Steel",
    confidence: 0.8,
    confirmationCount: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as NixLearning;

  beforeEach(async () => {
    const mockExtractionRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };

    const mockLearningRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };

    const mockPreferenceRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const mockClarificationRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
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

    const mockSecureDocuments = {
      create: jest.fn(),
      findAll: jest.fn(),
    };

    const mockS3Storage = {
      upload: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NixService,
        { provide: getRepositoryToken(NixExtraction), useValue: mockExtractionRepo },
        { provide: getRepositoryToken(NixLearning), useValue: mockLearningRepo },
        { provide: getRepositoryToken(NixUserPreference), useValue: mockPreferenceRepo },
        { provide: getRepositoryToken(NixClarification), useValue: mockClarificationRepo },
        { provide: PdfExtractorService, useValue: mockPdfExtractor },
        { provide: ExcelExtractorService, useValue: mockExcelExtractor },
        { provide: WordExtractorService, useValue: mockWordExtractor },
        { provide: AiExtractionService, useValue: mockAiExtractor },
        { provide: SecureDocumentsService, useValue: mockSecureDocuments },
        { provide: S3StorageService, useValue: mockS3Storage },
      ],
    }).compile();

    service = module.get<NixService>(NixService);
    extractionRepo = module.get(getRepositoryToken(NixExtraction));
    learningRepo = module.get(getRepositoryToken(NixLearning));
    clarificationRepo = module.get(getRepositoryToken(NixClarification));
    pdfExtractor = module.get(PdfExtractorService);
    excelExtractor = module.get(ExcelExtractorService);
    aiExtractor = module.get(AiExtractionService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("processDocument", () => {
    beforeEach(() => {
      extractionRepo.create.mockReturnValue(mockExtraction);
      extractionRepo.save.mockResolvedValue(mockExtraction);
      learningRepo.find.mockResolvedValue([]);
      clarificationRepo.create.mockReturnValue(mockClarification);
      clarificationRepo.save.mockResolvedValue(mockClarification);
    });

    it("should process PDF document successfully", async () => {
      aiExtractor.getAvailableProviders.mockResolvedValue([]);
      pdfExtractor.extractFromPdf.mockResolvedValue({
        sheetName: "PDF Document",
        totalRows: 10,
        items: [
          {
            rowNumber: 1,
            itemNumber: "1",
            description: "200NB Pipe Carbon Steel",
            itemType: "pipe",
            diameter: 200,
            material: "Carbon Steel",
            quantity: 5,
            needsClarification: false,
            clarificationReason: null,
            materialGrade: null,
            diameterUnit: "mm",
            secondaryDiameter: null,
            length: null,
            wallThickness: null,
            schedule: null,
            angle: null,
            flangeConfig: null,
            unit: "ea",
            confidence: 0.85,
            rawText: null,
          },
        ] as any,
        clarificationsNeeded: 0,
        specificationCells: [],
        metadata: {
          projectReference: null,
          projectLocation: null,
          projectName: null,
          standard: null,
          coating: null,
          lining: null,
          materialGrade: null,
          wallThickness: null,
        },
      });

      const result = await service.processDocument({
        documentPath: "/path/to/test.pdf",
        documentName: "test.pdf",
        userId: 100,
      });

      expect(result.extractionId).toBe(1);
      expect(result.status).toBe(ExtractionStatus.COMPLETED);
      expect(pdfExtractor.extractFromPdf).toHaveBeenCalledWith("/path/to/test.pdf");
    });

    it("should process Excel document successfully", async () => {
      excelExtractor.extractFromExcel.mockResolvedValue({
        sheetName: "Sheet1",
        totalRows: 20,
        items: [
          {
            rowNumber: 5,
            itemNumber: "1",
            description: "200mm dia Pipe",
            itemType: "pipe",
            diameter: 200,
            material: "Carbon Steel",
            quantity: 3,
            needsClarification: false,
            clarificationReason: null,
          },
        ] as any,
        clarificationsNeeded: 0,
        specificationCells: [],
        metadata: {
          projectReference: null,
          projectLocation: null,
          projectName: null,
          standard: null,
          coating: null,
          lining: null,
          materialGrade: null,
          wallThickness: null,
        },
      });

      const result = await service.processDocument({
        documentPath: "/path/to/test.xlsx",
        documentName: "test.xlsx",
        userId: 100,
      });

      expect(result.extractionId).toBe(1);
      expect(excelExtractor.extractFromExcel).toHaveBeenCalledWith("/path/to/test.xlsx");
    });

    it("should return failed status on error", async () => {
      aiExtractor.getAvailableProviders.mockResolvedValue([]);
      pdfExtractor.extractFromPdf.mockRejectedValue(new Error("PDF parsing failed"));

      const result = await service.processDocument({
        documentPath: "/path/to/test.pdf",
        documentName: "test.pdf",
        userId: 100,
      });

      expect(result.status).toBe(ExtractionStatus.FAILED);
      expect(result.error).toBe("PDF parsing failed");
    });

    it("should throw error for unsupported document type", async () => {
      const result = await service.processDocument({
        documentPath: "/path/to/test.dwg",
        documentName: "test.dwg",
        userId: 100,
      });

      expect(result.status).toBe(ExtractionStatus.FAILED);
      expect(result.error).toContain("Unsupported document type");
    });

    it("should generate clarifications for items needing them", async () => {
      aiExtractor.getAvailableProviders.mockResolvedValue([]);
      pdfExtractor.extractFromPdf.mockResolvedValue({
        sheetName: "PDF Document",
        totalRows: 10,
        items: [
          {
            rowNumber: 1,
            itemNumber: "1",
            description: "200NB Pipe",
            itemType: "pipe",
            diameter: 200,
            material: null,
            quantity: 5,
            needsClarification: true,
            clarificationReason: "Missing material",
          },
        ] as any,
        clarificationsNeeded: 1,
        specificationCells: [],
        metadata: {
          projectReference: null,
          projectLocation: null,
          projectName: null,
          standard: null,
          coating: null,
          lining: null,
          materialGrade: null,
          wallThickness: null,
        },
      });

      const result = await service.processDocument({
        documentPath: "/path/to/test.pdf",
        documentName: "test.pdf",
        userId: 100,
      });

      expect(result.status).toBe(ExtractionStatus.NEEDS_CLARIFICATION);
      expect(clarificationRepo.create).toHaveBeenCalled();
    });

    it("should use AI extraction when available", async () => {
      aiExtractor.getAvailableProviders.mockResolvedValue(["gemini"]);
      aiExtractor.extractWithAi.mockResolvedValue({
        items: [
          {
            rowNumber: 1,
            itemNumber: "1",
            description: "200NB Pipe",
            itemType: "pipe",
            diameter: 200,
            material: "Carbon Steel",
            quantity: 5,
            needsClarification: false,
          },
        ] as any,
        specificationCells: [],
        metadata: {
          projectReference: null,
          projectLocation: null,
          projectName: null,
          standard: null,
          coating: null,
          lining: null,
          materialGrade: null,
          wallThickness: null,
        },
        providerUsed: "gemini",
        tokensUsed: 500,
        processingTimeMs: 1000,
      });

      jest.spyOn(require("node:fs"), "readFileSync").mockReturnValue(Buffer.from("fake-pdf"));
      jest.mock("pdf-parse", () => ({
        PDFParse: jest.fn().mockImplementation(() => ({
          load: jest.fn().mockResolvedValue(undefined),
          getText: jest.fn().mockResolvedValue({ text: "Sample text", total: 1 }),
          getInfo: jest.fn().mockResolvedValue({ numPages: 1 }),
        })),
      }));

      await service.processDocument({
        documentPath: "/path/to/test.pdf",
        documentName: "test.pdf",
        userId: 100,
      });

      expect(aiExtractor.getAvailableProviders).toHaveBeenCalled();
    });
  });

  describe("submitClarification", () => {
    it("should return success false when clarification not found", async () => {
      clarificationRepo.findOne.mockResolvedValue(null);

      const result = await service.submitClarification({
        clarificationId: 999,
        responseType: ResponseType.TEXT,
        responseText: "Carbon Steel",
      });

      expect(result.success).toBe(false);
    });

    it("should submit clarification successfully", async () => {
      clarificationRepo.findOne.mockResolvedValue(mockClarification);
      clarificationRepo.save.mockResolvedValue(mockClarification);
      clarificationRepo.count.mockResolvedValue(0);
      extractionRepo.save.mockResolvedValue(mockExtraction);
      learningRepo.findOne.mockResolvedValue(null);
      learningRepo.create.mockReturnValue(mockLearning);
      learningRepo.save.mockResolvedValue(mockLearning);

      const result = await service.submitClarification({
        clarificationId: 1,
        responseType: ResponseType.TEXT,
        responseText: "Carbon Steel",
      });

      expect(result.success).toBe(true);
      expect(clarificationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ClarificationStatus.ANSWERED,
          responseText: "Carbon Steel",
        }),
      );
    });

    it("should update extraction status to completed when no remaining clarifications", async () => {
      clarificationRepo.findOne.mockResolvedValue(mockClarification);
      clarificationRepo.save.mockResolvedValue(mockClarification);
      clarificationRepo.count.mockResolvedValue(0);
      extractionRepo.save.mockResolvedValue({
        ...mockExtraction,
        status: ExtractionStatus.COMPLETED,
      });
      learningRepo.findOne.mockResolvedValue(null);
      learningRepo.create.mockReturnValue(mockLearning);
      learningRepo.save.mockResolvedValue(mockLearning);

      const result = await service.submitClarification({
        clarificationId: 1,
        responseType: ResponseType.TEXT,
        responseText: "Carbon Steel",
      });

      expect(result.remainingClarifications).toBe(0);
    });

    it("should skip learning when allowLearning is false", async () => {
      clarificationRepo.findOne.mockResolvedValue(mockClarification);
      clarificationRepo.save.mockResolvedValue(mockClarification);
      clarificationRepo.count.mockResolvedValue(0);
      extractionRepo.save.mockResolvedValue(mockExtraction);

      await service.submitClarification({
        clarificationId: 1,
        responseType: ResponseType.TEXT,
        responseText: "Carbon Steel",
        allowLearning: false,
      });

      expect(learningRepo.findOne).not.toHaveBeenCalled();
    });
  });

  describe("extraction", () => {
    it("should return extraction when found", async () => {
      extractionRepo.findOne.mockResolvedValue(mockExtraction);

      const result = await service.extraction(1);

      expect(result).toEqual(mockExtraction);
      expect(extractionRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ["user", "rfq"],
      });
    });

    it("should return null when extraction not found", async () => {
      extractionRepo.findOne.mockResolvedValue(null);

      const result = await service.extraction(999);

      expect(result).toBeNull();
    });
  });

  describe("pendingClarifications", () => {
    it("should return pending clarifications for extraction", async () => {
      clarificationRepo.find.mockResolvedValue([mockClarification]);

      const result = await service.pendingClarifications(1);

      expect(result).toEqual([mockClarification]);
      expect(clarificationRepo.find).toHaveBeenCalledWith({
        where: {
          extractionId: 1,
          status: ClarificationStatus.PENDING,
        },
        order: { createdAt: "ASC" },
      });
    });
  });

  describe("userExtractions", () => {
    it("should return user extractions", async () => {
      extractionRepo.find.mockResolvedValue([mockExtraction]);

      const result = await service.userExtractions(100);

      expect(result).toEqual([mockExtraction]);
      expect(extractionRepo.find).toHaveBeenCalledWith({
        where: { userId: 100 },
        order: { createdAt: "DESC" },
        take: 50,
      });
    });
  });

  describe("recordCorrection", () => {
    it("should create new learning rule for new correction", async () => {
      learningRepo.findOne.mockResolvedValue(null);
      learningRepo.create.mockReturnValue(mockLearning);
      learningRepo.save.mockResolvedValue(mockLearning);

      const result = await service.recordCorrection({
        itemDescription: "200NB Pipe",
        fieldName: "material",
        originalValue: null,
        correctedValue: "Carbon Steel",
      });

      expect(result.success).toBe(true);
      expect(learningRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          learningType: LearningType.CORRECTION,
          source: LearningSource.USER_CORRECTION,
          patternKey: "200NB Pipe::material",
          learnedValue: "Carbon Steel",
        }),
      );
    });

    it("should update existing learning rule with same value", async () => {
      const existingRule = { ...mockLearning, learnedValue: "Carbon Steel", confirmationCount: 1 };
      learningRepo.findOne.mockResolvedValue(existingRule);
      learningRepo.save.mockResolvedValue(existingRule);

      await service.recordCorrection({
        itemDescription: "200NB Pipe",
        fieldName: "material",
        originalValue: null,
        correctedValue: "Carbon Steel",
      });

      expect(learningRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          confirmationCount: 2,
        }),
      );
    });

    it("should reset learning rule with different value", async () => {
      const existingRule = {
        ...mockLearning,
        learnedValue: "Mild Steel",
        confirmationCount: 3,
        confidence: 0.9,
      };
      learningRepo.findOne.mockResolvedValue(existingRule);
      learningRepo.save.mockResolvedValue(existingRule);

      await service.recordCorrection({
        itemDescription: "200NB Pipe",
        fieldName: "material",
        originalValue: "Mild Steel",
        correctedValue: "Stainless Steel",
      });

      expect(learningRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          learnedValue: "Stainless Steel",
          confirmationCount: 1,
          confidence: 0.6,
        }),
      );
    });
  });

  describe("seedAdminRule", () => {
    it("should create admin learning rule", async () => {
      learningRepo.create.mockReturnValue(mockLearning);
      learningRepo.save.mockResolvedValue(mockLearning);

      const result = await service.seedAdminRule("material", "API 5L", "Carbon Steel", ["pipe"]);

      expect(result).toEqual(mockLearning);
      expect(learningRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          learningType: LearningType.RELEVANCE_RULE,
          source: LearningSource.ADMIN_SEEDED,
          category: "material",
          patternKey: "API 5L",
          learnedValue: "Carbon Steel",
          applicableProducts: ["pipe"],
          confidence: 0.9,
        }),
      );
    });
  });

  describe("adminLearningRules", () => {
    it("should return admin seeded learning rules", async () => {
      learningRepo.find.mockResolvedValue([mockLearning]);

      const result = await service.adminLearningRules();

      expect(result).toEqual([mockLearning]);
      expect(learningRepo.find).toHaveBeenCalledWith({
        where: { source: LearningSource.ADMIN_SEEDED },
        order: { createdAt: "DESC" },
      });
    });
  });

  describe("document type detection", () => {
    it.each([
      ["test.pdf", DocumentType.PDF],
      ["test.PDF", DocumentType.PDF],
      ["test.xlsx", DocumentType.EXCEL],
      ["test.xls", DocumentType.EXCEL],
      ["test.csv", DocumentType.EXCEL],
      ["test.doc", DocumentType.WORD],
      ["test.docx", DocumentType.WORD],
      ["test.dwg", DocumentType.CAD],
      ["test.dxf", DocumentType.CAD],
      ["test.sldprt", DocumentType.SOLIDWORKS],
      ["test.png", DocumentType.IMAGE],
      ["test.jpg", DocumentType.IMAGE],
      ["test.unknown", DocumentType.UNKNOWN],
    ])('should detect "%s" as %s', async (filename, expectedType) => {
      aiExtractor.getAvailableProviders.mockResolvedValue([]);

      if (expectedType === DocumentType.PDF) {
        pdfExtractor.extractFromPdf.mockResolvedValue({
          sheetName: "PDF",
          totalRows: 0,
          items: [],
          clarificationsNeeded: 0,
          specificationCells: [],
          metadata: {
            projectReference: null,
            projectLocation: null,
            projectName: null,
            standard: null,
            coating: null,
            lining: null,
            materialGrade: null,
            wallThickness: null,
          },
        });
      } else if (expectedType === DocumentType.EXCEL) {
        excelExtractor.extractFromExcel.mockResolvedValue({
          sheetName: "Sheet1",
          totalRows: 0,
          items: [],
          clarificationsNeeded: 0,
          specificationCells: [],
          metadata: {
            projectReference: null,
            projectLocation: null,
            projectName: null,
            standard: null,
            coating: null,
            lining: null,
            materialGrade: null,
            wallThickness: null,
          },
        });
      }

      extractionRepo.create.mockReturnValue({ ...mockExtraction, documentType: expectedType });
      extractionRepo.save.mockResolvedValue({ ...mockExtraction, documentType: expectedType });
      learningRepo.find.mockResolvedValue([]);

      await service.processDocument({
        documentPath: `/path/to/${filename}`,
        documentName: filename,
        userId: 100,
      });

      expect(extractionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          documentType: expectedType,
        }),
      );
    });
  });
});
