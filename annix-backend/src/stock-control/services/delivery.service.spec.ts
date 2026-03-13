import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { STORAGE_SERVICE } from "../../storage/storage.interface";
import { DeliveryNote } from "../entities/delivery-note.entity";
import { DeliveryNoteItem } from "../entities/delivery-note-item.entity";
import { StockControlSupplier } from "../entities/stock-control-supplier.entity";
import { StockItem } from "../entities/stock-item.entity";
import { MovementType, ReferenceType, StockMovement } from "../entities/stock-movement.entity";
import { SupplierInvoice } from "../entities/supplier-invoice.entity";
import { CpoService } from "./cpo.service";
import { DeliveryService } from "./delivery.service";
import { InvoiceExtractionService } from "./invoice-extraction.service";

describe("DeliveryService", () => {
  let service: DeliveryService;

  const mockDeliveryNoteRepo = {
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
  };

  const mockDeliveryNoteItemRepo = {
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockStockItemRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
  };

  const mockMovementRepo = {
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
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
    getPresignedUrl: jest.fn().mockResolvedValue("https://presigned.url/photo.jpg"),
    download: jest.fn(),
  };

  const mockExtractionService = {
    extractDeliveryNoteFromImage: jest.fn(),
  };

  const mockInvoiceRepo = {
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockSupplierRepo = {
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    }),
  };

  const mockCpoService = {
    linkDeliveryToCalloffs: jest.fn().mockResolvedValue([]),
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
        { provide: getRepositoryToken(DeliveryNoteItem), useValue: mockDeliveryNoteItemRepo },
        { provide: getRepositoryToken(StockItem), useValue: mockStockItemRepo },
        { provide: getRepositoryToken(StockMovement), useValue: mockMovementRepo },
        { provide: getRepositoryToken(SupplierInvoice), useValue: mockInvoiceRepo },
        { provide: getRepositoryToken(StockControlSupplier), useValue: mockSupplierRepo },
        { provide: STORAGE_SERVICE, useValue: mockStorageService },
        { provide: InvoiceExtractionService, useValue: mockExtractionService },
        { provide: CpoService, useValue: mockCpoService },
        { provide: DataSource, useValue: mockDataSource },
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
      expect(mockStorageService.getPresignedUrl).toHaveBeenCalledWith(
        "stock-control/photo.jpg",
        3600,
      );
    });
  });

  describe("handleReturnedItem (via create)", () => {
    it("reduces stock for returned items found in stock", async () => {
      const stockItem = { id: 1, name: "Paint", sku: "PAINT-RED", quantity: 50 };
      mockStockItemRepo.findOne.mockResolvedValue(stockItem);
      mockStockItemRepo.save.mockResolvedValue(stockItem);
      mockDeliveryNoteRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 1, items: [], photoUrl: null });
      mockDeliveryNoteRepo.save.mockResolvedValue({ id: 1 });

      const file = { size: 1000, buffer: Buffer.from(""), originalname: "dn.jpg" } as any;
      await service.createFromAnalyzedData(1, file, {
        deliveryNoteNumber: "DN-003",
        fromCompany: { name: "Supplier" },
        lineItems: [
          {
            description: "PAINT RED returned",
            isReturned: true,
            quantity: 5,
            itemCode: "PAINT-RED",
          },
        ],
      });

      expect(mockStockItemRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ quantity: 45 }),
      );
    });

    it("skips returned items not in stock", async () => {
      mockStockItemRepo.findOne.mockResolvedValue(null);
      mockDeliveryNoteRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 1, items: [], photoUrl: null });
      mockDeliveryNoteRepo.save.mockResolvedValue({ id: 1 });

      const file = { size: 1000, buffer: Buffer.from(""), originalname: "dn.jpg" } as any;
      await service.createFromAnalyzedData(1, file, {
        deliveryNoteNumber: "DN-004",
        fromCompany: { name: "Supplier" },
        lineItems: [
          {
            description: "UNKNOWN ITEM returned",
            isReturned: true,
            quantity: 3,
            itemCode: "UNKNOWN",
          },
        ],
      });

      expect(mockMovementRepo.save).not.toHaveBeenCalled();
    });
  });

  describe("paint handling", () => {
    it("calculates totalLiters for paint items", async () => {
      mockStockItemRepo.findOne.mockResolvedValue(null);
      mockStockItemRepo.find.mockResolvedValue([]);
      mockDeliveryNoteRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 1, items: [], photoUrl: null });
      mockDeliveryNoteRepo.save.mockResolvedValue({ id: 1 });
      mockDeliveryNoteItemRepo.createQueryBuilder.mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      });

      const file = { size: 1000, buffer: Buffer.from(""), originalname: "dn.jpg" } as any;
      await service.createFromAnalyzedData(1, file, {
        deliveryNoteNumber: "DN-005",
        fromCompany: { name: "Supplier" },
        lineItems: [
          {
            description: "PENGUARD EXPRESS MIO",
            isPaint: true,
            quantity: 2,
            volumeLitersPerPack: 20,
            totalLiters: 40,
            costPerLiter: 150,
            itemCode: "PEM-001",
          },
        ],
      });

      expect(mockStockItemRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          quantity: 40,
          unitOfMeasure: "L",
          category: "Paint",
        }),
      );
    });
  });
});
