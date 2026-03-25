import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { fromISO, now } from "../../lib/datetime";
import { JobCard } from "../entities/job-card.entity";
import { StockControlCompany } from "../entities/stock-control-company.entity";
import { QcBlastProfile } from "../qc/entities/qc-blast-profile.entity";
import { QcControlPlan } from "../qc/entities/qc-control-plan.entity";
import { DftCoatType, QcDftReading } from "../qc/entities/qc-dft-reading.entity";
import { QcDustDebrisTest } from "../qc/entities/qc-dust-debris-test.entity";
import { ItemReleaseResult, QcItemsRelease } from "../qc/entities/qc-items-release.entity";
import { QcPullTest } from "../qc/entities/qc-pull-test.entity";
import { QcReleaseCertificate } from "../qc/entities/qc-release-certificate.entity";
import { QcShoreHardness } from "../qc/entities/qc-shore-hardness.entity";
import { DataBookPdfService } from "./data-book-pdf.service";

const COMPANY_ID = 1;
const JOB_CARD_ID = 10;

function mockRepo() {
  return {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation((data: any) => ({ ...data })),
    save: jest.fn().mockImplementation((entity: any) => Promise.resolve(entity)),
  };
}

function makeJobCard(overrides: Record<string, any> = {}) {
  return {
    id: JOB_CARD_ID,
    companyId: COMPANY_ID,
    jobNumber: "JC-001",
    jobName: "Test Project",
    customerName: "Test Customer",
    poNumber: "PO-001",
    reference: "REF-001",
    createdAt: fromISO("2026-01-15").toJSDate(),
    lineItems: [],
    ...overrides,
  };
}

function makeCompany(overrides: Record<string, any> = {}) {
  return {
    id: COMPANY_ID,
    name: "PLS Coatings",
    primaryColor: "#0d9488",
    logoUrl: null,
    qcEnabled: true,
    ...overrides,
  };
}

function makeShoreHardness(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    companyId: COMPANY_ID,
    jobCardId: JOB_CARD_ID,
    rubberSpec: "NR 40",
    rubberBatchNumber: "RB-001",
    requiredShore: 40,
    readings: { column1: [40, 41, 39], column2: [40, 42, 38], column3: [], column4: [] },
    averages: { column1: 40, column2: 40, column3: null, column4: null, overall: 40 },
    readingDate: "2026-03-01",
    capturedByName: "Inspector",
    capturedById: 5,
    createdAt: now().toJSDate(),
    updatedAt: now().toJSDate(),
    ...overrides,
  };
}

function makeDftReading(coatType: DftCoatType, overrides: Record<string, any> = {}) {
  return {
    id: 1,
    companyId: COMPANY_ID,
    jobCardId: JOB_CARD_ID,
    coatType,
    paintProduct: "Interzinc 52",
    batchNumber: "PB-001",
    specMinMicrons: 50,
    specMaxMicrons: 100,
    readings: [
      { itemNumber: 1, reading: 75 },
      { itemNumber: 2, reading: 80 },
    ],
    averageMicrons: 77.5,
    readingDate: "2026-03-02",
    capturedByName: "Inspector",
    capturedById: 5,
    createdAt: now().toJSDate(),
    updatedAt: now().toJSDate(),
    ...overrides,
  };
}

function makeBlastProfile(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    companyId: COMPANY_ID,
    jobCardId: JOB_CARD_ID,
    specMicrons: 75,
    abrasiveBatchNumber: "AB-001",
    readings: [{ itemNumber: 1, reading: 78 }],
    averageMicrons: 78,
    temperature: 25,
    humidity: 45,
    readingDate: "2026-03-01",
    capturedByName: "Inspector",
    capturedById: 5,
    createdAt: now().toJSDate(),
    updatedAt: now().toJSDate(),
    ...overrides,
  };
}

function makeDustDebrisTest(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    companyId: COMPANY_ID,
    jobCardId: JOB_CARD_ID,
    tests: [
      {
        testNumber: 1,
        quantity: 5,
        coatingType: "rubber",
        itemNumber: "001",
        result: "pass",
        testedAt: "2026-03-01",
      },
    ],
    readingDate: "2026-03-01",
    capturedByName: "Inspector",
    capturedById: 5,
    createdAt: now().toJSDate(),
    updatedAt: now().toJSDate(),
    ...overrides,
  };
}

function makePullTest(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    companyId: COMPANY_ID,
    jobCardId: JOB_CARD_ID,
    itemDescription: "Gate Valve",
    quantity: 2,
    solutions: [{ product: "Chemosil 211", batchNumber: "CS-001", result: "pass" }],
    forceGauge: { make: "Elcometer", certificateNumber: "CAL-001", expiryDate: "2027-01-01" },
    areaReadings: [{ area: "Inside", result: "pass", reading: "3.5 MPa" }],
    comments: null,
    readingDate: "2026-03-01",
    capturedByName: "Inspector",
    capturedById: 5,
    createdAt: now().toJSDate(),
    updatedAt: now().toJSDate(),
    ...overrides,
  };
}

