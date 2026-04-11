import { ConflictException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ProductCategory } from "../entities/product-category.entity";
import { ProductCategoryService } from "./product-category.service";

describe("ProductCategoryService", () => {
  let service: ProductCategoryService;

  const mockCategoryRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => {
      if (Array.isArray(entity)) {
        return Promise.resolve(entity.map((e, i) => ({ id: i + 1, ...e })));
      }
      return Promise.resolve({ id: 1, ...entity });
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductCategoryService,
        { provide: getRepositoryToken(ProductCategory), useValue: mockCategoryRepo },
      ],
    }).compile();

    service = module.get<ProductCategoryService>(ProductCategoryService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("creates a new category when slug is unique", async () => {
      mockCategoryRepo.findOne.mockResolvedValueOnce(null);

      const result = await service.create(1, {
        productType: "consumable",
        slug: "tools",
        name: "Tools",
      });

      expect(mockCategoryRepo.save).toHaveBeenCalled();
      expect(result).toMatchObject({ companyId: 1, slug: "tools", name: "Tools" });
    });

    it("throws ConflictException when slug already exists", async () => {
      mockCategoryRepo.findOne.mockResolvedValueOnce({ id: 1, slug: "tools" });

      await expect(
        service.create(1, { productType: "consumable", slug: "tools", name: "Tools" }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("byId", () => {
    it("throws NotFoundException when category does not exist", async () => {
      mockCategoryRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.byId(1, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("ensureSeedDataForCompany", () => {
    it("creates the default seed categories when none exist", async () => {
      mockCategoryRepo.find.mockResolvedValueOnce([]);
      const created = await service.ensureSeedDataForCompany(1);
      expect(created).toBeGreaterThan(0);
      expect(mockCategoryRepo.save).toHaveBeenCalled();
    });

    it("does not duplicate existing categories", async () => {
      const existing = [
        { productType: "consumable", slug: "tools" },
        { productType: "consumable", slug: "cleaning" },
      ];
      mockCategoryRepo.find.mockResolvedValueOnce(existing as ProductCategory[]);
      const created = await service.ensureSeedDataForCompany(1);
      expect(created).toBeGreaterThan(0);
      expect(created).not.toBe(0);
    });
  });
});
