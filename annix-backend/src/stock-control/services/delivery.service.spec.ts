import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmTransactionContext } from "../../lib/persistence/transaction-context";
import { TransactionRunner } from "../../lib/persistence/transaction-runner";
import { SupplierInvoiceFifoBridgeService } from "../../stock-management/services/supplier-invoice-fifo-bridge.service";
import { STORAGE_SERVICE } from "../../storage/storage.interface";
import { DeliveryNote } from "../entities/delivery-note.entity";
import { DeliveryNoteItem } from "../entities/delivery-note-item.entity";
import { StockItem } from "../entities/stock-item.entity";
import { MovementType, ReferenceType, StockMovement } from "../entities/stock-movement.entity";
import { DeliveryNoteRepository } from "../repositories/delivery-note.repository";
import { DeliveryNoteItemRepository } from "../repositories/delivery-note-item.repository";
import { DnExtractionCorrectionRepository } from "../repositories/dn-extraction-correction.repository";
import { SupplierInvoiceRepository } from "../repositories/supplier-invoice.repository";
import { SupplierInvoiceItemRepository } from "../repositories/supplier-invoice-item.repository";
import { CpoService } from "./cpo.service";
import { DeliveryService } from "./delivery.service";
import { DeliveryExtractionService } from "./delivery-extraction.service";
import { DeliveryInvoiceService } from "./delivery-invoice.service";
import { DeliverySupplierService } from "./delivery-supplier.service";

describe("DeliveryService", () => {
  let service: DeliveryService;

  const mockManager = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    save: jest.fn().mockImplementation((_entity, data) => Promise.resolve({ id: 1, ...data })),
    remove: jest.fn(),
    create: jest.fn().mockImplementation((_entity, data) => ({ ...data })),
  };

  const mockDeliveryNoteTxRepo = {
    create: jest.fn().mockImplementation((data) => Promise.resolve({ id: 1, ...data })),
  };

  const mockDeliveryNoteItemTxRepo = {
    create: jest.fn().mockImplementation((data) => Promise.resolve({ id: 1, ...data })),
  };

  const mockDeliveryNoteRepo = {
    create: jest.fn().mockImplementation((data) => Promise.resolve({ id: 1, ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    findOneByNumber: jest.fn(),
    findOneForCompany: jest.fn(),
    findOneForCompanyWithItems: jest.fn(),
    findPaginatedWithItems: jest.fn().mockResolvedValue([]),
    findAllForCompanyByReceivedDate: jest.fn().mockResolvedValue([]),
    findAutoLinkCandidates: jest.fn().mockResolvedValue([]),
    withTransaction: jest.fn().mockReturnValue(mockDeliveryNoteTxRepo),
    remove: jest.fn(),
  };

  const mockDeliveryNoteItemRepo = {
    create: jest.fn().mockImplementation((data) => Promise.resolve({ id: 1, ...data })),
    createMany: jest.fn().mockResolvedValue([]),
    withTransaction: jest.fn().mockReturnValue(mockDeliveryNoteItemTxRepo),
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

  const mockTransactionRunner = {
    run: jest
      .fn()
      .mockImplementation((work) => work(new TypeOrmTransactionContext(mockManager as never))),
  };

  const mockFifoBridgeService = {
    createBatchesFromDelivery: jest.fn().mockResolvedValue({ created: 0, skipped: 0, errors: [] }),
    voidDeliveryBatches: jest.fn().mockResolvedValue(0),
  };

  const mockSupplierInvoiceRepo = {
    findCompletedLinkedToDeliveryNote: jest.fn().mockResolvedValue([]),
  };

  const mockSupplierInvoiceItemRepo = {
    findByInvoice: jest.fn().mockResolvedValue([]),
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
        { provide: TransactionRunner, useValue: mockTransactionRunner },
        { provide: DeliverySupplierService, useValue: mockSupplierService },
        { provide: DeliveryExtractionService, useValue: mockDeliveryExtractionService },
        { provide: DeliveryInvoiceService, useValue: mockDeliveryInvoiceService },
        { provide: SupplierInvoiceFifoBridgeService, useValue: mockFifoBridgeService },
        { provide: SupplierInvoiceRepository, useValue: mockSupplierInvoiceRepo },
        { provide: SupplierInvoiceItemRepository, useValue: mockSupplierInvoiceItemRepo },
      ],
    }).compile();

    service = module.get<DeliveryService>(DeliveryService);
    jest.clearAllMocks();
    mockDeliveryNoteRepo.withTransaction.mockReturnValue(mockDeliveryNoteTxRepo);
    mockDeliveryNoteItemRepo.withTransaction.mockReturnValue(mockDeliveryNoteItemTxRepo);
    mockTransactionRunner.run.mockImplementation((work) =>
      work(new TypeOrmTransactionContext(mockManager as never)),
    );
    mockDeliveryNoteTxRepo.create.mockImplementation((data) => Promise.resolve({ id: 1, ...data }));
    mockDeliveryNoteItemTxRepo.create.mockImplementation((data) =>
      Promise.resolve({ id: 1, ...data }),
    );
    mockManager.save.mockImplementation((_entity, data) => Promise.resolve({ id: 1, ...data }));
    mockManager.create.mockImplementation((_entity, data) => ({ ...data }));
    mockManager.find.mockResolvedValue([]);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("increments stock quantity for each delivered item", async () => {
      const stockItem = { id: 1, name: "Paint", quantity: 50 };
      mockManager.findOne.mockResolvedValue(stockItem);
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

      expect(mockManager.save).toHaveBeenCalledWith(
        StockItem,
        expect.objectContaining({ quantity: 70 }),
      );
    });

    it("creates IN movement for each delivered item", async () => {
      const stockItem = { id: 1, name: "Paint", quantity: 50 };
      mockManager.findOne.mockResolvedValue(stockItem);
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

      expect(mockManager.save).toHaveBeenCalledWith(
        StockMovement,
        expect.objectContaining({
          movementType: MovementType.IN,
          quantity: 20,
          referenceType: ReferenceType.DELIVERY,
        }),
      );
    });

    it("throws NotFoundException for missing stock item", async () => {
      mockManager.findOne.mockResolvedValue(null);
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
      mockManager.findOne.mockResolvedValueOnce(stockItem1).mockResolvedValueOnce(stockItem2);
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

      expect(mockTransactionRunner.run).toHaveBeenCalled();
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
      mockManager.find.mockResolvedValue([
        { id: 1, stockItem, quantity: 20, movementType: MovementType.IN },
      ]);
      mockManager.findOne.mockResolvedValue(stockItem);

      await service.remove(1, 1);

      expect(mockManager.save).toHaveBeenCalledWith(
        StockItem,
        expect.objectContaining({ quantity: 50 }),
      );
    });

    it("removes delivery note and items", async () => {
      const items = [{ id: 1 }, { id: 2 }];
      mockDeliveryNoteRepo.findOneForCompanyWithItems.mockResolvedValue({
        id: 1,
        items,
        photoUrl: null,
      });
      mockManager.find.mockResolvedValue([]);

      await service.remove(1, 1);

      expect(mockManager.remove).toHaveBeenCalledWith(DeliveryNoteItem, items);
      expect(mockManager.remove).toHaveBeenCalledWith(
        DeliveryNote,
        expect.objectContaining({ id: 1 }),
      );
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
