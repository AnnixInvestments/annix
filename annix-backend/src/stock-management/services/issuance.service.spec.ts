import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { IssuableProduct } from "../entities/issuable-product.entity";
import { IssuanceRow } from "../entities/issuance-row.entity";
import { IssuanceSession } from "../entities/issuance-session.entity";
import { FifoBatchService } from "./fifo-batch.service";
import { IssuanceService } from "./issuance.service";

describe("IssuanceService", () => {
  let service: IssuanceService;

  const mockSessionRepo = {
    find: jest.fn(),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
  };

  const mockRowRepo = {
    find: jest.fn(),
    save: jest.fn(),
  };

  const mockProductRepo = {
    findOne: jest.fn(),
  };

  const mockFifoBatchService = {
    consumeFifoInTransaction: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn().mockImplementation((cb) => cb({})),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IssuanceService,
        { provide: getRepositoryToken(IssuanceSession), useValue: mockSessionRepo },
        { provide: getRepositoryToken(IssuanceRow), useValue: mockRowRepo },
        { provide: getRepositoryToken(IssuableProduct), useValue: mockProductRepo },
        { provide: FifoBatchService, useValue: mockFifoBatchService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<IssuanceService>(IssuanceService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createSession", () => {
    it("rejects empty rows array", async () => {
      await expect(service.createSession(1, { rows: [] })).rejects.toThrow(BadRequestException);
    });
  });
});
