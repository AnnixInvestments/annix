import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { TransactionRunner } from "../../lib/persistence/transaction-runner";
import { ConsumableIssuanceRowRepository } from "../repositories/consumable-issuance-row.repository";
import { IssuableProductRepository } from "../repositories/issuable-product.repository";
import { IssuanceItemCoatTrackingRepository } from "../repositories/issuance-item-coat-tracking.repository";
import { IssuanceRowRepository } from "../repositories/issuance-row.repository";
import { IssuanceSessionRepository } from "../repositories/issuance-session.repository";
import { PaintIssuanceRowRepository } from "../repositories/paint-issuance-row.repository";
import { RubberRollIssuanceRowRepository } from "../repositories/rubber-roll-issuance-row.repository";
import { SolutionIssuanceRowRepository } from "../repositories/solution-issuance-row.repository";
import { FifoBatchService } from "./fifo-batch.service";
import { IssuanceService } from "./issuance.service";

describe("IssuanceService", () => {
  let service: IssuanceService;

  const txCapableMock = () => ({
    build: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    withTransaction: jest.fn(),
  });

  const mockSessionRepo = {
    ...txCapableMock(),
    findByIdWithFullRelations: jest.fn(),
    findByIdForCompanyWithFullRelations: jest.fn(),
    findPaginatedForCompany: jest.fn(),
  };

  const mockRowRepo = {
    ...txCapableMock(),
    issuedTotalsForCpo: jest.fn(),
    paintSplitsForCpo: jest.fn(),
    coatTrackingForCpo: jest.fn(),
    paintRowsForCpo: jest.fn(),
    jobCardIdsForCpo: jest.fn(),
    coatingAnalysesForJobCards: jest.fn(),
    lineItemsForJobCards: jest.fn(),
  };

  const mockProductRepo = {
    findByIdForCompany: jest.fn(),
    withTransaction: jest.fn(),
  };

  const mockConsumableRowRepo = txCapableMock();
  const mockPaintRowRepo = txCapableMock();
  const mockRubberRowRepo = txCapableMock();
  const mockSolutionRowRepo = txCapableMock();
  const mockCoatTrackingRepo = txCapableMock();

  const mockFifoBatchService = {
    consumeFifoInTransaction: jest.fn(),
  };

  const mockTxRunner = {
    run: jest.fn().mockImplementation((work) => work({})),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IssuanceService,
        { provide: IssuanceSessionRepository, useValue: mockSessionRepo },
        { provide: IssuanceRowRepository, useValue: mockRowRepo },
        { provide: IssuableProductRepository, useValue: mockProductRepo },
        { provide: ConsumableIssuanceRowRepository, useValue: mockConsumableRowRepo },
        { provide: PaintIssuanceRowRepository, useValue: mockPaintRowRepo },
        { provide: RubberRollIssuanceRowRepository, useValue: mockRubberRowRepo },
        { provide: SolutionIssuanceRowRepository, useValue: mockSolutionRowRepo },
        { provide: IssuanceItemCoatTrackingRepository, useValue: mockCoatTrackingRepo },
        { provide: FifoBatchService, useValue: mockFifoBatchService },
        { provide: TransactionRunner, useValue: mockTxRunner },
      ],
    }).compile();

    service = module.get<IssuanceService>(IssuanceService);
    jest.clearAllMocks();
    mockTxRunner.run.mockImplementation((work) => work({}));
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
