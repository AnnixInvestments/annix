import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AuditService } from "../audit/audit.service";
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
import { Rfq, RfqStatus } from "./entities/rfq.entity";
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
    updateById: jest.fn(),
    updateByIdWhereStatus: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue({}),
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
        { provide: AuditService, useValue: mockAuditService },
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

    it("returns persisted pricing for the owner of a quoted RFQ", async () => {
      const rfq = {
        id: 7,
        rfqNumber: "RFQ-2026-0007",
        status: RfqStatus.QUOTED,
        totalCost: 12500,
        items: [{ id: 1, unitPrice: 100, totalPrice: 1000 }],
      } as unknown as Rfq;
      mockRfqRepo.findById.mockResolvedValue(rfq);

      const result = await service.findRfqById(7);

      expect(result.totalCost).toBe(12500);
      expect(result.items[0].unitPrice).toBe(100);
      expect(result.items[0].totalPrice).toBe(1000);
    });
  });

  describe("acceptRfqQuote", () => {
    const ownerId = 42;
    const quotedRfq = () =>
      ({ id: 5, status: RfqStatus.QUOTED, createdBy: { id: ownerId } }) as unknown as Rfq;

    it("throws ForbiddenException for a non-owner", async () => {
      mockRfqRepo.findById.mockResolvedValueOnce({
        id: 5,
        status: RfqStatus.QUOTED,
        createdBy: { id: 999 },
      } as unknown as Rfq);

      await expect(service.acceptRfqQuote(5, ownerId)).rejects.toThrow(ForbiddenException);
      expect(mockRfqRepo.updateByIdWhereStatus).not.toHaveBeenCalled();
    });

    it("throws NotFoundException when the RFQ does not exist", async () => {
      mockRfqRepo.findById.mockResolvedValueOnce(null);

      await expect(service.acceptRfqQuote(5, ownerId)).rejects.toThrow(NotFoundException);
    });

    it("flips a quoted RFQ to accepted and stamps acceptedAt + actor", async () => {
      mockRfqRepo.findById
        .mockResolvedValueOnce(quotedRfq())
        .mockResolvedValueOnce({ id: 5, status: RfqStatus.ACCEPTED } as unknown as Rfq);
      mockRfqRepo.updateByIdWhereStatus.mockResolvedValueOnce({
        id: 5,
        status: RfqStatus.ACCEPTED,
      } as unknown as Rfq);

      const result = await service.acceptRfqQuote(5, ownerId);

      expect(mockRfqRepo.updateByIdWhereStatus).toHaveBeenCalledWith(
        5,
        RfqStatus.QUOTED,
        expect.objectContaining({
          status: RfqStatus.ACCEPTED,
          decisionByUserId: ownerId,
          acceptedAt: expect.any(Date),
          rejectedAt: null,
        }),
      );
      expect(mockAuditService.log).toHaveBeenCalled();
      expect(result.status).toBe(RfqStatus.ACCEPTED);
    });

    it("does not record an audit row and returns 409 when the atomic claim loses the race", async () => {
      mockRfqRepo.findById.mockResolvedValueOnce(quotedRfq()).mockResolvedValueOnce({
        id: 5,
        status: RfqStatus.REJECTED,
        createdBy: { id: ownerId },
      } as unknown as Rfq);
      mockRfqRepo.updateByIdWhereStatus.mockResolvedValueOnce(null);

      await expect(service.acceptRfqQuote(5, ownerId)).rejects.toThrow(ConflictException);
      expect(mockAuditService.log).not.toHaveBeenCalled();
    });

    it("is idempotent when the atomic claim loses the race to a concurrent accept", async () => {
      mockRfqRepo.findById.mockResolvedValueOnce(quotedRfq()).mockResolvedValueOnce({
        id: 5,
        status: RfqStatus.ACCEPTED,
        createdBy: { id: ownerId },
      } as unknown as Rfq);
      mockRfqRepo.updateByIdWhereStatus.mockResolvedValueOnce(null);

      const result = await service.acceptRfqQuote(5, ownerId);

      expect(result.status).toBe(RfqStatus.ACCEPTED);
      expect(mockAuditService.log).not.toHaveBeenCalled();
    });

    it("is idempotent when already accepted", async () => {
      mockRfqRepo.findById.mockResolvedValueOnce({
        id: 5,
        status: RfqStatus.ACCEPTED,
        createdBy: { id: ownerId },
      } as unknown as Rfq);

      const result = await service.acceptRfqQuote(5, ownerId);

      expect(result.status).toBe(RfqStatus.ACCEPTED);
      expect(mockRfqRepo.updateByIdWhereStatus).not.toHaveBeenCalled();
    });

    it("rejects accepting from a non-quoted source state", async () => {
      mockRfqRepo.findById.mockResolvedValueOnce({
        id: 5,
        status: RfqStatus.SUBMITTED,
        createdBy: { id: ownerId },
      } as unknown as Rfq);

      await expect(service.acceptRfqQuote(5, ownerId)).rejects.toThrow(ConflictException);
      expect(mockRfqRepo.updateByIdWhereStatus).not.toHaveBeenCalled();
    });
  });

  describe("rejectRfqQuote", () => {
    const ownerId = 42;

    it("throws ForbiddenException for a non-owner", async () => {
      mockRfqRepo.findById.mockResolvedValueOnce({
        id: 5,
        status: RfqStatus.QUOTED,
        createdBy: { id: 999 },
      } as unknown as Rfq);

      await expect(service.rejectRfqQuote(5, ownerId, "no budget")).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockRfqRepo.updateByIdWhereStatus).not.toHaveBeenCalled();
    });

    it("flips a quoted RFQ to rejected and persists the reason", async () => {
      mockRfqRepo.findById
        .mockResolvedValueOnce({
          id: 5,
          status: RfqStatus.QUOTED,
          createdBy: { id: ownerId },
        } as unknown as Rfq)
        .mockResolvedValueOnce({ id: 5, status: RfqStatus.REJECTED } as unknown as Rfq);
      mockRfqRepo.updateByIdWhereStatus.mockResolvedValueOnce({
        id: 5,
        status: RfqStatus.REJECTED,
      } as unknown as Rfq);

      const result = await service.rejectRfqQuote(5, ownerId, "  too expensive  ");

      expect(mockRfqRepo.updateByIdWhereStatus).toHaveBeenCalledWith(
        5,
        RfqStatus.QUOTED,
        expect.objectContaining({
          status: RfqStatus.REJECTED,
          decisionByUserId: ownerId,
          rejectedAt: expect.any(Date),
          acceptedAt: null,
          rejectionReason: "too expensive",
        }),
      );
      expect(result.status).toBe(RfqStatus.REJECTED);
    });

    it("is idempotent when already rejected", async () => {
      mockRfqRepo.findById.mockResolvedValueOnce({
        id: 5,
        status: RfqStatus.REJECTED,
        createdBy: { id: ownerId },
      } as unknown as Rfq);

      const result = await service.rejectRfqQuote(5, ownerId, null);

      expect(result.status).toBe(RfqStatus.REJECTED);
      expect(mockRfqRepo.updateByIdWhereStatus).not.toHaveBeenCalled();
    });

    it("rejects rejecting from a non-quoted source state", async () => {
      mockRfqRepo.findById.mockResolvedValueOnce({
        id: 5,
        status: RfqStatus.DRAFT,
        createdBy: { id: ownerId },
      } as unknown as Rfq);

      await expect(service.rejectRfqQuote(5, ownerId, null)).rejects.toThrow(ConflictException);
      expect(mockRfqRepo.updateByIdWhereStatus).not.toHaveBeenCalled();
    });

    it("does not record an audit row and returns 409 when the atomic claim loses the race", async () => {
      mockRfqRepo.findById
        .mockResolvedValueOnce({
          id: 5,
          status: RfqStatus.QUOTED,
          createdBy: { id: ownerId },
        } as unknown as Rfq)
        .mockResolvedValueOnce({
          id: 5,
          status: RfqStatus.ACCEPTED,
          createdBy: { id: ownerId },
        } as unknown as Rfq);
      mockRfqRepo.updateByIdWhereStatus.mockResolvedValueOnce(null);

      await expect(service.rejectRfqQuote(5, ownerId, null)).rejects.toThrow(ConflictException);
      expect(mockAuditService.log).not.toHaveBeenCalled();
    });
  });

  describe("updateUnifiedRfq", () => {
    const ownerId = 42;
    const decidedRfq = (status: RfqStatus) =>
      ({
        id: 9,
        status,
        items: [{ id: 1 }],
        createdBy: { id: ownerId },
      }) as unknown as Rfq;

    const editDto = {
      rfq: {
        projectName: "Updated",
        description: null,
        customerName: "Example Corp",
        customerEmail: "buyer@example.com",
        customerPhone: "+27 11 000 0000",
        requiredDate: null,
        notes: null,
      },
      items: [],
    } as unknown as Parameters<RfqService["updateUnifiedRfq"]>[1];

    it("throws ConflictException and does not mutate an accepted RFQ", async () => {
      mockRfqRepo.findById.mockResolvedValueOnce(decidedRfq(RfqStatus.ACCEPTED));

      await expect(service.updateUnifiedRfq(9, editDto, ownerId)).rejects.toThrow(
        ConflictException,
      );
      expect(mockRfqItemRepo.deleteByRfqId).not.toHaveBeenCalled();
      expect(mockRfqRepo.save).not.toHaveBeenCalled();
    });

    it("throws ConflictException and does not mutate a rejected RFQ", async () => {
      mockRfqRepo.findById.mockResolvedValueOnce(decidedRfq(RfqStatus.REJECTED));

      await expect(service.updateUnifiedRfq(9, editDto, ownerId)).rejects.toThrow(
        ConflictException,
      );
      expect(mockRfqItemRepo.deleteByRfqId).not.toHaveBeenCalled();
      expect(mockRfqRepo.save).not.toHaveBeenCalled();
    });

    it("throws ConflictException and does not mutate a quoted RFQ", async () => {
      mockRfqRepo.findById.mockResolvedValueOnce(decidedRfq(RfqStatus.QUOTED));

      await expect(service.updateUnifiedRfq(9, editDto, ownerId)).rejects.toThrow(
        ConflictException,
      );
      expect(mockRfqItemRepo.deleteByRfqId).not.toHaveBeenCalled();
      expect(mockRfqRepo.save).not.toHaveBeenCalled();
    });

    it("throws ForbiddenException for a non-owner", async () => {
      mockRfqRepo.findById.mockResolvedValueOnce({
        id: 9,
        status: RfqStatus.SUBMITTED,
        items: [],
        createdBy: { id: 999 },
      } as unknown as Rfq);

      await expect(service.updateUnifiedRfq(9, editDto, ownerId)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockRfqRepo.save).not.toHaveBeenCalled();
    });
  });
});
