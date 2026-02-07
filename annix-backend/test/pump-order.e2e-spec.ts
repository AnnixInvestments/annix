import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import request from "supertest";
import { now } from "../src/lib/datetime";
import {
  PumpOrder,
  PumpOrderStatus,
  PumpOrderType,
} from "../src/pump-order/entities/pump-order.entity";
import {
  PumpOrderItem,
  PumpOrderItemType,
} from "../src/pump-order/entities/pump-order-item.entity";
import { PumpOrderModule } from "../src/pump-order/pump-order.module";

describe("PumpOrderController (e2e)", () => {
  let app: INestApplication;

  const mockOrder = {
    id: 1,
    orderNumber: "PO-2026-ABC123",
    customerReference: "CUST-REF-001",
    status: PumpOrderStatus.DRAFT,
    orderType: PumpOrderType.NEW_PUMP,
    customerCompany: "Mining Corp SA",
    customerContact: "John Smith",
    customerEmail: "john@miningcorp.co.za",
    subtotal: 100000,
    vatAmount: 15000,
    totalAmount: 115000,
    currency: "ZAR",
    items: [],
    statusHistory: [],
    createdAt: now().toJSDate(),
    updatedAt: now().toJSDate(),
  };

  const mockOrderItem = {
    id: 1,
    orderId: 1,
    itemType: PumpOrderItemType.NEW_PUMP,
    description: "KSB Etanorm 50-200",
    quantity: 1,
    unitPrice: 50000,
    discountPercent: 0,
    lineTotal: 50000,
    createdAt: now().toJSDate(),
    updatedAt: now().toJSDate(),
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[mockOrder], 1]),
  };

  const mockOrderRepository = {
    create: jest.fn().mockImplementation((dto) => ({ ...mockOrder, ...dto, id: 1 })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...mockOrder, ...entity })),
    find: jest.fn().mockResolvedValue([mockOrder]),
    findOne: jest.fn().mockResolvedValue(mockOrder),
    remove: jest.fn().mockResolvedValue(undefined),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockOrderItemRepository = {
    create: jest.fn().mockImplementation((dto) => ({ ...mockOrderItem, ...dto })),
    save: jest
      .fn()
      .mockImplementation((items) =>
        Promise.resolve(
          Array.isArray(items)
            ? items.map((i, idx) => ({ ...mockOrderItem, ...i, id: idx + 1 }))
            : { ...mockOrderItem, ...items },
        ),
      ),
    find: jest.fn().mockResolvedValue([mockOrderItem]),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PumpOrderModule],
    })
      .overrideProvider(getRepositoryToken(PumpOrder))
      .useValue(mockOrderRepository)
      .overrideProvider(getRepositoryToken(PumpOrderItem))
      .useValue(mockOrderItemRepository)
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
    mockOrderRepository.findOne.mockResolvedValue({ ...mockOrder, items: [mockOrderItem] });
  });

  describe("/pump-orders (POST)", () => {
    it("should create a new order", async () => {
      const createDto = {
        orderType: PumpOrderType.NEW_PUMP,
        customerCompany: "Test Company",
        customerContact: "Jane Doe",
        customerEmail: "jane@test.com",
        items: [
          {
            itemType: PumpOrderItemType.NEW_PUMP,
            description: "Test Pump",
            quantity: 1,
            unitPrice: 50000,
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post("/pump-orders")
        .send(createDto)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.orderNumber).toBeDefined();
      expect(mockOrderRepository.create).toHaveBeenCalled();
      expect(mockOrderRepository.save).toHaveBeenCalled();
    });

    it("should return 400 for missing required fields", async () => {
      const invalidDto = {
        customerCompany: "Test Company",
      };

      await request(app.getHttpServer()).post("/pump-orders").send(invalidDto).expect(400);
    });

    it("should accept order with empty items array", async () => {
      const dto = {
        orderType: PumpOrderType.NEW_PUMP,
        customerCompany: "Test Company",
        items: [],
      };

      const response = await request(app.getHttpServer())
        .post("/pump-orders")
        .send(dto)
        .expect(201);

      expect(response.body).toBeDefined();
    });
  });

  describe("/pump-orders (GET)", () => {
    it("should return paginated list of orders", async () => {
      const response = await request(app.getHttpServer())
        .get("/pump-orders")
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.data).toBeDefined();
      expect(response.body.total).toBeDefined();
    });

    it("should filter by status", async () => {
      await request(app.getHttpServer())
        .get("/pump-orders")
        .query({ status: PumpOrderStatus.DRAFT })
        .expect(200);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });

    it("should filter by order type", async () => {
      await request(app.getHttpServer())
        .get("/pump-orders")
        .query({ orderType: PumpOrderType.NEW_PUMP })
        .expect(200);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });

    it("should filter by date range", async () => {
      await request(app.getHttpServer())
        .get("/pump-orders")
        .query({ fromDate: "2026-01-01", toDate: "2026-12-31" })
        .expect(200);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });
  });

  describe("/pump-orders/summary (GET)", () => {
    it("should return order summary statistics", async () => {
      const response = await request(app.getHttpServer()).get("/pump-orders/summary").expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.totalOrders).toBeDefined();
      expect(response.body.byStatus).toBeDefined();
      expect(response.body.byType).toBeDefined();
    });
  });

  describe("/pump-orders/by-number/:orderNumber (GET)", () => {
    it("should return order by order number", async () => {
      const response = await request(app.getHttpServer())
        .get("/pump-orders/by-number/PO-2026-ABC123")
        .expect(200);

      expect(response.body.orderNumber).toBe("PO-2026-ABC123");
    });

    it("should return 404 for non-existent order number", async () => {
      mockOrderRepository.findOne.mockResolvedValueOnce(null);

      await request(app.getHttpServer()).get("/pump-orders/by-number/INVALID").expect(404);
    });
  });

  describe("/pump-orders/:id (GET)", () => {
    it("should return order by ID", async () => {
      const response = await request(app.getHttpServer()).get("/pump-orders/1").expect(200);

      expect(response.body.id).toBe(1);
    });

    it("should return 404 for non-existent ID", async () => {
      mockOrderRepository.findOne.mockResolvedValueOnce(null);

      await request(app.getHttpServer()).get("/pump-orders/999").expect(404);
    });
  });

  describe("/pump-orders/:id (PATCH)", () => {
    it("should update an order", async () => {
      mockOrderRepository.findOne.mockResolvedValue({ ...mockOrder, items: [], statusHistory: [] });

      const updateDto = {
        customerReference: "UPDATED-REF",
      };

      const response = await request(app.getHttpServer())
        .patch("/pump-orders/1")
        .send(updateDto)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(mockOrderRepository.save).toHaveBeenCalled();
    });

    it("should return 404 for non-existent order", async () => {
      mockOrderRepository.findOne.mockResolvedValueOnce(null);

      await request(app.getHttpServer())
        .patch("/pump-orders/999")
        .send({ customerReference: "Test" })
        .expect(404);
    });
  });

  describe("/pump-orders/:id/status (PATCH)", () => {
    it("should update order status to SUBMITTED", async () => {
      mockOrderRepository.findOne.mockResolvedValue({ ...mockOrder, items: [], statusHistory: [] });

      const response = await request(app.getHttpServer())
        .patch("/pump-orders/1/status")
        .query({ status: PumpOrderStatus.SUBMITTED })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(mockOrderRepository.save).toHaveBeenCalled();
    });

    it("should update status with notes", async () => {
      mockOrderRepository.findOne.mockResolvedValue({ ...mockOrder, items: [], statusHistory: [] });

      await request(app.getHttpServer())
        .patch("/pump-orders/1/status")
        .query({
          status: PumpOrderStatus.CONFIRMED,
          updatedBy: "admin",
          notes: "Order confirmed by manager",
        })
        .expect(200);

      expect(mockOrderRepository.save).toHaveBeenCalled();
    });

    it("should track status history", async () => {
      const orderWithHistory = { ...mockOrder, items: [], statusHistory: [] };
      mockOrderRepository.findOne.mockResolvedValue(orderWithHistory);

      await request(app.getHttpServer())
        .patch("/pump-orders/1/status")
        .query({ status: PumpOrderStatus.SUBMITTED })
        .expect(200);

      expect(mockOrderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          statusHistory: expect.arrayContaining([
            expect.objectContaining({
              fromStatus: PumpOrderStatus.DRAFT,
              toStatus: PumpOrderStatus.SUBMITTED,
            }),
          ]),
        }),
      );
    });
  });

  describe("/pump-orders/:id (DELETE)", () => {
    it("should delete an order", async () => {
      await request(app.getHttpServer()).delete("/pump-orders/1").expect(200);

      expect(mockOrderRepository.remove).toHaveBeenCalled();
    });

    it("should return 404 for non-existent order", async () => {
      mockOrderRepository.findOne.mockResolvedValueOnce(null);

      await request(app.getHttpServer()).delete("/pump-orders/999").expect(404);
    });
  });

  describe("Order Workflow", () => {
    it("should complete full order lifecycle: DRAFT -> SUBMITTED -> CONFIRMED -> COMPLETED", async () => {
      const orderStates = { ...mockOrder, items: [], statusHistory: [] };
      mockOrderRepository.findOne.mockResolvedValue(orderStates);

      await request(app.getHttpServer())
        .patch("/pump-orders/1/status")
        .query({ status: PumpOrderStatus.SUBMITTED })
        .expect(200);

      orderStates.status = PumpOrderStatus.SUBMITTED;
      mockOrderRepository.findOne.mockResolvedValue(orderStates);

      await request(app.getHttpServer())
        .patch("/pump-orders/1/status")
        .query({ status: PumpOrderStatus.CONFIRMED })
        .expect(200);

      orderStates.status = PumpOrderStatus.CONFIRMED;
      mockOrderRepository.findOne.mockResolvedValue(orderStates);

      await request(app.getHttpServer())
        .patch("/pump-orders/1/status")
        .query({ status: PumpOrderStatus.COMPLETED })
        .expect(200);

      expect(mockOrderRepository.save).toHaveBeenCalledTimes(3);
    });

    it("should allow order cancellation", async () => {
      mockOrderRepository.findOne.mockResolvedValue({ ...mockOrder, items: [], statusHistory: [] });

      await request(app.getHttpServer())
        .patch("/pump-orders/1/status")
        .query({ status: PumpOrderStatus.CANCELLED, notes: "Customer cancelled" })
        .expect(200);

      expect(mockOrderRepository.save).toHaveBeenCalled();
    });
  });
});
