import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { now } from "../lib/datetime";
import { CreatePumpOrderDto } from "./dto/create-pump-order.dto";
import { UpdatePumpOrderDto } from "./dto/update-pump-order.dto";
import { PumpOrder, PumpOrderStatus, PumpOrderType } from "./entities/pump-order.entity";
import { PumpOrderItem, PumpOrderItemType } from "./entities/pump-order-item.entity";
import { PumpOrderController } from "./pump-order.controller";
import { PumpOrderService } from "./pump-order.service";

describe("PumpOrderController", () => {
  let controller: PumpOrderController;
  let service: PumpOrderService;

  const mockPumpOrderRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockPumpOrderItemRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  const mockPumpOrderService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByOrderNumber: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    remove: jest.fn(),
    summary: jest.fn(),
  };

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PumpOrderController],
      providers: [
        { provide: PumpOrderService, useValue: mockPumpOrderService },
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

    controller = module.get<PumpOrderController>(PumpOrderController);
    service = module.get<PumpOrderService>(PumpOrderService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("create", () => {
    it("should create a new order", async () => {
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

      mockPumpOrderService.create.mockResolvedValue(mockOrder);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockOrder);
      expect(mockPumpOrderService.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe("findAll", () => {
    it("should return paginated list of orders", async () => {
      const mockResponse = {
        items: [mockOrder],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      mockPumpOrderService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.findAll("1", "10");

      expect(result).toEqual(mockResponse);
      expect(mockPumpOrderService.findAll).toHaveBeenCalled();
    });

    it("should filter by status", async () => {
      const mockResponse = {
        items: [mockOrder],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      mockPumpOrderService.findAll.mockResolvedValue(mockResponse);

      await controller.findAll(undefined, undefined, undefined, PumpOrderStatus.DRAFT);

      expect(mockPumpOrderService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PumpOrderStatus.DRAFT,
        }),
      );
    });

    it("should filter by order type", async () => {
      const mockResponse = {
        items: [mockOrder],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      mockPumpOrderService.findAll.mockResolvedValue(mockResponse);

      await controller.findAll(undefined, undefined, undefined, undefined, PumpOrderType.NEW_PUMP);

      expect(mockPumpOrderService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          orderType: PumpOrderType.NEW_PUMP,
        }),
      );
    });
  });

  describe("findOne", () => {
    it("should return an order by id", async () => {
      mockPumpOrderService.findOne.mockResolvedValue(mockOrder);

      const result = await controller.findOne(1);

      expect(result).toEqual(mockOrder);
      expect(mockPumpOrderService.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe("findByOrderNumber", () => {
    it("should return an order by order number", async () => {
      mockPumpOrderService.findByOrderNumber.mockResolvedValue(mockOrder);

      const result = await controller.findByOrderNumber("PO-2026-00001");

      expect(result).toEqual(mockOrder);
      expect(mockPumpOrderService.findByOrderNumber).toHaveBeenCalledWith("PO-2026-00001");
    });
  });

  describe("update", () => {
    it("should update an order", async () => {
      const updateDto: UpdatePumpOrderDto = {
        customerReference: "UPDATED-REF",
      };

      const updatedOrder = { ...mockOrder, ...updateDto };
      mockPumpOrderService.update.mockResolvedValue(updatedOrder);

      const result = await controller.update(1, updateDto);

      expect(result).toEqual(updatedOrder);
      expect(mockPumpOrderService.update).toHaveBeenCalledWith(1, updateDto);
    });
  });

  describe("updateStatus", () => {
    it("should update order status", async () => {
      const updatedOrder = { ...mockOrder, status: PumpOrderStatus.SUBMITTED };
      mockPumpOrderService.updateStatus.mockResolvedValue(updatedOrder);

      const result = await controller.updateStatus(1, PumpOrderStatus.SUBMITTED);

      expect(result).toEqual(updatedOrder);
      expect(mockPumpOrderService.updateStatus).toHaveBeenCalledWith(
        1,
        PumpOrderStatus.SUBMITTED,
        undefined,
        undefined,
      );
    });
  });

  describe("remove", () => {
    it("should delete an order", async () => {
      mockPumpOrderService.remove.mockResolvedValue(undefined);

      await controller.remove(1);

      expect(mockPumpOrderService.remove).toHaveBeenCalledWith(1);
    });
  });

  describe("summary", () => {
    it("should return order summary", async () => {
      const mockSummary = {
        totalOrders: 10,
        byStatus: {
          draft: 2,
          submitted: 3,
          confirmed: 2,
          completed: 3,
        },
        byType: {
          new_pump: 5,
          spare_parts: 3,
          repair: 2,
        },
        totalValue: 1500000,
        recentOrders: [mockOrder],
      };

      mockPumpOrderService.summary.mockResolvedValue(mockSummary);

      const result = await controller.summary();

      expect(result).toEqual(mockSummary);
      expect(mockPumpOrderService.summary).toHaveBeenCalled();
    });
  });
});
