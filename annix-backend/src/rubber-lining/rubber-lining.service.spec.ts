import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import {
  RubberAdhesionRequirement,
  RubberApplicationRating,
  RubberThicknessRecommendation,
} from "./entities/rubber-application.entity";
import { RubberCompany } from "./entities/rubber-company.entity";
import { RubberOrder, RubberOrderStatus } from "./entities/rubber-order.entity";
import { RubberOrderItem } from "./entities/rubber-order-item.entity";
import { RubberPricingTier } from "./entities/rubber-pricing-tier.entity";
import { RubberProduct } from "./entities/rubber-product.entity";
import { RubberProductCoding } from "./entities/rubber-product-coding.entity";
import { RubberSpecification } from "./entities/rubber-specification.entity";
import { RubberType } from "./entities/rubber-type.entity";
import { RubberLiningService } from "./rubber-lining.service";

describe("RubberLiningService", () => {
  let service: RubberLiningService;

  const mockRepo = () => ({
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  });

  const mockRubberTypeRepo = mockRepo();
  const mockRubberSpecRepo = mockRepo();
  const mockApplicationRatingRepo = mockRepo();
  const mockThicknessRepo = mockRepo();
  const mockAdhesionRepo = mockRepo();
  const mockProductCodingRepo = mockRepo();
  const mockPricingTierRepo = mockRepo();
  const mockCompanyRepo = mockRepo();
  const mockProductRepo = mockRepo();
  const mockOrderRepo = mockRepo();
  const mockOrderItemRepo = mockRepo();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RubberLiningService,
        {
          provide: getRepositoryToken(RubberType),
          useValue: mockRubberTypeRepo,
        },
        {
          provide: getRepositoryToken(RubberSpecification),
          useValue: mockRubberSpecRepo,
        },
        {
          provide: getRepositoryToken(RubberApplicationRating),
          useValue: mockApplicationRatingRepo,
        },
        {
          provide: getRepositoryToken(RubberThicknessRecommendation),
          useValue: mockThicknessRepo,
        },
        {
          provide: getRepositoryToken(RubberAdhesionRequirement),
          useValue: mockAdhesionRepo,
        },
        {
          provide: getRepositoryToken(RubberProductCoding),
          useValue: mockProductCodingRepo,
        },
        {
          provide: getRepositoryToken(RubberPricingTier),
          useValue: mockPricingTierRepo,
        },
        {
          provide: getRepositoryToken(RubberCompany),
          useValue: mockCompanyRepo,
        },
        {
          provide: getRepositoryToken(RubberProduct),
          useValue: mockProductRepo,
        },
        { provide: getRepositoryToken(RubberOrder), useValue: mockOrderRepo },
        {
          provide: getRepositoryToken(RubberOrderItem),
          useValue: mockOrderItemRepo,
        },
      ],
    }).compile();

    service = module.get<RubberLiningService>(RubberLiningService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("calculatePrice", () => {
    it("should return null when product not found", async () => {
      mockProductRepo.findOne.mockResolvedValue(null);
      mockCompanyRepo.findOne.mockResolvedValue({ id: 1, name: "Test Co" });

      const result = await service.calculatePrice({
        productId: 999,
        companyId: 1,
        thickness: 3,
        width: 1200,
        length: 10,
        quantity: 2,
      });

      expect(result).toBeNull();
    });

    it("should return null when company not found", async () => {
      mockProductRepo.findOne.mockResolvedValue({
        id: 1,
        title: "Test Product",
      });
      mockCompanyRepo.findOne.mockResolvedValue(null);

      const result = await service.calculatePrice({
        productId: 1,
        companyId: 999,
        thickness: 3,
        width: 1200,
        length: 10,
        quantity: 2,
      });

      expect(result).toBeNull();
    });

    it("should calculate correctly with concrete values", async () => {
      mockProductRepo.findOne.mockResolvedValue({
        id: 1,
        title: "NR Compound",
        specificGravity: "1.15",
        costPerKg: "45.00",
        markup: "120",
      });
      mockCompanyRepo.findOne.mockResolvedValue({
        id: 1,
        name: "Acme Mining",
        pricingTier: { id: 1, name: "Standard", pricingFactor: "95" },
      });

      const result = await service.calculatePrice({
        productId: 1,
        companyId: 1,
        thickness: 3,
        width: 1200,
        length: 10,
        quantity: 2,
      });

      expect(result).not.toBeNull();
      expect(result!.specificGravity).toBe(1.15);
      expect(result!.costPerKg).toBe(45);
      expect(result!.markup).toBe(120);
      expect(result!.pricePerKg).toBe(54);
      expect(result!.pricingFactor).toBe(95);
      expect(result!.salePricePerKg).toBeCloseTo(51.3);
      expect(result!.kgPerRoll).toBeCloseTo(41.4);
      expect(result!.totalKg).toBeCloseTo(82.8);
      expect(result!.totalPrice).toBeCloseTo(4247.64);
      expect(result!.productTitle).toBe("NR Compound");
      expect(result!.companyName).toBe("Acme Mining");
    });

    it("should default specificGravity to 1 when null", async () => {
      mockProductRepo.findOne.mockResolvedValue({
        id: 1,
        title: "Test",
        specificGravity: null,
        costPerKg: "50.00",
        markup: "100",
      });
      mockCompanyRepo.findOne.mockResolvedValue({
        id: 1,
        name: "Co",
        pricingTier: { id: 1, name: "Tier", pricingFactor: "100" },
      });

      const result = await service.calculatePrice({
        productId: 1,
        companyId: 1,
        thickness: 5,
        width: 1000,
        length: 10,
        quantity: 1,
      });

      expect(result!.specificGravity).toBe(1);
      expect(result!.kgPerRoll).toBe(50);
    });

    it("should default specificGravity to 1 when zero", async () => {
      mockProductRepo.findOne.mockResolvedValue({
        id: 1,
        title: "Test",
        specificGravity: "0",
        costPerKg: "50.00",
        markup: "100",
      });
      mockCompanyRepo.findOne.mockResolvedValue({
        id: 1,
        name: "Co",
        pricingTier: { id: 1, name: "Tier", pricingFactor: "100" },
      });

      const result = await service.calculatePrice({
        productId: 1,
        companyId: 1,
        thickness: 5,
        width: 1000,
        length: 10,
        quantity: 1,
      });

      expect(result!.specificGravity).toBe(1);
    });

    it("should default costPerKg to 0 when null", async () => {
      mockProductRepo.findOne.mockResolvedValue({
        id: 1,
        title: "Test",
        specificGravity: "1.2",
        costPerKg: null,
        markup: "100",
      });
      mockCompanyRepo.findOne.mockResolvedValue({
        id: 1,
        name: "Co",
        pricingTier: { id: 1, name: "Tier", pricingFactor: "100" },
      });

      const result = await service.calculatePrice({
        productId: 1,
        companyId: 1,
        thickness: 3,
        width: 1200,
        length: 10,
        quantity: 1,
      });

      expect(result!.costPerKg).toBe(0);
      expect(result!.pricePerKg).toBe(0);
      expect(result!.totalPrice).toBe(0);
    });

    it("should default markup to 100 when null", async () => {
      mockProductRepo.findOne.mockResolvedValue({
        id: 1,
        title: "Test",
        specificGravity: "1.0",
        costPerKg: "50.00",
        markup: null,
      });
      mockCompanyRepo.findOne.mockResolvedValue({
        id: 1,
        name: "Co",
        pricingTier: { id: 1, name: "Tier", pricingFactor: "100" },
      });

      const result = await service.calculatePrice({
        productId: 1,
        companyId: 1,
        thickness: 1,
        width: 1000,
        length: 1,
        quantity: 1,
      });

      expect(result!.markup).toBe(100);
      expect(result!.pricePerKg).toBe(50);
    });

    it("should default pricingFactor to 100 when company has no pricing tier", async () => {
      mockProductRepo.findOne.mockResolvedValue({
        id: 1,
        title: "Test",
        specificGravity: "1.0",
        costPerKg: "40.00",
        markup: "150",
      });
      mockCompanyRepo.findOne.mockResolvedValue({
        id: 1,
        name: "No Tier Co",
        pricingTier: null,
      });

      const result = await service.calculatePrice({
        productId: 1,
        companyId: 1,
        thickness: 1,
        width: 1000,
        length: 1,
        quantity: 1,
      });

      expect(result!.pricingFactor).toBe(100);
      expect(result!.pricePerKg).toBe(60);
      expect(result!.salePricePerKg).toBe(60);
    });

    it("should return 0 totals when dimensions are zero", async () => {
      mockProductRepo.findOne.mockResolvedValue({
        id: 1,
        title: "Test",
        specificGravity: "1.5",
        costPerKg: "30.00",
        markup: "100",
      });
      mockCompanyRepo.findOne.mockResolvedValue({
        id: 1,
        name: "Co",
        pricingTier: { id: 1, name: "Tier", pricingFactor: "100" },
      });

      const result = await service.calculatePrice({
        productId: 1,
        companyId: 1,
        thickness: 0,
        width: 0,
        length: 0,
        quantity: 0,
      });

      expect(result!.kgPerRoll).toBe(0);
      expect(result!.totalKg).toBe(0);
      expect(result!.totalPrice).toBe(0);
    });
  });

  describe("orderById (mapOrderItemToDto)", () => {
    it("should calculate kgPerRoll and totalKg for order items with product loaded", async () => {
      mockOrderRepo.findOne.mockResolvedValue({
        id: 1,
        orderNumber: "ORD-00001",
        companyOrderNumber: null,
        status: RubberOrderStatus.DRAFT,
        companyId: 1,
        company: { name: "Test Co" },
        items: [
          {
            id: 1,
            productId: 1,
            product: { title: "NR Sheet", specificGravity: "1.15" },
            thickness: "3",
            width: "1200",
            length: "10",
            quantity: 2,
            callOffs: [],
          },
        ],
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      } as unknown as RubberOrder);

      const result = await service.orderById(1);

      expect(result).not.toBeNull();
      expect(result!.items).toHaveLength(1);
      expect(result!.items[0].kgPerRoll).toBeCloseTo(41.4);
      expect(result!.items[0].totalKg).toBeCloseTo(82.8);
    });

    it("should return null kgPerRoll when dimensions are missing", async () => {
      mockOrderRepo.findOne.mockResolvedValue({
        id: 1,
        orderNumber: "ORD-00001",
        companyOrderNumber: null,
        status: RubberOrderStatus.DRAFT,
        companyId: null,
        company: null,
        items: [
          {
            id: 1,
            productId: 1,
            product: { title: "NR Sheet", specificGravity: "1.15" },
            thickness: null,
            width: "1200",
            length: "10",
            quantity: 2,
            callOffs: [],
          },
        ],
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      } as unknown as RubberOrder);

      const result = await service.orderById(1);

      expect(result!.items[0].kgPerRoll).toBeNull();
      expect(result!.items[0].totalKg).toBeNull();
    });

    it("should default specificGravity to 1 when product has null specificGravity", async () => {
      mockOrderRepo.findOne.mockResolvedValue({
        id: 1,
        orderNumber: "ORD-00001",
        companyOrderNumber: null,
        status: RubberOrderStatus.DRAFT,
        companyId: null,
        company: null,
        items: [
          {
            id: 1,
            productId: 1,
            product: { title: "Generic", specificGravity: null },
            thickness: "5",
            width: "1000",
            length: "10",
            quantity: 1,
            callOffs: [],
          },
        ],
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      } as unknown as RubberOrder);

      const result = await service.orderById(1);

      expect(result!.items[0].kgPerRoll).toBe(50);
      expect(result!.items[0].totalKg).toBe(50);
    });
  });
});
