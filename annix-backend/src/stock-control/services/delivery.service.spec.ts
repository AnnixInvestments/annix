import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { STORAGE_SERVICE } from "../../storage/storage.interface";
import { DeliveryNote } from "../entities/delivery-note.entity";
import { DeliveryNoteItem } from "../entities/delivery-note-item.entity";
import { StockItem } from "../entities/stock-item.entity";
import { MovementType, ReferenceType, StockMovement } from "../entities/stock-movement.entity";
import { CpoService } from "./cpo.service";
import { DeliveryService } from "./delivery.service";
import { DeliveryExtractionService } from "./delivery-extraction.service";
import { DeliveryInvoiceService } from "./delivery-invoice.service";
import { DeliverySupplierService } from "./delivery-supplier.service";

describe("DeliveryService", () => {
  let service: DeliveryService;

  const mockDeliveryNoteRepo = {
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
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

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((_entity, data) => Promise.resolve({ id: 1, ...data })),
      remove: jest.fn(),
      create: jest.fn().mockImplementation((_entity, data) => ({ ...data })),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryService,
        { provide: getRepositoryToken(DeliveryNote), useValue: mockDeliveryNoteRepo },
        { provide: STORAGE_SERVICE, useValue: mockStorageService },
        { provide: CpoService, useValue: mockCpoService },
        { provide: DataSource, useValue: mockDataSource },
        { provide: DeliverySupplierService, useValue: mockSupplierService },
        { provide: DeliveryExtractionService, useValue: mockDeliveryExtractionService },
        { provide: DeliveryInvoiceService, useValue: mockDeliveryInvoiceService },
      ],
    }).compile();

    service = module.get<DeliveryService>(DeliveryService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("increments stock quantity for each delivered item", async () => {
      const stockItem = { id: 1, name: "Paint", quantity: 50 };
      mockQueryRunner.manager.findOne.mockResolvedValue(stockItem);
      mockDeliveryNoteRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValue({ id: 1, items: [], photoUrl: null });

      await service.create(1, {
        deliveryNumber: "DN-001",
        supplierName: "Supplier A",
        items: [{ stockItemId: 1, quantityReceived: 20 }],
      });

      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        StockItem,
        expect.objectContaining({ quantity: 70 }),
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it("creates IN movement for each delivered item", async () => {
      const stockItem = { id: 1, name: "Paint", quantity: 50 };
      mockQueryRunner.manager.findOne.mockResolvedValue(stockItem);
      mockDeliveryNoteRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValue({ id: 1, items: [], photoUrl: null });

      await service.create(1, {
        deliveryNumber: "DN-001",
        supplierName: "Supplier A",
        items: [{ stockItemId: 1, quantityReceived: 20 }],
      });

      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        StockMovement,
        expect.objectContaining({
          movementType: MovementType.IN,
          quantity: 20,
          referenceType: ReferenceType.DELIVERY,
        }),
      );
    });

    it("throws NotFoundException for missing stock item", async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(null);
      mockDeliveryNoteRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.create(1, {
          deliveryNumber: "DN-001",
          supplierName: "Supplier A",
          items: [{ stockItemId: 999, quantityReceived: 10 }],
        }),
      ).rejects.toThrow(NotFoundException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it("handles multiple items in single delivery", async () => {
      const stockItem1 = { id: 1, name: "Paint A", quantity: 10 };
      const stockItem2 = { id: 2, name: "Paint B", quantity: 20 };
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(stockItem1)
        .mockResolvedValueOnce(stockItem2);
      mockDeliveryNoteRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValue({ id: 1, items: [], photoUrl: null });

      await service.create(1, {
        deliveryNumber: "DN-002",
        supplierName: "Supplier B",
        items: [
          { stockItemId: 1, quantityReceived: 5 },
          { stockItemId: 2, quantityReceived: 15 },
        ],
      });

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    it("reverses stock movements when deleting delivery", async () => {
      const stockItem = { id: 1, name: "Paint", quantity: 70 };
      mockDeliveryNoteRepo.findOne.mockResolvedValue({
        id: 1,
        items: [],
        photoUrl: null,
      });
      mockQueryRunner.manager.find.mockResolvedValue([
        { id: 1, stockItem, quantity: 20, movementType: MovementType.IN },
      ]);
      mockQueryRunner.manager.findOne.mockResolvedValue(stockItem);

      await service.remove(1, 1);

      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        StockItem,
        expect.objectContaining({ quantity: 50 }),
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it("removes delivery note and items", async () => {
      const items = [{ id: 1 }, { id: 2 }];
      mockDeliveryNoteRepo.findOne.mockResolvedValue({
        id: 1,
        items,
        photoUrl: null,
      });
      mockQueryRunner.manager.find.mockResolvedValue([]);

      await service.remove(1, 1);

      expect(mockQueryRunner.manager.remove).toHaveBeenCalledWith(DeliveryNoteItem, items);
      expect(mockQueryRunner.manager.remove).toHaveBeenCalledWith(
        DeliveryNote,
        expect.objectContaining({ id: 1 }),
      );
    });
  });

  describe("findById", () => {
    it("throws NotFoundException when delivery note not found", async () => {
      mockDeliveryNoteRepo.findOne.mockResolvedValue(null);

      await expect(service.findById(1, 999)).rejects.toThrow(NotFoundException);
    });

    it("adds presigned URL to photo", async () => {
      mockDeliveryNoteRepo.findOne.mockResolvedValue({
        id: 1,
        items: [],
        photoUrl: "stock-control/photo.jpg",
      });

      const result = await service.findById(1, 1);
      expect(mockStorageService.presignedUrl).toHaveBeenCalledWith(
        "stock-control/photo.jpg",
        3600,
      );
    });
  });

  describe("createFromAnalyzedData delegation", () => {
    it("delegates line item processing to extraction service", async () => {
      mockDeliveryNoteRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 1, items: [], photoUrl: null });
      mockDeliveryNoteRepo.save.mockResolvedValue({ id: 1 });

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
      mockDeliveryNoteRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 1, items: [], photoUrl: null });
      mockDeliveryNoteRepo.save.mockResolvedValue({ id: 1 });

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
