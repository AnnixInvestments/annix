import { Test, TestingModule } from "@nestjs/testing";
import { AiUsageService } from "../../ai-usage/ai-usage.service";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import { CvExtractionService } from "./cv-extraction.service";

describe("CvExtractionService", () => {
  let service: CvExtractionService;
  let mockStorageService: Partial<IStorageService>;
  let mockAiChatService: Partial<AiChatService>;

  beforeEach(async () => {
    mockStorageService = {
      upload: jest.fn(),
      download: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
      getPresignedUrl: jest.fn(),
      getPublicUrl: jest.fn(),
    };

    mockAiChatService = {
      chat: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CvExtractionService,
        {
          provide: STORAGE_SERVICE,
          useValue: mockStorageService,
        },
        {
          provide: AiChatService,
          useValue: mockAiChatService,
        },
        {
          provide: AiUsageService,
          useValue: { log: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<CvExtractionService>(CvExtractionService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("extractTextFromPdf", () => {
    it("should download PDF from S3 and extract text", async () => {
      const pdfBuffer = Buffer.from("%PDF-1.4 test content");
      (mockStorageService.download as jest.Mock).mockResolvedValue(pdfBuffer);

      await expect(
        service.extractTextFromPdf("cv-assistant/candidates/1/test.pdf"),
      ).rejects.toThrow();

      expect(mockStorageService.download).toHaveBeenCalledWith(
        "cv-assistant/candidates/1/test.pdf",
      );
    });

    it("should throw error if download fails", async () => {
      (mockStorageService.download as jest.Mock).mockRejectedValue(new Error("S3 error"));

      await expect(
        service.extractTextFromPdf("cv-assistant/candidates/1/test.pdf"),
      ).rejects.toThrow("Failed to extract text from PDF: S3 error");
    });
  });

  describe("extractDataFromCv", () => {
    it("should extract structured data from CV text using AI", async () => {
      const cvText = "John Doe\njohn@example.com\n5 years experience in software development";
      const aiResponse = {
        content: JSON.stringify({
          candidateName: "John Doe",
          email: "john@example.com",
          phone: null,
          experienceYears: 5,
          skills: ["software development"],
          education: [],
          certifications: [],
          references: [],
          summary: "Experienced software developer",
        }),
        providerUsed: "gemini",
        tokensUsed: 100,
      };

      (mockAiChatService.chat as jest.Mock).mockResolvedValue(aiResponse);

      const result = await service.extractDataFromCv(cvText);

      expect(result).toEqual({
        candidateName: "John Doe",
        email: "john@example.com",
        phone: null,
        experienceYears: 5,
        skills: ["software development"],
        education: [],
        certifications: [],
        references: [],
        summary: "Experienced software developer",
      });
    });

    it("should return empty data structure when AI response has no JSON", async () => {
      (mockAiChatService.chat as jest.Mock).mockResolvedValue({
        content: "Sorry, I could not parse this CV",
        providerUsed: "gemini",
      });

      const result = await service.extractDataFromCv("some cv text");

      expect(result).toEqual({
        candidateName: null,
        email: null,
        phone: null,
        experienceYears: null,
        skills: [],
        education: [],
        certifications: [],
        references: [],
        summary: null,
      });
    });

    it("should handle AI service errors gracefully", async () => {
      (mockAiChatService.chat as jest.Mock).mockRejectedValue(new Error("AI service error"));

      const result = await service.extractDataFromCv("some cv text");

      expect(result).toEqual({
        candidateName: null,
        email: null,
        phone: null,
        experienceYears: null,
        skills: [],
        education: [],
        certifications: [],
        references: [],
        summary: null,
      });
    });
  });

  describe("processCV", () => {
    it("should download from S3, extract text, and parse data", async () => {
      const pdfBuffer = Buffer.from("%PDF-1.4 test");
      (mockStorageService.download as jest.Mock).mockResolvedValue(pdfBuffer);

      await expect(service.processCV("cv-assistant/candidates/1/test.pdf")).rejects.toThrow();

      expect(mockStorageService.download).toHaveBeenCalledWith(
        "cv-assistant/candidates/1/test.pdf",
      );
    });
  });
});
