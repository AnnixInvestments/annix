import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import request from "supertest";
import { now } from "../src/lib/datetime";
import {
  PumpProduct,
  PumpProductCategory,
  PumpProductStatus,
} from "../src/pump-product/entities/pump-product.entity";
import { PumpProductModule } from "../src/pump-product/pump-product.module";

describe("PumpProductController (e2e)", () => {
  let app: INestApplication;

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

  const mockRepository = {
    create: jest.fn().mockImplementation((dto) => ({ ...mockProduct, ...dto })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...mockProduct, ...entity })),
    find: jest.fn().mockResolvedValue([mockProduct]),
    findOne: jest.fn().mockResolvedValue(mockProduct),
    remove: jest.fn().mockResolvedValue(undefined),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PumpProductModule],
    })
      .overrideProvider(getRepositoryToken(PumpProduct))
      .useValue(mockRepository)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepository.findOne.mockResolvedValue(mockProduct);
  });

  describe("/pump-products (POST)", () => {
    it("should create a new pump product", async () => {
      mockRepository.findOne.mockResolvedValueOnce(null);

      const createDto = {
        sku: "NEW-PUMP-001",
        title: "New Test Pump",
        pumpType: "end_suction",
        category: PumpProductCategory.CENTRIFUGAL,
        manufacturer: "TestCo",
      };

      const response = await request(app.getHttpServer())
        .post("/pump-products")
        .send(createDto)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it("should return 400 for invalid data", async () => {
      const invalidDto = {
        title: "Missing required fields",
      };

      await request(app.getHttpServer()).post("/pump-products").send(invalidDto).expect(400);
    });

    it("should return 400 for duplicate SKU", async () => {
      mockRepository.findOne.mockResolvedValueOnce(mockProduct);

      const createDto = {
        sku: "KSB-ETN-50-200",
        title: "Duplicate SKU Pump",
        pumpType: "end_suction",
        category: PumpProductCategory.CENTRIFUGAL,
        manufacturer: "KSB",
      };

      await request(app.getHttpServer()).post("/pump-products").send(createDto).expect(400);
    });
  });

  describe("/pump-products (GET)", () => {
    it("should return paginated list of products", async () => {
      const response = await request(app.getHttpServer())
        .get("/pump-products")
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.items).toBeDefined();
      expect(response.body.total).toBeDefined();
      expect(mockRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it("should filter by category", async () => {
      await request(app.getHttpServer())
        .get("/pump-products")
        .query({ category: PumpProductCategory.CENTRIFUGAL })
        .expect(200);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });

    it("should filter by manufacturer", async () => {
      await request(app.getHttpServer())
        .get("/pump-products")
        .query({ manufacturer: "KSB" })
        .expect(200);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });

    it("should search by keyword", async () => {
      await request(app.getHttpServer())
        .get("/pump-products")
        .query({ search: "Etanorm" })
        .expect(200);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });
  });

  describe("/pump-products/manufacturers (GET)", () => {
    it("should return list of manufacturers", async () => {
      const response = await request(app.getHttpServer())
        .get("/pump-products/manufacturers")
        .expect(200);

      expect(response.body).toContain("KSB");
    });
  });

  describe("/pump-products/category/:category (GET)", () => {
    it("should return products by category", async () => {
      const response = await request(app.getHttpServer())
        .get(`/pump-products/category/${PumpProductCategory.CENTRIFUGAL}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(mockRepository.find).toHaveBeenCalled();
    });
  });

  describe("/pump-products/sku/:sku (GET)", () => {
    it("should return product by SKU", async () => {
      const response = await request(app.getHttpServer())
        .get("/pump-products/sku/KSB-ETN-50-200")
        .expect(200);

      expect(response.body.sku).toBe("KSB-ETN-50-200");
    });

    it("should return null for non-existent SKU", async () => {
      mockRepository.findOne.mockResolvedValueOnce(null);

      const response = await request(app.getHttpServer())
        .get("/pump-products/sku/INVALID-SKU")
        .expect(200);

      expect(response.body).toEqual({});
    });
  });

  describe("/pump-products/:id (GET)", () => {
    it("should return product by ID", async () => {
      const response = await request(app.getHttpServer()).get("/pump-products/1").expect(200);

      expect(response.body.id).toBe(1);
    });

    it("should return 404 for non-existent ID", async () => {
      mockRepository.findOne.mockResolvedValueOnce(null);

      await request(app.getHttpServer()).get("/pump-products/999").expect(404);
    });
  });

  describe("/pump-products/:id (PATCH)", () => {
    it("should update a product", async () => {
      const updateDto = {
        title: "Updated Title",
        listPrice: 50000,
      };

      const response = await request(app.getHttpServer())
        .patch("/pump-products/1")
        .send(updateDto)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it("should return 404 for non-existent product", async () => {
      mockRepository.findOne.mockResolvedValueOnce(null);

      await request(app.getHttpServer())
        .patch("/pump-products/999")
        .send({ title: "Test" })
        .expect(404);
    });
  });

  describe("/pump-products/:id/stock (PATCH)", () => {
    it("should update stock quantity", async () => {
      const response = await request(app.getHttpServer())
        .patch("/pump-products/1/stock")
        .query({ quantity: 10 })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe("/pump-products/:id (DELETE)", () => {
    it("should delete a product", async () => {
      await request(app.getHttpServer()).delete("/pump-products/1").expect(200);

      expect(mockRepository.remove).toHaveBeenCalled();
    });

    it("should return 404 for non-existent product", async () => {
      mockRepository.findOne.mockResolvedValueOnce(null);

      await request(app.getHttpServer()).delete("/pump-products/999").expect(404);
    });
  });
});
