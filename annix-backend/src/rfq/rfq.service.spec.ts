import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { BoqRepository } from "../boq/boq.repository";
import { BoqSupplierAccessRepository } from "../boq/boq-supplier-access.repository";
import { EmailService } from "../email/email.service";
import { FittingService } from "../fitting/fitting.service";
import { TransactionRunner } from "../lib/persistence/transaction-runner";
import { SteelSpecificationRepository } from "../steel-specification/steel-specification.repository";
import { IStorageService, STORAGE_SERVICE } from "../storage/storage.interface";
import { SupplierProfileRepository } from "../supplier/supplier-profile.repository";
import { UserRepository } from "../user/user.repository";
import { BendRfqRepository } from "./bend-rfq.repository";
import { Rfq } from "./entities/rfq.entity";
import { ExpansionJointRfqRepository } from "./expansion-joint-rfq.repository";
import { FastenerRfqRepository } from "./fastener-rfq.repository";
import { FittingRfqRepository } from "./fitting-rfq.repository";
import { InstrumentRfqRepository } from "./instrument-rfq.repository";
import { PumpRfqRepository } from "./pump-rfq.repository";
import { RfqRepository } from "./rfq.repository";
import { RfqService } from "./rfq.service";
import { RfqClarificationRequestRepository } from "./rfq-clarification-request.repository";
import { RfqDocumentRepository } from "./rfq-document.repository";
import { RfqDraftRepository } from "./rfq-draft.repository";
import { RfqItemRepository } from "./rfq-item.repository";
import { RfqSequenceRepository } from "./rfq-sequence.repository";
import { ReferenceDataCacheService } from "./services/reference-data-cache.service";
import { RfqCalculationService } from "./services/rfq-calculation.service";
import { StraightPipeRfqRepository } from "./straight-pipe-rfq.repository";
import { TankChuteRfqRepository } from "./tank-chute-rfq.repository";
import { ValveRfqRepository } from "./valve-rfq.repository";