function makeControlPlan(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    companyId: COMPANY_ID,
    jobCardId: JOB_CARD_ID,
    planType: "rubber",
    qcpNumber: "QCP-001",
    documentRef: null,
    revision: "00",
    customerName: "Example Corp",
    orderNumber: "PO-001",
    jobName: "Test Project",
    specification: "NR 40 Shore A",
    itemDescription: "Valve Lining",
    activities: [
      {
        operationNumber: 1,
        description: "Surface preparation",
        specification: "SA 2.5",
        procedureRequired: true,
        pls: { interventionType: "H", name: null, signatureUrl: null, date: null },
        mps: { interventionType: null, name: null, signatureUrl: null, date: null },
        client: { interventionType: null, name: null, signatureUrl: null, date: null },
        remarks: null,
      },
    ],
    approvalSignatures: [],
    createdByName: "Admin",
    createdById: 1,
    createdAt: now().toJSDate(),
    updatedAt: now().toJSDate(),
    ...overrides,
  };
}

function makeReleaseCert(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    companyId: COMPANY_ID,
    jobCardId: JOB_CARD_ID,
    certificateNumber: "QRC-001",
    blastingCheck: {
      blastProfileBatchNo: "AB-001",
      contaminationFree: "pass",
      sa25Grade: "pass",
      inspectorName: "Inspector",
    },
    solutionsUsed: [
      { productName: "Chemosil 211", typeBatch: "CS-001", result: "pass", inspectorName: "QC" },
    ],
    liningCheck: null,
    cureCycles: [{ cycleNumber: 1, timeIn: "08:00", timeOut: "12:00", pressureBar: 3.5 }],
    paintingChecks: [],
    finalInspection: null,
    comments: null,
    certificateDate: "2026-03-05",
    capturedByName: "Inspector",
    capturedById: 5,
    createdAt: now().toJSDate(),
    updatedAt: now().toJSDate(),
    ...overrides,
  };
}

function makeItemsRelease(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    companyId: COMPANY_ID,
    jobCardId: JOB_CARD_ID,
    items: [
      {
        itemCode: "VLV-001",
        description: "Gate Valve",
        jtNumber: "JT-01",
        rubberSpec: "NR 40",
        paintingSpec: null,
        quantity: 2,
        result: ItemReleaseResult.PASS,
      },
    ],
    totalQuantity: 2,
    createdByName: "Admin",
    createdById: 1,
    plsSignOff: { name: null, date: null, signatureUrl: null },
    mpsSignOff: { name: null, date: null, signatureUrl: null },
    clientSignOff: { name: null, date: null, signatureUrl: null },
    createdAt: now().toJSDate(),
    updatedAt: now().toJSDate(),
    ...overrides,
  };
}

