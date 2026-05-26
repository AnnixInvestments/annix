import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { now } from "../lib/datetime";
import {
  PumpProduct,
  PumpProductCategory,
  PumpProductStatus,
} from "./entities/pump-product.entity";
import { PumpProductRepository } from "./pump-product.repository";
import { PumpProductService } from "./pump-product.service";

describe("PumpProductService", () => {
  let service: PumpProductService;

  const mockProduct: PumpProduct = {
    id: 1,
    sku: "KSB-ETN-50-200",
    title: "KSB Etanorm 50-200",
    description: "Single-stage end suction pump",
    pumpType: "end_suction",
    category: PumpProductCategory.CENTRIFUGAL,
    status: PumpProductStatus.ACTIVE,
    manufacturer: "KSB",
    modelNumber: "ETN 50-200",
    api610Type: null,
    flowRateMin: 20,
    flowRateMax: 100,
    headMin: 20,
    headMax: 65,
    maxTemperature: null,
    maxPressure: null,
    suctionSize: null,
    dischargeSize: null,
    casingMaterial: null,
    impellerMaterial: null,
    shaftMaterial: null,
    sealType: null,
    motorPowerKw: 7.5,
    voltage: null,
    frequency: null,
    weightKg: null,
    certifications: ["ISO 9001", "CE"],
    applications: ["water_supply", "hvac"],
    baseCost: null,
    listPrice: 45000,
    markupPercentage: 15,
    leadTimeDays: null,
    stockQuantity: 3,
    datasheetUrl: null,
    imageUrl: null,
    specifications: null,
    pumpCurveData: null,
    notes: null,
    supplierId: null,
    supplier: null,
    createdAt: now().toJSDate(),
    updatedAt: now().toJSDate(),
  };

  const mockProductRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    findOneWhere: jest.fn(),
    findManyWhere: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
    findBySku: jest.fn(),
    searchPaged: jest.fn(),
    findByCategory: jest.fn(),
    findByManufacturerLike: jest.fn(),
    manufacturers: jest.fn(),
    fullTextSearchPaged: jest.fn(),
    findByIdList: jest.fn(),
    findSimilarProducts: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PumpProductService,
        {
          provide: PumpProductRepository,
          useValue: mockProductRepository,
        },
      ],
    }).compile();

    service = module.get<PumpProductService>(PumpProductService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a new product", async () => {
      mockProductRepository.findBySku.mockResolvedValue(null);
      mockProductRepository.create.mockResolvedValue(mockProduct);

      const createDto = {
        sku: "KSB-ETN-50-200",
        title: "KSB Etanorm 50-200",
        pumpType: "end_suction",
        category: PumpProductCategory.CENTRIFUGAL,
        manufacturer: "KSB",
      };

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(mockProductRepository.create).toHaveBeenCalled();
    });

    it("should throw BadRequestException for duplicate SKU", async () => {
      mockProductRepository.findBySku.mockResolvedValue(mockProduct);

      const createDto = {
        sku: "KSB-ETN-50-200",
        title: "Duplicate Product",
        pumpType: "end_suction",
        category: PumpProductCategory.CENTRIFUGAL,
        manufacturer: "KSB",
      };

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe("findAll", () => {
    it("should return paginated products", async () => {
      mockProductRepository.searchPaged.mockResolvedValue({ items: [mockProduct], total: 1 });

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toBeDefined();
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockProductRepository.searchPaged).toHaveBeenCalled();
    });

    it("should apply search filter", async () => {
      mockProductRepository.searchPaged.mockResolvedValue({ items: [mockProduct], total: 1 });

      await service.findAll({ search: "KSB" });

      expect(mockProductRepository.searchPaged).toHaveBeenCalledWith(
        expect.objectContaining({ search: "KSB" }),
      );
    });

    it("should apply category filter", async () => {
      mockProductRepository.searchPaged.mockResolvedValue({ items: [mockProduct], total: 1 });

      await service.findAll({ category: PumpProductCategory.CENTRIFUGAL });

      expect(mockProductRepository.searchPaged).toHaveBeenCalledWith(
        expect.objectContaining({ category: PumpProductCategory.CENTRIFUGAL }),
      );
    });
  });

  describe("findOne", () => {
    it("should return a product by id", async () => {
      mockProductRepository.findById.mockResolvedValue(mockProduct);

      const result = await service.findOne(1);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
    });

    it("should throw NotFoundException for non-existent product", async () => {
      mockProductRepository.findById.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("findBySku", () => {
    it("should return a product by SKU", async () => {
      mockProductRepository.findBySku.mockResolvedValue(mockProduct);

      const result = await service.findBySku("KSB-ETN-50-200");

      expect(result).toBeDefined();
      expect(result?.sku).toBe("KSB-ETN-50-200");
    });

    it("should return null for non-existent SKU", async () => {
      mockProductRepository.findBySku.mockResolvedValue(null);

      const result = await service.findBySku("INVALID-SKU");

      expect(result).toBeNull();
    });
  });

  describe("findByCategory", () => {
    it("should return products by category", async () => {
      mockProductRepository.findByCategory.mockResolvedValue([mockProduct]);

      const result = await service.findByCategory(PumpProductCategory.CENTRIFUGAL);

      expect(result).toHaveLength(1);
      expect(mockProductRepository.findByCategory).toHaveBeenCalledWith(
        PumpProductCategory.CENTRIFUGAL,
      );
    });
  });

  describe("findByManufacturer", () => {
    it("should return products by manufacturer", async () => {
      mockProductRepository.findByManufacturerLike.mockResolvedValue([mockProduct]);

      const result = await service.findByManufacturer("KSB");

      expect(result).toHaveLength(1);
      expect(mockProductRepository.findByManufacturerLike).toHaveBeenCalledWith("KSB");
    });
  });

  describe("manufacturers", () => {
    it("should return list of unique manufacturers", async () => {
      mockProductRepository.manufacturers.mockResolvedValue(["KSB"]);

      const result = await service.manufacturers();

      expect(result).toContain("KSB");
      expect(mockProductRepository.manufacturers).toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("should update a product", async () => {
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockProductRepository.save.mockResolvedValue(mockProduct);

      const updateDto = { title: "Updated Title" };
      const result = await service.update(1, updateDto);

      expect(result).toBeDefined();
      expect(mockProductRepository.save).toHaveBeenCalled();
    });

    it("should throw NotFoundException for non-existent product", async () => {
      mockProductRepository.findById.mockResolvedValue(null);

      await expect(service.update(999, { title: "Test" })).rejects.toThrow(NotFoundException);
    });
  });

  describe("updateStock", () => {
    it("should update stock quantity", async () => {
      mockProductRepository.findById.mockResolvedValue({ ...mockProduct });
      mockProductRepository.save.mockResolvedValue({ ...mockProduct, stockQuantity: 10 });

      const result = await service.updateStock(1, 10);

      expect(result).toBeDefined();
      expect(mockProductRepository.save).toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    it("should delete a product", async () => {
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockProductRepository.remove.mockResolvedValue(undefined);

      await service.remove(1);

      expect(mockProductRepository.remove).toHaveBeenCalledWith(mockProduct);
    });

    it("should throw NotFoundException for non-existent product", async () => {
      mockProductRepository.findById.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
