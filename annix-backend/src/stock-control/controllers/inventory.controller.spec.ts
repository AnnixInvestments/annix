import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlRoleGuard } from "../guards/stock-control-role.guard";
import { InventoryService } from "../services/inventory.service";
import { ItemIdentificationService } from "../services/item-identification.service";
import { PriceHistoryService } from "../services/price-history.service";
import { InventoryController } from "./inventory.controller";

describe("InventoryController", () => {
  let controller: InventoryController;
  let inventoryService: jest.Mocked<InventoryService>;
  let itemIdentificationService: jest.Mocked<ItemIdentificationService>;
  let priceHistoryService: jest.Mocked<PriceHistoryService>;

  const mockReq = (companyId = 1) => ({
    user: { id: 10, companyId, name: "Test User", email: "test@example.com" },
  });

  beforeEach(async () => {
    const mockInventoryService = {
      findAll: jest.fn(),
      lowStockAlerts: jest.fn(),
      categories: jest.fn(),
      groupedByCategory: jest.fn(),
      findByIdWithPhoto: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      uploadPhoto: jest.fn(),
    };

    const mockItemIdentificationService = {
      identifyFromPhoto: jest.fn(),
    };

    const mockPriceHistoryService = {
      historyForItem: jest.fn(),
      priceStatistics: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [
        { provide: InventoryService, useValue: mockInventoryService },
        { provide: ItemIdentificationService, useValue: mockItemIdentificationService },
        { provide: PriceHistoryService, useValue: mockPriceHistoryService },
      ],
    })
      .overrideGuard(StockControlAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(StockControlRoleGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<InventoryController>(InventoryController);
    inventoryService = module.get(InventoryService);
    itemIdentificationService = module.get(ItemIdentificationService);
    priceHistoryService = module.get(PriceHistoryService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("GET / (list)", () => {
    it("should delegate to inventoryService.findAll with filters", async () => {
      const expected = { data: [], total: 0 };
      inventoryService.findAll.mockResolvedValue(expected as any);

      const result = await controller.list(mockReq(), "rubber", "true", "pipe", "2", "25");

      expect(inventoryService.findAll).toHaveBeenCalledWith(1, {
        category: "rubber",
        belowMinStock: "true",
        search: "pipe",
        page: "2",
        limit: "25",
      });
      expect(result).toBe(expected);
    });

    it("should pass undefined filters when none provided", async () => {
      inventoryService.findAll.mockResolvedValue({ data: [] } as any);

      await controller.list(mockReq());

      expect(inventoryService.findAll).toHaveBeenCalledWith(1, {
        category: undefined,
        belowMinStock: undefined,
        search: undefined,
        page: undefined,
        limit: undefined,
      });
    });
  });

  describe("GET /low-stock", () => {
    it("should delegate to inventoryService.lowStockAlerts", async () => {
      const alerts = [{ id: 1, name: "Low item" }];
      inventoryService.lowStockAlerts.mockResolvedValue(alerts as any);

      const result = await controller.lowStock(mockReq());

      expect(inventoryService.lowStockAlerts).toHaveBeenCalledWith(1);
      expect(result).toBe(alerts);
    });
  });

  describe("GET /categories", () => {
    it("should delegate to inventoryService.categories", async () => {
      const categories = ["rubber", "steel"];
      inventoryService.categories.mockResolvedValue(categories as any);

      const result = await controller.categories(mockReq());

      expect(inventoryService.categories).toHaveBeenCalledWith(1);
      expect(result).toBe(categories);
    });
  });

  describe("GET /grouped", () => {
    it("should parse query params and delegate to service", async () => {
      const grouped = { groups: [] };
      inventoryService.groupedByCategory.mockResolvedValue(grouped as any);

      const result = await controller.grouped(mockReq(), "search term", "5", "2", "100");

      expect(inventoryService.groupedByCategory).toHaveBeenCalledWith(1, "search term", 5, 2, 100);
      expect(result).toBe(grouped);
    });

    it("should use defaults when no query params", async () => {
      inventoryService.groupedByCategory.mockResolvedValue({} as any);

      await controller.grouped(mockReq());

      expect(inventoryService.groupedByCategory).toHaveBeenCalledWith(
        1,
        undefined,
        undefined,
        1,
        500,
      );
    });

    it("should throw BadRequestException for invalid locationId", async () => {
      await expect(controller.grouped(mockReq(), undefined, "-1")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException for non-integer locationId", async () => {
      await expect(controller.grouped(mockReq(), undefined, "abc")).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("GET /:id (findById)", () => {
    it("should delegate to inventoryService.findByIdWithPhoto", async () => {
      const item = { id: 5, name: "Pipe" };
      inventoryService.findByIdWithPhoto.mockResolvedValue(item as any);

      const result = await controller.findById(mockReq(), 5);

      expect(inventoryService.findByIdWithPhoto).toHaveBeenCalledWith(1, 5);
      expect(result).toBe(item);
    });
  });

  describe("POST / (create)", () => {
    it("should delegate to inventoryService.create", async () => {
      const dto = { name: "New Item", sku: "NI-001" } as any;
      const created = { id: 1, ...dto };
      inventoryService.create.mockResolvedValue(created as any);

      const result = await controller.create(mockReq(), dto);

      expect(inventoryService.create).toHaveBeenCalledWith(1, dto);
      expect(result).toBe(created);
    });
  });

  describe("PUT /:id (update)", () => {
    it("should delegate to inventoryService.update", async () => {
      const dto = { name: "Updated Item" } as any;
      const updated = { id: 5, ...dto };
      inventoryService.update.mockResolvedValue(updated as any);

      const result = await controller.update(mockReq(), 5, dto);

      expect(inventoryService.update).toHaveBeenCalledWith(1, 5, dto);
      expect(result).toBe(updated);
    });
  });

  describe("DELETE /:id (remove)", () => {
    it("should delegate to inventoryService.remove", async () => {
      inventoryService.remove.mockResolvedValue(undefined as any);

      await controller.remove(mockReq(), 5);

      expect(inventoryService.remove).toHaveBeenCalledWith(1, 5);
    });
  });

  describe("POST /:id/photo (uploadPhoto)", () => {
    it("should delegate to inventoryService.uploadPhoto", async () => {
      const file = { buffer: Buffer.from("photo"), mimetype: "image/jpeg" } as Express.Multer.File;
      const expected = { photoUrl: "https://s3.example.com/photo.jpg" };
      inventoryService.uploadPhoto.mockResolvedValue(expected as any);

      const result = await controller.uploadPhoto(mockReq(), 5, file);

      expect(inventoryService.uploadPhoto).toHaveBeenCalledWith(1, 5, file);
      expect(result).toBe(expected);
    });
  });

  describe("POST /identify-photo", () => {
    it("should convert file to base64 and delegate to itemIdentificationService", async () => {
      const file = {
        buffer: Buffer.from("image-data"),
        mimetype: "image/jpeg",
      } as Express.Multer.File;
      const expected = { items: [{ name: "Rubber sheet" }] };
      itemIdentificationService.identifyFromPhoto.mockResolvedValue(expected as any);

      const result = await controller.identifyFromPhoto(mockReq(), file, "some context");

      expect(itemIdentificationService.identifyFromPhoto).toHaveBeenCalledWith(
        1,
        Buffer.from("image-data").toString("base64"),
        "image/jpeg",
        "some context",
      );
      expect(result).toBe(expected);
    });
  });

  describe("GET /:id/price-history", () => {
    it("should delegate to priceHistoryService.historyForItem", async () => {
      const history = [{ price: 100, date: "2026-01-01" }];
      priceHistoryService.historyForItem.mockResolvedValue(history as any);

      const result = await controller.priceHistory(mockReq(), 5);

      expect(priceHistoryService.historyForItem).toHaveBeenCalledWith(1, 5);
      expect(result).toBe(history);
    });
  });

  describe("GET /:id/price-statistics", () => {
    it("should delegate to priceHistoryService.priceStatistics", async () => {
      const stats = { avg: 100, min: 50, max: 150 };
      priceHistoryService.priceStatistics.mockResolvedValue(stats as any);

      const result = await controller.priceStatistics(mockReq(), 5);

      expect(priceHistoryService.priceStatistics).toHaveBeenCalledWith(1, 5);
      expect(result).toBe(stats);
    });
  });
});
