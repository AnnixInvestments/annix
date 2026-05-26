import { ConflictException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { StockTakeVarianceCategory } from "../entities/stock-take-variance-category.entity";
import { StockTakeVarianceCategoryRepository } from "../repositories/stock-take-variance-category.repository";
import { VarianceCategoryService } from "./variance-category.service";

describe("VarianceCategoryService", () => {
  let service: VarianceCategoryService;

  const mockCategoryRepo = {
    findForCompany: jest.fn(),
    findOneForCompany: jest.fn(),
    findOneByCompanySlug: jest.fn(),
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
        VarianceCategoryService,
        {
          provide: StockTakeVarianceCategoryRepository,
          useValue: mockCategoryRepo,
        },
      ],
    }).compile();

    service = module.get<VarianceCategoryService>(VarianceCategoryService);
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
    it("creates a new variance category", async () => {
      mockCategoryRepo.findOneByCompanySlug.mockResolvedValueOnce(null);

      const result = await service.create(1, {
        slug: "damaged",
        name: "Damaged",
        severity: "medium",
        requiresPhoto: true,
      });

      expect(result).toMatchObject({ companyId: 1, slug: "damaged", severity: "medium" });
    });

    it("throws ConflictException for duplicate slug", async () => {
      mockCategoryRepo.findOneByCompanySlug.mockResolvedValueOnce({ id: 1, slug: "damaged" });
      await expect(service.create(1, { slug: "damaged", name: "Damaged" })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe("byId", () => {
    it("throws NotFoundException for missing category", async () => {
      mockCategoryRepo.findOneForCompany.mockResolvedValueOnce(null);
      await expect(service.byId(1, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("ensureSeedDataForCompany", () => {
    it("creates 10 default categories on first run", async () => {
      mockCategoryRepo.findAllForCompany.mockResolvedValueOnce([]);
      const created = await service.ensureSeedDataForCompany(1);
      expect(created).toBe(10);
    });

    it("does not duplicate existing seed categories", async () => {
      const existing = [
        { slug: "damaged" },
        { slug: "miscounted" },
        { slug: "shrinkage" },
      ] as StockTakeVarianceCategory[];
      mockCategoryRepo.findAllForCompany.mockResolvedValueOnce(existing);
      const created = await service.ensureSeedDataForCompany(1);
      expect(created).toBe(7);
    });
  });
});
