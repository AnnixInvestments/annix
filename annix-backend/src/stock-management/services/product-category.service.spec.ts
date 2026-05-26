import { ConflictException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ProductCategory } from "../entities/product-category.entity";
import { ProductCategoryRepository } from "../repositories/product-category.repository";
import { ProductCategoryService } from "./product-category.service";

describe("ProductCategoryService", () => {
  let service: ProductCategoryService;

  const mockCategoryRepo = {
    findForCompany: jest.fn(),
    findOneForCompany: jest.fn(),
    findOneByTypeSlug: jest.fn(),
    findAllForCompany: jest.fn(),
    build: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    saveMany: jest
      .fn()
      .mockImplementation((entities) =>
        Promise.resolve(entities.map((e: object, i: number) => ({ id: i + 1, ...e }))),
      ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductCategoryService,
        { provide: ProductCategoryRepository, useValue: mockCategoryRepo },
      ],
    }).compile();

    service = module.get<ProductCategoryService>(ProductCategoryService);
    jest.clearAllMocks();
    mockCategoryRepo.build.mockImplementation((data) => ({ ...data }));
    mockCategoryRepo.save.mockImplementation((entity) => Promise.resolve({ id: 1, ...entity }));
    mockCategoryRepo.saveMany.mockImplementation((entities) =>
      Promise.resolve(entities.map((e: object, i: number) => ({ id: i + 1, ...e }))),
    );
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("creates a new category when slug is unique", async () => {
      mockCategoryRepo.findOneByTypeSlug.mockResolvedValueOnce(null);

      const result = await service.create(1, {
        productType: "consumable",
        slug: "tools",
        name: "Tools",
      });

      expect(mockCategoryRepo.save).toHaveBeenCalled();
      expect(result).toMatchObject({ companyId: 1, slug: "tools", name: "Tools" });
    });

    it("throws ConflictException when slug already exists", async () => {
      mockCategoryRepo.findOneByTypeSlug.mockResolvedValueOnce({ id: 1, slug: "tools" });

      await expect(
        service.create(1, { productType: "consumable", slug: "tools", name: "Tools" }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("byId", () => {
    it("throws NotFoundException when category does not exist", async () => {
      mockCategoryRepo.findOneForCompany.mockResolvedValueOnce(null);
      await expect(service.byId(1, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("ensureSeedDataForCompany", () => {
    it("creates the default seed categories when none exist", async () => {
      mockCategoryRepo.findAllForCompany.mockResolvedValueOnce([]);
      const created = await service.ensureSeedDataForCompany(1);
      expect(created).toBeGreaterThan(0);
      expect(mockCategoryRepo.saveMany).toHaveBeenCalled();
    });

    it("does not duplicate existing categories", async () => {
      const existing = [
        { productType: "consumable", slug: "tools" },
        { productType: "consumable", slug: "cleaning" },
      ];
      mockCategoryRepo.findAllForCompany.mockResolvedValueOnce(existing as ProductCategory[]);
      const created = await service.ensureSeedDataForCompany(1);
      expect(created).toBeGreaterThan(0);
      expect(created).not.toBe(0);
    });
  });
});
