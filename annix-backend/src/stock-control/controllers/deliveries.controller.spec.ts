import { BadRequestException, InternalServerErrorException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { RubberCocExtractionService } from "../../rubber-lining/rubber-coc-extraction.service";
import { IdempotencyService } from "../../shared/services/idempotency.service";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlRoleGuard } from "../guards/stock-control-role.guard";
import { DeliveryService } from "../services/delivery.service";
import { DeliveriesController } from "./deliveries.controller";

describe("DeliveriesController", () => {
  let controller: DeliveriesController;
  let deliveryService: jest.Mocked<DeliveryService>;
  let extractionService: jest.Mocked<RubberCocExtractionService>;

  const mockReq = (companyId = 1) => ({
    user: { id: 10, companyId, name: "Test User" },
  });

  beforeEach(async () => {
    const mockDeliveryService = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      remove: jest.fn(),
      uploadPhoto: jest.fn(),
      extractFromPhoto: jest.fn(),
      extractionStatus: jest.fn(),
      linkExtractedItemsToStock: jest.fn(),
      createFromAnalyzedData: jest.fn(),
      createInvoiceFromAnalyzedData: jest.fn(),
    };

    const mockExtractionService = {
      analyzeDeliveryNotePdf: jest.fn(),
      analyzeDeliveryNotePhoto: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeliveriesController],
      providers: [
        { provide: DeliveryService, useValue: mockDeliveryService },
        { provide: RubberCocExtractionService, useValue: mockExtractionService },
        { provide: IdempotencyService, useValue: { check: jest.fn(), store: jest.fn() } },
      ],
    })
      .overrideGuard(StockControlAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(StockControlRoleGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DeliveriesController>(DeliveriesController);
    deliveryService = module.get(DeliveryService);
    extractionService = module.get(RubberCocExtractionService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("GET / (list)", () => {
    it("should parse pagination and delegate to deliveryService.findAll", async () => {
      const expected = { data: [], total: 0 };
      deliveryService.findAll.mockResolvedValue(expected as any);

      const result = await controller.list(mockReq(), "3", "25");

      expect(deliveryService.findAll).toHaveBeenCalledWith(1, 3, 25);
      expect(result).toBe(expected);
    });

    it("should default to page 1 and limit 50", async () => {
      deliveryService.findAll.mockResolvedValue({ data: [] } as any);

      await controller.list(mockReq());

      expect(deliveryService.findAll).toHaveBeenCalledWith(1, 1, 50);
    });

    it("should clamp page minimum to 1", async () => {
      deliveryService.findAll.mockResolvedValue({ data: [] } as any);

      await controller.list(mockReq(), "0");

      expect(deliveryService.findAll).toHaveBeenCalledWith(1, 1, 50);
    });

    it("should clamp limit maximum to 100", async () => {
      deliveryService.findAll.mockResolvedValue({ data: [] } as any);

      await controller.list(mockReq(), "1", "999");

      expect(deliveryService.findAll).toHaveBeenCalledWith(1, 1, 100);
    });
  });

  describe("GET /:id (findById)", () => {
    it("should delegate to deliveryService.findById", async () => {
      const note = { id: 5, noteNumber: "DN-001" };
      deliveryService.findById.mockResolvedValue(note as any);

      const result = await controller.findById(mockReq(), 5);

      expect(deliveryService.findById).toHaveBeenCalledWith(1, 5);
      expect(result).toBe(note);
    });
  });

  describe("POST / (create)", () => {
    it("should spread dto, convert receivedDate, add receivedBy and delegate", async () => {
      const dto = {
        noteNumber: "DN-001",
        supplier: "Supplier A",
        receivedDate: "2026-03-01T00:00:00Z",
        items: [],
      } as any;
      const created = { id: 1, noteNumber: "DN-001" };
      deliveryService.create.mockResolvedValue(created as any);

      const result = await controller.create(dto, mockReq());

      expect(deliveryService.create).toHaveBeenCalledWith(1, {
        ...dto,
        receivedDate: expect.any(Date),
        receivedBy: "Test User",
      });
      expect(result).toBe(created);
    });

    it("should pass null receivedDate when not provided", async () => {
      const dto = { noteNumber: "DN-002", supplier: "Supplier B", items: [] } as any;
      deliveryService.create.mockResolvedValue({ id: 2 } as any);

      await controller.create(dto, mockReq());

      expect(deliveryService.create).toHaveBeenCalledWith(1, {
        ...dto,
        receivedDate: null,
        receivedBy: "Test User",
      });
    });
  });

  describe("DELETE /:id (remove)", () => {
    it("should delegate to deliveryService.remove", async () => {
      deliveryService.remove.mockResolvedValue(undefined as any);

      await controller.remove(mockReq(), 5);

      expect(deliveryService.remove).toHaveBeenCalledWith(1, 5);
    });
  });

  describe("POST /:id/photo (uploadPhoto)", () => {
    it("should delegate to deliveryService.uploadPhoto", async () => {
      const file = { buffer: Buffer.from("photo") } as Express.Multer.File;
      const expected = { photoUrl: "https://example.com/photo.jpg" };
      deliveryService.uploadPhoto.mockResolvedValue(expected as any);

      const result = await controller.uploadPhoto(mockReq(), 5, file);

      expect(deliveryService.uploadPhoto).toHaveBeenCalledWith(1, 5, file);
      expect(result).toBe(expected);
    });
  });

  describe("POST /:id/extract (extractFromPhoto)", () => {
    it("should delegate to deliveryService.extractFromPhoto", async () => {
      const expected = { status: "processing" };
      deliveryService.extractFromPhoto.mockResolvedValue(expected as any);

      const result = await controller.extractFromPhoto(mockReq(), 5);

      expect(deliveryService.extractFromPhoto).toHaveBeenCalledWith(1, 5);
      expect(result).toBe(expected);
    });
  });

  describe("GET /:id/extraction (extractionStatus)", () => {
    it("should delegate to deliveryService.extractionStatus", async () => {
      const expected = { status: "complete", items: [] };
      deliveryService.extractionStatus.mockResolvedValue(expected as any);

      const result = await controller.extractionStatus(mockReq(), 5);

      expect(deliveryService.extractionStatus).toHaveBeenCalledWith(1, 5);
      expect(result).toBe(expected);
    });
  });

  describe("POST /:id/link-to-stock (linkExtractedToStock)", () => {
    it("should delegate to deliveryService.linkExtractedItemsToStock", async () => {
      const expected = { linked: 3 };
      deliveryService.linkExtractedItemsToStock.mockResolvedValue(expected as any);

      const result = await controller.linkExtractedToStock(mockReq(), 5);

      expect(deliveryService.linkExtractedItemsToStock).toHaveBeenCalledWith(1, 5, "Test User");
      expect(result).toBe(expected);
    });
  });

  describe("POST /analyze (analyzeDocument)", () => {
    it("should analyze a PDF file", async () => {
      const file = {
        buffer: Buffer.from("pdf-data"),
        mimetype: "application/pdf",
      } as Express.Multer.File;
      const expected = { lineItems: [] };
      extractionService.analyzeDeliveryNotePdf.mockResolvedValue(expected as any);

      const result = await controller.analyzeDocument(file);

      expect(extractionService.analyzeDeliveryNotePdf).toHaveBeenCalledWith(file.buffer);
      expect(result).toBe(expected);
    });

    it("should analyze an image file", async () => {
      const file = {
        buffer: Buffer.from("image-data"),
        mimetype: "image/jpeg",
      } as Express.Multer.File;
      const expected = { lineItems: [] };
      extractionService.analyzeDeliveryNotePhoto.mockResolvedValue(expected as any);

      const result = await controller.analyzeDocument(file);

      expect(extractionService.analyzeDeliveryNotePhoto).toHaveBeenCalledWith([file.buffer]);
      expect(result).toBe(expected);
    });

    it("should throw BadRequestException when no file provided", async () => {
      await expect(controller.analyzeDocument(null as any)).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException for unsupported file type", async () => {
      const file = {
        buffer: Buffer.from("data"),
        mimetype: "text/plain",
      } as Express.Multer.File;

      await expect(controller.analyzeDocument(file)).rejects.toThrow(BadRequestException);
    });
  });

  describe("POST /accept-analyzed (acceptAnalyzedDeliveryNote)", () => {
    it("should create a delivery note from analyzed data", async () => {
      const file = {
        buffer: Buffer.from("photo"),
        mimetype: "image/jpeg",
      } as Express.Multer.File;
      const analyzedData = JSON.stringify({ deliveryNoteNumber: "DN-001", lineItems: [] });
      const expected = { id: 1, noteNumber: "DN-001" };
      deliveryService.createFromAnalyzedData.mockResolvedValue(expected as any);

      const result = await controller.acceptAnalyzedDeliveryNote(mockReq(), file, analyzedData);

      expect(deliveryService.createFromAnalyzedData).toHaveBeenCalledWith(
        1,
        file,
        JSON.parse(analyzedData),
        "Test User",
      );
      expect(result).toBe(expected);
    });

    it("should create an invoice when documentType is SUPPLIER_INVOICE", async () => {
      const file = {
        buffer: Buffer.from("photo"),
        mimetype: "image/jpeg",
      } as Express.Multer.File;
      const analyzedData = JSON.stringify({ invoiceNumber: "INV-001" });
      const expected = { id: 1, invoiceNumber: "INV-001" };
      deliveryService.createInvoiceFromAnalyzedData.mockResolvedValue(expected as any);

      const result = await controller.acceptAnalyzedDeliveryNote(
        mockReq(),
        file,
        analyzedData,
        "SUPPLIER_INVOICE",
      );

      expect(deliveryService.createInvoiceFromAnalyzedData).toHaveBeenCalledWith(
        1,
        file,
        JSON.parse(analyzedData),
      );
      expect(result).toBe(expected);
    });

    it("should throw BadRequestException when no file provided", async () => {
      await expect(
        controller.acceptAnalyzedDeliveryNote(mockReq(), null as any, "{}"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when no analyzed data provided", async () => {
      const file = { buffer: Buffer.from("photo") } as Express.Multer.File;

      await expect(
        controller.acceptAnalyzedDeliveryNote(mockReq(), file, null as any),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw InternalServerErrorException on unexpected errors", async () => {
      const file = {
        buffer: Buffer.from("photo"),
        mimetype: "image/jpeg",
      } as Express.Multer.File;
      const analyzedData = JSON.stringify({ deliveryNoteNumber: "DN-001" });
      deliveryService.createFromAnalyzedData.mockRejectedValue(new Error("DB connection failed"));

      await expect(
        controller.acceptAnalyzedDeliveryNote(mockReq(), file, analyzedData),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
