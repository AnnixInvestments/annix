import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { AuditService } from "../../audit/audit.service";
import { STORAGE_SERVICE } from "../../storage/storage.interface";
import { DeliveryNote } from "../entities/delivery-note.entity";
import { InvoiceClarification } from "../entities/invoice-clarification.entity";
import { InvoiceExtractionStatus, SupplierInvoice } from "../entities/supplier-invoice.entity";
import { SupplierInvoiceItem } from "../entities/supplier-invoice-item.entity";
import { InvoiceService } from "./invoice.service";
import { InvoiceExtractionService } from "./invoice-extraction.service";

describe("InvoiceService", () => {
  let service: InvoiceService;

  const mockInvoiceRepo = {
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockInvoiceItemRepo = {
    count: jest.fn().mockResolvedValue(0),
  };

  const mockClarificationRepo = {
    count: jest.fn().mockResolvedValue(0),
  };

  const mockDeliveryNoteRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockStorageService = {
    upload: jest.fn().mockResolvedValue({
      url: "https://s3.example.com/invoice.pdf",
      path: "stock-control/invoices/invoice.pdf",
      originalFilename: "invoice.pdf",
      mimeType: "application/pdf",
      size: 10000,
    }),
    presignedUrl: jest.fn().mockResolvedValue("https://presigned.url/invoice.pdf"),
    download: jest.fn().mockResolvedValue(Buffer.from("fake-file-content")),
  };

  const mockExtractionService = {
    extractFromImage: jest.fn().mockResolvedValue({
      id: 1,
      extractionStatus: InvoiceExtractionStatus.AWAITING_APPROVAL,
    }),
    pendingClarifications: jest.fn().mockResolvedValue([]),
    processClarificationResponse: jest.fn().mockResolvedValue({ id: 1 }),
    skipClarification: jest.fn().mockResolvedValue({ id: 1 }),
    applyPriceUpdates: jest.fn().mockResolvedValue({
      id: 1,
      extractionStatus: InvoiceExtractionStatus.COMPLETED,
    }),
    autoLinkAllUnlinked: jest.fn().mockResolvedValue({ linked: 0, details: [] }),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(null),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceService,
        { provide: getRepositoryToken(SupplierInvoice), useValue: mockInvoiceRepo },
        { provide: getRepositoryToken(SupplierInvoiceItem), useValue: mockInvoiceItemRepo },
        { provide: getRepositoryToken(InvoiceClarification), useValue: mockClarificationRepo },
        { provide: getRepositoryToken(DeliveryNote), useValue: mockDeliveryNoteRepo },
        { provide: STORAGE_SERVICE, useValue: mockStorageService },
        { provide: InvoiceExtractionService, useValue: mockExtractionService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<InvoiceService>(InvoiceService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("creates an invoice with PENDING extraction status", async () => {
      const result = await service.create(1, {
        invoiceNumber: "INV-001",
        supplierName: "Acme Supplies",
      });

      expect(mockInvoiceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: 1,
          invoiceNumber: "INV-001",
          supplierName: "Acme Supplies",
          extractionStatus: InvoiceExtractionStatus.PENDING,
          deliveryNoteId: null,
        }),
      );
      expect(mockInvoiceRepo.save).toHaveBeenCalled();
      expect(result).toHaveProperty("id");
    });

    it("links to delivery note when deliveryNoteId is provided", async () => {
      mockDeliveryNoteRepo.findOne.mockResolvedValue({
        id: 5,
        companyId: 1,
        supplierName: "DN Supplier",
      });

      await service.create(1, {
        invoiceNumber: "INV-002",
        supplierName: "Override Supplier",
        deliveryNoteId: 5,
      });

      expect(mockDeliveryNoteRepo.findOne).toHaveBeenCalledWith({
        where: { id: 5, companyId: 1 },
      });
      expect(mockInvoiceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          deliveryNoteId: 5,
          supplierName: "Override Supplier",
        }),
      );
    });

    it("falls back to delivery note supplier name when dto supplierName is empty", async () => {
      mockDeliveryNoteRepo.findOne.mockResolvedValue({
        id: 5,
        companyId: 1,
        supplierName: "DN Supplier",
      });

      await service.create(1, {
        invoiceNumber: "INV-003",
        supplierName: "",
        deliveryNoteId: 5,
      });

      expect(mockInvoiceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          supplierName: "DN Supplier",
        }),
      );
    });

    it("throws NotFoundException when delivery note does not exist", async () => {
      mockDeliveryNoteRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create(1, {
          invoiceNumber: "INV-004",
          supplierName: "Supplier",
          deliveryNoteId: 999,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("parses invoiceDate from ISO string", async () => {
      await service.create(1, {
        invoiceNumber: "INV-005",
        supplierName: "Supplier",
        invoiceDate: "2025-06-15",
      });

      expect(mockInvoiceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          invoiceDate: expect.any(Date),
        }),
      );
    });

    it("sets invoiceDate to null when not provided", async () => {
      await service.create(1, {
        invoiceNumber: "INV-006",
        supplierName: "Supplier",
      });

      expect(mockInvoiceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          invoiceDate: null,
        }),
      );
    });
  });

  describe("findAll", () => {
    it("returns paginated invoices with presigned URLs", async () => {
      mockInvoiceRepo.find.mockResolvedValueOnce([]).mockResolvedValueOnce([
        { id: 1, scanUrl: "stock-control/invoices/scan1.pdf" },
        { id: 2, scanUrl: null },
      ]);

      const result = await service.findAll(1, 1, 50);

      expect(mockInvoiceRepo.find).toHaveBeenCalledWith({
        where: { companyId: 1 },
        relations: ["deliveryNote"],
        order: { createdAt: "DESC" },
        take: 50,
        skip: 0,
      });
      expect(result).toHaveLength(2);
      expect(mockStorageService.presignedUrl).toHaveBeenCalledWith(
        "stock-control/invoices/scan1.pdf",
        3600,
      );
    });

    it("applies correct offset for page 2", async () => {
      mockInvoiceRepo.find.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      await service.findAll(1, 2, 25);

      expect(mockInvoiceRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 25,
          skip: 25,
        }),
      );
    });
  });

  describe("findById", () => {
    it("returns invoice with resolved scan URL", async () => {
      mockInvoiceRepo.findOne.mockResolvedValue({
        id: 1,
        companyId: 1,
        scanUrl: "stock-control/invoices/scan.pdf",
        items: [],
        clarifications: [],
      });

      const result = await service.findById(1, 1);

      expect(mockInvoiceRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1, companyId: 1 },
        relations: ["deliveryNote", "items", "items.stockItem", "clarifications"],
      });
      expect(mockStorageService.presignedUrl).toHaveBeenCalledWith(
        "stock-control/invoices/scan.pdf",
        3600,
      );
      expect(result.scanUrl).toBe("https://presigned.url/invoice.pdf");
    });

    it("throws NotFoundException when invoice does not exist", async () => {
      mockInvoiceRepo.findOne.mockResolvedValue(null);

      await expect(service.findById(1, 999)).rejects.toThrow(NotFoundException);
    });

    it("refreshes expired presigned URLs", async () => {
      mockInvoiceRepo.findOne.mockResolvedValue({
        id: 1,
        companyId: 1,
        scanUrl:
          "https://bucket.s3.amazonaws.com/stock-control%2Finvoices%2Fscan.pdf?X-Amz-Expires=3600&other=params",
        items: [],
        clarifications: [],
      });

      await service.findById(1, 1);

      expect(mockStorageService.presignedUrl).toHaveBeenCalledWith(
        "stock-control/invoices/scan.pdf",
        3600,
      );
    });
  });

  describe("reExtract", () => {
    it("downloads file from S3 and triggers extraction", async () => {
      mockInvoiceRepo.findOne.mockResolvedValue({
        id: 1,
        companyId: 1,
        scanUrl: "stock-control/invoices/scan.pdf",
      });

      const result = await service.reExtract(1, 1);

      expect(mockStorageService.download).toHaveBeenCalledWith("stock-control/invoices/scan.pdf");
      expect(mockExtractionService.extractFromImage).toHaveBeenCalledWith(
        1,
        expect.any(String),
        "application/pdf",
      );
      expect(result.extractionStatus).toBe(InvoiceExtractionStatus.AWAITING_APPROVAL);
    });

    it("throws NotFoundException when invoice does not exist", async () => {
      mockInvoiceRepo.findOne.mockResolvedValue(null);

      await expect(service.reExtract(1, 999)).rejects.toThrow(NotFoundException);
    });

    it("throws NotFoundException when no scan is uploaded", async () => {
      mockInvoiceRepo.findOne.mockResolvedValue({
        id: 1,
        companyId: 1,
        scanUrl: null,
      });

      await expect(service.reExtract(1, 1)).rejects.toThrow("No scan uploaded");
    });

    it("extracts S3 key from full URL", async () => {
      mockInvoiceRepo.findOne.mockResolvedValue({
        id: 1,
        companyId: 1,
        scanUrl:
          "https://bucket.s3.amazonaws.com/stock-control%2Finvoices%2Fscan.jpg?X-Amz-Expires=3600",
      });

      await service.reExtract(1, 1);

      expect(mockStorageService.download).toHaveBeenCalledWith("stock-control/invoices/scan.jpg");
      expect(mockExtractionService.extractFromImage).toHaveBeenCalledWith(
        1,
        expect.any(String),
        "image/jpeg",
      );
    });

    it("logs audit event for re-extraction", async () => {
      mockInvoiceRepo.findOne.mockResolvedValue({
        id: 1,
        companyId: 1,
        scanUrl: "stock-control/invoices/scan.pdf",
      });

      await service.reExtract(1, 1);

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: "supplier_invoice",
          entityId: 1,
          newValues: { reExtracted: true },
        }),
      );
    });
  });

  describe("uploadScan", () => {
    it("uploads file and triggers extraction", async () => {
      mockInvoiceRepo.findOne.mockResolvedValue({
        id: 1,
        companyId: 1,
        scanUrl: null,
        items: [],
        clarifications: [],
      });

      const mockFile = {
        buffer: Buffer.from("fake-pdf-content"),
        mimetype: "application/pdf",
        originalname: "invoice.pdf",
      } as Express.Multer.File;

      await service.uploadScan(1, 1, mockFile);

      expect(mockStorageService.upload).toHaveBeenCalledWith(mockFile, "stock-control/invoices");
      expect(mockInvoiceRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          scanUrl: "stock-control/invoices/invoice.pdf",
        }),
      );
      expect(mockExtractionService.extractFromImage).toHaveBeenCalledWith(
        1,
        expect.any(String),
        "application/pdf",
      );
    });

    it("throws NotFoundException when invoice does not exist", async () => {
      mockInvoiceRepo.findOne.mockResolvedValue(null);

      const mockFile = {
        buffer: Buffer.from("fake"),
        mimetype: "image/jpeg",
        originalname: "scan.jpg",
      } as Express.Multer.File;

      await expect(service.uploadScan(1, 999, mockFile)).rejects.toThrow(NotFoundException);
    });
  });

  describe("linkScanPath", () => {
    it("updates the invoice scanUrl", async () => {
      await service.linkScanPath(1, "stock-control/invoices/new-path.pdf");

      expect(mockInvoiceRepo.update).toHaveBeenCalledWith(1, {
        scanUrl: "stock-control/invoices/new-path.pdf",
      });
    });
  });

  describe("pendingClarifications", () => {
    it("delegates to extraction service after verifying invoice exists", async () => {
      mockInvoiceRepo.findOne.mockResolvedValue({
        id: 1,
        companyId: 1,
        items: [],
        clarifications: [],
        scanUrl: null,
      });
      mockExtractionService.pendingClarifications.mockResolvedValue([
        { id: 10, question: "Match this item?" },
      ]);

      const result = await service.pendingClarifications(1, 1);

      expect(result).toHaveLength(1);
      expect(mockExtractionService.pendingClarifications).toHaveBeenCalledWith(1);
    });

    it("throws NotFoundException when invoice does not exist", async () => {
      mockInvoiceRepo.findOne.mockResolvedValue(null);

      await expect(service.pendingClarifications(1, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("submitClarification", () => {
    it("delegates to extraction service with response", async () => {
      mockInvoiceRepo.findOne.mockResolvedValue({
        id: 1,
        companyId: 1,
        items: [],
        clarifications: [],
        scanUrl: null,
      });

      const response = { selectedStockItemId: 42 };
      await service.submitClarification(1, 1, 10, response, 5);

      expect(mockExtractionService.processClarificationResponse).toHaveBeenCalledWith(
        10,
        response,
        5,
      );
    });
  });

  describe("skipClarification", () => {
    it("delegates to extraction service", async () => {
      mockInvoiceRepo.findOne.mockResolvedValue({
        id: 1,
        companyId: 1,
        items: [],
        clarifications: [],
        scanUrl: null,
      });

      await service.skipClarification(1, 1, 10, 5);

      expect(mockExtractionService.skipClarification).toHaveBeenCalledWith(10, 5);
    });
  });

  describe("approve", () => {
    it("applies price updates and logs audit event", async () => {
      mockInvoiceRepo.findOne.mockResolvedValue({
        id: 1,
        companyId: 1,
        items: [],
        clarifications: [],
        scanUrl: null,
      });

      const result = await service.approve(1, 1, 5);

      expect(mockExtractionService.applyPriceUpdates).toHaveBeenCalledWith(1, 5);
      expect(result.extractionStatus).toBe(InvoiceExtractionStatus.COMPLETED);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: "supplier_invoice",
          entityId: 1,
          newValues: expect.objectContaining({
            approvedByUserId: 5,
            extractionStatus: InvoiceExtractionStatus.COMPLETED,
          }),
        }),
      );
    });
  });

  describe("priceChangeSummary", () => {
    it("calculates price changes for matched items", async () => {
      mockInvoiceRepo.findOne.mockResolvedValue({
        id: 1,
        companyId: 1,
        scanUrl: null,
        clarifications: [],
        items: [
          {
            id: 1,
            stockItemId: 10,
            stockItem: { name: "Red Paint", costPerUnit: 100 },
            quantity: 5,
            unitPrice: 120,
            previousPrice: null,
            extractedDescription: "Red Paint 5L",
          },
          {
            id: 2,
            stockItemId: 20,
            stockItem: { name: "Blue Paint", costPerUnit: 200 },
            quantity: 3,
            unitPrice: 180,
            previousPrice: 200,
            extractedDescription: "Blue Paint 5L",
          },
        ],
      });

      const result = await service.priceChangeSummary(1, 1);

      expect(result.items).toHaveLength(2);
      expect(result.items[0].oldPrice).toBe(100);
      expect(result.items[0].newPrice).toBe(120);
      expect(result.items[0].changePercent).toBe(20);
      expect(result.items[0].needsApproval).toBe(false);
      expect(result.items[1].oldPrice).toBe(200);
      expect(result.items[1].newPrice).toBe(180);
      expect(result.items[1].changePercent).toBe(-10);
      expect(result.items[1].needsApproval).toBe(false);
      expect(result.totalOldValue).toBe(100 * 5 + 200 * 3);
      expect(result.totalNewValue).toBe(120 * 5 + 180 * 3);
    });

    it("flags items with price change exceeding 20%", async () => {
      mockInvoiceRepo.findOne.mockResolvedValue({
        id: 1,
        companyId: 1,
        scanUrl: null,
        clarifications: [],
        items: [
          {
            id: 1,
            stockItemId: 10,
            stockItem: { name: "Expensive Item", costPerUnit: 100 },
            quantity: 1,
            unitPrice: 150,
            previousPrice: null,
            extractedDescription: "Expensive",
          },
        ],
      });

      const result = await service.priceChangeSummary(1, 1);

      expect(result.items[0].changePercent).toBe(50);
      expect(result.items[0].needsApproval).toBe(true);
    });

    it("excludes items without stock item or with zero quantity", async () => {
      mockInvoiceRepo.findOne.mockResolvedValue({
        id: 1,
        companyId: 1,
        scanUrl: null,
        clarifications: [],
        items: [
          {
            id: 1,
            stockItemId: null,
            stockItem: null,
            quantity: 5,
            unitPrice: 100,
            previousPrice: null,
            extractedDescription: "Unmatched",
          },
          {
            id: 2,
            stockItemId: 10,
            stockItem: { name: "Zero Qty", costPerUnit: 50 },
            quantity: 0,
            unitPrice: 60,
            previousPrice: null,
            extractedDescription: "Zero",
          },
        ],
      });

      const result = await service.priceChangeSummary(1, 1);

      expect(result.items).toHaveLength(0);
    });
  });

  describe("remove", () => {
    it("removes the invoice", async () => {
      const invoice = {
        id: 1,
        companyId: 1,
        scanUrl: null,
        items: [],
        clarifications: [],
      };
      mockInvoiceRepo.findOne.mockResolvedValue(invoice);

      await service.remove(1, 1);

      expect(mockInvoiceRepo.remove).toHaveBeenCalledWith(invoice);
    });

    it("throws NotFoundException when invoice does not exist", async () => {
      mockInvoiceRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(1, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("reExtractAllFailed", () => {
    it("re-extracts all failed invoices with scans", async () => {
      mockInvoiceRepo.find.mockResolvedValue([
        { id: 1, invoiceNumber: "INV-001", scanUrl: "stock-control/invoices/scan1.pdf" },
        { id: 2, invoiceNumber: "INV-002", scanUrl: "stock-control/invoices/scan2.jpg" },
        { id: 3, invoiceNumber: "INV-003", scanUrl: null },
      ]);

      const result = await service.reExtractAllFailed(1);

      expect(mockStorageService.download).toHaveBeenCalledTimes(2);
      expect(mockExtractionService.extractFromImage).toHaveBeenCalledTimes(2);
      expect(result.triggered).toBe(2);
      expect(result.failed).toHaveLength(0);
    });

    it("reports failures without throwing", async () => {
      mockInvoiceRepo.find.mockResolvedValue([
        { id: 1, invoiceNumber: "INV-001", scanUrl: "stock-control/invoices/scan1.pdf" },
      ]);
      mockStorageService.download.mockRejectedValueOnce(new Error("S3 download failed"));

      const result = await service.reExtractAllFailed(1);

      expect(result.triggered).toBe(0);
      expect(result.failed).toEqual(["S3 download failed"]);
    });
  });

  describe("findUnlinked", () => {
    it("returns invoices without a delivery note", async () => {
      mockInvoiceRepo.find.mockResolvedValue([
        { id: 1, deliveryNoteId: null },
        { id: 2, deliveryNoteId: null },
      ]);

      const result = await service.findUnlinked(1);

      expect(result).toHaveLength(2);
      expect(mockInvoiceRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { companyId: 1, deliveryNoteId: expect.anything() },
        }),
      );
    });
  });

  describe("linkToDeliveryNote", () => {
    it("links invoice to delivery note and logs audit", async () => {
      mockInvoiceRepo.findOne.mockResolvedValue({
        id: 1,
        companyId: 1,
        deliveryNoteId: null,
        scanUrl: null,
        items: [],
        clarifications: [],
      });
      mockDeliveryNoteRepo.findOne.mockResolvedValue({
        id: 5,
        companyId: 1,
        deliveryNumber: "DN-001",
        supplierName: "Supplier",
      });

      await service.linkToDeliveryNote(1, 1, 5);

      expect(mockInvoiceRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          deliveryNoteId: 5,
        }),
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: "supplier_invoice",
          entityId: 1,
          oldValues: { deliveryNoteId: null },
          newValues: { deliveryNoteId: 5 },
        }),
      );
    });

    it("throws NotFoundException when delivery note does not exist", async () => {
      mockInvoiceRepo.findOne.mockResolvedValue({
        id: 1,
        companyId: 1,
        deliveryNoteId: null,
        scanUrl: null,
        items: [],
        clarifications: [],
      });
      mockDeliveryNoteRepo.findOne.mockResolvedValue(null);

      await expect(service.linkToDeliveryNote(1, 1, 999)).rejects.toThrow(NotFoundException);
    });

    it("throws NotFoundException when invoice does not exist", async () => {
      mockInvoiceRepo.findOne.mockResolvedValue(null);

      await expect(service.linkToDeliveryNote(1, 999, 5)).rejects.toThrow(NotFoundException);
    });
  });

  describe("autoLinkAllUnlinked", () => {
    it("delegates to extraction service", async () => {
      mockExtractionService.autoLinkAllUnlinked.mockResolvedValue({
        linked: 3,
        details: ["INV-001 -> DN-001"],
      });

      const result = await service.autoLinkAllUnlinked(1);

      expect(mockExtractionService.autoLinkAllUnlinked).toHaveBeenCalledWith(1);
      expect(result.linked).toBe(3);
    });
  });

  describe("suggestDeliveryNoteMatches", () => {
    it("suggests delivery notes matching by supplier name", async () => {
      mockInvoiceRepo.findOne.mockResolvedValue({
        id: 1,
        companyId: 1,
        supplierName: "Acme Supplies",
        invoiceDate: null,
        scanUrl: null,
        items: [],
        clarifications: [],
      });
      mockDeliveryNoteRepo.find.mockResolvedValue([
        {
          id: 10,
          deliveryNumber: "DN-001",
          supplierName: "Acme Supplies",
          receivedDate: new Date("2025-06-01"),
        },
        {
          id: 11,
          deliveryNumber: "DN-002",
          supplierName: "Other Supplier",
          receivedDate: new Date("2025-06-02"),
        },
      ]);

      const result = await service.suggestDeliveryNoteMatches(1, 1);

      expect(result).toHaveLength(1);
      expect(result[0].matchReason).toBe("Supplier name matches");
      expect(result[0].deliveryNumber).toBe("DN-001");
    });

    it("suggests delivery notes matching by date proximity", async () => {
      mockInvoiceRepo.findOne.mockResolvedValue({
        id: 1,
        companyId: 1,
        supplierName: "Unique Supplier",
        invoiceDate: new Date("2025-06-10"),
        scanUrl: null,
        items: [],
        clarifications: [],
      });
      mockDeliveryNoteRepo.find.mockResolvedValue([
        {
          id: 10,
          deliveryNumber: "DN-001",
          supplierName: "Other Supplier A",
          receivedDate: new Date("2025-06-08"),
        },
        {
          id: 11,
          deliveryNumber: "DN-002",
          supplierName: "Other Supplier B",
          receivedDate: new Date("2025-01-01"),
        },
      ]);

      const result = await service.suggestDeliveryNoteMatches(1, 1);

      expect(result).toHaveLength(1);
      expect(result[0].matchReason).toBe("Received within 14 days of invoice date");
    });

    it("does not duplicate suggestions matched by both supplier and date", async () => {
      mockInvoiceRepo.findOne.mockResolvedValue({
        id: 1,
        companyId: 1,
        supplierName: "Acme Supplies",
        invoiceDate: new Date("2025-06-10"),
        scanUrl: null,
        items: [],
        clarifications: [],
      });
      mockDeliveryNoteRepo.find.mockResolvedValue([
        {
          id: 10,
          deliveryNumber: "DN-001",
          supplierName: "Acme Supplies",
          receivedDate: new Date("2025-06-08"),
        },
      ]);

      const result = await service.suggestDeliveryNoteMatches(1, 1);

      expect(result).toHaveLength(1);
      expect(result[0].matchReason).toBe("Supplier name matches");
    });

    it("limits suggestions to 10", async () => {
      mockInvoiceRepo.findOne.mockResolvedValue({
        id: 1,
        companyId: 1,
        supplierName: "Acme",
        invoiceDate: null,
        scanUrl: null,
        items: [],
        clarifications: [],
      });

      const manyDeliveryNotes = Array.from({ length: 15 }, (_, i) => ({
        id: i + 1,
        deliveryNumber: `DN-${String(i + 1).padStart(3, "0")}`,
        supplierName: "Acme",
        receivedDate: new Date("2025-06-01"),
      }));
      mockDeliveryNoteRepo.find.mockResolvedValue(manyDeliveryNotes);

      const result = await service.suggestDeliveryNoteMatches(1, 1);

      expect(result.length).toBeLessThanOrEqual(10);
    });

    it("returns empty when no matches found", async () => {
      mockInvoiceRepo.findOne.mockResolvedValue({
        id: 1,
        companyId: 1,
        supplierName: "Nonexistent Supplier",
        invoiceDate: null,
        scanUrl: null,
        items: [],
        clarifications: [],
      });
      mockDeliveryNoteRepo.find.mockResolvedValue([
        {
          id: 10,
          deliveryNumber: "DN-001",
          supplierName: "Totally Different",
          receivedDate: null,
        },
      ]);

      const result = await service.suggestDeliveryNoteMatches(1, 1);

      expect(result).toHaveLength(0);
    });
  });
});
