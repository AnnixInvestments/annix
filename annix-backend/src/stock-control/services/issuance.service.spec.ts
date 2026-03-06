import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { JobCard } from "../entities/job-card.entity";
import { StaffMember } from "../entities/staff-member.entity";
import { StockAllocation } from "../entities/stock-allocation.entity";
import { StockIssuance } from "../entities/stock-issuance.entity";
import { StockItem } from "../entities/stock-item.entity";
import { MovementType, ReferenceType, StockMovement } from "../entities/stock-movement.entity";
import { IssuanceService } from "./issuance.service";

describe("IssuanceService", () => {
  let service: IssuanceService;

  const mockIssuanceRepo = {
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    findOne: jest.fn(),
  };

  const mockStaffRepo = {
    findOne: jest.fn(),
  };

  const mockStockItemRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockJobCardRepo = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockMovementRepo = {
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
  };

  const mockAllocationRepo = {
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
  };

  const mockUser = { id: 1, companyId: 1, name: "Test User" };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IssuanceService,
        { provide: getRepositoryToken(StockIssuance), useValue: mockIssuanceRepo },
        { provide: getRepositoryToken(StaffMember), useValue: mockStaffRepo },
        { provide: getRepositoryToken(StockItem), useValue: mockStockItemRepo },
        { provide: getRepositoryToken(JobCard), useValue: mockJobCardRepo },
        { provide: getRepositoryToken(StockMovement), useValue: mockMovementRepo },
        { provide: getRepositoryToken(StockAllocation), useValue: mockAllocationRepo },
      ],
    }).compile();

    service = module.get<IssuanceService>(IssuanceService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("parseAndValidateQr", () => {
    it("parses 'staff:token' format", async () => {
      const staff = { id: 1, name: "John", active: true, qrToken: "abc123" };
      mockStaffRepo.findOne.mockResolvedValue(staff);

      const result = await service.parseAndValidateQr(1, "staff:abc123");
      expect(result.type).toBe("staff");
      expect(result.id).toBe(1);
      expect(result.data).toBe(staff);
    });

    it("parses 'stock:id' format", async () => {
      const stockItem = { id: 5, name: "Paint" };
      mockStockItemRepo.findOne.mockResolvedValue(stockItem);

      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(stockItem),
      };
      mockStockItemRepo.findOne.mockResolvedValue(null);
      (mockStockItemRepo as any).createQueryBuilder = jest.fn().mockReturnValue(qb);

      const result = await service.parseAndValidateQr(1, "stock:5");
      expect(result.type).toBe("stock_item");
      expect(result.id).toBe(5);
    });

    it("parses 'job:id' format", async () => {
      const jobCard = { id: 10, jobNumber: "JC-001" };
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(jobCard),
      };
      mockJobCardRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.parseAndValidateQr(1, "job:10");
      expect(result.type).toBe("job_card");
      expect(result.id).toBe(10);
    });

    it("parses JSON QR with id field as stock item", async () => {
      const stockItem = { id: 7, name: "Item" };
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(stockItem),
      };
      (mockStockItemRepo as any).createQueryBuilder = jest.fn().mockReturnValue(qb);

      const result = await service.parseAndValidateQr(1, '{"id": 7}');
      expect(result.type).toBe("stock_item");
      expect(result.id).toBe(7);
    });

    it("parses JSON QR with jobNumber field", async () => {
      const stockQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      (mockStockItemRepo as any).createQueryBuilder = jest.fn().mockReturnValue(stockQb);

      const jobCard = { id: 15, jobNumber: "JC-005" };
      const jobQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(jobCard),
      };
      mockJobCardRepo.createQueryBuilder.mockReturnValue(jobQb);

      const result = await service.parseAndValidateQr(1, '{"jobNumber": "JC-005"}');
      expect(result.type).toBe("job_card");
      expect(result.id).toBe(15);
    });

    it("extracts JSON from brace-enclosed content", async () => {
      const stockItem = { id: 3, name: "Item" };
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(stockItem),
      };
      (mockStockItemRepo as any).createQueryBuilder = jest.fn().mockReturnValue(qb);

      const result = await service.parseAndValidateQr(1, 'prefix{"id": 3}suffix');
      expect(result.type).toBe("stock_item");
      expect(result.id).toBe(3);
    });

    it("falls back to raw token staff lookup", async () => {
      const staff = { id: 2, name: "Jane", active: true, qrToken: "rawtoken" };
      mockStaffRepo.findOne.mockResolvedValue(staff);

      const result = await service.parseAndValidateQr(1, "rawtoken");
      expect(result.type).toBe("staff");
    });

    it("trims whitespace from QR input", async () => {
      const staff = { id: 1, name: "John", active: true, qrToken: "token1" };
      mockStaffRepo.findOne.mockResolvedValue(staff);

      const result = await service.parseAndValidateQr(1, "  staff:token1  ");
      expect(result.type).toBe("staff");
    });

    it("throws NotFoundException when no match found", async () => {
      mockStaffRepo.findOne.mockResolvedValue(null);
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      (mockStockItemRepo as any).createQueryBuilder = jest.fn().mockReturnValue(qb);
      mockJobCardRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      });

      await expect(service.parseAndValidateQr(1, "unknown_code")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("throws BadRequestException for inactive staff", async () => {
      const staff = { id: 1, name: "Inactive", active: false, qrToken: "abc" };
      mockStaffRepo.findOne.mockResolvedValue(staff);

      await expect(service.parseAndValidateQr(1, "staff:abc")).rejects.toThrow(BadRequestException);
    });
  });

  describe("createIssuance", () => {
    const issuer = { id: 1, name: "Issuer" };
    const recipient = { id: 2, name: "Recipient" };
    const stockItem = { id: 10, name: "Paint", quantity: 50 };
    const jobCard = { id: 5, jobNumber: "JC-001" };

    function setupCreateMocks(overrides?: { stockQuantity?: number; jobCardId?: number | null }) {
      mockStaffRepo.findOne.mockResolvedValueOnce(issuer).mockResolvedValueOnce(recipient);
      mockStockItemRepo.findOne.mockResolvedValue({
        ...stockItem,
        quantity: overrides?.stockQuantity ?? 50,
      });
      mockStockItemRepo.save.mockResolvedValue(true);
      mockJobCardRepo.findOne.mockResolvedValue(overrides?.jobCardId !== null ? jobCard : null);
      mockIssuanceRepo.findOne.mockResolvedValue({ id: 1 });
    }

    it("throws BadRequestException when quantity <= 0", async () => {
      setupCreateMocks();

      await expect(
        service.createIssuance(
          1,
          {
            issuerStaffId: 1,
            recipientStaffId: 2,
            stockItemId: 10,
            quantity: 0,
          },
          mockUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException when insufficient stock", async () => {
      setupCreateMocks({ stockQuantity: 5 });

      await expect(
        service.createIssuance(
          1,
          {
            issuerStaffId: 1,
            recipientStaffId: 2,
            stockItemId: 10,
            quantity: 10,
          },
          mockUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("decrements stock quantity on successful issuance", async () => {
      setupCreateMocks();

      await service.createIssuance(
        1,
        {
          issuerStaffId: 1,
          recipientStaffId: 2,
          stockItemId: 10,
          quantity: 5,
        },
        mockUser,
      );

      expect(mockStockItemRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ quantity: 45 }),
      );
    });

    it("creates OUT movement record", async () => {
      setupCreateMocks();

      await service.createIssuance(
        1,
        {
          issuerStaffId: 1,
          recipientStaffId: 2,
          stockItemId: 10,
          quantity: 5,
        },
        mockUser,
      );

      expect(mockMovementRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          movementType: MovementType.OUT,
          quantity: 5,
          referenceType: ReferenceType.ISSUANCE,
        }),
      );
    });

    it("creates stock allocation when jobCardId is provided", async () => {
      setupCreateMocks();

      await service.createIssuance(
        1,
        {
          issuerStaffId: 1,
          recipientStaffId: 2,
          stockItemId: 10,
          jobCardId: 5,
          quantity: 5,
        },
        mockUser,
      );

      expect(mockAllocationRepo.create).toHaveBeenCalled();
      expect(mockAllocationRepo.save).toHaveBeenCalled();
    });

    it("does not create allocation without jobCardId", async () => {
      setupCreateMocks({ jobCardId: null });

      await service.createIssuance(
        1,
        {
          issuerStaffId: 1,
          recipientStaffId: 2,
          stockItemId: 10,
          quantity: 5,
        },
        mockUser,
      );

      expect(mockAllocationRepo.create).not.toHaveBeenCalled();
    });

    it("throws NotFoundException when issuer not found", async () => {
      mockStaffRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.createIssuance(
          1,
          {
            issuerStaffId: 999,
            recipientStaffId: 2,
            stockItemId: 10,
            quantity: 1,
          },
          mockUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("createBatchIssuance", () => {
    it("throws BadRequestException for empty items array", async () => {
      await expect(
        service.createBatchIssuance(
          1,
          {
            issuerStaffId: 1,
            recipientStaffId: 2,
            items: [],
          },
          mockUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("accumulates errors for invalid items", async () => {
      mockStaffRepo.findOne
        .mockResolvedValueOnce({ id: 1, name: "Issuer" })
        .mockResolvedValueOnce({ id: 2, name: "Recipient" });
      mockJobCardRepo.findOne.mockResolvedValue(null);
      mockStockItemRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 2, name: "Item 2", quantity: 100 });
      mockStockItemRepo.save.mockResolvedValue(true);
      mockIssuanceRepo.findOne.mockResolvedValue({ id: 1 });

      const result = await service.createBatchIssuance(
        1,
        {
          issuerStaffId: 1,
          recipientStaffId: 2,
          items: [
            { stockItemId: 999, quantity: 1 },
            { stockItemId: 2, quantity: 1 },
          ],
        },
        mockUser,
      );

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].stockItemId).toBe(999);
      expect(result.created).toBe(1);
    });

    it("reports error for quantity <= 0", async () => {
      mockStaffRepo.findOne
        .mockResolvedValueOnce({ id: 1, name: "Issuer" })
        .mockResolvedValueOnce({ id: 2, name: "Recipient" });
      mockJobCardRepo.findOne.mockResolvedValue(null);
      mockStockItemRepo.findOne.mockResolvedValue({ id: 1, name: "Item", quantity: 100 });

      const result = await service.createBatchIssuance(
        1,
        {
          issuerStaffId: 1,
          recipientStaffId: 2,
          items: [{ stockItemId: 1, quantity: 0 }],
        },
        mockUser,
      );

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain("greater than 0");
    });
  });
});
