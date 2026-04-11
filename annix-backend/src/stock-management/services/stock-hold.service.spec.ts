import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { IssuableProduct } from "../entities/issuable-product.entity";
import { StockHoldItem } from "../entities/stock-hold-item.entity";
import { StockHoldService } from "./stock-hold.service";

describe("StockHoldService", () => {
  let service: StockHoldService;

  const mockHoldRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
  };

  const mockProductRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockHoldService,
        { provide: getRepositoryToken(StockHoldItem), useValue: mockHoldRepo },
        { provide: getRepositoryToken(IssuableProduct), useValue: mockProductRepo },
      ],
    }).compile();

    service = module.get<StockHoldService>(StockHoldService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("flagStock", () => {
    it("throws NotFoundException when product does not exist", async () => {
      mockProductRepo.findOne.mockResolvedValueOnce(null);
      await expect(
        service.flagStock(1, {
          productId: 999,
          reason: "damaged",
          reasonNotes: "test",
          flaggedByStaffId: 1,
          photoUrl: "https://example.com/photo.jpg",
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("requires a photo for damaged items", async () => {
      mockProductRepo.findOne.mockResolvedValueOnce({ id: 1, costPerUnit: 100 });
      await expect(
        service.flagStock(1, {
          productId: 1,
          reason: "damaged",
          reasonNotes: "test",
          flaggedByStaffId: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("requires a photo for expired items", async () => {
      mockProductRepo.findOne.mockResolvedValueOnce({ id: 1, costPerUnit: 100 });
      await expect(
        service.flagStock(1, {
          productId: 1,
          reason: "expired",
          reasonNotes: "test",
          flaggedByStaffId: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("computes write-off value as quantity × costPerUnit", async () => {
      mockProductRepo.findOne.mockResolvedValueOnce({ id: 1, costPerUnit: 200 });
      const result = await service.flagStock(1, {
        productId: 1,
        quantity: 5,
        reason: "damaged",
        reasonNotes: "Dropped",
        photoUrl: "https://example.com/p.jpg",
        flaggedByStaffId: 1,
      });
      expect(result.writeOffValueR).toBe(1000);
      expect(result.dispositionStatus).toBe("pending");
    });
  });

  describe("resolveDisposition", () => {
    it("throws when hold item does not exist", async () => {
      mockHoldRepo.findOne.mockResolvedValueOnce(null);
      await expect(
        service.resolveDisposition(1, 999, {
          status: "scrapped",
          action: "scrap",
          dispositionByStaffId: 1,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws when hold item is already resolved", async () => {
      mockHoldRepo.findOne.mockResolvedValueOnce({
        id: 1,
        companyId: 1,
        dispositionStatus: "scrapped",
      });
      await expect(
        service.resolveDisposition(1, 1, {
          status: "donated",
          action: "donate",
          dispositionByStaffId: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
