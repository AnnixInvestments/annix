import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AuditService } from "../../audit/audit.service";
import { TransactionRunner } from "../../lib/persistence/transaction-runner";
import { SupplierInvoiceFifoBridgeService } from "../../stock-management/services/supplier-invoice-fifo-bridge.service";
import { STORAGE_SERVICE } from "../../storage/storage.interface";
import { MovementType, ReferenceType } from "../entities/stock-movement.entity";
import { DeliveryNoteRepository } from "../repositories/delivery-note.repository";
import { DeliveryNoteItemRepository } from "../repositories/delivery-note-item.repository";
import { DnExtractionCorrectionRepository } from "../repositories/dn-extraction-correction.repository";
import { InvoiceClarificationRepository } from "../repositories/invoice-clarification.repository";
import { StockItemRepository } from "../repositories/stock-item.repository";
import { StockMovementRepository } from "../repositories/stock-movement.repository";
import { SupplierInvoiceRepository } from "../repositories/supplier-invoice.repository";
import { SupplierInvoiceItemRepository } from "../repositories/supplier-invoice-item.repository";
import { CpoService } from "./cpo.service";
import { DeliveryService } from "./delivery.service";
import { DeliveryExtractionService } from "./delivery-extraction.service";
import { DeliveryInvoiceService } from "./delivery-invoice.service";
import { DeliverySupplierService } from "./delivery-supplier.service";

