import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { STORAGE_SERVICE } from "../../storage/storage.interface";
import { JobCard } from "../entities/job-card.entity";
import { ExtractionStatus, JobCardAttachment } from "../entities/job-card-attachment.entity";
import { JobCardLineItem } from "../entities/job-card-line-item.entity";
import { DrawingExtractionService } from "./drawing-extraction.service";

describe("DrawingExtractionService", () => {
  let service: DrawingExtractionService;

  const mockAttachmentRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest
      .fn()
      .mockImplementation((entity) =>
        Promise.resolve(Array.isArray(entity) ? entity : { id: 1, ...entity }),
      ),
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockJobCardRepo = {
    findOne: jest.fn(),
  };

  const mockLineItemRepo = {
    find: jest.fn(),
    save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    create: jest
      .fn()
      .mockImplementation((data) =>
        Array.isArray(data) ? data.map((d) => ({ ...d })) : [{ ...data }],
      ),
  };

  const mockStorageService = {
    upload: jest.fn().mockResolvedValue({ path: "stock-control/job-card-drawings/test.pdf" }),
    download: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
    getPresignedUrl: jest.fn().mockResolvedValue("https://signed-url.example.com"),
    getPublicUrl: jest.fn(),
  };

  const mockAiChatService = {
    chat: jest.fn(),
    chatWithImage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DrawingExtractionService,
        { provide: getRepositoryToken(JobCardAttachment), useValue: mockAttachmentRepo },
        { provide: getRepositoryToken(JobCard), useValue: mockJobCardRepo },
        { provide: getRepositoryToken(JobCardLineItem), useValue: mockLineItemRepo },
        { provide: STORAGE_SERVICE, useValue: mockStorageService },
        { provide: AiChatService, useValue: mockAiChatService },
      ],
    }).compile();

    service = module.get<DrawingExtractionService>(DrawingExtractionService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("parseAiResponse (via extractFromPdfBuffers)", () => {
    it("parses pipe drawing response with dimensions", async () => {
      const aiResponse = {
        drawingType: "pipe",
        dimensions: [
          {
            description: "300NB x 6m Straight Pipe",
            diameterMm: 300,
            lengthM: 6,
            quantity: 2,
            itemType: "pipe",
          },
          {
            description: "200NB 90° Bend",
            diameterMm: 200,
            lengthM: 0.5,
            quantity: 1,
            itemType: "bend",
          },
        ],
        confidence: 0.85,
      };

      jest
        .spyOn(service as any, "convertPdfToImages")
        .mockResolvedValue([Buffer.from("fake-image")]);

      mockAiChatService.chat.mockResolvedValue({
        content: JSON.stringify(aiResponse),
      });

      const result = await service.extractFromPdfBuffers([
        { buffer: Buffer.from("fake-pdf"), filename: "test.pdf" },
      ]);

      expect(result.drawingType).toBe("pipe");
      expect(result.dimensions).toHaveLength(2);
      expect(result.dimensions[0].diameterMm).toBe(300);
      expect(result.dimensions[0].lengthM).toBe(6);
      expect(result.confidence).toBe(0.85);
      expect(result.totalExternalM2).toBeGreaterThan(0);
      expect(result.totalInternalM2).toBeGreaterThan(0);
    });

    it("parses tank/chute drawing response with sections", async () => {
      const aiResponse = {
        drawingType: "tank_chute",
        tankData: {
          assemblyType: "tank",
          drawingReference: "GPW-017",
          jobName: "Screen 2 Underpan",
          overallLengthMm: 7238,
          overallWidthMm: 5241,
          overallHeightMm: 2852,
          liningType: "rubber",
          liningThicknessMm: 6,
          liningAreaM2: 75.0,
          coatingAreaM2: 82.5,
          coatingSystem: "Epoxy primer + polyurethane topcoat",
          surfacePrepStandard: "Sa 2.5",
          sections: [
            { mark: "A-A", description: "Side Panel", liningAreaM2: 40.0, coatingAreaM2: 44.0 },
            { mark: "B-B", description: "End Panel", liningAreaM2: 35.0, coatingAreaM2: 38.5 },
          ],
          plateParts: [{ mark: "P1", description: "Side plate", thicknessMm: 10, quantity: 2 }],
        },
        dimensions: [],
        confidence: 0.9,
      };

      jest
        .spyOn(service as any, "convertPdfToImages")
        .mockResolvedValue([Buffer.from("fake-image")]);

      mockAiChatService.chat.mockResolvedValue({
        content: JSON.stringify(aiResponse),
      });

      const result = await service.extractFromPdfBuffers([
        { buffer: Buffer.from("fake-pdf"), filename: "tank.pdf" },
      ]);

      expect(result.drawingType).toBe("tank_chute");
      expect(result.tankData).not.toBeNull();
      expect(result.tankData!.assemblyType).toBe("tank");
      expect(result.tankData!.liningAreaM2).toBe(75.0);
      expect(result.tankData!.coatingAreaM2).toBe(82.5);
      expect(result.tankData!.sections).toHaveLength(2);
      expect(result.totalLiningM2).toBe(75.0);
      expect(result.totalCoatingM2).toBe(82.5);
      expect(result.confidence).toBe(0.9);
    });

    it("returns empty result when no PDF buffers provided", async () => {
      jest.spyOn(service as any, "convertPdfToImages").mockResolvedValue([]);

      mockAiChatService.chat.mockResolvedValue({
        content: "no valid data found",
      });

      const result = await service.extractFromPdfBuffers([
        { buffer: Buffer.from("fake-pdf"), filename: "empty.pdf" },
      ]);

      expect(result.dimensions).toHaveLength(0);
      expect(result.totalExternalM2).toBe(0);
      expect(result.confidence).toBe(0);
    });

    it("handles AI returning no valid JSON gracefully", async () => {
      jest
        .spyOn(service as any, "convertPdfToImages")
        .mockResolvedValue([Buffer.from("fake-image")]);

      mockAiChatService.chat.mockResolvedValue({
        content: "I cannot extract any data from this image",
      });

      const result = await service.extractFromPdfBuffers([
        { buffer: Buffer.from("fake-pdf"), filename: "bad.pdf" },
      ]);

      expect(result.drawingType).toBe("pipe");
      expect(result.dimensions).toHaveLength(0);
      expect(result.confidence).toBe(0);
    });
  });

  describe("buildExtractionResult - surface area calculation", () => {
    it("calculates surface area for pipe dimensions", async () => {
      const aiResponse = {
        drawingType: "pipe",
        dimensions: [
          {
            description: "100NB x 3m Pipe",
            diameterMm: 100,
            lengthM: 3,
            quantity: 1,
            itemType: "pipe",
          },
        ],
        confidence: 0.8,
      };

      jest
        .spyOn(service as any, "convertPdfToImages")
        .mockResolvedValue([Buffer.from("fake-image")]);

      mockAiChatService.chat.mockResolvedValue({
        content: JSON.stringify(aiResponse),
      });

      const result = await service.extractFromPdfBuffers([
        { buffer: Buffer.from("fake-pdf"), filename: "pipe.pdf" },
      ]);

      const dim = result.dimensions[0];
      const expectedExternal = Math.PI * 0.1 * 3;
      expect(dim.externalSurfaceM2).toBeCloseTo(Math.round(expectedExternal * 100) / 100, 2);
      expect(dim.internalSurfaceM2).not.toBeNull();
      expect(dim.internalSurfaceM2!).toBeLessThan(dim.externalSurfaceM2!);
    });

    it("skips surface calculation when diameter or length is null", async () => {
      const aiResponse = {
        drawingType: "pipe",
        dimensions: [
          {
            description: "Unknown fitting",
            diameterMm: null,
            lengthM: null,
            quantity: 1,
            itemType: "other",
          },
        ],
        confidence: 0.5,
      };

      jest
        .spyOn(service as any, "convertPdfToImages")
        .mockResolvedValue([Buffer.from("fake-image")]);

      mockAiChatService.chat.mockResolvedValue({
        content: JSON.stringify(aiResponse),
      });

      const result = await service.extractFromPdfBuffers([
        { buffer: Buffer.from("fake-pdf"), filename: "fitting.pdf" },
      ]);

      expect(result.dimensions[0].externalSurfaceM2).toBeNull();
      expect(result.dimensions[0].internalSurfaceM2).toBeNull();
    });

    it("multiplies surface area by quantity for total calculations", async () => {
      const aiResponse = {
        drawingType: "pipe",
        dimensions: [
          {
            description: "200NB x 2m Pipe",
            diameterMm: 200,
            lengthM: 2,
            quantity: 3,
            itemType: "pipe",
          },
        ],
        confidence: 0.8,
      };

      jest
        .spyOn(service as any, "convertPdfToImages")
        .mockResolvedValue([Buffer.from("fake-image")]);

      mockAiChatService.chat.mockResolvedValue({
        content: JSON.stringify(aiResponse),
      });

      const result = await service.extractFromPdfBuffers([
        { buffer: Buffer.from("fake-pdf"), filename: "pipes.pdf" },
      ]);

      const singleExternal = result.dimensions[0].externalSurfaceM2!;
      expect(result.totalExternalM2).toBeCloseTo(Math.round(singleExternal * 3 * 100) / 100, 2);
    });
  });

  describe("uploadAttachment", () => {
    it("throws NotFoundException when job card does not exist", async () => {
      mockJobCardRepo.findOne.mockResolvedValue(null);

      const file = {
        originalname: "drawing.pdf",
        size: 12345,
        mimetype: "application/pdf",
        buffer: Buffer.from("pdf"),
      } as Express.Multer.File;

      await expect(service.uploadAttachment(10, 999, file, "user1", null)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("uploads file and creates attachment record", async () => {
      mockJobCardRepo.findOne.mockResolvedValue({ id: 1, companyId: 10 });
      mockAttachmentRepo.save.mockResolvedValue({
        id: 5,
        jobCardId: 1,
        companyId: 10,
        filePath: "stock-control/job-card-drawings/test.pdf",
        originalFilename: "drawing.pdf",
      });

      const file = {
        originalname: "drawing.pdf",
        size: 12345,
        mimetype: "application/pdf",
        buffer: Buffer.from("pdf"),
      } as Express.Multer.File;

      const result = await service.uploadAttachment(10, 1, file, "user1", "Test notes");

      expect(mockStorageService.upload).toHaveBeenCalled();
      expect(mockAttachmentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          jobCardId: 1,
          companyId: 10,
          originalFilename: "drawing.pdf",
          notes: "Test notes",
          extractionStatus: ExtractionStatus.PENDING,
        }),
      );
    });
  });

  describe("deleteAttachment", () => {
    it("throws NotFoundException when attachment does not exist", async () => {
      mockAttachmentRepo.findOne.mockResolvedValue(null);

      await expect(service.deleteAttachment(10, 1, 999)).rejects.toThrow(NotFoundException);
    });

    it("removes the attachment record", async () => {
      const attachment = { id: 5, jobCardId: 1, companyId: 10 };
      mockAttachmentRepo.findOne.mockResolvedValue(attachment);

      await service.deleteAttachment(10, 1, 5);

      expect(mockAttachmentRepo.remove).toHaveBeenCalledWith(attachment);
    });
  });

  describe("attachments", () => {
    it("throws NotFoundException when job card does not exist", async () => {
      mockJobCardRepo.findOne.mockResolvedValue(null);

      await expect(service.attachments(10, 999)).rejects.toThrow(NotFoundException);
    });

    it("returns attachments with signed URLs", async () => {
      mockJobCardRepo.findOne.mockResolvedValue({ id: 1, companyId: 10 });
      mockAttachmentRepo.find.mockResolvedValue([
        {
          id: 5,
          jobCardId: 1,
          companyId: 10,
          filePath: "stock-control/job-card-drawings/test.pdf",
          originalFilename: "test.pdf",
        },
      ]);

      const result = await service.attachments(10, 1);

      expect(result).toHaveLength(1);
      expect(result[0].filePath).toBe("https://signed-url.example.com");
    });
  });

  describe("normalizeStoragePath", () => {
    it("strips domain and query from presigned URLs", () => {
      const normalize = (service as any).normalizeStoragePath.bind(service);
      const url = "https://bucket.s3.amazonaws.com/stock-control/drawings/test.pdf?X-Amz-Sig=abc";
      expect(normalize(url)).toBe("stock-control/drawings/test.pdf");
    });

    it("returns plain paths unchanged", () => {
      const normalize = (service as any).normalizeStoragePath.bind(service);
      expect(normalize("stock-control/drawings/test.pdf")).toBe("stock-control/drawings/test.pdf");
    });
  });

  describe("multi-document extraction", () => {
    it("uses multi-doc prompt when multiple PDFs provided", async () => {
      jest
        .spyOn(service as any, "convertPdfToImages")
        .mockResolvedValue([Buffer.from("fake-image")]);

      mockAiChatService.chat.mockResolvedValue({
        content: JSON.stringify({
          drawingType: "pipe",
          dimensions: [],
          confidence: 0.5,
        }),
      });

      await service.extractFromPdfBuffers([
        { buffer: Buffer.from("pdf1"), filename: "sheet1.pdf" },
        { buffer: Buffer.from("pdf2"), filename: "sheet2.pdf" },
      ]);

      const chatCall = mockAiChatService.chat.mock.calls[0];
      const systemPrompt = chatCall[1];
      expect(systemPrompt).toContain("multiple engineering documents");
    });

    it("uses single-doc prompt when one PDF provided", async () => {
      jest
        .spyOn(service as any, "convertPdfToImages")
        .mockResolvedValue([Buffer.from("fake-image")]);

      mockAiChatService.chat.mockResolvedValue({
        content: JSON.stringify({
          drawingType: "pipe",
          dimensions: [],
          confidence: 0.5,
        }),
      });

      await service.extractFromPdfBuffers([
        { buffer: Buffer.from("pdf1"), filename: "sheet1.pdf" },
      ]);

      const chatCall = mockAiChatService.chat.mock.calls[0];
      const systemPrompt = chatCall[1];
      expect(systemPrompt).toContain("analysing engineering drawing images");
      expect(systemPrompt).not.toContain("multiple engineering documents");
    });
  });
});
