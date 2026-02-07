import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { now } from "../lib/datetime";
import { CreatePumpOrderDto } from "./dto/create-pump-order.dto";
import { PumpOrder, PumpOrderStatus, PumpOrderType } from "./entities/pump-order.entity";
import { PumpOrderItem, PumpOrderItemType } from "./entities/pump-order-item.entity";
import { PumpOrderService } from "./pump-order.service";

describe("PumpOrderService", () => {
  let service: PumpOrderService;

  const mockOrder = {
    id: 1,
    orderNumber: "PO-2026-00001",
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
    getCount: jest.fn().mockResolvedValue(1),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue({ total: "100000" }),
    getMany: jest.fn().mockResolvedValue([mockOrder]),
  };

  const mockPumpOrderRepo = {
    create: jest.fn().mockReturnValue(mockOrder),
    save: jest.fn().mockResolvedValue(mockOrder),
    find: jest.fn().mockResolvedValue([mockOrder]),
    findOne: jest.fn(),
    remove: jest.fn().mockResolvedValue(undefined),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    count: jest.fn().mockResolvedValue(1),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockPumpOrderItemRepo = {
    create: jest.fn().mockReturnValue(mockOrderItem),
    save: jest.fn().mockResolvedValue([mockOrderItem]),
    find: jest.fn().mockResolvedValue([mockOrderItem]),
    remove: jest.fn(),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PumpOrderService,
        {
          provide: getRepositoryToken(PumpOrder),
          useValue: mockPumpOrderRepo,
        },
        {
          provide: getRepositoryToken(PumpOrderItem),
          useValue: mockPumpOrderItemRepo,
        },
      ],
    }).compile();

    service = module.get<PumpOrderService>(PumpOrderService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a new order with items", async () => {
      mockPumpOrderRepo.findOne.mockResolvedValue(mockOrder);

      const createDto: CreatePumpOrderDto = {
        orderType: PumpOrderType.NEW_PUMP,
        customerCompany: "Mining Corp SA",
        customerContact: "John Smith",
        customerEmail: "john@miningcorp.co.za",
        items: [
          {
            itemType: PumpOrderItemType.NEW_PUMP,
            description: "KSB Pump",
            quantity: 1,
            unitPrice: 50000,
          },
        ],
      };

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(mockPumpOrderRepo.create).toHaveBeenCalled();
      expect(mockPumpOrderRepo.save).toHaveBeenCalled();
      expect(mockPumpOrderItemRepo.save).toHaveBeenCalled();
    });

    it("should generate unique order number with timestamp", async () => {
      mockPumpOrderRepo.findOne.mockResolvedValue(mockOrder);

      const createDto: CreatePumpOrderDto = {
        orderType: PumpOrderType.NEW_PUMP,
        customerCompany: "Test Company",
        items: [
          {
            itemType: PumpOrderItemType.NEW_PUMP,
            description: "Test Pump",
            quantity: 1,
            unitPrice: 10000,
          },
        ],
      };

      await service.create(createDto);

      expect(mockPumpOrderRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          orderNumber: expect.stringMatching(/^PO-\d{4}-[A-Z0-9]+$/) as string,
        }),
      );
    });

    it("should calculate line totals for items", async () => {
      mockPumpOrderRepo.findOne.mockResolvedValue(mockOrder);
      const savedItemWithLineTotal = { ...mockOrderItem, lineTotal: 100000 };
      mockPumpOrderItemRepo.save.mockResolvedValue([savedItemWithLineTotal]);

      const createDto: CreatePumpOrderDto = {
        orderType: PumpOrderType.NEW_PUMP,
        customerCompany: "Test Company",
        items: [
          {
            itemType: PumpOrderItemType.NEW_PUMP,
            description: "Pump 1",
            quantity: 2,
            unitPrice: 50000,
          },
        ],
      };

      await service.create(createDto);

      expect(mockPumpOrderRepo.update).toHaveBeenCalledWith(
        mockOrder.id,
        expect.objectContaining({
          subtotal: expect.any(Number) as number,
          vatAmount: expect.any(Number) as number,
          totalAmount: expect.any(Number) as number,
        }),
      );
    });
  });

  describe("findAll", () => {
    it("should return paginated orders", async () => {
      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toBeDefined();
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockPumpOrderRepo.createQueryBuilder).toHaveBeenCalled();
    });

    it("should apply status filter", async () => {
      await service.findAll({ status: PumpOrderStatus.DRAFT });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });

    it("should apply order type filter", async () => {
      await service.findAll({ orderType: PumpOrderType.NEW_PUMP });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });

    it("should apply date range filters", async () => {
      await service.findAll({
        fromDate: "2026-01-01",
        toDate: "2026-12-31",
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("should return an order by id", async () => {
      mockPumpOrderRepo.findOne.mockResolvedValue(mockOrder);

      const result = await service.findOne(1);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
    });

    it("should throw NotFoundException for non-existent order", async () => {
      mockPumpOrderRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("findByOrderNumber", () => {
    it("should return an order by order number", async () => {
      mockPumpOrderRepo.findOne.mockResolvedValue(mockOrder);

      const result = await service.findByOrderNumber("PO-2026-00001");

      expect(result).toBeDefined();
      expect(result.orderNumber).toBe("PO-2026-00001");
    });

    it("should throw NotFoundException for non-existent order number", async () => {
      mockPumpOrderRepo.findOne.mockResolvedValue(null);

      await expect(service.findByOrderNumber("INVALID")).rejects.toThrow(NotFoundException);
    });
  });

  describe("update", () => {
    it("should update an order", async () => {
      mockPumpOrderRepo.findOne.mockResolvedValue({ ...mockOrder });

      const updateDto = { customerReference: "UPDATED-REF" };
      const result = await service.update(1, updateDto);

      expect(result).toBeDefined();
      expect(mockPumpOrderRepo.save).toHaveBeenCalled();
    });

    it("should throw NotFoundException for non-existent order", async () => {
      mockPumpOrderRepo.findOne.mockResolvedValue(null);

      await expect(service.update(999, { customerReference: "Test" })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("updateStatus", () => {
    it("should update order status", async () => {
      mockPumpOrderRepo.findOne.mockResolvedValue({
        ...mockOrder,
        statusHistory: [],
      });

      const result = await service.updateStatus(1, PumpOrderStatus.SUBMITTED);

      expect(result).toBeDefined();
      expect(mockPumpOrderRepo.save).toHaveBeenCalled();
    });

    it("should add status history entry when status changes", async () => {
      const orderWithHistory = { ...mockOrder, statusHistory: [] };
      mockPumpOrderRepo.findOne.mockResolvedValue(orderWithHistory);

      await service.updateStatus(1, PumpOrderStatus.SUBMITTED);

      expect(mockPumpOrderRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PumpOrderStatus.SUBMITTED,
          statusHistory: expect.arrayContaining([
            expect.objectContaining({
              fromStatus: PumpOrderStatus.DRAFT,
              toStatus: PumpOrderStatus.SUBMITTED,
            }),
          ]),
        }),
      );
    });

    it("should pass updatedBy and notes to update", async () => {
      mockPumpOrderRepo.findOne.mockResolvedValue({
        ...mockOrder,
        statusHistory: [],
      });

      await service.updateStatus(1, PumpOrderStatus.CONFIRMED, "admin", "Approved by manager");

      expect(mockPumpOrderRepo.save).toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    it("should delete an order", async () => {
      mockPumpOrderRepo.findOne.mockResolvedValue(mockOrder);

      await service.remove(1);

      expect(mockPumpOrderRepo.remove).toHaveBeenCalledWith(mockOrder);
    });

    it("should throw NotFoundException for non-existent order", async () => {
      mockPumpOrderRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("summary", () => {
    it("should return order summary", async () => {
      const mockOrders = [
        {
          ...mockOrder,
          status: PumpOrderStatus.DRAFT,
          orderType: PumpOrderType.NEW_PUMP,
          totalAmount: 100000,
        },
        {
          ...mockOrder,
          id: 2,
          status: PumpOrderStatus.SUBMITTED,
          orderType: PumpOrderType.NEW_PUMP,
          totalAmount: 50000,
        },
        {
          ...mockOrder,
          id: 3,
          status: PumpOrderStatus.CONFIRMED,
          orderType: PumpOrderType.SPARE_PARTS,
          totalAmount: 25000,
        },
      ];

      mockPumpOrderRepo.find.mockResolvedValue(mockOrders);

      const result = await service.summary();

      expect(result).toBeDefined();
      expect(result.totalOrders).toBe(3);
      expect(result.byStatus[PumpOrderStatus.DRAFT]).toBe(1);
      expect(result.byStatus[PumpOrderStatus.SUBMITTED]).toBe(1);
      expect(result.byStatus[PumpOrderStatus.CONFIRMED]).toBe(1);
      expect(result.byType[PumpOrderType.NEW_PUMP]).toBe(2);
      expect(result.byType[PumpOrderType.SPARE_PARTS]).toBe(1);
      expect(result.totalRevenue).toBe(175000);
      expect(result.averageOrderValue).toBeCloseTo(58333.33, 0);
      expect(mockPumpOrderRepo.find).toHaveBeenCalled();
    });

    it("should handle empty orders", async () => {
      mockPumpOrderRepo.find.mockResolvedValue([]);

      const result = await service.summary();

      expect(result.totalOrders).toBe(0);
      expect(result.totalRevenue).toBe(0);
      expect(result.averageOrderValue).toBe(0);
    });
  });
});