describe("DeliveryService", () => {
  let service: DeliveryService;

  const mockDeliveryNoteRepo = {
    create: jest.fn().mockImplementation((data) => Promise.resolve({ id: 1, ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    findOneByNumber: jest.fn(),
    findOneForCompany: jest.fn(),
    findOneForCompanyWithItems: jest.fn(),
    findPaginatedWithItems: jest.fn().mockResolvedValue([]),
    findAllForCompanyByReceivedDate: jest.fn().mockResolvedValue([]),
    findAutoLinkCandidates: jest.fn().mockResolvedValue([]),
    remove: jest.fn(),
    withTransaction: jest.fn(),
  };
  mockDeliveryNoteRepo.withTransaction.mockReturnValue(mockDeliveryNoteRepo);

  const mockDeliveryNoteItemRepo = {
    create: jest.fn().mockImplementation((data) => Promise.resolve({ id: 1, ...data })),
    createMany: jest.fn().mockResolvedValue([]),
    remove: jest.fn(),
    withTransaction: jest.fn(),
  };
  mockDeliveryNoteItemRepo.withTransaction.mockReturnValue(mockDeliveryNoteItemRepo);

  const mockStockItemRepo = {
    findOneForCompany: jest.fn(),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...entity })),
    incrementQuantityForCompany: jest.fn().mockResolvedValue(true),
    decrementQuantityForCompany: jest.fn().mockResolvedValue(true),
    setQuantityForCompany: jest.fn().mockResolvedValue(true),
    withTransaction: jest.fn(),
  };
  mockStockItemRepo.withTransaction.mockReturnValue(mockStockItemRepo);

  const mockStockMovementRepo = {
    create: jest.fn().mockImplementation((data) => Promise.resolve({ id: 1, ...data })),
    findManyWhere: jest.fn().mockResolvedValue([]),
    remove: jest.fn(),
    withTransaction: jest.fn(),
  };
  mockStockMovementRepo.withTransaction.mockReturnValue(mockStockMovementRepo);

  const mockTxRunner = {
    run: jest.fn().mockImplementation((work) => work({})),
  };

  const mockInvoiceClarificationRepo = {
    deleteForInvoice: jest.fn().mockResolvedValue(undefined),
  };

  const mockDnCorrectionRepo = {
    findRecentForCompany: jest.fn().mockResolvedValue([]),
    createMany: jest.fn().mockResolvedValue([]),
  };

  const mockStorageService = {
    upload: jest.fn().mockResolvedValue({
      url: "https://s3.example.com/photo.jpg",
      path: "stock-control/photo.jpg",
      originalFilename: "photo.jpg",
      mimeType: "image/jpeg",
      size: 5000,
    }),
    presignedUrl: jest.fn().mockResolvedValue("https://presigned.url/photo.jpg"),
    download: jest.fn(),
  };

  const mockCpoService = {
    linkDeliveryToCalloffs: jest.fn().mockResolvedValue([]),
  };

  const mockSupplierService = {
    resolveOrCreateSupplier: jest.fn().mockResolvedValue({ id: 1, name: "Supplier" }),
    findMatchingStockItem: jest.fn().mockResolvedValue({ existingItem: null, sameSupplier: false }),
    normalizeForComparison: jest.fn((text: string) =>
      text
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .trim(),
    ),
  };

  const mockDeliveryExtractionService = {
    extractFromPhoto: jest.fn().mockResolvedValue(undefined),
    linkExtractedItemsToStock: jest.fn().mockResolvedValue(undefined),
    createStockItemsFromExtracted: jest.fn().mockResolvedValue(undefined),
    calculateItemMetrics: jest.fn(),
    generateSku: jest.fn(
      (item: { itemCode?: string }) => item.itemCode?.toUpperCase().replace(/\s+/g, "-") || "ITEM",
    ),
    inferMediaTypeFromUrl: jest.fn().mockReturnValue("image/jpeg"),
  };

  const mockDeliveryInvoiceService = {
    createFromAnalyzedData: jest.fn().mockResolvedValue({ id: 1 }),
    mimeToMediaType: jest.fn().mockReturnValue("image/jpeg"),
  };

  const mockFifoBridgeService = {
    createBatchesFromDelivery: jest.fn().mockResolvedValue({ created: 0, skipped: 0, errors: [] }),
    voidDeliveryBatches: jest.fn().mockResolvedValue(0),
  };

  const mockSupplierInvoiceRepo = {
    findCompletedLinkedToDeliveryNote: jest.fn().mockResolvedValue([]),
    findManyWhere: jest.fn().mockResolvedValue([]),
    remove: jest.fn(),
  };

  const mockSupplierInvoiceItemRepo = {
    findByInvoice: jest.fn().mockResolvedValue([]),
    deleteByInvoice: jest.fn().mockResolvedValue(undefined),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryService,
        { provide: DeliveryNoteRepository, useValue: mockDeliveryNoteRepo },
        { provide: DeliveryNoteItemRepository, useValue: mockDeliveryNoteItemRepo },
        { provide: DnExtractionCorrectionRepository, useValue: mockDnCorrectionRepo },
        { provide: STORAGE_SERVICE, useValue: mockStorageService },
        { provide: CpoService, useValue: mockCpoService },
        { provide: DeliverySupplierService, useValue: mockSupplierService },
        { provide: DeliveryExtractionService, useValue: mockDeliveryExtractionService },
        { provide: DeliveryInvoiceService, useValue: mockDeliveryInvoiceService },
        { provide: SupplierInvoiceFifoBridgeService, useValue: mockFifoBridgeService },
        { provide: SupplierInvoiceRepository, useValue: mockSupplierInvoiceRepo },
        { provide: SupplierInvoiceItemRepository, useValue: mockSupplierInvoiceItemRepo },
        { provide: StockItemRepository, useValue: mockStockItemRepo },
        { provide: StockMovementRepository, useValue: mockStockMovementRepo },
        { provide: InvoiceClarificationRepository, useValue: mockInvoiceClarificationRepo },
        { provide: TransactionRunner, useValue: mockTxRunner },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<DeliveryService>(DeliveryService);
    jest.clearAllMocks();
    mockDeliveryNoteRepo.create.mockImplementation((data) => Promise.resolve({ id: 1, ...data }));
    mockDeliveryNoteRepo.withTransaction.mockReturnValue(mockDeliveryNoteRepo);
    mockDeliveryNoteItemRepo.create.mockImplementation((data) =>
      Promise.resolve({ id: 1, ...data }),
    );
    mockDeliveryNoteItemRepo.withTransaction.mockReturnValue(mockDeliveryNoteItemRepo);
    mockStockItemRepo.save.mockImplementation((entity) => Promise.resolve({ ...entity }));
    mockStockItemRepo.withTransaction.mockReturnValue(mockStockItemRepo);
    mockStockItemRepo.incrementQuantityForCompany.mockResolvedValue(true);
    mockStockItemRepo.decrementQuantityForCompany.mockResolvedValue(true);
    mockStockItemRepo.setQuantityForCompany.mockResolvedValue(true);
    mockStockMovementRepo.create.mockImplementation((data) => Promise.resolve({ id: 1, ...data }));
    mockStockMovementRepo.withTransaction.mockReturnValue(mockStockMovementRepo);
    mockStockMovementRepo.findManyWhere.mockResolvedValue([]);
    mockTxRunner.run.mockImplementation((work) => work({}));
    mockSupplierInvoiceRepo.findCompletedLinkedToDeliveryNote.mockResolvedValue([]);
    mockSupplierInvoiceRepo.findManyWhere.mockResolvedValue([]);
    mockSupplierInvoiceItemRepo.findByInvoice.mockResolvedValue([]);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("increments stock quantity for each delivered item", async () => {
      const stockItem = { id: 1, name: "Paint", quantity: 50 };
      mockStockItemRepo.findOneForCompany.mockResolvedValue(stockItem);
      mockDeliveryNoteRepo.findOneByNumber.mockResolvedValue(null);
      mockDeliveryNoteRepo.findOneForCompanyWithItems.mockResolvedValue({
        id: 1,
        items: [],
        photoUrl: null,
      });

      await service.create(1, {
        deliveryNumber: "DN-001",
        supplierName: "Supplier A",
        items: [{ stockItemId: 1, quantityReceived: 20 }],
      });

      expect(mockStockItemRepo.incrementQuantityForCompany).toHaveBeenCalledWith(1, 1, 20);
    });

    it("creates IN movement for each delivered item", async () => {
      const stockItem = { id: 1, name: "Paint", quantity: 50 };
      mockStockItemRepo.findOneForCompany.mockResolvedValue(stockItem);
      mockDeliveryNoteRepo.findOneByNumber.mockResolvedValue(null);
      mockDeliveryNoteRepo.findOneForCompanyWithItems.mockResolvedValue({
        id: 1,
        items: [],
        photoUrl: null,
      });

      await service.create(1, {
        deliveryNumber: "DN-001",
        supplierName: "Supplier A",
        items: [{ stockItemId: 1, quantityReceived: 20 }],
      });

      expect(mockStockMovementRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          stockItemId: 1,
          movementType: MovementType.IN,
          quantity: 20,
          referenceType: ReferenceType.DELIVERY,
          referenceId: 1,
        }),
      );
    });

    it("throws NotFoundException for missing stock item", async () => {
      mockStockItemRepo.findOneForCompany.mockResolvedValue(null);
      mockDeliveryNoteRepo.findOneByNumber.mockResolvedValue(null);

      await expect(
        service.create(1, {
          deliveryNumber: "DN-001",
          supplierName: "Supplier A",
          items: [{ stockItemId: 999, quantityReceived: 10 }],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("handles multiple items in single delivery", async () => {
      const stockItem1 = { id: 1, name: "Paint A", quantity: 10 };
      const stockItem2 = { id: 2, name: "Paint B", quantity: 20 };
      mockStockItemRepo.findOneForCompany
        .mockResolvedValueOnce(stockItem1)
        .mockResolvedValueOnce(stockItem2);
      mockDeliveryNoteRepo.findOneByNumber.mockResolvedValue(null);
      mockDeliveryNoteRepo.findOneForCompanyWithItems.mockResolvedValue({
        id: 1,
        items: [],
        photoUrl: null,
      });

      await service.create(1, {
        deliveryNumber: "DN-002",
        supplierName: "Supplier B",
        items: [
          { stockItemId: 1, quantityReceived: 5 },
          { stockItemId: 2, quantityReceived: 15 },
        ],
      });

      expect(mockDeliveryNoteItemRepo.create).toHaveBeenCalledTimes(2);
      expect(mockStockMovementRepo.create).toHaveBeenCalledTimes(2);
    });
  });

  describe("remove", () => {
    it("reverses stock movements when deleting delivery", async () => {
      const stockItem = { id: 1, name: "Paint", quantity: 70 };
      mockDeliveryNoteRepo.findOneForCompanyWithItems.mockResolvedValue({
        id: 1,
        items: [],
        photoUrl: null,
      });
      const movement = { id: 1, stockItemId: 1, quantity: 20, movementType: MovementType.IN };
      mockStockMovementRepo.findManyWhere.mockResolvedValue([movement]);
      mockStockItemRepo.findOneForCompany.mockResolvedValue(stockItem);

      await service.remove(1, 1);

      expect(mockStockItemRepo.decrementQuantityForCompany).toHaveBeenCalledWith(1, 1, 20, false);
      expect(mockStockMovementRepo.remove).toHaveBeenCalledWith(movement);
    });

    it("removes delivery note and items", async () => {
      const items = [{ id: 1 }, { id: 2 }];
      mockDeliveryNoteRepo.findOneForCompanyWithItems.mockResolvedValue({
        id: 1,
        items,
        photoUrl: null,
      });
      mockStockMovementRepo.findManyWhere.mockResolvedValue([]);

      await service.remove(1, 1);

      expect(mockDeliveryNoteItemRepo.remove).toHaveBeenCalledWith(items[0]);
      expect(mockDeliveryNoteItemRepo.remove).toHaveBeenCalledWith(items[1]);
      expect(mockDeliveryNoteRepo.remove).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    });

    it("removes linked supplier invoices with their items and clarifications", async () => {
      mockDeliveryNoteRepo.findOneForCompanyWithItems.mockResolvedValue({
        id: 1,
        items: [],
        photoUrl: null,
      });
      mockStockMovementRepo.findManyWhere.mockResolvedValue([]);
      const invoice = { id: 7, deliveryNoteId: 1 };
      mockSupplierInvoiceRepo.findManyWhere
        .mockResolvedValueOnce([invoice])
        .mockResolvedValueOnce([invoice]);

      await service.remove(1, 1);

      expect(mockSupplierInvoiceItemRepo.deleteByInvoice).toHaveBeenCalledTimes(1);
      expect(mockSupplierInvoiceItemRepo.deleteByInvoice).toHaveBeenCalledWith(7);
      expect(mockInvoiceClarificationRepo.deleteForInvoice).toHaveBeenCalledWith(7);
      expect(mockSupplierInvoiceRepo.remove).toHaveBeenCalledWith(invoice);
    });
  });

  describe("findById", () => {
    it("throws NotFoundException when delivery note not found", async () => {
      mockDeliveryNoteRepo.findOneForCompanyWithItems.mockResolvedValue(null);

      await expect(service.findById(1, 999)).rejects.toThrow(NotFoundException);
    });

    it("adds presigned URL to photo", async () => {
      mockDeliveryNoteRepo.findOneForCompanyWithItems.mockResolvedValue({
        id: 1,
        items: [],
        photoUrl: "stock-control/photo.jpg",
      });

      await service.findById(1, 1);
      expect(mockStorageService.presignedUrl).toHaveBeenCalledWith("stock-control/photo.jpg", 3600);
    });
  });

  describe("createFromAnalyzedData delegation", () => {
    it("delegates line item processing to extraction service", async () => {
      mockDeliveryNoteRepo.findOneByNumber.mockResolvedValue(null);
      mockDeliveryNoteRepo.findOneForCompanyWithItems.mockResolvedValue({
        id: 1,
        items: [],
        photoUrl: null,
      });
      mockDeliveryNoteRepo.create.mockResolvedValue({ id: 1 });

      const lineItems = [
        {
          description: "PAINT RED returned",
          isReturned: true,
          quantity: 5,
          itemCode: "PAINT-RED",
        },
      ];

      const file = { size: 1000, buffer: Buffer.from(""), originalname: "dn.jpg" } as any;
      await service.createFromAnalyzedData(1, file, {
        deliveryNoteNumber: "DN-003",
        fromCompany: { name: "Supplier" },
        lineItems,
      });

      expect(mockDeliveryExtractionService.createStockItemsFromExtracted).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ id: 1 }),
        lineItems,
        undefined,
      );
    });

    it("resolves supplier via supplier service", async () => {
      mockDeliveryNoteRepo.findOneByNumber.mockResolvedValue(null);
      mockDeliveryNoteRepo.findOneForCompanyWithItems.mockResolvedValue({
        id: 1,
        items: [],
        photoUrl: null,
      });
      mockDeliveryNoteRepo.create.mockResolvedValue({ id: 1 });

      const file = { size: 1000, buffer: Buffer.from(""), originalname: "dn.jpg" } as any;
      await service.createFromAnalyzedData(1, file, {
        deliveryNoteNumber: "DN-004",
        fromCompany: { name: "Test Supplier" },
      });

      expect(mockSupplierService.resolveOrCreateSupplier).toHaveBeenCalledWith(
        1,
        "Test Supplier",
        expect.any(Object),
      );
    });

    it("delegates invoice creation to invoice service", async () => {
      const file = { size: 1000, buffer: Buffer.from(""), originalname: "inv.pdf" } as any;
      const analyzedData = {
        invoiceNumber: "INV-001",
        fromCompany: { name: "Supplier" },
      };

      await service.createInvoiceFromAnalyzedData(1, file, analyzedData);

      expect(mockDeliveryInvoiceService.createFromAnalyzedData).toHaveBeenCalledWith(
        1,
        file,
        analyzedData,
      );
    });
  });
});
