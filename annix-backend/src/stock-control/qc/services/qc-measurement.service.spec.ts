import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { JobCardCoatingAnalysisRepository } from "../../repositories/coating-analysis.repository";
import { CustomerPurchaseOrderRepository } from "../../repositories/customer-purchase-order.repository";
import { JobCardRepository } from "../../repositories/job-card.repository";
import { JobCardLineItemRepository } from "../../repositories/job-card-line-item.repository";
import { StockControlCompanyRepository } from "../../repositories/stock-control-company.repository";
import { CertificateService } from "../../services/certificate.service";
import { ItemReleaseResult } from "../entities/qc-items-release.entity";
import { QcBlastProfileRepository } from "../repositories/qc-blast-profile.repository";
import { QcControlPlanRepository } from "../repositories/qc-control-plan.repository";
import { QcDefelskoBatchRepository } from "../repositories/qc-defelsko-batch.repository";
import { QcDftReadingRepository } from "../repositories/qc-dft-reading.repository";
import { QcDustDebrisTestRepository } from "../repositories/qc-dust-debris-test.repository";
import { QcEnvironmentalRecordRepository } from "../repositories/qc-environmental-record.repository";
import { QcItemsReleaseRepository } from "../repositories/qc-items-release.repository";
import { QcPullTestRepository } from "../repositories/qc-pull-test.repository";
import { QcReleaseCertificateRepository } from "../repositories/qc-release-certificate.repository";
import { QcShoreHardnessRepository } from "../repositories/qc-shore-hardness.repository";
import { WORK_ITEM_PROVIDER } from "../work-item-provider.interface";
import { QcMeasurementService } from "./qc-measurement.service";

const COMPANY_ID = 1;
const JOB_CARD_ID = 10;
const RECORD_ID = 100;

const mockUser = { id: 5, companyId: COMPANY_ID, name: "QC Inspector" };

function mockRepo() {
  return {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    findById: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation((data: any) => ({ ...data })),
    save: jest
      .fn()
      .mockImplementation((entity: any) => Promise.resolve({ id: RECORD_ID, ...entity })),
    remove: jest.fn().mockResolvedValue(undefined),
    findOneForCompany: jest.fn().mockResolvedValue(null),
    findOneForCompanyWithLineItems: jest.fn().mockResolvedValue(null),
    findForCpoWithLineItemsOrdered: jest.fn().mockResolvedValue([]),
    findOneForJobCard: jest.fn().mockResolvedValue(null),
    findLatestForJobCard: jest.fn().mockResolvedValue(null),
    findForJobCardAndCompany: jest.fn().mockResolvedValue([]),
    findOneForCompanyWithItems: jest.fn().mockResolvedValue(null),
  };
}

function mockOwnedRepo() {
  return {
    create: jest
      .fn()
      .mockImplementation((data: any) => Promise.resolve({ id: RECORD_ID, ...data })),
    save: jest
      .fn()
      .mockImplementation((entity: any) => Promise.resolve({ id: RECORD_ID, ...entity })),
    remove: jest.fn().mockResolvedValue(undefined),
    removeMany: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue(null),
    findAll: jest.fn().mockResolvedValue([]),
    findOneWhere: jest.fn().mockResolvedValue(null),
    findManyWhere: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    findByIdForCompany: jest.fn().mockResolvedValue(null),
    findForJobCard: jest.fn().mockResolvedValue([]),
    findForJobCardOrdered: jest.fn().mockResolvedValue([]),
    findForJobCardInRange: jest.fn().mockResolvedValue([]),
    findForCpo: jest.fn().mockResolvedValue([]),
    findCpoLevelForCpo: jest.fn().mockResolvedValue([]),
    findAllForJobCard: jest.fn().mockResolvedValue([]),
    findAllWithJobInfo: jest.fn().mockResolvedValue([]),
    findByJobCardAndDate: jest.fn().mockResolvedValue(null),
    findByJobCardAndFieldKey: jest.fn().mockResolvedValue(null),
    countForJobCardOnDate: jest.fn().mockResolvedValue(0),
    countForJobCardCoatOnDate: jest.fn().mockResolvedValue(0),
    search: jest.fn().mockResolvedValue([]),
    latestQcpNumberWithPrefix: jest.fn().mockResolvedValue(null),
    matchActiveByBatchNumber: jest.fn().mockResolvedValue(null),
    findChildReleasesInWindow: jest.fn().mockResolvedValue([]),
    updateById: jest.fn().mockResolvedValue(undefined),
  };
}

