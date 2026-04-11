import { ConflictException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { StockTakeVarianceCategory } from "../entities/stock-take-variance-category.entity";
import { VarianceCategoryService } from "./variance-category.service";

describe("VarianceCategoryService", () => {
  let service: VarianceCategoryService;

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
        VarianceCategoryService,
        {
          provide: getRepositoryToken(StockTakeVarianceCategory),
          useValue: mockCategoryRepo,
        },
      ],
    }).compile();

    service = module.get<VarianceCategoryService>(VarianceCategoryService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("creates a new variance category", async () => {
      mockCategoryRepo.findOne.mockResolvedValueOnce(null);

      const result = await service.create(1, {
        slug: "damaged",
        name: "Damaged",
        severity: "medium",
        requiresPhoto: true,
      });

      expect(result).toMatchObject({ companyId: 1, slug: "damaged", severity: "medium" });
    });

    it("throws ConflictException for duplicate slug", async () => {
      mockCategoryRepo.findOne.mockResolvedValueOnce({ id: 1, slug: "damaged" });
      await expect(service.create(1, { slug: "damaged", name: "Damaged" })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe("byId", () => {
    it("throws NotFoundException for missing category", async () => {
      mockCategoryRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.byId(1, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("ensureSeedDataForCompany", () => {
    it("creates 10 default categories on first run", async () => {
      mockCategoryRepo.find.mockResolvedValueOnce([]);
      const created = await service.ensureSeedDataForCompany(1);
      expect(created).toBe(10);
    });

    it("does not duplicate existing seed categories", async () => {
      const existing = [
        { slug: "damaged" },
        { slug: "miscounted" },
        { slug: "shrinkage" },
      ] as StockTakeVarianceCategory[];
      mockCategoryRepo.find.mockResolvedValueOnce(existing);
      const created = await service.ensureSeedDataForCompany(1);
      expect(created).toBe(7);
    });
  });
});
