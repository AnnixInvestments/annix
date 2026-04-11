import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { IssuableProduct } from "../entities/issuable-product.entity";
import { StockTake } from "../entities/stock-take.entity";
import { StockTakeLine } from "../entities/stock-take-line.entity";
import { StockTakeVarianceCategory } from "../entities/stock-take-variance-category.entity";
import { StockTakeService } from "./stock-take.service";

describe("StockTakeService", () => {
  let service: StockTakeService;

  const baseRepoMock = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => {
      if (Array.isArray(entity)) {
        return Promise.resolve(entity.map((e, i) => ({ id: i + 1, ...e })));
      }
      return Promise.resolve({ id: 1, ...entity });
    }),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    })),
  });

  const mockDataSource = {
    transaction: jest.fn().mockImplementation((cb) => cb({})),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockTakeService,
        { provide: getRepositoryToken(StockTake), useValue: baseRepoMock() },
        { provide: getRepositoryToken(StockTakeLine), useValue: baseRepoMock() },
        { provide: getRepositoryToken(StockTakeVarianceCategory), useValue: baseRepoMock() },
        { provide: getRepositoryToken(IssuableProduct), useValue: baseRepoMock() },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<StockTakeService>(StockTakeService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("byId", () => {
    it("throws NotFoundException when stock take does not exist", async () => {
      const stockTakeRepo = service["stockTakeRepo"] as { findOne: jest.Mock };
      stockTakeRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.byId(1, 999)).rejects.toThrow(NotFoundException);
    });
  });
});
