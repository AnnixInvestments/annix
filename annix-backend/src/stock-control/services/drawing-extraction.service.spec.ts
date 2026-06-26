import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { STORAGE_SERVICE } from "../../storage/storage.interface";
import { AttachmentType, ExtractionStatus } from "../entities/job-card-attachment.entity";
import { JobCardRepository } from "../repositories/job-card.repository";
import { JobCardAttachmentRepository } from "../repositories/job-card-attachment.repository";
import { JobCardLineItemRepository } from "../repositories/job-card-line-item.repository";
import { DrawingExtractionService } from "./drawing-extraction.service";

describe("DrawingExtractionService", () => {
  let service: DrawingExtractionService;

  const mockAttachmentRepo = {
    findForJobCard: jest.fn(),
    findOneForJobCard: jest.fn(),
    findExtractableForJobCard: jest.fn(),
    save: jest
      .fn()
      .mockImplementation((entity) =>
        Promise.resolve(Array.isArray(entity) ? entity : { id: 1, ...entity }),
      ),
    saveForCompany: jest
      .fn()
      .mockImplementation((_companyId, entity) =>
        Promise.resolve(Array.isArray(entity) ? entity : { id: 1, ...entity }),
      ),
    saveMany: jest.fn().mockImplementation((entities) => Promise.resolve(entities)),
    create: jest.fn().mockImplementation((data) => Promise.resolve({ id: 1, ...data })),
    updateMany: jest.fn(),
    remove: jest.fn(),
    removeForCompany: jest.fn(),
  };

  const mockJobCardRepo = {
    findOneForCompany: jest.fn(),
  };

  const mockLineItemRepo = {
    findForJobCardOrderedBySort: jest.fn(),
    saveMany: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    buildMany: jest.fn().mockImplementation((rows) => rows.map((r: object) => ({ ...r }))),
  };

  const mockStorageService = {
    upload: jest.fn().mockResolvedValue({ path: "stock-control/job-card-drawings/test.pdf" }),
    download: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
    presignedUrl: jest.fn().mockResolvedValue("https://signed-url.example.com"),
    publicUrl: jest.fn(),
  };

  const mockAiChatService = {
    chat: jest.fn(),
    chatWithImage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DrawingExtractionService,
        { provide: JobCardAttachmentRepository, useValue: mockAttachmentRepo },
        { provide: JobCardRepository, useValue: mockJobCardRepo },
        { provide: JobCardLineItemRepository, useValue: mockLineItemRepo },
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
      mockJobCardRepo.findOneForCompany.mockResolvedValue(null);

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
      mockJobCardRepo.findOneForCompany.mockResolvedValue({ id: 1, companyId: 10 });
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
      mockAttachmentRepo.findOneForJobCard.mockResolvedValue(null);

      await expect(service.deleteAttachment(10, 1, 999)).rejects.toThrow(NotFoundException);
    });

    it("removes the attachment record", async () => {
      const attachment = { id: 5, jobCardId: 1, companyId: 10 };
      mockAttachmentRepo.findOneForJobCard.mockResolvedValue(attachment);

      await service.deleteAttachment(10, 1, 5);

      expect(mockAttachmentRepo.removeForCompany).toHaveBeenCalledWith(10, attachment);
    });
  });

  describe("attachments", () => {
    it("throws NotFoundException when job card does not exist", async () => {
      mockJobCardRepo.findOneForCompany.mockResolvedValue(null);

      await expect(service.attachments(10, 999)).rejects.toThrow(NotFoundException);
    });

    it("returns attachments with signed URLs", async () => {
      mockJobCardRepo.findOneForCompany.mockResolvedValue({ id: 1, companyId: 10 });
      mockAttachmentRepo.findForJobCard.mockResolvedValue([
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

  describe("extractAllFromJobCard - per-drawing line item fill", () => {
    const storedTankResult = () => ({
      drawingType: "tank_chute",
      dimensions: [],
      tankData: {
        assemblyType: "distributor",
        drawingReference: "CD1-6147",
        jobName: "Distributor Body",
        overallLengthMm: null,
        overallWidthMm: null,
        overallHeightMm: null,
        liningType: "rubber",
        liningThicknessMm: 6,
        liningAreaM2: 12.5,
        coatingAreaM2: 18.25,
        coatingSystem: null,
        surfacePrepStandard: null,
        sections: [],
        plateParts: [
          {
            mark: "P1",
            description: "Body plate",
            thicknessMm: 10,
            lengthMm: 2400,
            widthMm: 1200,
            quantity: 2,
            liningThicknessMm: 6,
          },
        ],
        components: [
          {
            mark: "S1",
            description: "Shell",
            componentType: "shell",
            shape: { type: "cylinder", innerDiameterMm: 1000, heightMm: 1200 },
            liningType: "rubber",
            liningThicknessMm: 6,
            liningAreaM2: null,
            coatingAreaM2: null,
            quantity: 1,
            segmentCount: null,
          },
        ],
      },
      totalExternalM2: 18.25,
      totalInternalM2: 12.5,
      totalLiningM2: 12.5,
      totalCoatingM2: 18.25,
      rawText: "",
      confidence: 0.9,
    });

    const analysedAttachment = () => ({
      id: 7,
      jobCardId: 1,
      companyId: 10,
      attachmentType: AttachmentType.DRAWING,
      originalFilename: "CD1-6147_DISTRIBUTOR_BODY_(Rev_0_-_Approval)_PDF.pdf",
      extractionStatus: ExtractionStatus.ANALYSED,
      extractedData: storedTankResult(),
    });

    it("fills the matching line item with liningM², m², plateBom and tankComponents", async () => {
      mockJobCardRepo.findOneForCompany.mockResolvedValue({ id: 1, companyId: 10 });
      mockAttachmentRepo.findForJobCard.mockResolvedValue([analysedAttachment()]);
      const lineItem = {
        id: 42,
        jobCardId: 1,
        companyId: 10,
        itemNo: "CD1-6147",
        itemCode: null,
        m2: null,
        liningM2: null,
        plateBom: null,
        tankComponents: null,
      };
      mockLineItemRepo.findForJobCardOrderedBySort.mockResolvedValue([lineItem]);

      const result = await service.extractAllFromJobCard(10, 1, { reapplyAnalysed: true });

      expect(mockLineItemRepo.saveMany).toHaveBeenCalledTimes(1);
      const saved = mockLineItemRepo.saveMany.mock.calls[0][0];
      expect(saved).toHaveLength(1);
      expect(saved[0].id).toBe(42);
      expect(saved[0].liningM2).toBe(12.5);
      expect(saved[0].m2).toBe(18.25);
      expect(saved[0].plateBom).toHaveLength(1);
      expect(saved[0].tankComponents).toHaveLength(1);
      expect(mockLineItemRepo.buildMany).not.toHaveBeenCalled();
      expect(result.drawingType).toBe("tank_chute");
    });

    it("falls back to appending tank line items when no existing line item matches", async () => {
      mockJobCardRepo.findOneForCompany.mockResolvedValue({ id: 1, companyId: 10 });
      mockAttachmentRepo.findForJobCard.mockResolvedValue([analysedAttachment()]);
      const lineItem = {
        id: 99,
        jobCardId: 1,
        companyId: 10,
        itemNo: "ZZZ-0000",
        itemCode: null,
        sortOrder: 1,
      };
      mockLineItemRepo.findForJobCardOrderedBySort.mockResolvedValue([lineItem]);

      await service.extractAllFromJobCard(10, 1, { reapplyAnalysed: true });

      expect(mockLineItemRepo.buildMany).toHaveBeenCalledTimes(1);
      const appended = mockLineItemRepo.buildMany.mock.calls[0][0];
      expect(appended.length).toBeGreaterThan(0);
      expect(mockLineItemRepo.saveMany).toHaveBeenCalled();
    });

    it("reuses stored extraction data without calling the AI service", async () => {
      mockJobCardRepo.findOneForCompany.mockResolvedValue({ id: 1, companyId: 10 });
      mockAttachmentRepo.findForJobCard.mockResolvedValue([analysedAttachment()]);
      mockLineItemRepo.findForJobCardOrderedBySort.mockResolvedValue([
        { id: 42, jobCardId: 1, companyId: 10, itemNo: "CD1-6147", itemCode: null },
      ]);

      await service.extractAllFromJobCard(10, 1, { reapplyAnalysed: true });

      expect(mockAiChatService.chat).not.toHaveBeenCalled();
      expect(mockAiChatService.chatWithImage).not.toHaveBeenCalled();
      expect(mockStorageService.download).not.toHaveBeenCalled();
      expect(mockAttachmentRepo.saveForCompany).not.toHaveBeenCalled();
    });

    it("re-validates poisoned stored data before filling the line item", async () => {
      mockJobCardRepo.findOneForCompany.mockResolvedValue({ id: 1, companyId: 10 });
      const poisoned = storedTankResult();
      poisoned.tankData.liningAreaM2 = 1e9;
      poisoned.tankData.plateParts = [
        {
          mark: "BAD",
          description: "oversized",
          thicknessMm: 10,
          lengthMm: 1e9,
          widthMm: 1200,
          quantity: 1e9,
          liningThicknessMm: 6,
        },
        {
          mark: "OK",
          description: "valid",
          thicknessMm: 10,
          lengthMm: 2400,
          widthMm: 1200,
          quantity: 5,
          liningThicknessMm: 6,
        },
      ];
      const attachment = analysedAttachment();
      attachment.extractedData = poisoned;
      mockAttachmentRepo.findForJobCard.mockResolvedValue([attachment]);
      mockLineItemRepo.findForJobCardOrderedBySort.mockResolvedValue([
        {
          id: 42,
          jobCardId: 1,
          companyId: 10,
          itemNo: "CD1-6147",
          itemCode: null,
          m2: null,
          liningM2: null,
          plateBom: null,
          tankComponents: null,
        },
      ]);

      await service.extractAllFromJobCard(10, 1, { reapplyAnalysed: true });

      const saved = mockLineItemRepo.saveMany.mock.calls[0][0][0];
      expect(saved.liningM2 ?? null).toBeNull();
      expect(saved.m2).toBe(18.25);
      expect(saved.plateBom).toHaveLength(1);
      expect(saved.plateBom[0].mark).toBe("OK");
      expect(saved.plateBom[0].quantity).toBe(5);
    });

    it("falls back to append when more than one line item matches the drawing code", async () => {
      mockJobCardRepo.findOneForCompany.mockResolvedValue({ id: 1, companyId: 10 });
      mockAttachmentRepo.findForJobCard.mockResolvedValue([analysedAttachment()]);
      mockLineItemRepo.findForJobCardOrderedBySort.mockResolvedValue([
        { id: 1, jobCardId: 1, companyId: 10, itemNo: "CD1-6147", itemCode: null, sortOrder: 1 },
        { id: 2, jobCardId: 1, companyId: 10, itemNo: "CD1-6147", itemCode: null, sortOrder: 2 },
      ]);

      await service.extractAllFromJobCard(10, 1, { reapplyAnalysed: true });

      expect(mockLineItemRepo.buildMany).toHaveBeenCalledTimes(1);
    });

    it("does not fill a pipe line item that shares the drawing code, appends instead", async () => {
      mockJobCardRepo.findOneForCompany.mockResolvedValue({ id: 1, companyId: 10 });
      mockAttachmentRepo.findForJobCard.mockResolvedValue([analysedAttachment()]);
      const pipeRow = {
        id: 55,
        jobCardId: 1,
        companyId: 10,
        itemNo: "CD1-6147",
        itemCode: null,
        itemDescription: "100 NB PIPE",
        m2: null,
        liningM2: null,
        plateBom: null,
        tankComponents: null,
        sortOrder: 1,
      };
      mockLineItemRepo.findForJobCardOrderedBySort.mockResolvedValue([pipeRow]);

      await service.extractAllFromJobCard(10, 1, { reapplyAnalysed: true });

      expect(pipeRow.liningM2).toBeNull();
      expect(pipeRow.m2).toBeNull();
      expect(pipeRow.plateBom).toBeNull();
      expect(pipeRow.tankComponents).toBeNull();
      expect(mockLineItemRepo.buildMany).toHaveBeenCalledTimes(1);
    });

    it("ignores the model-controlled drawingReference and matches only on the filename code", async () => {
      mockJobCardRepo.findOneForCompany.mockResolvedValue({ id: 1, companyId: 10 });
      const attachment = analysedAttachment();
      attachment.originalFilename = "scan.pdf";
      mockAttachmentRepo.findForJobCard.mockResolvedValue([attachment]);
      mockLineItemRepo.findForJobCardOrderedBySort.mockResolvedValue([
        {
          id: 7,
          jobCardId: 1,
          companyId: 10,
          itemNo: "CD1-6147",
          itemCode: null,
          sortOrder: 1,
          m2: null,
          liningM2: null,
        },
      ]);

      await service.extractAllFromJobCard(10, 1, { reapplyAnalysed: true });

      expect(mockLineItemRepo.buildMany).toHaveBeenCalledTimes(1);
    });

    it("does not append duplicate section rows across multiple drawings on the same job", async () => {
      mockJobCardRepo.findOneForCompany.mockResolvedValue({ id: 1, companyId: 10 });
      const first = analysedAttachment();
      first.id = 11;
      first.originalFilename = "tank-scan.pdf";
      const second = analysedAttachment();
      second.id = 12;
      second.originalFilename = "tank-scan-copy.pdf";
      mockAttachmentRepo.findForJobCard.mockResolvedValue([first, second]);

      const drawingOneRows = [
        { itemDescription: "Distributor Internal Lining (CD1-6147) - Type: rubber - 6mm thick" },
        { itemDescription: "Distributor External Coating (CD1-6147)" },
      ];
      mockLineItemRepo.findForJobCardOrderedBySort
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(drawingOneRows);

      await service.extractAllFromJobCard(10, 1, { reapplyAnalysed: true });

      expect(mockLineItemRepo.buildMany).toHaveBeenCalledTimes(1);
    });

    it("does not match a line item when the only derived code is shorter than 4 chars", async () => {
      const tankData = storedTankResult().tankData;
      mockLineItemRepo.findForJobCardOrderedBySort.mockResolvedValue([
        {
          id: 1,
          jobCardId: 1,
          companyId: 10,
          itemNo: "ABC",
          itemCode: null,
          m2: null,
          liningM2: null,
        },
      ]);

      const filled = await (service as any).fillMatchingLineItemFromTank(10, 1, tankData, ["ABC"]);

      expect(filled).toBe(false);
      expect(mockLineItemRepo.saveMany).not.toHaveBeenCalled();
    });

    it("append path writes lining area to liningM2 and coating area to m2 (no double count)", async () => {
      mockJobCardRepo.findOneForCompany.mockResolvedValue({ id: 1, companyId: 10 });
      const attachment = analysedAttachment();
      attachment.originalFilename = "scan.pdf";
      mockAttachmentRepo.findForJobCard.mockResolvedValue([attachment]);
      mockLineItemRepo.findForJobCardOrderedBySort.mockResolvedValue([]);

      await service.extractAllFromJobCard(10, 1, { reapplyAnalysed: true });

      const rows = mockLineItemRepo.buildMany.mock.calls[0][0];
      const liningRow = rows.find((r: any) => (r.liningM2 ?? 0) > 0);
      const coatingRow = rows.find((r: any) => (r.m2 ?? 0) > 0);
      expect(liningRow.liningM2).toBe(12.5);
      expect(liningRow.m2 ?? null).toBeNull();
      expect(coatingRow.m2).toBe(18.25);
      expect(coatingRow.liningM2 ?? null).toBeNull();
    });

    it("fills liningM2 but leaves the existing m2 untouched when the tank has lining area only", async () => {
      mockJobCardRepo.findOneForCompany.mockResolvedValue({ id: 1, companyId: 10 });
      const attachment = analysedAttachment();
      const data = storedTankResult();
      (data.tankData as { coatingAreaM2: number | null }).coatingAreaM2 = null;
      attachment.extractedData = data;
      mockAttachmentRepo.findForJobCard.mockResolvedValue([attachment]);
      mockLineItemRepo.findForJobCardOrderedBySort.mockResolvedValue([
        {
          id: 42,
          jobCardId: 1,
          companyId: 10,
          itemNo: "CD1-6147",
          itemCode: null,
          m2: 7,
          liningM2: null,
          plateBom: null,
          tankComponents: null,
        },
      ]);

      await service.extractAllFromJobCard(10, 1, { reapplyAnalysed: true });

      const saved = mockLineItemRepo.saveMany.mock.calls[0][0][0];
      expect(saved.liningM2).toBe(12.5);
      expect(saved.m2).toBe(7);
      expect(mockLineItemRepo.buildMany).not.toHaveBeenCalled();
    });

    it("returns an empty result and writes nothing when there are no drawing attachments", async () => {
      mockJobCardRepo.findOneForCompany.mockResolvedValue({ id: 1, companyId: 10 });
      mockAttachmentRepo.findForJobCard.mockResolvedValue([]);

      const result = await service.extractAllFromJobCard(10, 1, { reapplyAnalysed: true });

      expect(result.totalLiningM2).toBe(0);
      expect(mockAiChatService.chat).not.toHaveBeenCalled();
      expect(mockLineItemRepo.buildMany).not.toHaveBeenCalled();
      expect(mockLineItemRepo.saveMany).not.toHaveBeenCalled();
    });

    it("skips an attachment still in PROCESSING during re-extract (no AI, no writes)", async () => {
      mockJobCardRepo.findOneForCompany.mockResolvedValue({ id: 1, companyId: 10 });
      const attachment = analysedAttachment();
      attachment.extractionStatus = ExtractionStatus.PROCESSING;
      mockAttachmentRepo.findForJobCard.mockResolvedValue([attachment]);

      const result = await service.extractAllFromJobCard(10, 1, { reapplyAnalysed: true });

      expect(result.totalLiningM2).toBe(0);
      expect(mockAiChatService.chat).not.toHaveBeenCalled();
      expect(mockAttachmentRepo.saveForCompany).not.toHaveBeenCalled();
      expect(mockLineItemRepo.buildMany).not.toHaveBeenCalled();
      expect(mockLineItemRepo.saveMany).not.toHaveBeenCalled();
    });
  });

  describe("parseAiResponse - hostile input clamping", () => {
    it("clamps out-of-range tank areas and coerces oversized plateParts", async () => {
      const aiResponse = {
        drawingType: "tank_chute",
        tankData: {
          assemblyType: "tank",
          drawingReference: "GPW-001",
          liningType: "rubber",
          liningThicknessMm: 6,
          liningAreaM2: 1e9,
          coatingAreaM2: -5,
          sections: [],
          plateParts: [
            {
              mark: "P1",
              description: "ok",
              thicknessMm: 10,
              lengthMm: 2400,
              widthMm: 1200,
              quantity: 1e9,
              liningThicknessMm: 6,
            },
            {
              mark: "P2",
              description: "huge",
              thicknessMm: 10,
              lengthMm: 1e9,
              widthMm: 1200,
              quantity: 2,
              liningThicknessMm: 6,
            },
            { mark: "P3", description: "no dims", thicknessMm: 10, quantity: 2 },
          ],
          components: [],
        },
        dimensions: [],
        confidence: 0.9,
      };

      jest.spyOn(service as any, "convertPdfToImages").mockResolvedValue([Buffer.from("img")]);
      mockAiChatService.chat.mockResolvedValue({ content: JSON.stringify(aiResponse) });

      const result = await service.extractFromPdfBuffers([
        { buffer: Buffer.from("pdf"), filename: "tank.pdf" },
      ]);

      expect(result.tankData!.liningAreaM2).toBeNull();
      expect(result.tankData!.coatingAreaM2).toBeNull();
      expect(result.tankData!.plateParts).toHaveLength(1);
      expect(result.tankData!.plateParts[0].mark).toBe("P1");
      expect(result.tankData!.plateParts[0].quantity).toBe(1000);
      expect(result.totalLiningM2).toBe(0);
    });
  });
});
