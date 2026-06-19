import { Test, TestingModule } from "@nestjs/testing";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { AiUsageService } from "../../ai-usage/ai-usage.service";
import { LibreOfficeConversionService } from "../../lib/libreoffice-conversion.service";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import { CvExtractionService } from "./cv-extraction.service";

async function buildPdfBuffer(pageCount: number): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  Array.from({ length: pageCount }).forEach(() => pdf.addPage([200, 200]));
  return Buffer.from(await pdf.save());
}

async function pdfPageCount(buffer: Buffer): Promise<number> {
  return (await PDFDocument.load(buffer)).getPageCount();
}

describe("CvExtractionService", () => {
  let service: CvExtractionService;
  let mockStorageService: Partial<IStorageService>;
  let mockAiChatService: Partial<AiChatService>;
  let mockLibreOffice: Partial<LibreOfficeConversionService>;

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

    mockLibreOffice = {
      convertToPdf: jest.fn(),
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
        {
          provide: LibreOfficeConversionService,
          useValue: mockLibreOffice,
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
        undefined,
        { model: "gemini-2.5-flash" },
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

    it("converts a legacy .doc via LibreOffice then OCRs the resulting PDF", async () => {
      const docBuffer = Buffer.from("legacy word 97-2003 binary");
      const pdfBuffer = Buffer.from("%PDF-1.4 converted from doc");
      (mockStorageService.download as jest.Mock).mockResolvedValue(docBuffer);
      (mockLibreOffice.convertToPdf as jest.Mock).mockResolvedValue(pdfBuffer);
      (mockAiChatService.chatWithImage as jest.Mock).mockResolvedValue({
        content: "Converted CV text",
        providerUsed: "gemini",
        tokensUsed: 30,
      });

      const text = await service.extractTextFromCv("cv-assistant/individuals/8/cv/test.doc");

      expect(mockLibreOffice.convertToPdf).toHaveBeenCalledWith(docBuffer, "doc");
      expect(mockAiChatService.chatWithImage).toHaveBeenCalledWith(
        pdfBuffer.toString("base64"),
        "application/pdf",
        expect.any(String),
        undefined,
        { model: "gemini-2.5-flash" },
      );
      expect(text).toBe("Converted CV text");
    });

    it("OCRs an image CV (JPG) via Gemini vision", async () => {
      const imageBuffer = Buffer.from("jpeg bytes");
      (mockStorageService.download as jest.Mock).mockResolvedValue(imageBuffer);
      (mockAiChatService.chatWithImage as jest.Mock).mockResolvedValue({
        content: "Photo CV text",
        providerUsed: "gemini",
        tokensUsed: 25,
      });

      const text = await service.extractTextFromCv("cv-assistant/individuals/8/cv/scan.jpg");

      expect(mockAiChatService.chatWithImage).toHaveBeenCalledWith(
        imageBuffer.toString("base64"),
        "image/jpeg",
        expect.any(String),
        undefined,
        { model: "gemini-2.5-flash" },
      );
      expect(text).toBe("Photo CV text");
    });

    it("caps a long image-only PDF to the first 5 pages before paying for vision OCR", async () => {
      const pdfBuffer = await buildPdfBuffer(12);
      (mockStorageService.download as jest.Mock).mockResolvedValue(pdfBuffer);
      (mockAiChatService.chatWithImage as jest.Mock).mockResolvedValue({
        content: "Capped CV text",
        providerUsed: "gemini",
        tokensUsed: 60,
      });

      const text = await service.extractTextFromCv("cv-assistant/individuals/8/cv/long.pdf");

      const sentBase64 = (mockAiChatService.chatWithImage as jest.Mock).mock.calls[0][0];
      const sentBuffer = Buffer.from(sentBase64, "base64");
      expect(await pdfPageCount(sentBuffer)).toBe(5);
      expect(sentBuffer.length).toBeLessThan(pdfBuffer.length);
      expect(text).toBe("Capped CV text");
    });

    it("leaves a short image-only PDF untouched (no needless re-save)", async () => {
      const pdfBuffer = await buildPdfBuffer(3);
      (mockStorageService.download as jest.Mock).mockResolvedValue(pdfBuffer);
      (mockAiChatService.chatWithImage as jest.Mock).mockResolvedValue({
        content: "Short CV text",
        providerUsed: "gemini",
        tokensUsed: 20,
      });

      await service.extractTextFromCv("cv-assistant/individuals/8/cv/short.pdf");

      const sentBase64 = (mockAiChatService.chatWithImage as jest.Mock).mock.calls[0][0];
      const sentBuffer = Buffer.from(sentBase64, "base64");
      expect(await pdfPageCount(sentBuffer)).toBe(3);
    });

    it("downscales a large image CV before sending it to vision OCR", async () => {
      const largeImage = await sharp({
        create: { width: 4000, height: 3000, channels: 3, background: "#ffffff" },
      })
        .jpeg()
        .toBuffer();
      (mockStorageService.download as jest.Mock).mockResolvedValue(largeImage);
      (mockAiChatService.chatWithImage as jest.Mock).mockResolvedValue({
        content: "Scaled CV text",
        providerUsed: "gemini",
        tokensUsed: 35,
      });

      await service.extractTextFromCv("cv-assistant/individuals/8/cv/big.jpg");

      const sentBase64 = (mockAiChatService.chatWithImage as jest.Mock).mock.calls[0][0];
      const sentBuffer = Buffer.from(sentBase64, "base64");
      const meta = await sharp(sentBuffer).metadata();
      expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeLessThanOrEqual(1500);
      expect(sentBuffer.length).toBeLessThan(largeImage.length);
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
        seniority: null,
        suggestedSalaryMin: null,
        suggestedSalaryMax: null,
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