describe("DataBookPdfService", () => {
  let service: DataBookPdfService;

  const shoreHardnessRepo = mockRepo();
  const dftReadingRepo = mockRepo();
  const blastProfileRepo = mockRepo();
  const dustDebrisRepo = mockRepo();
  const pullTestRepo = mockRepo();
  const controlPlanRepo = mockRepo();
  const releaseCertRepo = mockRepo();
  const itemsReleaseRepo = mockRepo();
  const jobCardRepo = mockRepo();
  const companyRepo = mockRepo();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataBookPdfService,
        { provide: getRepositoryToken(QcShoreHardness), useValue: shoreHardnessRepo },
        { provide: getRepositoryToken(QcDftReading), useValue: dftReadingRepo },
        { provide: getRepositoryToken(QcBlastProfile), useValue: blastProfileRepo },
        { provide: getRepositoryToken(QcDustDebrisTest), useValue: dustDebrisRepo },
        { provide: getRepositoryToken(QcPullTest), useValue: pullTestRepo },
        { provide: getRepositoryToken(QcControlPlan), useValue: controlPlanRepo },
        { provide: getRepositoryToken(QcReleaseCertificate), useValue: releaseCertRepo },
        { provide: getRepositoryToken(QcItemsRelease), useValue: itemsReleaseRepo },
        { provide: getRepositoryToken(JobCard), useValue: jobCardRepo },
        { provide: getRepositoryToken(StockControlCompany), useValue: companyRepo },
      ],
    }).compile();

    service = module.get(DataBookPdfService);
    jest.clearAllMocks();
  });

  describe("generateStructuredSections", () => {
    it("returns null when job card is not found", async () => {
      jobCardRepo.findOne.mockResolvedValue(null);

      const result = await service.generateStructuredSections(COMPANY_ID, 999);

      expect(result).toBeNull();
    });

    it("returns null when job card exists but has no QC data", async () => {
      jobCardRepo.findOne.mockResolvedValue(makeJobCard());
      companyRepo.findOne.mockResolvedValue(makeCompany());

      const result = await service.generateStructuredSections(COMPANY_ID, JOB_CARD_ID);

      expect(result).toBeNull();
    });

    it("produces a valid PDF buffer when shore hardness data exists", async () => {
      jobCardRepo.findOne.mockResolvedValue(makeJobCard());
      companyRepo.findOne.mockResolvedValue(makeCompany());
      shoreHardnessRepo.find.mockResolvedValue([makeShoreHardness()]);

      const result = await service.generateStructuredSections(COMPANY_ID, JOB_CARD_ID);

      expect(result).not.toBeNull();
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result!.subarray(0, 5).toString()).toBe("%PDF-");
    });

    it("produces a valid PDF with all QC section types populated", async () => {
      jobCardRepo.findOne.mockResolvedValue(makeJobCard());
      companyRepo.findOne.mockResolvedValue(makeCompany());
      shoreHardnessRepo.find.mockResolvedValue([makeShoreHardness()]);
      dftReadingRepo.find.mockResolvedValue([
        makeDftReading(DftCoatType.PRIMER),
        makeDftReading(DftCoatType.FINAL, { id: 2, paintProduct: "Interthane 990" }),
      ]);
      blastProfileRepo.find.mockResolvedValue([makeBlastProfile()]);
      dustDebrisRepo.find.mockResolvedValue([makeDustDebrisTest()]);
      pullTestRepo.find.mockResolvedValue([makePullTest()]);
      controlPlanRepo.find.mockResolvedValue([makeControlPlan()]);
      releaseCertRepo.find.mockResolvedValue([makeReleaseCert()]);
      itemsReleaseRepo.find.mockResolvedValue([makeItemsRelease()]);

      const result = await service.generateStructuredSections(COMPANY_ID, JOB_CARD_ID);

      expect(result).not.toBeNull();
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result!.length).toBeGreaterThan(1000);
      expect(result!.subarray(0, 5).toString()).toBe("%PDF-");
    });

    it("returns null when company is null (QC disabled)", async () => {
      jobCardRepo.findOne.mockResolvedValue(makeJobCard());
      companyRepo.findOne.mockResolvedValue(null);
      shoreHardnessRepo.find.mockResolvedValue([makeShoreHardness()]);

      const result = await service.generateStructuredSections(COMPANY_ID, JOB_CARD_ID);

      expect(result).toBeNull();
    });

    it("returns null when QC is disabled for company", async () => {
      jobCardRepo.findOne.mockResolvedValue(makeJobCard());
      companyRepo.findOne.mockResolvedValue(makeCompany({ qcEnabled: false }));
      shoreHardnessRepo.find.mockResolvedValue([makeShoreHardness()]);

      const result = await service.generateStructuredSections(COMPANY_ID, JOB_CARD_ID);

      expect(result).toBeNull();
    });

    it("generates TOC entries matching rendered sections", async () => {
      jobCardRepo.findOne.mockResolvedValue(makeJobCard());
      companyRepo.findOne.mockResolvedValue(makeCompany());
      controlPlanRepo.find.mockResolvedValue([
        makeControlPlan({ planType: "rubber" }),
        makeControlPlan({ id: 2, planType: "paint_external", qcpNumber: "QCP-002" }),
      ]);
      shoreHardnessRepo.find.mockResolvedValue([makeShoreHardness()]);
      dftReadingRepo.find.mockResolvedValue([makeDftReading(DftCoatType.PRIMER)]);
      blastProfileRepo.find.mockResolvedValue([makeBlastProfile()]);

      const result = await service.generateStructuredSections(COMPANY_ID, JOB_CARD_ID);

      expect(result).not.toBeNull();
      expect(result!.subarray(0, 5).toString()).toBe("%PDF-");
    });

    it("only DFT readings present still produces valid PDF", async () => {
      jobCardRepo.findOne.mockResolvedValue(makeJobCard());
      companyRepo.findOne.mockResolvedValue(makeCompany());
      dftReadingRepo.find.mockResolvedValue([makeDftReading(DftCoatType.PRIMER)]);

      const result = await service.generateStructuredSections(COMPANY_ID, JOB_CARD_ID);

      expect(result).not.toBeNull();
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it("only items release present still produces valid PDF", async () => {
      jobCardRepo.findOne.mockResolvedValue(makeJobCard());
      companyRepo.findOne.mockResolvedValue(makeCompany());
      itemsReleaseRepo.find.mockResolvedValue([makeItemsRelease()]);

      const result = await service.generateStructuredSections(COMPANY_ID, JOB_CARD_ID);

      expect(result).not.toBeNull();
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it("queries all repositories with correct company and job card IDs", async () => {
      jobCardRepo.findOne.mockResolvedValue(makeJobCard());
      companyRepo.findOne.mockResolvedValue(makeCompany());

      await service.generateStructuredSections(COMPANY_ID, JOB_CARD_ID);

      expect(jobCardRepo.findOne).toHaveBeenCalledWith({
        where: { id: JOB_CARD_ID, companyId: COMPANY_ID },
        relations: ["lineItems"],
      });
      expect(companyRepo.findOne).toHaveBeenCalledWith({ where: { id: COMPANY_ID } });
      expect(shoreHardnessRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { companyId: COMPANY_ID, jobCardId: JOB_CARD_ID },
        }),
      );
      expect(dftReadingRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { companyId: COMPANY_ID, jobCardId: JOB_CARD_ID },
        }),
      );
    });
  });
});
