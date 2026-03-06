import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { EmailService } from "../email/email.service";
import { RubberCompoundBatch } from "./entities/rubber-compound-batch.entity";
import { RubberCompoundQualityConfig } from "./entities/rubber-compound-quality-config.entity";
import {
  QualityAlertSeverity,
  QualityAlertType,
  RubberQualityAlert,
} from "./entities/rubber-quality-alert.entity";
import { RubberSupplierCoc } from "./entities/rubber-supplier-coc.entity";
import { RubberQualityTrackingService } from "./rubber-quality-tracking.service";

describe("RubberQualityTrackingService", () => {
  let service: RubberQualityTrackingService;

  const mockRepo = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    save: jest.fn(),
    create: jest.fn((data: unknown) => data),
    createQueryBuilder: jest.fn(),
  });

  const mockBatchRepo = mockRepo();
  const mockCocRepo = mockRepo();
  const mockConfigRepo = mockRepo();
  const mockAlertRepo = mockRepo();
  const mockEmailService = { sendEmail: jest.fn() };
  const mockConfigService = { get: jest.fn().mockReturnValue("test@test.com") };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RubberQualityTrackingService,
        { provide: getRepositoryToken(RubberCompoundBatch), useValue: mockBatchRepo },
        { provide: getRepositoryToken(RubberSupplierCoc), useValue: mockCocRepo },
        { provide: getRepositoryToken(RubberCompoundQualityConfig), useValue: mockConfigRepo },
        { provide: getRepositoryToken(RubberQualityAlert), useValue: mockAlertRepo },
        { provide: EmailService, useValue: mockEmailService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<RubberQualityTrackingService>(RubberQualityTrackingService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("calculateMetricStats", () => {
    const calculate = (values: (number | null)[]) =>
      (service as any).calculateMetricStats(values);

    it("should return null when fewer than 2 valid values", () => {
      expect(calculate([5])).toBeNull();
      expect(calculate([])).toBeNull();
      expect(calculate([null, null])).toBeNull();
      expect(calculate([5, null])).toBeNull();
    });

    it("should calculate mean correctly", () => {
      const result = calculate([10, 20, 30]);

      expect(result.mean).toBe(20);
    });

    it("should calculate standard deviation (population) correctly", () => {
      const result = calculate([10, 20, 30]);
      const expectedStdDev = Math.sqrt(((100 + 0 + 100) / 3));

      expect(result.stdDev).toBeCloseTo(expectedStdDev, 1);
    });

    it("should calculate coefficient of variation correctly", () => {
      const result = calculate([10, 20, 30]);
      const mean = 20;
      const stdDev = Math.sqrt(200 / 3);
      const expectedCv = (stdDev / mean) * 100;

      expect(result.cv).toBeCloseTo(expectedCv, 1);
    });

    it("should return 0 cv when mean is 0", () => {
      const result = calculate([-5, 5]);

      expect(result.mean).toBe(0);
      expect(result.cv).toBe(0);
    });

    it("should calculate min and max correctly", () => {
      const result = calculate([15, 5, 25, 10]);

      expect(result.min).toBe(5);
      expect(result.max).toBe(25);
    });

    it("should set latestValue to first element", () => {
      const result = calculate([99, 50, 75]);

      expect(result.latestValue).toBe(99);
    });

    it("should set sampleCount to number of non-null values", () => {
      const result = calculate([10, null, 20, null, 30]);

      expect(result.sampleCount).toBe(3);
    });

    it("should filter out null values for calculations", () => {
      const result = calculate([10, null, 30]);

      expect(result.mean).toBe(20);
      expect(result.sampleCount).toBe(2);
    });

    it("should handle identical values (zero variance)", () => {
      const result = calculate([50, 50, 50]);

      expect(result.mean).toBe(50);
      expect(result.stdDev).toBe(0);
      expect(result.cv).toBe(0);
    });

    it("should round values to 2 decimal places", () => {
      const result = calculate([1, 2, 3]);

      expect(String(result.mean).split(".")[1]?.length || 0).toBeLessThanOrEqual(2);
      expect(String(result.stdDev).split(".")[1]?.length || 0).toBeLessThanOrEqual(2);
    });
  });

  describe("calculateTrend", () => {
    const trend = (values: number[]) => (service as any).calculateTrend(values);

    it("should return stable when fewer than 3 values", () => {
      expect(trend([1, 2])).toBe("stable");
      expect(trend([1])).toBe("stable");
      expect(trend([])).toBe("stable");
    });

    it("should detect upward trend", () => {
      expect(trend([10, 20, 30, 40, 50])).toBe("up");
    });

    it("should detect downward trend", () => {
      expect(trend([50, 40, 30, 20, 10])).toBe("down");
    });

    it("should return stable for flat data", () => {
      expect(trend([50, 50, 50, 50, 50])).toBe("stable");
    });

    it("should return stable for small fluctuations relative to mean", () => {
      expect(trend([100, 100.5, 99.5, 100.2, 99.8])).toBe("stable");
    });
  });

  describe("determineCompoundStatus", () => {
    const status = (alertCount: number) =>
      (service as any).determineCompoundStatus(alertCount);

    it("should return normal when no alerts", () => {
      expect(status(0)).toBe("normal");
    });

    it("should return warning when 1-2 alerts", () => {
      expect(status(1)).toBe("warning");
      expect(status(2)).toBe("warning");
    });

    it("should return critical when 3+ alerts", () => {
      expect(status(3)).toBe("critical");
      expect(status(10)).toBe("critical");
    });
  });

  describe("checkDriftMetric", () => {
    const checkDrift = (
      currentValue: number | null,
      historicalValues: (number | null)[],
      threshold: number,
    ) => {
      const alerts: Partial<RubberQualityAlert>[] = [];
      (service as any).checkDriftMetric(
        "Shore A",
        "shoreAHardness",
        currentValue,
        historicalValues,
        threshold,
        { batchNumber: "B100", id: 1 },
        "TEST-COMPOUND",
        alerts,
      );
      return alerts;
    };

    it("should not alert when current value is null", () => {
      const alerts = checkDrift(null, [50, 52, 51], 3);

      expect(alerts).toHaveLength(0);
    });

    it("should not alert when fewer than 2 historical values", () => {
      const alerts = checkDrift(60, [50], 3);

      expect(alerts).toHaveLength(0);
    });

    it("should not alert when drift is within threshold", () => {
      const alerts = checkDrift(52, [50, 51, 49], 3);

      expect(alerts).toHaveLength(0);
    });

    it("should create WARNING alert when drift exceeds threshold but under 1.5x", () => {
      const alerts = checkDrift(54, [50, 50, 50], 3);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].alertType).toBe(QualityAlertType.DRIFT);
      expect(alerts[0].severity).toBe(QualityAlertSeverity.WARNING);
      expect(alerts[0].compoundCode).toBe("TEST-COMPOUND");
    });

    it("should create CRITICAL alert when drift exceeds 1.5x threshold", () => {
      const alerts = checkDrift(60, [50, 50, 50], 3);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe(QualityAlertSeverity.CRITICAL);
    });

    it("should detect drift below mean", () => {
      const alerts = checkDrift(43, [50, 50, 50], 3);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].message).toContain("below");
    });

    it("should detect drift above mean", () => {
      const alerts = checkDrift(57, [50, 50, 50], 3);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].message).toContain("above");
    });

    it("should filter null historical values", () => {
      const alerts = checkDrift(57, [50, null, 50, null, 50], 3);

      expect(alerts).toHaveLength(1);
    });
  });

  describe("checkDropMetric", () => {
    const checkDrop = (
      currentValue: number | null,
      historicalValues: (number | null)[],
      dropPercentThreshold: number,
    ) => {
      const alerts: Partial<RubberQualityAlert>[] = [];
      (service as any).checkDropMetric(
        "Tensile Strength",
        "tensileStrengthMpa",
        currentValue,
        historicalValues,
        dropPercentThreshold,
        { batchNumber: "B100", id: 1 },
        "TEST-COMPOUND",
        alerts,
      );
      return alerts;
    };

    it("should not alert when current value is null", () => {
      const alerts = checkDrop(null, [20, 22, 21], 10);

      expect(alerts).toHaveLength(0);
    });

    it("should not alert when fewer than 2 historical values", () => {
      const alerts = checkDrop(10, [20], 10);

      expect(alerts).toHaveLength(0);
    });

    it("should not alert when no significant drop", () => {
      const alerts = checkDrop(19, [20, 20, 20], 10);

      expect(alerts).toHaveLength(0);
    });

    it("should create WARNING alert for drop exceeding threshold", () => {
      const alerts = checkDrop(17, [20, 20, 20], 10);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].alertType).toBe(QualityAlertType.DROP);
      expect(alerts[0].severity).toBe(QualityAlertSeverity.WARNING);
    });

    it("should create CRITICAL alert for drop exceeding 1.5x threshold", () => {
      const alerts = checkDrop(13, [20, 20, 20], 10);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe(QualityAlertSeverity.CRITICAL);
    });

    it("should not alert when value increases", () => {
      const alerts = checkDrop(25, [20, 20, 20], 10);

      expect(alerts).toHaveLength(0);
    });
  });

  describe("checkCvMetric", () => {
    const checkCv = (values: (number | null)[], threshold: number) => {
      const alerts: Partial<RubberQualityAlert>[] = [];
      (service as any).checkCvMetric(
        "TC90",
        "rheometerTc90",
        values,
        threshold,
        { batchNumber: "B100", id: 1 },
        "TEST-COMPOUND",
        alerts,
      );
      return alerts;
    };

    it("should not alert when fewer than 3 valid values", () => {
      const alerts = checkCv([5, 10], 15);

      expect(alerts).toHaveLength(0);
    });

    it("should not alert when CV is below threshold", () => {
      const alerts = checkCv([10, 10.1, 9.9, 10.2, 9.8], 15);

      expect(alerts).toHaveLength(0);
    });

    it("should create WARNING when CV exceeds threshold", () => {
      const alerts = checkCv([10, 12, 8, 11, 9], 10);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].alertType).toBe(QualityAlertType.CV_HIGH);
      expect(alerts[0].severity).toBe(QualityAlertSeverity.WARNING);
    });

    it("should create CRITICAL when CV exceeds 1.5x threshold", () => {
      const alerts = checkCv([1, 50, 5, 80, 3], 15);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe(QualityAlertSeverity.CRITICAL);
    });

    it("should filter null values", () => {
      const alerts = checkCv([10, null, 10.1, null, 9.9], 15);

      expect(alerts).toHaveLength(0);
    });

    it("should handle zero mean without division by zero", () => {
      const alerts = checkCv([-5, 5, 0], 15);

      expect(alerts).toHaveLength(0);
    });
  });

  describe("checkCompoundQuality integration", () => {
    const mockBatch = (
      overrides: Partial<RubberCompoundBatch> = {},
    ): Partial<RubberCompoundBatch> => ({
      id: 1,
      batchNumber: "B100",
      shoreAHardness: 50,
      specificGravity: 1.15,
      reboundPercent: 40,
      tearStrengthKnM: 30,
      tensileStrengthMpa: 20,
      elongationPercent: 400,
      rheometerTc90: 5.5,
      createdAt: new Date(),
      ...overrides,
    });

    const setupBatchQueryBuilder = (batches: Partial<RubberCompoundBatch>[]) => {
      const qb = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(batches),
      };
      mockBatchRepo.createQueryBuilder.mockReturnValue(qb);
    };

    it("should return no alerts when fewer than 3 batches", async () => {
      setupBatchQueryBuilder([mockBatch(), mockBatch({ id: 2 })]);
      mockConfigRepo.findOne.mockResolvedValue(null);

      const result = await service.checkCompoundQuality("TEST");

      expect(result.alertsCreated).toBe(0);
      expect(result.alerts).toHaveLength(0);
    });

    it("should detect drift when latest batch deviates significantly", async () => {
      const historical = Array.from({ length: 5 }, (_, i) =>
        mockBatch({ id: i + 2, batchNumber: `B${101 + i}`, shoreAHardness: 50 }),
      );
      const latest = mockBatch({ id: 1, batchNumber: "B100", shoreAHardness: 60 });
      setupBatchQueryBuilder([latest, ...historical]);
      mockConfigRepo.findOne.mockResolvedValue(null);
      mockAlertRepo.save.mockImplementation((alerts: unknown[]) =>
        (alerts as Partial<RubberQualityAlert>[]).map((a, i) => ({
          ...a,
          id: i + 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          acknowledgedAt: null,
          acknowledgedBy: null,
        })),
      );
      mockEmailService.sendEmail.mockResolvedValue(undefined);

      const result = await service.checkCompoundQuality("TEST");

      expect(result.alertsCreated).toBeGreaterThan(0);
      const driftAlert = result.alerts.find(
        (a) => a.metricName === "shoreAHardness" && a.alertType === QualityAlertType.DRIFT,
      );
      expect(driftAlert).toBeDefined();
    });
  });
});
