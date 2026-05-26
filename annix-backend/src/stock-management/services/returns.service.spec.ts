import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { TransactionRunner } from "../../lib/persistence/transaction-runner";
import { ConsumableReturnRepository } from "../repositories/consumable-return.repository";
import { IssuableProductRepository } from "../repositories/issuable-product.repository";
import { PaintReturnRepository } from "../repositories/paint-return.repository";
import { ReturnSessionRepository } from "../repositories/return-session.repository";
import { RubberOffcutReturnRepository } from "../repositories/rubber-offcut-return.repository";
import { RubberOffcutStockRepository } from "../repositories/rubber-offcut-stock.repository";
import { RubberWastageBinRepository } from "../repositories/rubber-wastage-bin.repository";
import { RubberWastageEntryRepository } from "../repositories/rubber-wastage-entry.repository";
import { ReturnsService } from "./returns.service";

describe("ReturnsService", () => {
  let service: ReturnsService;

  const baseRepoMock = () => ({
    build: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    withTransaction: jest.fn(),
    findOutstandingForCompany: jest.fn(),
    findByIdForCompany: jest.fn(),
    findByIdWithReturns: jest.fn(),
    findByIdWithOffcutReturns: jest.fn(),
    findActiveForCompany: jest.fn(),
    findByColour: jest.fn(),
    findByIdForCompanyWithDetail: jest.fn(),
  });

  const mockTxRunner = {
    run: jest.fn().mockImplementation((work) => work({})),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReturnsService,
        { provide: ReturnSessionRepository, useValue: baseRepoMock() },
        { provide: RubberOffcutReturnRepository, useValue: baseRepoMock() },
        { provide: RubberOffcutStockRepository, useValue: baseRepoMock() },
        { provide: IssuableProductRepository, useValue: baseRepoMock() },
        { provide: RubberWastageBinRepository, useValue: baseRepoMock() },
        { provide: RubberWastageEntryRepository, useValue: baseRepoMock() },
        { provide: PaintReturnRepository, useValue: baseRepoMock() },
        { provide: ConsumableReturnRepository, useValue: baseRepoMock() },
        { provide: TransactionRunner, useValue: mockTxRunner },
      ],
    }).compile();

    service = module.get<ReturnsService>(ReturnsService);
    jest.clearAllMocks();
    mockTxRunner.run.mockImplementation((work) => work({}));
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createOffcutReturnSession", () => {
    it("rejects zero or negative dimensions", async () => {
      await expect(
        service.createOffcutReturnSession(1, {
          widthMm: 0,
          lengthM: 1,
          thicknessMm: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("addWastageEntry", () => {
    it("rejects zero or negative weight", async () => {
      await expect(
        service.addWastageEntry(1, {
          colour: "black",
          weightKgAdded: 0,
          costPerKgAtEntry: 100,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