describe("RfqService", () => {
  let service: RfqService;

  const crudRepoMock = () => ({
    create: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    findOneWhere: jest.fn(),
    findManyWhere: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
  });

  const mockRfqRepo = {
    ...crudRepoMock(),
    withTransaction: jest.fn(),
    findBySubmissionId: jest.fn(),
    findAllWithItemsOrdered: jest.fn(),
    findPaginatedWithItems: jest.fn(),
  };

  const mockRfqItemRepo = {
    ...crudRepoMock(),
    withTransaction: jest.fn(),
    countByRfqId: jest.fn(),
    deleteByRfqId: jest.fn(),
  };

  const mockStraightPipeRfqRepo = {
    ...crudRepoMock(),
    withTransaction: jest.fn(),
  };

  const mockBendRfqRepo = crudRepoMock();
  const mockFittingRfqRepo = crudRepoMock();
  const mockExpansionJointRfqRepo = crudRepoMock();
  const mockValveRfqRepo = crudRepoMock();
  const mockInstrumentRfqRepo = crudRepoMock();
  const mockPumpRfqRepo = crudRepoMock();
  const mockTankChuteRfqRepo = crudRepoMock();
  const mockFastenerRfqRepo = crudRepoMock();

  const mockRfqDocumentRepo = {
    ...crudRepoMock(),
    findByRfqIdWithUploadedBy: jest.fn(),
    findByIdWithRfqAndUploadedBy: jest.fn(),
    findByIdWithRfqCreatedBy: jest.fn(),
  };

  const mockRfqDraftRepo = {
    ...crudRepoMock(),
    findByIdForUser: jest.fn(),
    findByDraftNumberForUser: jest.fn(),
    findAllForUserWithConvertedRfq: jest.fn(),
  };

  const mockRfqClarificationRequestRepo = {
    ...crudRepoMock(),
    findByToken: jest.fn(),
  };

  const mockRfqSequenceRepo = {
    ...crudRepoMock(),
    findByYear: jest.fn(),
    findAllOrderedByYearDesc: jest.fn(),
  };

  const mockUserRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findById: jest.fn(),
    findByIds: jest.fn(),
    remove: jest.fn(),
  };

  const mockSteelSpecRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findById: jest.fn(),
    findByIds: jest.fn(),
    findAll: jest.fn(),
    findOneWhere: jest.fn(),
    findManyWhere: jest.fn(),
    remove: jest.fn(),
  };

  const mockStorageService: IStorageService = {
    upload: jest.fn(),
    download: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
    publicUrl: jest.fn(),
    presignedUrl: jest.fn(),
  };

  const mockBoqRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findById: jest.fn(),
    findByRfqId: jest.fn(),
    findRfqLinksByRfqIds: jest.fn(),
    remove: jest.fn(),
  };

  const mockBoqSupplierAccessRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findByBoqIdsExcludingStatus: jest.fn(),
    countDistinctSuppliersByStatusForBoqs: jest.fn(),
    remove: jest.fn(),
  };

  const mockSupplierProfileRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findById: jest.fn(),
    findByIdsWithUserAndCompany: jest.fn(),
    remove: jest.fn(),
  };

  const mockEmailService = {
    sendEmail: jest.fn(),
    sendBoqAccessEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RfqService,
        { provide: RfqRepository, useValue: mockRfqRepo },
        { provide: RfqItemRepository, useValue: mockRfqItemRepo },
        { provide: StraightPipeRfqRepository, useValue: mockStraightPipeRfqRepo },
        { provide: BendRfqRepository, useValue: mockBendRfqRepo },
        { provide: FittingRfqRepository, useValue: mockFittingRfqRepo },
        { provide: ExpansionJointRfqRepository, useValue: mockExpansionJointRfqRepo },
        { provide: ValveRfqRepository, useValue: mockValveRfqRepo },
        { provide: InstrumentRfqRepository, useValue: mockInstrumentRfqRepo },
        { provide: PumpRfqRepository, useValue: mockPumpRfqRepo },
        { provide: TankChuteRfqRepository, useValue: mockTankChuteRfqRepo },
        { provide: FastenerRfqRepository, useValue: mockFastenerRfqRepo },
        { provide: RfqDocumentRepository, useValue: mockRfqDocumentRepo },
        { provide: RfqDraftRepository, useValue: mockRfqDraftRepo },
        {
          provide: RfqClarificationRequestRepository,
          useValue: mockRfqClarificationRequestRepo,
        },
        { provide: RfqSequenceRepository, useValue: mockRfqSequenceRepo },
        { provide: UserRepository, useValue: mockUserRepo },
        {
          provide: SteelSpecificationRepository,
          useValue: mockSteelSpecRepo,
        },
        { provide: BoqRepository, useValue: mockBoqRepo },
        {
          provide: BoqSupplierAccessRepository,
          useValue: mockBoqSupplierAccessRepo,
        },
        {
          provide: SupplierProfileRepository,
          useValue: mockSupplierProfileRepo,
        },
        { provide: STORAGE_SERVICE, useValue: mockStorageService },
        { provide: EmailService, useValue: mockEmailService },
        {
          provide: ReferenceDataCacheService,
          useValue: {
            nbNpsLookupByNb: jest.fn(),
            steelSpecificationById: jest.fn(),
            pipeDimensionsByNb: jest.fn(),
            pipeDimensionByNbAndSchedule: jest.fn(),
            pipeDimensionByNbAndWallThickness: jest.fn(),
            flangeDimensionsByNb: jest.fn(),
            flangeDimension: jest.fn(),
            refreshCache: jest.fn(),
            cacheStats: jest.fn(),
          },
        },
        {
          provide: RfqCalculationService,
          useValue: {
            calculateStraightPipeRequirements: jest.fn(),
            calculateBendRequirements: jest.fn(),
            calculatePumpRequirements: jest.fn(),
          },
        },
        {
          provide: FittingService,
          useValue: {
            calculateFitting: jest.fn(),
          },
        },
        {
          provide: TransactionRunner,
          useValue: {
            run: jest.fn((work) => work({})),
          },
        },
      ],
    }).compile();

    service = module.get<RfqService>(RfqService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAllRfqs", () => {
    it("should return array of RFQs", async () => {
      const rfqs = [{ id: 1, rfqNumber: "RFQ-2024-0001" }] as Rfq[];
      mockRfqRepo.findAllWithItemsOrdered.mockResolvedValue(rfqs);

      const result = await service.findAllRfqs();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 1,
        rfqNumber: "RFQ-2024-0001",
      });
    });
  });

  describe("findRfqById", () => {
    it("should return an RFQ by id", async () => {
      const rfq = { id: 1, rfqNumber: "RFQ-2024-0001" } as Rfq;
      mockRfqRepo.findById.mockResolvedValue(rfq);

      const result = await service.findRfqById(1);

      expect(result).toEqual(rfq);
      expect(mockRfqRepo.findById).toHaveBeenCalledWith(1, [
        "items",
        "items.straightPipeDetails",
        "items.straightPipeDetails.steelSpecification",
        "items.bendDetails",
        "items.fittingDetails",
        "items.expansionJointDetails",
        "items.valveDetails",
        "items.instrumentDetails",
        "items.pumpDetails",
        "items.tankChuteDetails",
        "items.fastenerDetails",
        "drawings",
        "boqs",
      ]);
    });

    it("should throw NotFoundException if RFQ not found", async () => {
      mockRfqRepo.findById.mockResolvedValue(null);

      await expect(service.findRfqById(1)).rejects.toThrow(NotFoundException);
    });
  });
});
