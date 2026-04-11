import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { ConsumableReturn } from "../entities/consumable-return.entity";
import { IssuableProduct } from "../entities/issuable-product.entity";
import { PaintReturn } from "../entities/paint-return.entity";
import { ReturnSession } from "../entities/return-session.entity";
import { RubberOffcutReturn } from "../entities/rubber-offcut-return.entity";
import { RubberOffcutStock } from "../entities/rubber-offcut-stock.entity";
import { RubberWastageBin } from "../entities/rubber-wastage-bin.entity";
import { RubberWastageEntry } from "../entities/rubber-wastage-entry.entity";
import { ReturnsService } from "./returns.service";

describe("ReturnsService", () => {
  let service: ReturnsService;

  const baseRepoMock = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
  });

  const mockDataSource = {
    transaction: jest.fn().mockImplementation((cb) => cb({})),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReturnsService,
        { provide: getRepositoryToken(ReturnSession), useValue: baseRepoMock() },
        { provide: getRepositoryToken(RubberOffcutReturn), useValue: baseRepoMock() },
        { provide: getRepositoryToken(RubberOffcutStock), useValue: baseRepoMock() },
        { provide: getRepositoryToken(IssuableProduct), useValue: baseRepoMock() },
        { provide: getRepositoryToken(RubberWastageBin), useValue: baseRepoMock() },
        { provide: getRepositoryToken(RubberWastageEntry), useValue: baseRepoMock() },
        { provide: getRepositoryToken(PaintReturn), useValue: baseRepoMock() },
        { provide: getRepositoryToken(ConsumableReturn), useValue: baseRepoMock() },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<ReturnsService>(ReturnsService);
    jest.clearAllMocks();
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
