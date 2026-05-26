import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { now } from "../lib/datetime";
import { CreatePumpOrderDto } from "./dto/create-pump-order.dto";
import { PumpOrder, PumpOrderStatus, PumpOrderType } from "./entities/pump-order.entity";
import { PumpOrderItem, PumpOrderItemType } from "./entities/pump-order-item.entity";
import { PumpOrderRepository } from "./pump-order.repository";
import { PumpOrderService } from "./pump-order.service";
import { PumpOrderItemRepository } from "./pump-order-item.repository";

describe("PumpOrderService", () => {
  let service: PumpOrderService;

  const mockOrder: PumpOrder = {
    id: 1,
    orderNumber: "PO-2026-00001",
    customerReference: "CUST-REF-001",
    status: PumpOrderStatus.DRAFT,
    orderType: PumpOrderType.NEW_PUMP,
    rfqId: null,
    customerCompany: "Mining Corp SA",
    customerContact: "John Smith",
    customerEmail: "john@example.com",
    customerPhone: null,
    deliveryAddress: null,
    requestedDeliveryDate: null,
    confirmedDeliveryDate: null,
    supplierId: null,
    subtotal: 100000,
    vatAmount: 15000,
    totalAmount: 115000,
    currency: "ZAR",
    specialInstructions: null,
    internalNotes: null,
    statusHistory: [],
    createdBy: null,
    updatedBy: null,
    items: [],
    createdAt: now().toJSDate(),
    updatedAt: now().toJSDate(),
  } as unknown as PumpOrder;

  const mockOrderItem: PumpOrderItem = {
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
  } as unknown as PumpOrderItem;

  const mockPumpOrderRepo = {
    create: jest.fn().mockResolvedValue(mockOrder),
    save: jest.fn().mockResolvedValue(mockOrder),
    findById: jest.fn(),
    findAllPaged: jest.fn(),
    findByOrderNumber: jest.fn(),
    summary: jest.fn(),
    updateTotals: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
    findOneWhere: jest.fn(),
  };

  const mockPumpOrderItemRepo = {
    saveMany: jest.fn().mockResolvedValue([mockOrderItem]),
    deleteByOrderId: jest.fn().mockResolvedValue(undefined),
    create: jest.fn().mockResolvedValue(mockOrderItem),
    findOneWhere: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PumpOrderService,
        {
          provide: PumpOrderRepository,
          useValue: mockPumpOrderRepo,
        },
        {
          provide: PumpOrderItemRepository,
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
      mockPumpOrderRepo.create.mockResolvedValue(mockOrder);
      mockPumpOrderRepo.findById.mockResolvedValue({ ...mockOrder, items: [mockOrderItem] });
      mockPumpOrderItemRepo.saveMany.mockResolvedValue([mockOrderItem]);

      const createDto: CreatePumpOrderDto = {
        orderType: PumpOrderType.NEW_PUMP,
        customerCompany: "Mining Corp SA",
        customerContact: "John Smith",
        customerEmail: "john@example.com",
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
      expect(mockPumpOrderItemRepo.saveMany).toHaveBeenCalled();
      expect(mockPumpOrderRepo.updateTotals).toHaveBeenCalled();
    });

    it("should generate unique order number with timestamp", async () => {
      mockPumpOrderRepo.create.mockResolvedValue(mockOrder);
      mockPumpOrderRepo.findById.mockResolvedValue({ ...mockOrder, items: [mockOrderItem] });
      mockPumpOrderItemRepo.saveMany.mockResolvedValue([mockOrderItem]);

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
      const savedItemWithLineTotal = { ...mockOrderItem, lineTotal: 100000 };
      mockPumpOrderRepo.create.mockResolvedValue(mockOrder);
      mockPumpOrderRepo.findById.mockResolvedValue({
        ...mockOrder,
        items: [savedItemWithLineTotal],
      });
      mockPumpOrderItemRepo.saveMany.mockResolvedValue([savedItemWithLineTotal]);

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

      expect(mockPumpOrderRepo.updateTotals).toHaveBeenCalledWith(
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
      mockPumpOrderRepo.findAllPaged.mockResolvedValue({
        data: [mockOrder],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toBeDefined();
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockPumpOrderRepo.findAllPaged).toHaveBeenCalled();
    });

    it("should apply status filter", async () => {
      mockPumpOrderRepo.findAllPaged.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      await service.findAll({ status: PumpOrderStatus.DRAFT });

      expect(mockPumpOrderRepo.findAllPaged).toHaveBeenCalledWith(
        expect.objectContaining({ status: PumpOrderStatus.DRAFT }),
      );
    });

    it("should apply order type filter", async () => {
      mockPumpOrderRepo.findAllPaged.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      await service.findAll({ orderType: PumpOrderType.NEW_PUMP });

      expect(mockPumpOrderRepo.findAllPaged).toHaveBeenCalledWith(
        expect.objectContaining({ orderType: PumpOrderType.NEW_PUMP }),
      );
    });

    it("should apply date range filters", async () => {
      mockPumpOrderRepo.findAllPaged.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      await service.findAll({ fromDate: "2026-01-01", toDate: "2026-12-31" });

      expect(mockPumpOrderRepo.findAllPaged).toHaveBeenCalledWith(
        expect.objectContaining({ fromDate: "2026-01-01", toDate: "2026-12-31" }),
      );
    });
  });

  describe("findOne", () => {
    it("should return an order by id", async () => {
      mockPumpOrderRepo.findById.mockResolvedValue({ ...mockOrder, items: [] });

      const result = await service.findOne(1);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
    });

    it("should throw NotFoundException for non-existent order", async () => {
      mockPumpOrderRepo.findById.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("findByOrderNumber", () => {
    it("should return an order by order number", async () => {
      mockPumpOrderRepo.findByOrderNumber.mockResolvedValue({ ...mockOrder, items: [] });
      mockPumpOrderRepo.findById.mockResolvedValue({ ...mockOrder, items: [] });

      const result = await service.findByOrderNumber("PO-2026-00001");

      expect(result).toBeDefined();
      expect(result.orderNumber).toBe("PO-2026-00001");
    });

    it("should throw NotFoundException for non-existent order number", async () => {
      mockPumpOrderRepo.findByOrderNumber.mockResolvedValue(null);

      await expect(service.findByOrderNumber("INVALID")).rejects.toThrow(NotFoundException);
    });
  });

  describe("update", () => {
    it("should update an order", async () => {
      const orderWithItems = { ...mockOrder, items: [], statusHistory: [] };
      mockPumpOrderRepo.findById.mockResolvedValue(orderWithItems);
      mockPumpOrderRepo.save.mockResolvedValue(orderWithItems);

      const updateDto = { customerReference: "UPDATED-REF" };
      const result = await service.update(1, updateDto);

      expect(result).toBeDefined();
      expect(mockPumpOrderRepo.save).toHaveBeenCalled();
    });

    it("should throw NotFoundException for non-existent order", async () => {
      mockPumpOrderRepo.findById.mockResolvedValue(null);

      await expect(service.update(999, { customerReference: "Test" })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("updateStatus", () => {
    it("should update order status", async () => {
      const orderWithHistory = { ...mockOrder, statusHistory: [], items: [] };
      mockPumpOrderRepo.findById.mockResolvedValue(orderWithHistory);
      mockPumpOrderRepo.save.mockResolvedValue(orderWithHistory);

      const result = await service.updateStatus(1, PumpOrderStatus.SUBMITTED);

      expect(result).toBeDefined();
      expect(mockPumpOrderRepo.save).toHaveBeenCalled();
    });

    it("should add status history entry when status changes", async () => {
      const orderWithHistory = { ...mockOrder, statusHistory: [], items: [] };
      mockPumpOrderRepo.findById.mockResolvedValue(orderWithHistory);
      mockPumpOrderRepo.save.mockResolvedValue(orderWithHistory);

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
      const orderWithHistory = { ...mockOrder, statusHistory: [], items: [] };
      mockPumpOrderRepo.findById.mockResolvedValue(orderWithHistory);
      mockPumpOrderRepo.save.mockResolvedValue(orderWithHistory);

      await service.updateStatus(1, PumpOrderStatus.CONFIRMED, "admin", "Approved by manager");

      expect(mockPumpOrderRepo.save).toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    it("should delete an order", async () => {
      mockPumpOrderRepo.findById.mockResolvedValue(mockOrder);

      await service.remove(1);

      expect(mockPumpOrderRepo.remove).toHaveBeenCalledWith(mockOrder);
    });

    it("should throw NotFoundException for non-existent order", async () => {
      mockPumpOrderRepo.findById.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("summary", () => {
    it("should return order summary", async () => {
      const mockSummary = {
        totalOrders: 3,
        byStatus: {
          [PumpOrderStatus.DRAFT]: 1,
          [PumpOrderStatus.SUBMITTED]: 1,
          [PumpOrderStatus.CONFIRMED]: 1,
        },
        byType: {
          [PumpOrderType.NEW_PUMP]: 2,
          [PumpOrderType.SPARE_PARTS]: 1,
        },
        totalRevenue: 175000,
        averageOrderValue: 58333.33,
      };

      mockPumpOrderRepo.summary.mockResolvedValue(mockSummary);

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
      expect(mockPumpOrderRepo.summary).toHaveBeenCalledTimes(1);
    });

    it("should handle empty orders", async () => {
      mockPumpOrderRepo.summary.mockResolvedValue({
        totalOrders: 0,
        byStatus: {},
        byType: {},
        totalRevenue: 0,
        averageOrderValue: 0,
      });

      const result = await service.summary();

      expect(result.totalOrders).toBe(0);
      expect(result.totalRevenue).toBe(0);
      expect(result.averageOrderValue).toBe(0);
    });
  });
});
