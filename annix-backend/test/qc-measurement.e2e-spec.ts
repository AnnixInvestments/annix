import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import request from "supertest";
import { JobCard } from "../src/stock-control/entities/job-card.entity";
import { StockControlAuthGuard } from "../src/stock-control/guards/stock-control-auth.guard";
import { StockControlRoleGuard } from "../src/stock-control/guards/stock-control-role.guard";
import { QcMeasurementController } from "../src/stock-control/qc/controllers/qc-measurement.controller";
import { QcBlastProfile } from "../src/stock-control/qc/entities/qc-blast-profile.entity";
import { QcControlPlan } from "../src/stock-control/qc/entities/qc-control-plan.entity";
import { QcDftReading } from "../src/stock-control/qc/entities/qc-dft-reading.entity";
import { QcDustDebrisTest } from "../src/stock-control/qc/entities/qc-dust-debris-test.entity";
import {
  ItemReleaseResult,
  QcItemsRelease,
} from "../src/stock-control/qc/entities/qc-items-release.entity";
import { QcPullTest } from "../src/stock-control/qc/entities/qc-pull-test.entity";
import { QcReleaseCertificate } from "../src/stock-control/qc/entities/qc-release-certificate.entity";
import { QcShoreHardness } from "../src/stock-control/qc/entities/qc-shore-hardness.entity";
import { QcMeasurementService } from "../src/stock-control/qc/services/qc-measurement.service";

const COMPANY_ID = 1;
const JOB_CARD_ID = 10;
const MOCK_USER = { id: 5, companyId: COMPANY_ID, name: "QC Inspector", role: "admin" };

function mockRepo() {
  return {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation((data: any) => ({ ...data })),
    save: jest.fn().mockImplementation((entity: any) => Promise.resolve({ id: 1, ...entity })),
    remove: jest.fn().mockResolvedValue(undefined),
  };
}

