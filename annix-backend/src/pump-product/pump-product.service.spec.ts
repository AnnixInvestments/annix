import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { now } from "../lib/datetime";
import {
  PumpProduct,
  PumpProductCategory,
  PumpProductStatus,
} from "./entities/pump-product.entity";
import { PumpProductService } from "./pump-product.service";

describe("PumpProductService", () => {
  let service: PumpProductService;

  const mockProduct = {
    id: 1,
    sku: "KSB-ETN-50-200",
    title: "KSB Etanorm 50-200",
    description: "Single-stage end suction pump",
    pumpType: "end_suction",
    category: PumpProductCategory.CENTRIFUGAL,
    status: PumpProductStatus.ACTIVE,
    manufacturer: "KSB",
    modelNumber: "ETN 50-200",
    flowRateMin: 20,
    flowRateMax: 100,
    headMin: 20,
    headMax: 65,
    motorPowerKw: 7.5,
    listPrice: 45000,
    stockQuantity: 3,
    certifications: ["ISO 9001", "CE"],
    applications: ["water_supply", "hvac"],
    createdAt: now().toJSDate(),
    updatedAt: now().toJSDate(),
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[mockProduct], 1]),
    getCount: jest.fn().mockResolvedValue(1),
    getMany: jest.fn().mockResolvedValue([mockProduct]),
    select: jest.fn().mockReturnThis(),
    distinct: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([{ manufacturer: "KSB" }]),
  };

  const mockPumpProductRepo = {
    create: jest.fn().mockReturnValue(mockProduct),
    save: jest.fn().mockResolvedValue(mockProduct),
    find: jest.fn().mockResolvedValue([mockProduct]),
    findOne: jest.fn(),
    remove: jest.fn().mockResolvedValue(undefined),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PumpProductService,
        {
          provide: getRepositoryToken(PumpProduct),
          useValue: mockPumpProductRepo,
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
      mockPumpProductRepo.findOne.mockResolvedValue(null);

      const createDto = {
        sku: "KSB-ETN-50-200",
        title: "KSB Etanorm 50-200",
        pumpType: "end_suction",
        category: PumpProductCategory.CENTRIFUGAL,
        manufacturer: "KSB",
      };

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(mockPumpProductRepo.create).toHaveBeenCalled();
      expect(mockPumpProductRepo.save).toHaveBeenCalled();
    });

    it("should throw BadRequestException for duplicate SKU", async () => {
      mockPumpProductRepo.findOne.mockResolvedValue(mockProduct);

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
      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toBeDefined();
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockPumpProductRepo.createQueryBuilder).toHaveBeenCalled();
    });

    it("should apply search filter", async () => {
      await service.findAll({ search: "KSB" });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });

    it("should apply category filter", async () => {
      await service.findAll({ category: PumpProductCategory.CENTRIFUGAL });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("should return a product by id", async () => {
      mockPumpProductRepo.findOne.mockResolvedValue(mockProduct);

      const result = await service.findOne(1);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
    });

    it("should throw NotFoundException for non-existent product", async () => {
      mockPumpProductRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("findBySku", () => {
    it("should return a product by SKU", async () => {
      mockPumpProductRepo.findOne.mockResolvedValue(mockProduct);

      const result = await service.findBySku("KSB-ETN-50-200");

      expect(result).toBeDefined();
      expect(result?.sku).toBe("KSB-ETN-50-200");
    });

    it("should return null for non-existent SKU", async () => {
      mockPumpProductRepo.findOne.mockResolvedValue(null);

      const result = await service.findBySku("INVALID-SKU");

      expect(result).toBeNull();
    });
  });

  describe("findByCategory", () => {
    it("should return products by category", async () => {
      const result = await service.findByCategory(PumpProductCategory.CENTRIFUGAL);

      expect(result).toHaveLength(1);
      expect(mockPumpProductRepo.find).toHaveBeenCalledWith({
        where: {
          category: PumpProductCategory.CENTRIFUGAL,
          status: PumpProductStatus.ACTIVE,
        },
        order: { title: "ASC" },
      });
    });
  });

  describe("findByManufacturer", () => {
    it("should return products by manufacturer", async () => {
      const result = await service.findByManufacturer("KSB");

      expect(result).toHaveLength(1);
      expect(mockPumpProductRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: PumpProductStatus.ACTIVE,
          }),
          order: { title: "ASC" },
        }),
      );
    });
  });

  describe("manufacturers", () => {
    it("should return list of unique manufacturers", async () => {
      const result = await service.manufacturers();

      expect(result).toContain("KSB");
      expect(mockPumpProductRepo.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("should update a product", async () => {
      mockPumpProductRepo.findOne.mockResolvedValue(mockProduct);

      const updateDto = { title: "Updated Title" };
      const result = await service.update(1, updateDto);

      expect(result).toBeDefined();
      expect(mockPumpProductRepo.save).toHaveBeenCalled();
    });

    it("should throw NotFoundException for non-existent product", async () => {
      mockPumpProductRepo.findOne.mockResolvedValue(null);

      await expect(service.update(999, { title: "Test" })).rejects.toThrow(NotFoundException);
    });
  });

  describe("updateStock", () => {
    it("should update stock quantity", async () => {
      mockPumpProductRepo.findOne.mockResolvedValue(mockProduct);

      const result = await service.updateStock(1, 10);

      expect(result).toBeDefined();
      expect(mockPumpProductRepo.save).toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    it("should delete a product", async () => {
      mockPumpProductRepo.findOne.mockResolvedValue(mockProduct);

      await service.remove(1);

      expect(mockPumpProductRepo.remove).toHaveBeenCalledWith(mockProduct);
    });

    it("should throw NotFoundException for non-existent product", async () => {
      mockPumpProductRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