describe("QcMeasurementService", () => {
  let service: QcMeasurementService;

  const shoreHardnessRepo = mockOwnedRepo();
  const dftReadingRepo = mockOwnedRepo();
  const blastProfileRepo = mockOwnedRepo();
  const dustDebrisRepo = mockOwnedRepo();
  const pullTestRepo = mockOwnedRepo();
  const controlPlanRepo = mockOwnedRepo();
  const releaseCertRepo = mockOwnedRepo();
  const itemsReleaseRepo = mockOwnedRepo();
  const defelskoBatchRepo = mockOwnedRepo();
  const environmentalRecordRepo = mockOwnedRepo();
  const jobCardRepo = mockRepo();
  const coatingRepo = mockRepo();
  const lineItemRepo = mockRepo();
  const companyRepo = mockRepo();
  const mockWorkItemProvider = {
    lineItemsForWorkItem: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QcMeasurementService,
        { provide: QcShoreHardnessRepository, useValue: shoreHardnessRepo },
        { provide: QcDftReadingRepository, useValue: dftReadingRepo },
        { provide: QcBlastProfileRepository, useValue: blastProfileRepo },
        { provide: QcDustDebrisTestRepository, useValue: dustDebrisRepo },
        { provide: QcPullTestRepository, useValue: pullTestRepo },
        { provide: QcControlPlanRepository, useValue: controlPlanRepo },
        { provide: QcReleaseCertificateRepository, useValue: releaseCertRepo },
        { provide: QcItemsReleaseRepository, useValue: itemsReleaseRepo },
        { provide: QcDefelskoBatchRepository, useValue: defelskoBatchRepo },
        { provide: QcEnvironmentalRecordRepository, useValue: environmentalRecordRepo },
        { provide: JobCardRepository, useValue: jobCardRepo },
        { provide: JobCardLineItemRepository, useValue: lineItemRepo },
        { provide: JobCardCoatingAnalysisRepository, useValue: coatingRepo },
        { provide: StockControlCompanyRepository, useValue: companyRepo },
        { provide: CustomerPurchaseOrderRepository, useValue: mockRepo() },
        { provide: WORK_ITEM_PROVIDER, useValue: mockWorkItemProvider },
        {
          provide: CertificateService,
          useValue: { findByJobCard: jest.fn().mockResolvedValue([]) },
        },
      ],
    }).compile();

    service = module.get(QcMeasurementService);
    jest.clearAllMocks();
  });

  // ── Shore Hardness CRUD ─────────────────────────────────────────────

  describe("shoreHardnessForJobCard", () => {
    it("returns records filtered by company and job card", async () => {
      const records = [{ id: 1, companyId: COMPANY_ID, jobCardId: JOB_CARD_ID }];
      shoreHardnessRepo.findForJobCard.mockResolvedValue(records);

      const result = await service.shoreHardnessForJobCard(COMPANY_ID, JOB_CARD_ID);

      expect(result).toEqual(records);
      expect(shoreHardnessRepo.findForJobCard).toHaveBeenCalledWith(COMPANY_ID, JOB_CARD_ID);
    });
  });

  describe("shoreHardnessById", () => {
    it("returns a record when found", async () => {
      const record = { id: RECORD_ID, companyId: COMPANY_ID };
      shoreHardnessRepo.findByIdForCompany.mockResolvedValue(record);

      const result = await service.shoreHardnessById(COMPANY_ID, RECORD_ID);

      expect(result).toEqual(record);
    });

    it("throws NotFoundException when record does not exist", async () => {
      shoreHardnessRepo.findByIdForCompany.mockResolvedValue(null);

      await expect(service.shoreHardnessById(COMPANY_ID, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("createShoreHardness", () => {
    it("creates a record with user context", async () => {
      const data = {
        rubberSpec: "NR 40",
        requiredShore: 40,
        readings: { column1: [40, 41], column2: [39, 40], column3: [], column4: [] },
        averages: { column1: 40.5, column2: 39.5, column3: null, column4: null, overall: 40.0 },
        readingDate: "2026-03-10",
      };

      await service.createShoreHardness(COMPANY_ID, JOB_CARD_ID, data, mockUser);

      expect(shoreHardnessRepo.create).toHaveBeenCalledWith({
        ...data,
        companyId: COMPANY_ID,
        jobCardId: JOB_CARD_ID,
        capturedByName: mockUser.name,
        capturedById: mockUser.id,
      });
    });
  });

  describe("updateShoreHardness", () => {
    it("updates an existing record", async () => {
      const existing = { id: RECORD_ID, companyId: COMPANY_ID, requiredShore: 40 };
      shoreHardnessRepo.findByIdForCompany.mockResolvedValue(existing);

      await service.updateShoreHardness(COMPANY_ID, RECORD_ID, { requiredShore: 45 });

      expect(shoreHardnessRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ requiredShore: 45 }),
      );
    });

    it("throws NotFoundException for missing record", async () => {
      shoreHardnessRepo.findByIdForCompany.mockResolvedValue(null);

      await expect(service.updateShoreHardness(COMPANY_ID, 999, {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("deleteShoreHardness", () => {
    it("removes the record", async () => {
      const existing = { id: RECORD_ID, companyId: COMPANY_ID };
      shoreHardnessRepo.findByIdForCompany.mockResolvedValue(existing);

      await service.deleteShoreHardness(COMPANY_ID, RECORD_ID);

      expect(shoreHardnessRepo.remove).toHaveBeenCalledWith(existing);
    });

    it("throws NotFoundException for missing record", async () => {
      shoreHardnessRepo.findByIdForCompany.mockResolvedValue(null);

      await expect(service.deleteShoreHardness(COMPANY_ID, 999)).rejects.toThrow(NotFoundException);
    });
  });

  // ── DFT Reading CRUD ────────────────────────────────────────────────

  describe("createDftReading", () => {
    it("creates a DFT reading with user context", async () => {
      const data = {
        coatType: "primer" as any,
        paintProduct: "Interzinc 52",
        specMinMicrons: 50,
        specMaxMicrons: 100,
        readings: [{ itemNumber: 1, reading: 75 }],
        readingDate: "2026-03-10",
      };

      await service.createDftReading(COMPANY_ID, JOB_CARD_ID, data, mockUser);

      expect(dftReadingRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: COMPANY_ID,
          jobCardId: JOB_CARD_ID,
          capturedByName: mockUser.name,
        }),
      );
    });
  });

  describe("dftReadingById", () => {
    it("throws NotFoundException for missing DFT reading", async () => {
      dftReadingRepo.findByIdForCompany.mockResolvedValue(null);

      await expect(service.dftReadingById(COMPANY_ID, 999)).rejects.toThrow(NotFoundException);
    });
  });

  // ── Blast Profile CRUD ──────────────────────────────────────────────

  describe("createBlastProfile", () => {
    it("creates a blast profile with user context", async () => {
      const data = {
        specMicrons: 75,
        readings: [{ itemNumber: 1, reading: 78 }],
        readingDate: "2026-03-10",
      };

      await service.createBlastProfile(COMPANY_ID, JOB_CARD_ID, data, mockUser);

      expect(blastProfileRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: COMPANY_ID,
          capturedByName: mockUser.name,
        }),
      );
    });
  });

  // ── Dust & Debris CRUD ──────────────────────────────────────────────

  describe("createDustDebrisTest", () => {
    it("creates a dust/debris test with user context", async () => {
      const data = {
        tests: [
          {
            testNumber: 1,
            quantity: 5,
            sizeClass: 2,
            location: "Top plate",
            coatingType: "rubber",
            itemNumber: "001",
            result: "pass" as any,
            testedAt: "2026-03-10",
          },
        ],
        readingDate: "2026-03-10",
      };

      await service.createDustDebrisTest(COMPANY_ID, JOB_CARD_ID, data, mockUser);

      expect(dustDebrisRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: COMPANY_ID }),
      );
    });
  });

  // ── Pull Test CRUD ──────────────────────────────────────────────────

  describe("createPullTest", () => {
    it("creates a pull test with user context", async () => {
      const data = {
        solutions: [{ product: "Chemosil 211", batchNumber: "B001", result: "pass" as any }],
        forceGauge: { make: "Elcometer", certificateNumber: "CAL-001", expiryDate: "2027-01-01" },
        areaReadings: [{ area: "Inside", result: "pass" as any, reading: "3.5 MPa" }],
        readingDate: "2026-03-10",
      };

      await service.createPullTest(COMPANY_ID, JOB_CARD_ID, data, mockUser);

      expect(pullTestRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ capturedById: mockUser.id }),
      );
    });
  });

  // ── Control Plan CRUD ───────────────────────────────────────────────

  describe("createControlPlan", () => {
    it("creates a control plan with createdBy fields", async () => {
      const data = {
        planType: "rubber" as any,
        qcpNumber: "QCP-001",
        activities: [],
      };

      await service.createControlPlan(COMPANY_ID, JOB_CARD_ID, data, mockUser);

      expect(controlPlanRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          createdByName: mockUser.name,
          createdById: mockUser.id,
        }),
      );
    });
  });

  // ── Release Certificate CRUD ────────────────────────────────────────

  describe("createReleaseCertificate", () => {
    it("creates a release certificate with user context", async () => {
      const data = {
        certificateNumber: "QRC-001",
        blastingCheck: null,
        solutionsUsed: [],
        cureCycles: [],
      };

      await service.createReleaseCertificate(COMPANY_ID, JOB_CARD_ID, data, mockUser);

      expect(releaseCertRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          capturedByName: mockUser.name,
        }),
      );
    });
  });

  // ── Items Release CRUD ──────────────────────────────────────────────

  describe("createItemsRelease", () => {
    it("creates an items release with user context", async () => {
      const data = {
        items: [
          {
            itemCode: "VLV-001",
            description: "Gate Valve",
            jtNumber: null,
            rubberSpec: null,
            paintingSpec: null,
            quantity: 2,
            result: ItemReleaseResult.PASS,
            itemNo: null,
          },
        ],
        totalQuantity: 2,
      };

      lineItemRepo.findForJobCardAndCompany.mockResolvedValue([
        { itemCode: "VLV-001", quantity: 10 },
      ]);
      itemsReleaseRepo.findAllForJobCard.mockResolvedValue([]);

      await service.createItemsRelease(COMPANY_ID, JOB_CARD_ID, data, mockUser);

      expect(itemsReleaseRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          createdByName: mockUser.name,
          createdById: mockUser.id,
        }),
      );
    });
  });

  // ── Auto-populate Items Release ─────────────────────────────────────

  describe("autoPopulateItemsRelease", () => {
    it("creates items release from work item line items", async () => {
      mockWorkItemProvider.lineItemsForWorkItem.mockResolvedValue([
        { itemCode: "VLV-001", description: "Gate Valve", jtNumber: "JT-01", quantity: 3 },
        { itemCode: "PIP-002", description: "Pipe Spool", jtNumber: "JT-02", quantity: 5 },
      ]);

      await service.autoPopulateItemsRelease(COMPANY_ID, JOB_CARD_ID, mockUser);

      expect(mockWorkItemProvider.lineItemsForWorkItem).toHaveBeenCalledWith(
        COMPANY_ID,
        JOB_CARD_ID,
      );
      expect(itemsReleaseRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: COMPANY_ID,
          jobCardId: JOB_CARD_ID,
          totalQuantity: 8,
          items: expect.arrayContaining([
            expect.objectContaining({ itemCode: "VLV-001", quantity: 3 }),
            expect.objectContaining({ itemCode: "PIP-002", quantity: 5 }),
          ]),
          createdByName: mockUser.name,
        }),
      );
    });

    it("throws NotFoundException when work item has no line items", async () => {
      mockWorkItemProvider.lineItemsForWorkItem.mockResolvedValue([]);

      await expect(service.autoPopulateItemsRelease(COMPANY_ID, 999, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("defaults item result to PASS", async () => {
      mockWorkItemProvider.lineItemsForWorkItem.mockResolvedValue([
        { itemCode: "X", description: "Y", jtNumber: null, quantity: 1 },
      ]);

      await service.autoPopulateItemsRelease(COMPANY_ID, JOB_CARD_ID, mockUser);

      expect(itemsReleaseRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [expect.objectContaining({ result: ItemReleaseResult.PASS })],
        }),
      );
    });
  });

  // ── Aggregate ───────────────────────────────────────────────────────

  describe("allMeasurementsForJobCard", () => {
    it("returns all measurement types in parallel", async () => {
      const shoreData = [{ id: 1 }];
      const dftData = [{ id: 2 }];
      shoreHardnessRepo.findForJobCard.mockResolvedValue(shoreData);
      dftReadingRepo.findForJobCard.mockResolvedValue(dftData);
      blastProfileRepo.findForJobCard.mockResolvedValue([]);
      dustDebrisRepo.findForJobCard.mockResolvedValue([]);
      pullTestRepo.findForJobCard.mockResolvedValue([]);
      controlPlanRepo.findForJobCard.mockResolvedValue([]);
      releaseCertRepo.findForJobCard.mockResolvedValue([]);

      const result = await service.allMeasurementsForJobCard(COMPANY_ID, JOB_CARD_ID);

      expect(result.shoreHardness).toEqual(shoreData);
      expect(result.dftReadings).toEqual(dftData);
      expect(result.blastProfiles).toEqual([]);
      expect(result.dustDebrisTests).toEqual([]);
      expect(result.pullTests).toEqual([]);
      expect(result.controlPlans).toEqual([]);
      expect(result.releaseCertificates).toEqual([]);
    });
  });

  // ── Company scoping ─────────────────────────────────────────────────

  describe("company scoping", () => {
    it("enforces company ID on find operations", async () => {
      await service.shoreHardnessForJobCard(COMPANY_ID, JOB_CARD_ID);
      await service.dftReadingsForJobCard(COMPANY_ID, JOB_CARD_ID);
      await service.blastProfilesForJobCard(COMPANY_ID, JOB_CARD_ID);

      expect(shoreHardnessRepo.findForJobCard).toHaveBeenCalledWith(COMPANY_ID, JOB_CARD_ID);
      expect(dftReadingRepo.findForJobCard).toHaveBeenCalledWith(COMPANY_ID, JOB_CARD_ID);
      expect(blastProfileRepo.findForJobCard).toHaveBeenCalledWith(COMPANY_ID, JOB_CARD_ID);
    });

    it("enforces company ID on findOrFail lookups", async () => {
      shoreHardnessRepo.findByIdForCompany.mockResolvedValue(null);

      await expect(service.shoreHardnessById(COMPANY_ID, RECORD_ID)).rejects.toThrow(
        NotFoundException,
      );

      expect(shoreHardnessRepo.findByIdForCompany).toHaveBeenCalledWith(COMPANY_ID, RECORD_ID);
    });
  });
});
