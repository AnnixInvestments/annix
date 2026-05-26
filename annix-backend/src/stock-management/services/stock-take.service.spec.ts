import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { TransactionRunner } from "../../lib/persistence/transaction-runner";
import { IssuableProductRepository } from "../repositories/issuable-product.repository";
import { StockTakeRepository } from "../repositories/stock-take.repository";
import { StockTakeLineRepository } from "../repositories/stock-take-line.repository";
import { StockTakeVarianceCategoryRepository } from "../repositories/stock-take-variance-category.repository";
import { StockTakeService } from "./stock-take.service";

describe("StockTakeService", () => {
  let service: StockTakeService;

  const mockStockTakeRepo = {
    build: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    withTransaction: jest.fn(),
    findByIdForCompany: jest.fn(),
    findByIdForCompanyWithLines: jest.fn(),
    findForCompany: jest.fn(),
    findDraftForPeriod: jest.fn(),
    distinctCompanyIds: jest.fn(),
  };

  const mockLineRepo = {
    build: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    saveMany: jest.fn().mockImplementation((entities) => Promise.resolve(entities)),
    withTransaction: jest.fn(),
    findOneForStockTake: jest.fn(),
    findForStockTake: jest.fn(),
    varianceArchive: jest.fn(),
  };

  const mockCategoryRepo = {
    findById: jest.fn(),
    findByIds: jest.fn(),
  };

  const mockProductRepo = {
    findByIdForCompany: jest.fn(),
    findActiveForCompany: jest.fn(),
    withTransaction: jest.fn(),
  };

  const mockTxRunner = {
    run: jest.fn().mockImplementation((work) => work({})),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockTakeService,
        { provide: StockTakeRepository, useValue: mockStockTakeRepo },
        { provide: StockTakeLineRepository, useValue: mockLineRepo },
        { provide: StockTakeVarianceCategoryRepository, useValue: mockCategoryRepo },
        { provide: IssuableProductRepository, useValue: mockProductRepo },
        { provide: TransactionRunner, useValue: mockTxRunner },
      ],
    }).compile();

    service = module.get<StockTakeService>(StockTakeService);
    jest.clearAllMocks();
    mockTxRunner.run.mockImplementation((work) => work({}));
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("byId", () => {
    it("throws NotFoundException when stock take does not exist", async () => {
      mockStockTakeRepo.findByIdForCompanyWithLines.mockResolvedValueOnce(null);
      await expect(service.byId(1, 999)).rejects.toThrow(NotFoundException);
    });
  });
});
