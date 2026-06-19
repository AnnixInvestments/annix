import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { NixLearningRepository } from "../../nix/nix-learning.repository";
import { STORAGE_SERVICE } from "../../storage/storage.interface";
import { DeliveryNoteItemRepository } from "../repositories/delivery-note-item.repository";
import { StockAllocationRepository } from "../repositories/stock-allocation.repository";
import { StockIssuanceRepository } from "../repositories/stock-issuance.repository";
import { StockItemRepository } from "../repositories/stock-item.repository";
import { StockMovementRepository } from "../repositories/stock-movement.repository";
import { DeliverySupplierService } from "./delivery-supplier.service";
import { InventoryService } from "./inventory.service";
import { RequisitionService } from "./requisition.service";

describe("InventoryService", () => {
  let service: InventoryService;

  const mockStockItemRepo = {
    create: jest.fn().mockImplementation((data) => Promise.resolve({ id: 1, ...data })),
    build: jest.fn().mockImplementation((data) => ({ ...data })),
    buildMany: jest.fn().mockImplementation((rows) => rows),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    saveMany: jest
      .fn()
      .mockImplementation((entities) =>
        Promise.resolve(entities.map((e: object, i: number) => ({ id: i + 1, ...e }))),
      ),
    remove: jest.fn().mockResolvedValue(null),
    findOneForCompany: jest.fn(),
    findOneForCompanyWithRelations: jest.fn(),
    findByIdsForCompanyOrderedByName: jest.fn().mockResolvedValue([]),
    findAllForCompanyOrderedByName: jest.fn().mockResolvedValue([]),
    findFilteredForCompany: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    searchForCompany: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    groupedForCompany: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    lowStockForCompany: jest.fn().mockResolvedValue([]),
    categoriesForCompany: jest.fn().mockResolvedValue([]),
    updateByIdForCompany: jest.fn().mockResolvedValue(undefined),
  };

  const mockStorageService = {
    presignedUrl: jest.fn().mockResolvedValue("https://signed-url.example.com/photo.jpg"),
    upload: jest.fn().mockResolvedValue({ path: "stock-control/inventory/photo.jpg" }),
  };

  const mockRequisitionService = {
    createReorderRequisition: jest.fn().mockResolvedValue(null),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: StockItemRepository, useValue: mockStockItemRepo },
        {
          provide: NixLearningRepository,
          useValue: {
            save: jest.fn(),
            build: jest.fn((data: unknown) => data),
            findActiveCorrectionsByCategory: jest.fn().mockResolvedValue([]),
            findActiveCorrectionsByCategoryOrderedByConfidence: jest.fn().mockResolvedValue([]),
            findActiveCorrectionsByCategoryTopByConfidence: jest.fn().mockResolvedValue([]),
            findOneCorrectionByPatternKeyCategoryAndValue: jest.fn(),
            findActiveCorrectionByPatternKeyAndCategory: jest.fn(),
            findOneByIdAndCategory: jest.fn(),
          },
        },
        {
          provide: StockMovementRepository,
          useValue: {
            build: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            findManyWhere: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: DeliveryNoteItemRepository,
          useValue: {
            create: jest.fn(),
            createMany: jest.fn(),
            save: jest.fn(),
            findManyWhere: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: StockAllocationRepository,
          useValue: {
            find: jest.fn().mockResolvedValue([]),
            update: jest.fn(),
            save: jest.fn(),
            findManyWhere: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: StockIssuanceRepository,
          useValue: { save: jest.fn(), findManyWhere: jest.fn().mockResolvedValue([]) },
        },
        { provide: STORAGE_SERVICE, useValue: mockStorageService },
        { provide: RequisitionService, useValue: mockRequisitionService },
        { provide: AiChatService, useValue: { chat: jest.fn().mockResolvedValue("") } },
        {
          provide: DeliverySupplierService,
          useValue: {
            scoreCandidates: jest.fn().mockReturnValue([]),
            normaliseSupplierName: jest.fn().mockReturnValue(""),
          },
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("creates a stock item with companyId", async () => {
      const data = { name: "Widget", sku: "W-001", quantity: 100 };
      mockStockItemRepo.create.mockResolvedValue({ id: 1, ...data, companyId: 1 });

      const result = await service.create(1, data);

      expect(mockStockItemRepo.create).toHaveBeenCalledWith({ ...data, companyId: 1 });
      expect(result).toEqual(expect.objectContaining({ name: "Widget", companyId: 1 }));
    });
  });

  describe("findById", () => {
    it("returns the item when found", async () => {
      const item = { id: 5, companyId: 1, name: "Bolt", allocations: [], movements: [] };
      mockStockItemRepo.findOneForCompanyWithRelations.mockResolvedValue(item);

      const result = await service.findById(1, 5);

      expect(result).toEqual(item);
      expect(mockStockItemRepo.findOneForCompanyWithRelations).toHaveBeenCalledWith(5, 1, [
        "allocations",
        "movements",
      ]);
    });

    it("throws NotFoundException when item does not exist", async () => {
      mockStockItemRepo.findOneForCompanyWithRelations.mockResolvedValue(null);

      await expect(service.findById(1, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("findByIdWithPhoto", () => {
    it("returns item with refreshed photo URL", async () => {
      const item = {
        id: 1,
        companyId: 1,
        name: "Gasket",
        photoUrl: "stock-control/photo.jpg",
        allocations: [],
        movements: [],
      };
      mockStockItemRepo.findOneForCompanyWithRelations.mockResolvedValue(item);
      mockStorageService.presignedUrl.mockResolvedValue("https://signed.example.com/photo.jpg");

      const result = await service.findByIdWithPhoto(1, 1);

      expect(result.photoUrl).toBe("https://signed.example.com/photo.jpg");
    });
  });

  describe("findByIds", () => {
    it("returns items matching the given ids", async () => {
      const items = [
        { id: 1, companyId: 1, name: "A" },
        { id: 3, companyId: 1, name: "C" },
      ];
      mockStockItemRepo.findByIdsForCompanyOrderedByName.mockResolvedValue(items);

      const result = await service.findByIds(1, [1, 3]);

      expect(result).toEqual(items);
      expect(mockStockItemRepo.findByIdsForCompanyOrderedByName).toHaveBeenCalledWith([1, 3], 1);
    });
  });

  describe("findAll", () => {
    it("returns paginated items", async () => {
      const items = [{ id: 1, name: "Item A", photoUrl: null }];
      mockStockItemRepo.findFilteredForCompany.mockResolvedValue({ items, total: 1 });

      const result = await service.findAll(1, { page: "1", limit: "10" });

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
    });

    it("passes category filter to the repository", async () => {
      await service.findAll(1, { category: "Fasteners" });

      expect(mockStockItemRepo.findFilteredForCompany).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ category: "Fasteners" }),
        expect.any(Number),
        expect.any(Number),
      );
    });

    it("passes belowMinStock filter to the repository", async () => {
      await service.findAll(1, { belowMinStock: "true" });

      expect(mockStockItemRepo.findFilteredForCompany).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ belowMinStock: true }),
        expect.any(Number),
        expect.any(Number),
      );
    });

    it("delegates to search when search param provided", async () => {
      mockStockItemRepo.searchForCompany.mockResolvedValue({
        items: [{ id: 1, name: "Bolt", photoUrl: null }],
        total: 1,
      });

      const result = await service.findAll(1, { search: "bolt" });

      expect(mockStockItemRepo.searchForCompany).toHaveBeenCalled();
      expect(result.total).toBe(1);
    });
  });

  describe("update", () => {
    it("updates item fields and preserves existing photo when no new photo", async () => {
      const existing = {
        id: 1,
        companyId: 1,
        name: "Old Name",
        photoUrl: "existing/photo.jpg",
        minStockLevel: 0,
        quantity: 50,
        allocations: [],
        movements: [],
      };
      mockStockItemRepo.findOneForCompanyWithRelations.mockResolvedValue({ ...existing });
      mockStockItemRepo.save.mockResolvedValue({ ...existing, name: "New Name" });

      const result = await service.update(1, 1, { name: "New Name" });

      expect(mockStockItemRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: "New Name", photoUrl: "existing/photo.jpg" }),
      );
      expect(result).toBeDefined();
    });

    it("updates photo when provided", async () => {
      const existing = {
        id: 1,
        companyId: 1,
        name: "Item",
        photoUrl: "old/photo.jpg",
        minStockLevel: 0,
        quantity: 50,
        allocations: [],
        movements: [],
      };
      mockStockItemRepo.findOneForCompanyWithRelations.mockResolvedValue({ ...existing });
      mockStockItemRepo.save.mockResolvedValue({ ...existing, photoUrl: "new/photo.jpg" });

      await service.update(1, 1, { photoUrl: "new/photo.jpg" });

      expect(mockStockItemRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ photoUrl: "new/photo.jpg" }),
      );
    });

    it("triggers reorder when quantity falls below minStockLevel", async () => {
      const existing = {
        id: 1,
        companyId: 1,
        name: "Item",
        photoUrl: null,
        minStockLevel: 20,
        quantity: 50,
        allocations: [],
        movements: [],
      };
      mockStockItemRepo.findOneForCompanyWithRelations.mockResolvedValue({ ...existing });
      mockStockItemRepo.save.mockResolvedValue({ ...existing, quantity: 10, minStockLevel: 20 });

      await service.update(1, 1, { quantity: 10 });

      expect(mockRequisitionService.createReorderRequisition).toHaveBeenCalledWith(1, 1);
    });

    it("does not trigger reorder when quantity is above minStockLevel", async () => {
      const existing = {
        id: 1,
        companyId: 1,
        name: "Item",
        photoUrl: null,
        minStockLevel: 5,
        quantity: 50,
        allocations: [],
        movements: [],
      };
      mockStockItemRepo.findOneForCompanyWithRelations.mockResolvedValue({ ...existing });
      mockStockItemRepo.save.mockResolvedValue({ ...existing });

      await service.update(1, 1, { name: "Renamed" });

      expect(mockRequisitionService.createReorderRequisition).not.toHaveBeenCalled();
    });

    it("throws NotFoundException when item does not exist", async () => {
      mockStockItemRepo.findOneForCompanyWithRelations.mockResolvedValue(null);

      await expect(service.update(1, 999, { name: "X" })).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("removes the item", async () => {
      const item = { id: 1, companyId: 1, name: "Gasket", allocations: [], movements: [] };
      mockStockItemRepo.findOneForCompanyWithRelations.mockResolvedValue(item);

      await service.remove(1, 1);

      expect(mockStockItemRepo.remove).toHaveBeenCalledWith(item);
    });

    it("throws NotFoundException when item does not exist", async () => {
      mockStockItemRepo.findOneForCompanyWithRelations.mockResolvedValue(null);

      await expect(service.remove(1, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("adjustQuantity", () => {
    beforeEach(() => {
      mockStockItemRepo.save.mockImplementation((entity) => Promise.resolve({ ...entity }));
    });

    it("adds positive delta to quantity", async () => {
      const item = { id: 1, companyId: 1, quantity: 50, minStockLevel: 0, photoUrl: null };
      mockStockItemRepo.findOneForCompany.mockResolvedValue(item);

      const result = await service.adjustQuantity(1, 1, 10);

      expect(mockStockItemRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ quantity: 60 }),
      );
      expect(result).toBeDefined();
    });

    it("subtracts negative delta from quantity", async () => {
      const item = { id: 1, companyId: 1, quantity: 50, minStockLevel: 0, photoUrl: null };
      mockStockItemRepo.findOneForCompany.mockResolvedValue(item);

      await service.adjustQuantity(1, 1, -10);

      expect(mockStockItemRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ quantity: 40 }),
      );
    });

    it("clamps quantity to zero (never negative)", async () => {
      const item = { id: 1, companyId: 1, quantity: 3, minStockLevel: 0, photoUrl: null };
      mockStockItemRepo.findOneForCompany.mockResolvedValue(item);

      await service.adjustQuantity(1, 1, -20);

      expect(mockStockItemRepo.save).toHaveBeenCalledWith(expect.objectContaining({ quantity: 0 }));
    });

    it("throws NotFoundException when item not found", async () => {
      mockStockItemRepo.findOneForCompany.mockResolvedValue(null);

      await expect(service.adjustQuantity(1, 999, 5)).rejects.toThrow(NotFoundException);
    });

    it("propagates repository errors", async () => {
      mockStockItemRepo.findOneForCompany.mockRejectedValue(new Error("DB error"));

      await expect(service.adjustQuantity(1, 1, 5)).rejects.toThrow("DB error");
    });

    it("triggers reorder when negative delta drops below minStockLevel", async () => {
      const item = { id: 1, companyId: 1, quantity: 20, minStockLevel: 15, photoUrl: null };
      mockStockItemRepo.findOneForCompany.mockResolvedValue(item);

      await service.adjustQuantity(1, 1, -10);

      expect(mockRequisitionService.createReorderRequisition).toHaveBeenCalledWith(1, 1);
    });

    it("does not trigger reorder for positive delta", async () => {
      const item = { id: 1, companyId: 1, quantity: 5, minStockLevel: 20, photoUrl: null };
      mockStockItemRepo.findOneForCompany.mockResolvedValue(item);

      await service.adjustQuantity(1, 1, 10);

      expect(mockRequisitionService.createReorderRequisition).not.toHaveBeenCalled();
    });

    it("does not trigger reorder when minStockLevel is zero", async () => {
      const item = { id: 1, companyId: 1, quantity: 5, minStockLevel: 0, photoUrl: null };
      mockStockItemRepo.findOneForCompany.mockResolvedValue(item);

      await service.adjustQuantity(1, 1, -5);

      expect(mockRequisitionService.createReorderRequisition).not.toHaveBeenCalled();
    });
  });

  describe("photo URL handling", () => {
    it("generates presigned URL for S3 path without protocol", async () => {
      const item = {
        id: 1,
        companyId: 1,
        name: "Item",
        photoUrl: "stock-control/photo.jpg",
        allocations: [],
        movements: [],
      };
      mockStockItemRepo.findOneForCompanyWithRelations.mockResolvedValue(item);
      mockStorageService.presignedUrl.mockResolvedValue("https://signed.example.com/photo.jpg");

      const result = await service.findByIdWithPhoto(1, 1);

      expect(mockStorageService.presignedUrl).toHaveBeenCalledWith("stock-control/photo.jpg", 3600);
      expect(result.photoUrl).toBe("https://signed.example.com/photo.jpg");
    });

    it("re-signs expired presigned S3 URL by extracting path", async () => {
      const expiredUrl =
        "https://bucket.s3.amazonaws.com/stock-control%2Fphoto.jpg?X-Amz-Signature=abc123&X-Amz-Expires=3600";
      const item = {
        id: 1,
        companyId: 1,
        name: "Item",
        photoUrl: expiredUrl,
        allocations: [],
        movements: [],
      };
      mockStockItemRepo.findOneForCompanyWithRelations.mockResolvedValue(item);
      mockStorageService.presignedUrl.mockResolvedValue(
        "https://signed.example.com/new-signed.jpg",
      );

      const result = await service.findByIdWithPhoto(1, 1);

      expect(mockStorageService.presignedUrl).toHaveBeenCalledWith("stock-control/photo.jpg", 3600);
      expect(result.photoUrl).toBe("https://signed.example.com/new-signed.jpg");
    });

    it("does not modify external https URLs without S3 signatures", async () => {
      const item = {
        id: 1,
        companyId: 1,
        name: "Item",
        photoUrl: "https://external.com/image.png",
        allocations: [],
        movements: [],
      };
      mockStockItemRepo.findOneForCompanyWithRelations.mockResolvedValue(item);

      const result = await service.findByIdWithPhoto(1, 1);

      expect(mockStorageService.presignedUrl).not.toHaveBeenCalled();
      expect(result.photoUrl).toBe("https://external.com/image.png");
    });

    it("does not modify null photoUrl", async () => {
      const item = {
        id: 1,
        companyId: 1,
        name: "Item",
        photoUrl: null,
        allocations: [],
        movements: [],
      };
      mockStockItemRepo.findOneForCompanyWithRelations.mockResolvedValue(item);

      const result = await service.findByIdWithPhoto(1, 1);

      expect(mockStorageService.presignedUrl).not.toHaveBeenCalled();
      expect(result.photoUrl).toBeNull();
    });
  });

  describe("uploadPhoto", () => {
    it("uploads file and updates item photoUrl", async () => {
      const item = {
        id: 1,
        companyId: 1,
        name: "Item",
        photoUrl: null,
        allocations: [],
        movements: [],
      };
      mockStockItemRepo.findOneForCompanyWithRelations.mockResolvedValue(item);
      mockStorageService.upload.mockResolvedValue({ path: "stock-control/inventory/new.jpg" });
      mockStockItemRepo.save.mockResolvedValue({
        ...item,
        photoUrl: "stock-control/inventory/new.jpg",
      });
      mockStorageService.presignedUrl.mockResolvedValue("https://signed.example.com/new.jpg");

      const file = { originalname: "photo.jpg", buffer: Buffer.from("img") } as Express.Multer.File;
      const result = await service.uploadPhoto(1, 1, file);

      expect(mockStorageService.upload).toHaveBeenCalledWith(file, "stock-control/inventory");
      expect(result.photoUrl).toBe("https://signed.example.com/new.jpg");
    });

    it("throws NotFoundException when item does not exist", async () => {
      mockStockItemRepo.findOneForCompanyWithRelations.mockResolvedValue(null);

      const file = { originalname: "photo.jpg", buffer: Buffer.from("img") } as Express.Multer.File;
      await expect(service.uploadPhoto(1, 999, file)).rejects.toThrow(NotFoundException);
    });
  });

  describe("lowStockAlerts", () => {
    it("returns items below min stock level", async () => {
      const items = [{ id: 1, name: "Low Item", quantity: 2, minStockLevel: 10, photoUrl: null }];
      mockStockItemRepo.lowStockForCompany.mockResolvedValue(items);

      const result = await service.lowStockAlerts(1);

      expect(result).toEqual(items);
    });
  });

  describe("categories", () => {
    it("returns distinct categories", async () => {
      mockStockItemRepo.categoriesForCompany.mockResolvedValue(["Adhesives", "Fasteners"]);

      const result = await service.categories(1);

      expect(result).toEqual(["Adhesives", "Fasteners"]);
    });
  });

  describe("groupedByCategory", () => {
    it("groups items by category", async () => {
      const items = [
        { id: 1, name: "Bolt", category: "Fasteners", photoUrl: null },
        { id: 2, name: "Nut", category: "Fasteners", photoUrl: null },
        { id: 3, name: "Tape", category: "Adhesives", photoUrl: null },
      ];
      mockStockItemRepo.groupedForCompany.mockResolvedValue({ items, total: 3 });

      const result = await service.groupedByCategory(1);

      expect(result.groups).toHaveLength(2);
      expect(result.groups[0].category).toBe("Fasteners");
      expect(result.groups[0].items).toHaveLength(2);
      expect(result.groups[1].category).toBe("Adhesives");
      expect(result.total).toBe(3);
    });

    it("places Uncategorized group at the end", async () => {
      const items = [
        { id: 2, name: "Bolt", category: "Fasteners", photoUrl: null },
        { id: 1, name: "Unknown", category: null, photoUrl: null },
        { id: 3, name: "Tape", category: "Adhesives", photoUrl: null },
      ];
      mockStockItemRepo.groupedForCompany.mockResolvedValue({ items, total: 2 });

      const result = await service.groupedByCategory(1);

      const lastGroup = result.groups[result.groups.length - 1];
      expect(lastGroup.category).toBe("Uncategorized");
    });

    it("passes search filter to the repository", async () => {
      await service.groupedByCategory(1, "bolt");

      expect(mockStockItemRepo.groupedForCompany).toHaveBeenCalledWith(
        1,
        "bolt",
        null,
        expect.any(Number),
        expect.any(Number),
      );
    });

    it("passes location filter to the repository", async () => {
      await service.groupedByCategory(1, undefined, 5);

      expect(mockStockItemRepo.groupedForCompany).toHaveBeenCalledWith(
        1,
        undefined,
        5,
        expect.any(Number),
        expect.any(Number),
      );
    });
  });

  describe("bulkCreate", () => {
    it("creates multiple items with companyId", async () => {
      const items = [
        { name: "A", sku: "A-001" },
        { name: "B", sku: "B-001" },
      ];

      const result = await service.bulkCreate(1, items);

      expect(result).toHaveLength(2);
      expect(mockStockItemRepo.buildMany).toHaveBeenCalledWith([
        { ...items[0], companyId: 1 },
        { ...items[1], companyId: 1 },
      ]);
      expect(mockStockItemRepo.saveMany).toHaveBeenCalled();
    });
  });
});
