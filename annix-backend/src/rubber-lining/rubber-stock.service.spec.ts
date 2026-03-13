import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { now } from "../lib/datetime";
import { RubberCompoundMovement } from "./entities/rubber-compound-movement.entity";
import { RubberCompoundOrder } from "./entities/rubber-compound-order.entity";
import { RubberCompoundStock } from "./entities/rubber-compound-stock.entity";
import { RubberProduct } from "./entities/rubber-product.entity";
import { RubberProductCoding } from "./entities/rubber-product-coding.entity";
import { RubberProduction } from "./entities/rubber-production.entity";
import { RubberStockLocation } from "./entities/rubber-stock-location.entity";
import { RubberStockService } from "./rubber-stock.service";

describe("RubberStockService", () => {
  let service: RubberStockService;

  const mockRepo = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn((data: unknown) => data),
    delete: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RubberStockService,
        { provide: getRepositoryToken(RubberCompoundStock), useValue: mockRepo() },
        { provide: getRepositoryToken(RubberCompoundMovement), useValue: mockRepo() },
        { provide: getRepositoryToken(RubberProduction), useValue: mockRepo() },
        { provide: getRepositoryToken(RubberCompoundOrder), useValue: mockRepo() },
        { provide: getRepositoryToken(RubberProductCoding), useValue: mockRepo() },
        { provide: getRepositoryToken(RubberProduct), useValue: mockRepo() },
        { provide: getRepositoryToken(RubberStockLocation), useValue: mockRepo() },
      ],
    }).compile();

    service = module.get<RubberStockService>(RubberStockService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("calculateCompoundWeight", () => {
    const calculate = (
      thicknessMm: number,
      widthMm: number,
      lengthM: number,
      specificGravity: number,
      quantity: number,
    ) =>
      (service as any).calculateCompoundWeight(
        thicknessMm,
        widthMm,
        lengthM,
        specificGravity,
        quantity,
      );

    it("should calculate weight correctly for standard dimensions", () => {
      const result = calculate(3, 1200, 10, 1.15, 1);

      expect(result).toBeCloseTo(41.4);
    });

    it("should multiply by quantity", () => {
      const singleRoll = calculate(3, 1200, 10, 1.15, 1);
      const doubleRoll = calculate(3, 1200, 10, 1.15, 2);

      expect(doubleRoll).toBeCloseTo(singleRoll * 2);
    });

    it("should return 0 when thickness is 0", () => {
      expect(calculate(0, 1200, 10, 1.15, 1)).toBe(0);
    });

    it("should return 0 when width is 0", () => {
      expect(calculate(3, 0, 10, 1.15, 1)).toBe(0);
    });

    it("should return 0 when length is 0", () => {
      expect(calculate(3, 1200, 0, 1.15, 1)).toBe(0);
    });

    it("should return 0 when quantity is 0", () => {
      expect(calculate(3, 1200, 10, 1.15, 0)).toBe(0);
    });

    it("should use specific gravity in calculation", () => {
      const sg1 = calculate(5, 1000, 10, 1.0, 1);
      const sg15 = calculate(5, 1000, 10, 1.5, 1);

      expect(sg1).toBeCloseTo(50);
      expect(sg15).toBeCloseTo(75);
    });

    it("should handle decimal dimensions", () => {
      const result = calculate(2.5, 1500, 12.5, 1.2, 1);
      const expected = (2.5 / 1000) * (1500 / 1000) * 12.5 * 1.2 * 1000;

      expect(result).toBeCloseTo(expected);
    });
  });

  describe("mapCompoundStockToDto", () => {
    const mapStock = (stock: Record<string, unknown>) =>
      (service as any).mapCompoundStockToDto(stock);

    it("should set isLowStock true when quantity below reorder point", () => {
      const dto = mapStock({
        id: 1,
        firebaseUid: "uid1",
        compoundCodingId: 1,
        quantityKg: 10,
        minStockLevelKg: 50,
        reorderPointKg: 20,
        costPerKg: null,
        location: null,
        batchNumber: null,
        compoundCoding: null,
        createdAt: now().toJSDate(),
        updatedAt: now().toJSDate(),
      });

      expect(dto.isLowStock).toBe(true);
    });

    it("should set isLowStock false when quantity above reorder point", () => {
      const dto = mapStock({
        id: 1,
        firebaseUid: "uid1",
        compoundCodingId: 1,
        quantityKg: 30,
        minStockLevelKg: 50,
        reorderPointKg: 20,
        costPerKg: "45.50",
        location: "Bay A",
        batchNumber: "B100",
        compoundCoding: { name: "Test Compound", code: "TC01" },
        createdAt: now().toJSDate(),
        updatedAt: now().toJSDate(),
      });

      expect(dto.isLowStock).toBe(false);
      expect(dto.costPerKg).toBe(45.5);
      expect(dto.compoundName).toBe("Test Compound");
      expect(dto.compoundCode).toBe("TC01");
    });

    it("should convert numeric string fields to numbers", () => {
      const dto = mapStock({
        id: 1,
        firebaseUid: "uid1",
        compoundCodingId: 1,
        quantityKg: "100.500",
        minStockLevelKg: "50.000",
        reorderPointKg: "75.000",
        costPerKg: "42.99",
        location: null,
        batchNumber: null,
        compoundCoding: null,
        createdAt: now().toJSDate(),
        updatedAt: now().toJSDate(),
      });

      expect(dto.quantityKg).toBe(100.5);
      expect(dto.minStockLevelKg).toBe(50);
      expect(dto.reorderPointKg).toBe(75);
      expect(dto.costPerKg).toBe(42.99);
    });

    it("should return null costPerKg when field is null", () => {
      const dto = mapStock({
        id: 1,
        firebaseUid: "uid1",
        compoundCodingId: 1,
        quantityKg: 100,
        minStockLevelKg: 50,
        reorderPointKg: 75,
        costPerKg: null,
        location: null,
        batchNumber: null,
        compoundCoding: null,
        createdAt: now().toJSDate(),
        updatedAt: now().toJSDate(),
      });

      expect(dto.costPerKg).toBeNull();
    });
  });

  describe("mapProductionToDto", () => {
    const mapProduction = (production: Record<string, unknown>) =>
      (service as any).mapProductionToDto(production);

    it("should calculate compoundRequiredKg using product specificGravity", () => {
      const dto = mapProduction({
        id: 1,
        firebaseUid: "uid1",
        productionNumber: "PRD-00001",
        productId: 1,
        product: { title: "NR Sheet", specificGravity: "1.15" },
        compoundStockId: 1,
        compoundStock: { compoundCoding: { name: "Test" } },
        thicknessMm: 3,
        widthMm: 1200,
        lengthM: 10,
        quantity: 2,
        compoundUsedKg: null,
        status: "pending",
        orderId: null,
        notes: null,
        createdBy: null,
        completedAt: null,
        createdAt: now().toJSDate(),
        updatedAt: now().toJSDate(),
      });

      expect(dto.compoundRequiredKg).toBeCloseTo(82.8);
      expect(dto.productTitle).toBe("NR Sheet");
    });

    it("should default specificGravity to 1 when product has null", () => {
      const dto = mapProduction({
        id: 1,
        firebaseUid: "uid1",
        productionNumber: "PRD-00001",
        productId: 1,
        product: { title: "Generic", specificGravity: null },
        compoundStockId: 1,
        compoundStock: { compoundCoding: { name: "Test" } },
        thicknessMm: 5,
        widthMm: 1000,
        lengthM: 10,
        quantity: 1,
        compoundUsedKg: null,
        status: "pending",
        orderId: null,
        notes: null,
        createdBy: null,
        completedAt: null,
        createdAt: now().toJSDate(),
        updatedAt: now().toJSDate(),
      });

      expect(dto.compoundRequiredKg).toBeCloseTo(50);
    });

    it("should default specificGravity to 1 when product is null", () => {
      const dto = mapProduction({
        id: 1,
        firebaseUid: "uid1",
        productionNumber: "PRD-00001",
        productId: 1,
        product: null,
        compoundStockId: 1,
        compoundStock: { compoundCoding: null },
        thicknessMm: 5,
        widthMm: 1000,
        lengthM: 10,
        quantity: 1,
        compoundUsedKg: null,
        status: "pending",
        orderId: null,
        notes: null,
        createdBy: null,
        completedAt: null,
        createdAt: now().toJSDate(),
        updatedAt: now().toJSDate(),
      });

      expect(dto.compoundRequiredKg).toBeCloseTo(50);
      expect(dto.productTitle).toBeNull();
      expect(dto.compoundName).toBeNull();
    });
  });
});