describe("QcMeasurementController (e2e)", () => {
  let app: INestApplication;

  const shoreHardnessRepo = mockRepo();
  const dftReadingRepo = mockRepo();
  const blastProfileRepo = mockRepo();
  const dustDebrisRepo = mockRepo();
  const pullTestRepo = mockRepo();
  const controlPlanRepo = mockRepo();
  const releaseCertRepo = mockRepo();
  const itemsReleaseRepo = mockRepo();
  const jobCardRepo = mockRepo();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [QcMeasurementController],
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
        { provide: getRepositoryToken(JobCard), useValue: jobCardRepo },
      ],
    })
      .overrideGuard(StockControlAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          req.user = MOCK_USER;
          return true;
        },
      })
      .overrideGuard(StockControlRoleGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    shoreHardnessRepo.find.mockResolvedValue([]);
    dftReadingRepo.find.mockResolvedValue([]);
    blastProfileRepo.find.mockResolvedValue([]);
    dustDebrisRepo.find.mockResolvedValue([]);
    pullTestRepo.find.mockResolvedValue([]);
    controlPlanRepo.find.mockResolvedValue([]);
    releaseCertRepo.find.mockResolvedValue([]);
    itemsReleaseRepo.find.mockResolvedValue([]);
  });

  const basePath = `/stock-control/job-cards/${JOB_CARD_ID}/qc`;

  // ── Aggregate endpoint ────────────────────────────────────────────

  describe("GET /qc", () => {
    it("returns all measurement types", async () => {
      const shoreData = [{ id: 1, rubberSpec: "NR 40" }];
      shoreHardnessRepo.find.mockResolvedValue(shoreData);

      const response = await request(app.getHttpServer()).get(basePath).expect(200);

      expect(response.body).toHaveProperty("shoreHardness");
      expect(response.body).toHaveProperty("dftReadings");
      expect(response.body).toHaveProperty("blastProfiles");
      expect(response.body).toHaveProperty("dustDebrisTests");
      expect(response.body).toHaveProperty("pullTests");
      expect(response.body).toHaveProperty("controlPlans");
      expect(response.body).toHaveProperty("releaseCertificates");
      expect(response.body.shoreHardness).toEqual(shoreData);
    });
  });

  // ── Shore Hardness ────────────────────────────────────────────────

  describe("GET /qc/shore-hardness", () => {
    it("returns shore hardness records for job card", async () => {
      const records = [{ id: 1, companyId: COMPANY_ID, jobCardId: JOB_CARD_ID }];
      shoreHardnessRepo.find.mockResolvedValue(records);

      const response = await request(app.getHttpServer())
        .get(`${basePath}/shore-hardness`)
        .expect(200);

      expect(response.body).toEqual(records);
    });
  });

  describe("POST /qc/shore-hardness", () => {
    it("creates a shore hardness record", async () => {
      const body = {
        rubberSpec: "NR 40",
        requiredShore: 40,
        readings: { column1: [40], column2: [], column3: [], column4: [] },
        averages: { column1: 40, column2: null, column3: null, column4: null, overall: 40 },
        readingDate: "2026-03-10",
      };

      await request(app.getHttpServer()).post(`${basePath}/shore-hardness`).send(body).expect(201);

      expect(shoreHardnessRepo.create).toHaveBeenCalled();
      expect(shoreHardnessRepo.save).toHaveBeenCalled();
    });
  });

  describe("DELETE /qc/shore-hardness/:id", () => {
    it("deletes a shore hardness record and returns confirmation", async () => {
      shoreHardnessRepo.findOne.mockResolvedValue({ id: 1, companyId: COMPANY_ID });

      const response = await request(app.getHttpServer())
        .delete(`${basePath}/shore-hardness/1`)
        .expect(200);

      expect(response.body).toEqual({ deleted: true });
    });

    it("returns 404 for non-existent record", async () => {
      shoreHardnessRepo.findOne.mockResolvedValue(null);

      await request(app.getHttpServer()).delete(`${basePath}/shore-hardness/999`).expect(404);
    });
  });

  // ── DFT Readings ──────────────────────────────────────────────────

  describe("GET /qc/dft-readings", () => {
    it("returns DFT readings for job card", async () => {
      const records = [{ id: 1, coatType: "primer" }];
      dftReadingRepo.find.mockResolvedValue(records);

      const response = await request(app.getHttpServer())
        .get(`${basePath}/dft-readings`)
        .expect(200);

      expect(response.body).toEqual(records);
    });
  });

  describe("POST /qc/dft-readings", () => {
    it("creates a DFT reading", async () => {
      const body = {
        coatType: "primer",
        paintProduct: "Interzinc 52",
        specMinMicrons: 50,
        specMaxMicrons: 100,
        readings: [{ itemNumber: 1, reading: 75 }],
        readingDate: "2026-03-10",
      };

      await request(app.getHttpServer()).post(`${basePath}/dft-readings`).send(body).expect(201);

      expect(dftReadingRepo.create).toHaveBeenCalled();
    });
  });

  // ── Blast Profiles ────────────────────────────────────────────────

  describe("GET /qc/blast-profiles", () => {
    it("returns blast profiles for job card", async () => {
      blastProfileRepo.find.mockResolvedValue([]);

      await request(app.getHttpServer()).get(`${basePath}/blast-profiles`).expect(200);

      expect(blastProfileRepo.find).toHaveBeenCalled();
    });
  });

  // ── Dust & Debris ─────────────────────────────────────────────────

  describe("GET /qc/dust-debris", () => {
    it("returns dust/debris tests for job card", async () => {
      dustDebrisRepo.find.mockResolvedValue([]);

      await request(app.getHttpServer()).get(`${basePath}/dust-debris`).expect(200);

      expect(dustDebrisRepo.find).toHaveBeenCalled();
    });
  });

  // ── Pull Tests ────────────────────────────────────────────────────

  describe("GET /qc/pull-tests", () => {
    it("returns pull tests for job card", async () => {
      pullTestRepo.find.mockResolvedValue([]);

      await request(app.getHttpServer()).get(`${basePath}/pull-tests`).expect(200);

      expect(pullTestRepo.find).toHaveBeenCalled();
    });
  });

  // ── Control Plans ─────────────────────────────────────────────────

  describe("POST /qc/control-plans", () => {
    it("creates a control plan", async () => {
      const body = {
        planType: "rubber",
        qcpNumber: "QCP-001",
        activities: [],
      };

      await request(app.getHttpServer()).post(`${basePath}/control-plans`).send(body).expect(201);

      expect(controlPlanRepo.create).toHaveBeenCalled();
    });
  });

  // ── Release Certificates ──────────────────────────────────────────

  describe("GET /qc/release-certificates", () => {
    it("returns release certificates for job card", async () => {
      releaseCertRepo.find.mockResolvedValue([]);

      await request(app.getHttpServer()).get(`${basePath}/release-certificates`).expect(200);

      expect(releaseCertRepo.find).toHaveBeenCalled();
    });
  });

  // ── Items Release ─────────────────────────────────────────────────

  describe("POST /qc/items-releases/auto-populate", () => {
    it("auto-populates items release from job card line items", async () => {
      jobCardRepo.findOne.mockResolvedValue({
        id: JOB_CARD_ID,
        companyId: COMPANY_ID,
        lineItems: [
          { itemCode: "VLV-001", itemDescription: "Gate Valve", jtNo: "JT-01", quantity: 3 },
        ],
      });

      const response = await request(app.getHttpServer())
        .post(`${basePath}/items-releases/auto-populate`)
        .expect(201);

      expect(itemsReleaseRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          totalQuantity: 3,
          items: expect.arrayContaining([
            expect.objectContaining({ itemCode: "VLV-001", result: ItemReleaseResult.PASS }),
          ]),
        }),
      );
    });

    it("returns 404 when job card does not exist", async () => {
      jobCardRepo.findOne.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post(`${basePath}/items-releases/auto-populate`)
        .expect(404);
    });
  });

  // ── Company scoping ───────────────────────────────────────────────

  describe("company scoping", () => {
    it("passes the authenticated user companyId to the service", async () => {
      await request(app.getHttpServer()).get(`${basePath}/shore-hardness`).expect(200);

      expect(shoreHardnessRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ companyId: COMPANY_ID }),
        }),
      );
    });
  });
});
