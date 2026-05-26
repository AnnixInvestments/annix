import { ConflictException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ConsumableProductRepository } from "../repositories/consumable-product.repository";
import { IssuableProductRepository } from "../repositories/issuable-product.repository";
import { PaintProductRepository } from "../repositories/paint-product.repository";
import { RubberRollRepository } from "../repositories/rubber-roll.repository";
import { SolutionProductRepository } from "../repositories/solution-product.repository";
import { IssuableProductService } from "./issuable-product.service";

describe("IssuableProductService", () => {
  let service: IssuableProductService;

  const mockProductRepo = {
    findPaginatedForCompany: jest.fn(),
    findByIdForCompany: jest.fn(),
    findByIdForCompanyWithDetail: jest.fn(),
    findBySkuForCompany: jest.fn(),
    findByLegacyStockItemId: jest.fn(),
    findAllOfTypeWithPaint: jest.fn(),
    countByType: jest.fn().mockResolvedValue({
      consumable: 0,
      paint: 0,
      rubber_roll: 0,
      rubber_offcut: 0,
      solution: 0,
    }),
    build: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
  };

  const childRepoMock = () => ({
    findByProductId: jest.fn(),
    build: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IssuableProductService,
        { provide: IssuableProductRepository, useValue: mockProductRepo },
        { provide: ConsumableProductRepository, useValue: childRepoMock() },
        { provide: PaintProductRepository, useValue: childRepoMock() },
        { provide: RubberRollRepository, useValue: childRepoMock() },
        { provide: SolutionProductRepository, useValue: childRepoMock() },
      ],
    }).compile();

    service = module.get<IssuableProductService>(IssuableProductService);
    jest.clearAllMocks();
    mockProductRepo.build.mockImplementation((data) => ({ ...data }));
    mockProductRepo.save.mockImplementation((entity) => Promise.resolve({ id: 1, ...entity }));
    mockProductRepo.countByType.mockResolvedValue({
      consumable: 0,
      paint: 0,
      rubber_roll: 0,
      rubber_offcut: 0,
      solution: 0,
    });
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("throws ConflictException when SKU already exists", async () => {
      mockProductRepo.findBySkuForCompany.mockResolvedValueOnce({ id: 1, sku: "DUP" });
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
      mockProductRepo.findByIdForCompanyWithDetail.mockResolvedValueOnce(null);
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
