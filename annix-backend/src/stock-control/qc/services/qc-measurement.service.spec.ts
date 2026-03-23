import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { JobCardCoatingAnalysis } from "../../entities/coating-analysis.entity";
import { JobCard } from "../../entities/job-card.entity";
import { StockControlCompany } from "../../entities/stock-control-company.entity";
import { QcBlastProfile } from "../entities/qc-blast-profile.entity";
import { QcControlPlan } from "../entities/qc-control-plan.entity";
import { QcDefelskoBatch } from "../entities/qc-defelsko-batch.entity";
import { QcDftReading } from "../entities/qc-dft-reading.entity";
import { QcDustDebrisTest } from "../entities/qc-dust-debris-test.entity";
import { ItemReleaseResult, QcItemsRelease } from "../entities/qc-items-release.entity";
import { QcPullTest } from "../entities/qc-pull-test.entity";
import { QcReleaseCertificate } from "../entities/qc-release-certificate.entity";
import { QcShoreHardness } from "../entities/qc-shore-hardness.entity";
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
    create: jest.fn().mockImplementation((data: any) => ({ ...data })),
    save: jest
      .fn()
      .mockImplementation((entity: any) => Promise.resolve({ id: RECORD_ID, ...entity })),
    remove: jest.fn().mockResolvedValue(undefined),
  };
}

describe("QcMeasurementService", () => {
  let service: QcMeasurementService;

  const shoreHardnessRepo = mockRepo();
  const dftReadingRepo = mockRepo();
  const blastProfileRepo = mockRepo();
  const dustDebrisRepo = mockRepo();
  const pullTestRepo = mockRepo();
  const controlPlanRepo = mockRepo();
  const releaseCertRepo = mockRepo();
  const itemsReleaseRepo = mockRepo();
  const defelskoBatchRepo = mockRepo();
  const jobCardRepo = mockRepo();
  const coatingRepo = mockRepo();
  const companyRepo = mockRepo();
  const mockWorkItemProvider = {
    lineItemsForWorkItem: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QcMeasurementService,
        { provide: getRepositoryToken(QcShoreHardness), useValue: shoreHardnessRepo },
        { provide: getRepositoryToken(QcDftReading), useValue: dftReadingRepo },
        { provide: getRepositoryToken(QcBlastProfile), useValue: blastProfileRepo },
        { provide: getRepositoryToken(QcDustDebrisTest), useValue: dustDebrisRepo },
        { provide: getRepositoryToken(QcPullTest), useValue: pullTestRepo },
        { provide: getRepositoryToken(QcControlPlan), useValue: controlPlanRepo },
        { provide: getRepositoryToken(QcReleaseCertificate), useValue: releaseCertRepo },
        { provide: getRepositoryToken(QcItemsRelease), useValue: itemsReleaseRepo },
        { provide: getRepositoryToken(QcDefelskoBatch), useValue: defelskoBatchRepo },
        { provide: getRepositoryToken(JobCard), useValue: jobCardRepo },
        { provide: getRepositoryToken(JobCardCoatingAnalysis), useValue: coatingRepo },
        { provide: getRepositoryToken(StockControlCompany), useValue: companyRepo },
        { provide: WORK_ITEM_PROVIDER, useValue: mockWorkItemProvider },
      ],
    }).compile();

    service = module.get(QcMeasurementService);
    jest.clearAllMocks();
  });

  // ── Shore Hardness CRUD ─────────────────────────────────────────────

  describe("shoreHardnessForJobCard", () => {
    it("returns records filtered by company and job card", async () => {
      const records = [{ id: 1, companyId: COMPANY_ID, jobCardId: JOB_CARD_ID }];
      shoreHardnessRepo.find.mockResolvedValue(records);

      const result = await service.shoreHardnessForJobCard(COMPANY_ID, JOB_CARD_ID);

      expect(result).toEqual(records);
      expect(shoreHardnessRepo.find).toHaveBeenCalledWith({
        where: { companyId: COMPANY_ID, jobCardId: JOB_CARD_ID },
        order: { readingDate: "DESC", createdAt: "DESC" },
      });
    });
  });

  describe("shoreHardnessById", () => {
    it("returns a record when found", async () => {
      const record = { id: RECORD_ID, companyId: COMPANY_ID };
      shoreHardnessRepo.findOne.mockResolvedValue(record);

      const result = await service.shoreHardnessById(COMPANY_ID, RECORD_ID);

      expect(result).toEqual(record);
    });

    it("throws NotFoundException when record does not exist", async () => {
      shoreHardnessRepo.findOne.mockResolvedValue(null);

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
      expect(shoreHardnessRepo.save).toHaveBeenCalled();
    });
  });

  describe("updateShoreHardness", () => {
    it("updates an existing record", async () => {
      const existing = { id: RECORD_ID, companyId: COMPANY_ID, requiredShore: 40 };
      shoreHardnessRepo.findOne.mockResolvedValue(existing);

      await service.updateShoreHardness(COMPANY_ID, RECORD_ID, { requiredShore: 45 });

      expect(shoreHardnessRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ requiredShore: 45 }),
      );
    });

    it("throws NotFoundException for missing record", async () => {
      shoreHardnessRepo.findOne.mockResolvedValue(null);

      await expect(service.updateShoreHardness(COMPANY_ID, 999, {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("deleteShoreHardness", () => {
    it("removes the record", async () => {
      const existing = { id: RECORD_ID, companyId: COMPANY_ID };
      shoreHardnessRepo.findOne.mockResolvedValue(existing);

      await service.deleteShoreHardness(COMPANY_ID, RECORD_ID);

      expect(shoreHardnessRepo.remove).toHaveBeenCalledWith(existing);
    });

    it("throws NotFoundException for missing record", async () => {
      shoreHardnessRepo.findOne.mockResolvedValue(null);

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
      dftReadingRepo.findOne.mockResolvedValue(null);

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
          },
        ],
        totalQuantity: 2,
      };

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
      shoreHardnessRepo.find.mockResolvedValue(shoreData);
      dftReadingRepo.find.mockResolvedValue(dftData);
      blastProfileRepo.find.mockResolvedValue([]);
      dustDebrisRepo.find.mockResolvedValue([]);
      pullTestRepo.find.mockResolvedValue([]);
      controlPlanRepo.find.mockResolvedValue([]);
      releaseCertRepo.find.mockResolvedValue([]);

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

      expect(shoreHardnessRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ companyId: COMPANY_ID }) }),
      );
      expect(dftReadingRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ companyId: COMPANY_ID }) }),
      );
      expect(blastProfileRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ companyId: COMPANY_ID }) }),
      );
    });

    it("enforces company ID on findOrFail lookups", async () => {
      shoreHardnessRepo.findOne.mockResolvedValue(null);

      await expect(service.shoreHardnessById(COMPANY_ID, RECORD_ID)).rejects.toThrow(
        NotFoundException,
      );

      expect(shoreHardnessRepo.findOne).toHaveBeenCalledWith({
        where: { id: RECORD_ID, companyId: COMPANY_ID },
      });
    });
  });
});
