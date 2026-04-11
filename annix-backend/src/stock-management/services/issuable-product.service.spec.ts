import { ConflictException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConsumableProduct } from "../entities/consumable-product.entity";
import { IssuableProduct } from "../entities/issuable-product.entity";
import { PaintProduct } from "../entities/paint-product.entity";
import { RubberOffcutStock } from "../entities/rubber-offcut-stock.entity";
import { RubberRoll } from "../entities/rubber-roll.entity";
import { SolutionProduct } from "../entities/solution-product.entity";
import { IssuableProductService } from "./issuable-product.service";

describe("IssuableProductService", () => {
  let service: IssuableProductService;

  const mockProductRepo = {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    })),
  };

  const childRepoMock = () => ({
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IssuableProductService,
        { provide: getRepositoryToken(IssuableProduct), useValue: mockProductRepo },
        { provide: getRepositoryToken(ConsumableProduct), useValue: childRepoMock() },
        { provide: getRepositoryToken(PaintProduct), useValue: childRepoMock() },
        { provide: getRepositoryToken(RubberRoll), useValue: childRepoMock() },
        { provide: getRepositoryToken(RubberOffcutStock), useValue: childRepoMock() },
        { provide: getRepositoryToken(SolutionProduct), useValue: childRepoMock() },
      ],
    }).compile();

    service = module.get<IssuableProductService>(IssuableProductService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("throws ConflictException when SKU already exists", async () => {
      mockProductRepo.findOne.mockResolvedValueOnce({ id: 1, sku: "DUP" });
      await expect(
        service.create(1, {
          productType: "consumable",
          sku: "DUP",
          name: "Duplicate",
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("byId", () => {
    it("throws NotFoundException for missing product", async () => {
      mockProductRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.byId(1, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("countByType", () => {
    it("returns zeros for all product types when company has no products", async () => {
      const result = await service.countByType(1);
      expect(result).toEqual({
        consumable: 0,
        paint: 0,
        rubber_roll: 0,
        rubber_offcut: 0,
        solution: 0,
      });
    });
  });
});
