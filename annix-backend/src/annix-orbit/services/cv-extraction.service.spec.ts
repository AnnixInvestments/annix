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
      presignedUrl: jest.fn(),
      publicUrl: jest.fn(),
    };

    mockAiChatService = {
      chat: jest.fn(),
      chatWithImage: jest.fn(),
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

  describe("extractTextFromCv", () => {
    it("routes a PDF with no extractable text layer to Gemini vision OCR", async () => {
      const pdfBuffer = Buffer.from("%PDF-1.4 not a real parseable pdf");
      (mockStorageService.download as jest.Mock).mockResolvedValue(pdfBuffer);
      (mockAiChatService.chatWithImage as jest.Mock).mockResolvedValue({
        content: "John Doe\nSoftware Engineer",
        providerUsed: "gemini",
        tokensUsed: 50,
      });

      const text = await service.extractTextFromCv("cv-assistant/individuals/8/cv/test.pdf");

      expect(mockStorageService.download).toHaveBeenCalledWith(
        "cv-assistant/individuals/8/cv/test.pdf",
      );
      expect(mockAiChatService.chatWithImage).toHaveBeenCalledWith(
        pdfBuffer.toString("base64"),
        "application/pdf",
        expect.any(String),
      );
      expect(text).toBe("John Doe\nSoftware Engineer");
    });

    it("returns an empty string when OCR also fails so callers surface a friendly error", async () => {
      const pdfBuffer = Buffer.from("%PDF-1.4 not a real parseable pdf");
      (mockStorageService.download as jest.Mock).mockResolvedValue(pdfBuffer);
      (mockAiChatService.chatWithImage as jest.Mock).mockRejectedValue(new Error("Gemini down"));

      const text = await service.extractTextFromCv("cv-assistant/individuals/8/cv/test.pdf");

      expect(text).toBe("");
    });

    it("throws for unsupported formats before any download", async () => {
      await expect(
        service.extractTextFromCv("cv-assistant/individuals/8/cv/notes.txt"),
      ).rejects.toThrow("Unsupported CV file format");
      expect(mockStorageService.download).not.toHaveBeenCalled();
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
        detectedLanguage: null,
        professionalRegistrations: [],
        saQualifications: [],
        location: null,
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
        detectedLanguage: null,
        professionalRegistrations: [],
        saQualifications: [],
        location: null,
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
        detectedLanguage: null,
        professionalRegistrations: [],
        saQualifications: [],
        location: null,
      });
    });
  });

  describe("processCV", () => {
    it("downloads, OCRs an image-only PDF, and parses structured data", async () => {
      const pdfBuffer = Buffer.from("%PDF-1.4 not a real parseable pdf");
      (mockStorageService.download as jest.Mock).mockResolvedValue(pdfBuffer);
      (mockAiChatService.chatWithImage as jest.Mock).mockResolvedValue({
        content: "Jane Doe CV text",
        providerUsed: "gemini",
        tokensUsed: 40,
      });
      (mockAiChatService.chat as jest.Mock).mockResolvedValue({
        content: JSON.stringify({ candidateName: "Jane Doe", skills: [] }),
        providerUsed: "gemini",
        tokensUsed: 100,
      });

      const result = await service.processCV("cv-assistant/individuals/8/cv/test.pdf");

      expect(mockStorageService.download).toHaveBeenCalledWith(
        "cv-assistant/individuals/8/cv/test.pdf",
      );
      expect(result.text).toBe("Jane Doe CV text");
      expect(result.data.candidateName).toBe("Jane Doe");
    });
  });
});
