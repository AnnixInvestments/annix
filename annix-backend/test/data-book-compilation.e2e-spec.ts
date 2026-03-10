import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { JobCard } from "../src/stock-control/entities/job-card.entity";
import { StockControlCompany } from "../src/stock-control/entities/stock-control-company.entity";
import { QcBlastProfile } from "../src/stock-control/qc/entities/qc-blast-profile.entity";
import { QcControlPlan } from "../src/stock-control/qc/entities/qc-control-plan.entity";
import { DftCoatType, QcDftReading } from "../src/stock-control/qc/entities/qc-dft-reading.entity";
import { QcDustDebrisTest } from "../src/stock-control/qc/entities/qc-dust-debris-test.entity";
import {
  ItemReleaseResult,
  QcItemsRelease,
} from "../src/stock-control/qc/entities/qc-items-release.entity";
import { QcPullTest } from "../src/stock-control/qc/entities/qc-pull-test.entity";
import { QcReleaseCertificate } from "../src/stock-control/qc/entities/qc-release-certificate.entity";
import { QcShoreHardness } from "../src/stock-control/qc/entities/qc-shore-hardness.entity";
import { DataBookPdfService } from "../src/stock-control/services/data-book-pdf.service";

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

describe("Data Book Compilation (E2E smoke test)", () => {
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

  beforeAll(async () => {
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
  });

  beforeEach(() => {
    jest.restoreAllMocks();
    shoreHardnessRepo.find.mockResolvedValue([]);
    dftReadingRepo.find.mockResolvedValue([]);
    blastProfileRepo.find.mockResolvedValue([]);
    dustDebrisRepo.find.mockResolvedValue([]);
    pullTestRepo.find.mockResolvedValue([]);
    controlPlanRepo.find.mockResolvedValue([]);
    releaseCertRepo.find.mockResolvedValue([]);
    itemsReleaseRepo.find.mockResolvedValue([]);
    jobCardRepo.findOne.mockResolvedValue(null);
    companyRepo.findOne.mockResolvedValue(null);
  });

  it("compiles a complete data book with all QC sections populated and produces a valid PDF", async () => {
    const jobCard = {
      id: JOB_CARD_ID,
      companyId: COMPANY_ID,
      jobNumber: "JC-001",
      jobName: "Valve Lining Project",
      customerName: "Sasol",
      poNumber: "PO-12345",
      reference: "REF-001",
      siteLocation: "Secunda",
      dueDate: "2026-04-30",
      createdAt: new Date("2026-01-15"),
      lineItems: [
        { itemCode: "VLV-001", itemDescription: 'Gate Valve 6"', jtNo: "JT-01", quantity: 4 },
        { itemCode: "VLV-002", itemDescription: 'Ball Valve 4"', jtNo: "JT-02", quantity: 2 },
      ],
    };

    const company = {
      id: COMPANY_ID,
      name: "PLS Coatings (Pty) Ltd",
      primaryColor: "#0d9488",
      logoUrl: null,
    };

    const shoreHardnessRecords = [
      {
        id: 1,
        companyId: COMPANY_ID,
        jobCardId: JOB_CARD_ID,
        rubberSpec: "NR 40 Shore A",
        rubberBatchNumber: "RB-2026-001",
        requiredShore: 40,
        readings: {
          column1: [40, 41, 39, 40],
          column2: [41, 40, 42, 39],
          column3: [],
          column4: [],
        },
        averages: { column1: 40, column2: 40.5, column3: null, column4: null, overall: 40.25 },
        readingDate: "2026-03-01",
        capturedByName: "QC Inspector",
        capturedById: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const dftReadings = [
      {
        id: 1,
        companyId: COMPANY_ID,
        jobCardId: JOB_CARD_ID,
        coatType: DftCoatType.PRIMER,
        paintProduct: "Interzinc 52",
        batchNumber: "PB-001",
        specMinMicrons: 50,
        specMaxMicrons: 75,
        readings: [
          { itemNumber: 1, reading: 65 },
          { itemNumber: 2, reading: 70 },
          { itemNumber: 3, reading: 62 },
        ],
        averageMicrons: 65.67,
        readingDate: "2026-03-02",
        capturedByName: "QC Inspector",
        capturedById: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        companyId: COMPANY_ID,
        jobCardId: JOB_CARD_ID,
        coatType: DftCoatType.FINAL,
        paintProduct: "Interthane 990",
        batchNumber: "PB-002",
        specMinMicrons: 125,
        specMaxMicrons: 200,
        readings: [
          { itemNumber: 1, reading: 150 },
          { itemNumber: 2, reading: 165 },
        ],
        averageMicrons: 157.5,
        readingDate: "2026-03-05",
        capturedByName: "QC Inspector",
        capturedById: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const blastProfiles = [
      {
        id: 1,
        companyId: COMPANY_ID,
        jobCardId: JOB_CARD_ID,
        specMicrons: 75,
        abrasiveBatchNumber: "AB-2026-001",
        readings: [
          { itemNumber: 1, reading: 78 },
          { itemNumber: 2, reading: 72 },
          { itemNumber: 3, reading: 80 },
        ],
        averageMicrons: 76.67,
        temperature: 24.5,
        humidity: 42,
        readingDate: "2026-03-01",
        capturedByName: "QC Inspector",
        capturedById: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const dustDebrisTests = [
      {
        id: 1,
        companyId: COMPANY_ID,
        jobCardId: JOB_CARD_ID,
        tests: [
          {
            testNumber: 1,
            quantity: 4,
            coatingType: "rubber",
            itemNumber: "VLV-001",
            result: "pass",
            testedAt: "2026-03-01 08:00",
          },
          {
            testNumber: 2,
            quantity: 2,
            coatingType: "rubber",
            itemNumber: "VLV-002",
            result: "pass",
            testedAt: "2026-03-01 09:00",
          },
        ],
        readingDate: "2026-03-01",
        capturedByName: "QC Inspector",
        capturedById: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const pullTests = [
      {
        id: 1,
        companyId: COMPANY_ID,
        jobCardId: JOB_CARD_ID,
        itemDescription: 'Gate Valve 6"',
        quantity: 4,
        solutions: [
          { product: "Chemosil 211", batchNumber: "CS-001", result: "pass" },
          { product: "Chemosil 411", batchNumber: "CS-002", result: "pass" },
        ],
        forceGauge: {
          make: "Elcometer",
          certificateNumber: "CAL-2026-001",
          expiryDate: "2027-06-15",
        },
        areaReadings: [
          { area: "Inside flange", result: "pass", reading: "4.2 MPa" },
          { area: "Body", result: "pass", reading: "3.8 MPa" },
        ],
        comments: null,
        readingDate: "2026-03-03",
        finalApprovalName: null,
        finalApprovalDate: null,
        capturedByName: "QC Inspector",
        capturedById: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const controlPlans = [
      {
        id: 1,
        companyId: COMPANY_ID,
        jobCardId: JOB_CARD_ID,
        planType: "rubber",
        qcpNumber: "QCP-RUB-001",
        documentRef: null,
        revision: "00",
        customerName: "Sasol",
        orderNumber: "PO-12345",
        jobName: "Valve Lining Project",
        specification: "NR 40 Shore A Rubber Lining",
        itemDescription: "Gate & Ball Valves",
        activities: [
          {
            operationNumber: 1,
            description: "Incoming inspection",
            specification: "Visual",
            procedureRequired: true,
            pls: { interventionType: "H", name: null, signatureUrl: null, date: null },
            mps: { interventionType: null, name: null, signatureUrl: null, date: null },
            client: { interventionType: null, name: null, signatureUrl: null, date: null },
            remarks: null,
          },
          {
            operationNumber: 2,
            description: "Abrasive blasting",
            specification: "SA 2.5",
            procedureRequired: true,
            pls: { interventionType: "H", name: null, signatureUrl: null, date: null },
            mps: { interventionType: "W", name: null, signatureUrl: null, date: null },
            client: { interventionType: null, name: null, signatureUrl: null, date: null },
            remarks: null,
          },
        ],
        approvalSignatures: [],
        createdByName: "Admin",
        createdById: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        companyId: COMPANY_ID,
        jobCardId: JOB_CARD_ID,
        planType: "paint_external",
        qcpNumber: "QCP-PNT-001",
        documentRef: null,
        revision: "00",
        customerName: "Sasol",
        orderNumber: "PO-12345",
        jobName: "Valve Lining Project",
        specification: "Interthane 990 System",
        itemDescription: "External coating",
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
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const releaseCertificates = [
      {
        id: 1,
        companyId: COMPANY_ID,
        jobCardId: JOB_CARD_ID,
        certificateNumber: "QRC-2026-001",
        blastingCheck: {
          blastProfileBatchNo: "AB-2026-001",
          contaminationFree: "pass",
          sa25Grade: "pass",
          inspectorName: "QC Inspector",
        },
        solutionsUsed: [
          { productName: "Chemosil 211", typeBatch: "CS-001", result: "pass", inspectorName: "QC" },
        ],
        liningCheck: {
          preCureLinedAsPerDrawing: "pass",
          preCureInspectorName: "QC Inspector",
          visualDefectInspection: "pass",
          visualDefectInspectorName: "QC Inspector",
        },
        cureCycles: [
          { cycleNumber: 1, timeIn: "08:00", timeOut: "12:00", pressureBar: 3.5 },
          { cycleNumber: 2, timeIn: "13:00", timeOut: "17:00", pressureBar: 3.5 },
        ],
        paintingChecks: [
          {
            coat: "primer",
            batchNumber: "PB-001",
            dftMicrons: 65,
            result: "pass",
            inspectorName: "QC",
          },
          {
            coat: "final",
            batchNumber: "PB-002",
            dftMicrons: 155,
            result: "pass",
            inspectorName: "QC",
          },
        ],
        finalInspection: {
          linedAsPerDrawing: "pass",
          visualInspection: "pass",
          testPlate: "pass",
          shoreHardness: 41,
          sparkTest: "pass",
          sparkTestVoltagePerMm: 5,
          inspectorName: "QC Inspector",
        },
        comments: null,
        certificateDate: "2026-03-08",
        finalApprovalName: null,
        finalApprovalSignatureUrl: null,
        finalApprovalDate: null,
        capturedByName: "QC Inspector",
        capturedById: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const itemsReleases = [
      {
        id: 1,
        companyId: COMPANY_ID,
        jobCardId: JOB_CARD_ID,
        items: [
          {
            itemCode: "VLV-001",
            description: 'Gate Valve 6"',
            jtNumber: "JT-01",
            rubberSpec: "NR 40",
            paintingSpec: "Interthane 990",
            quantity: 4,
            result: ItemReleaseResult.PASS,
          },
          {
            itemCode: "VLV-002",
            description: 'Ball Valve 4"',
            jtNumber: "JT-02",
            rubberSpec: "NR 40",
            paintingSpec: "Interthane 990",
            quantity: 2,
            result: ItemReleaseResult.PASS,
          },
        ],
        totalQuantity: 6,
        createdByName: "Admin",
        createdById: 1,
        plsSignOff: { name: "QC Manager", date: "2026-03-09", signatureUrl: null },
        mpsSignOff: { name: null, date: null, signatureUrl: null },
        clientSignOff: { name: null, date: null, signatureUrl: null },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    jobCardRepo.findOne.mockResolvedValue(jobCard);
    companyRepo.findOne.mockResolvedValue(company);
    shoreHardnessRepo.find.mockResolvedValue(shoreHardnessRecords);
    dftReadingRepo.find.mockResolvedValue(dftReadings);
    blastProfileRepo.find.mockResolvedValue(blastProfiles);
    dustDebrisRepo.find.mockResolvedValue(dustDebrisTests);
    pullTestRepo.find.mockResolvedValue(pullTests);
    controlPlanRepo.find.mockResolvedValue(controlPlans);
    releaseCertRepo.find.mockResolvedValue(releaseCertificates);
    itemsReleaseRepo.find.mockResolvedValue(itemsReleases);

    const result = await service.generateStructuredSections(COMPANY_ID, JOB_CARD_ID);

    expect(result).not.toBeNull();
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result!.subarray(0, 5).toString()).toBe("%PDF-");
    expect(result!.length).toBeGreaterThan(5000);

    const pdfString = result!.toString("latin1");
    expect(pdfString).toContain("%%EOF");
  }, 30000);

  it("returns null when no QC data exists for job card", async () => {
    jobCardRepo.findOne.mockResolvedValue({
      id: JOB_CARD_ID,
      companyId: COMPANY_ID,
      lineItems: [],
    });
    companyRepo.findOne.mockResolvedValue({ id: COMPANY_ID, name: "Test Co" });

    const result = await service.generateStructuredSections(COMPANY_ID, JOB_CARD_ID);

    expect(result).toBeNull();
  });

  it("returns null when job card does not exist", async () => {
    jobCardRepo.findOne.mockResolvedValue(null);

    const result = await service.generateStructuredSections(COMPANY_ID, 999);

    expect(result).toBeNull();
  });
});
