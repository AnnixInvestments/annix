import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { EmailService } from "../email/email.service";
import { now } from "../lib/datetime";
import {
  BatchMetricData,
  CompoundQualityDetailDto,
  CompoundQualitySummaryDto,
  MetricStats,
  QualityAlertDto,
  QualityCheckResult,
  QualityConfigDto,
  QualityStatus,
  TrendDirection,
  UpdateQualityConfigDto,
} from "./dto/rubber-quality.dto";
import { RubberCompoundBatch } from "./entities/rubber-compound-batch.entity";
import { RubberCompoundQualityConfig } from "./entities/rubber-compound-quality-config.entity";
import {
  QualityAlertSeverity,
  QualityAlertType,
  RubberQualityAlert,
} from "./entities/rubber-quality-alert.entity";
import { RubberSupplierCoc, SupplierCocType } from "./entities/rubber-supplier-coc.entity";

interface ThresholdDefaults {
  shoreADriftThreshold: number;
  specificGravityDriftThreshold: number;
  reboundDriftThreshold: number;
  tearStrengthDropPercent: number;
  tensileStrengthDropPercent: number;
  elongationDropPercent: number;
  tc90CvThreshold: number;
}

const DEFAULT_THRESHOLDS: ThresholdDefaults = {
  shoreADriftThreshold: 3,
  specificGravityDriftThreshold: 0.02,
  reboundDriftThreshold: 3,
  tearStrengthDropPercent: 15,
  tensileStrengthDropPercent: 10,
  elongationDropPercent: 15,
  tc90CvThreshold: 15,
};

const DEFAULT_WINDOW_SIZE = 10;

const ALERT_TYPE_LABELS: Record<QualityAlertType, string> = {
  [QualityAlertType.DRIFT]: "Drift from Mean",
  [QualityAlertType.DROP]: "Significant Drop",
  [QualityAlertType.CV_HIGH]: "High Variability",
};

const SEVERITY_LABELS: Record<QualityAlertSeverity, string> = {
  [QualityAlertSeverity.WARNING]: "Warning",
  [QualityAlertSeverity.CRITICAL]: "Critical",
};

@Injectable()
export class RubberQualityTrackingService {
  private readonly logger = new Logger(RubberQualityTrackingService.name);

  constructor(
    @InjectRepository(RubberCompoundBatch)
    private batchRepository: Repository<RubberCompoundBatch>,
    @InjectRepository(RubberSupplierCoc)
    private cocRepository: Repository<RubberSupplierCoc>,
    @InjectRepository(RubberCompoundQualityConfig)
    private configRepository: Repository<RubberCompoundQualityConfig>,
    @InjectRepository(RubberQualityAlert)
    private alertRepository: Repository<RubberQualityAlert>,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  async qualitySummaryByCompound(): Promise<CompoundQualitySummaryDto[]> {
    const compoundCodes = await this.distinctCompoundCodes();

    const summaries = await Promise.all(
      compoundCodes.map(async (compoundCode) => {
        const batches = await this.completeBatchesForCompound(compoundCode);

        if (batches.length === 0) {
          return null;
        }

        const alertCount = await this.activeAlertCountForCompound(compoundCode);
        const lastBatch = batches[0];

        const shoreAStats = this.calculateMetricStats(batches.map((b) => b.shoreAHardness));
        const tc90Stats = this.calculateMetricStats(batches.map((b) => b.rheometerTc90));
        const tensileStats = this.calculateMetricStats(batches.map((b) => b.tensileStrengthMpa));
        const elongationStats = this.calculateMetricStats(batches.map((b) => b.elongationPercent));
        const tearStats = this.calculateMetricStats(batches.map((b) => b.tearStrengthKnM));
        const sgStats = this.calculateMetricStats(batches.map((b) => b.specificGravity));
        const reboundStats = this.calculateMetricStats(batches.map((b) => b.reboundPercent));

        const status = this.determineCompoundStatus(alertCount);

        const summary: CompoundQualitySummaryDto = {
          compoundCode,
          batchCount: batches.length,
          lastBatchDate: lastBatch.createdAt.toISOString(),
          shoreA: shoreAStats,
          tc90: tc90Stats,
          tensile: tensileStats,
          elongation: elongationStats,
          tearStrength: tearStats,
          specificGravity: sgStats,
          rebound: reboundStats,
          status,
          activeAlertCount: alertCount,
        };

        return summary;
      }),
    );

    return summaries.filter((s): s is CompoundQualitySummaryDto => s !== null);
  }

  async qualityDetailForCompound(compoundCode: string): Promise<CompoundQualityDetailDto | null> {
    const batches = await this.completeBatchesForCompound(compoundCode);

    if (batches.length === 0) {
      return null;
    }

    const config = await this.configForCompound(compoundCode);
    const alerts = await this.alertsForCompound(compoundCode);

    const batchData: BatchMetricData[] = batches.map((batch) => ({
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      createdAt: batch.createdAt.toISOString(),
      shoreA: batch.shoreAHardness ? Number(batch.shoreAHardness) : null,
      specificGravity: batch.specificGravity ? Number(batch.specificGravity) : null,
      rebound: batch.reboundPercent ? Number(batch.reboundPercent) : null,
      tearStrength: batch.tearStrengthKnM ? Number(batch.tearStrengthKnM) : null,
      tensile: batch.tensileStrengthMpa ? Number(batch.tensileStrengthMpa) : null,
      elongation: batch.elongationPercent ? Number(batch.elongationPercent) : null,
      sMin: batch.rheometerSMin ? Number(batch.rheometerSMin) : null,
      sMax: batch.rheometerSMax ? Number(batch.rheometerSMax) : null,
      ts2: batch.rheometerTs2 ? Number(batch.rheometerTs2) : null,
      tc90: batch.rheometerTc90 ? Number(batch.rheometerTc90) : null,
      passFailStatus: batch.passFailStatus ?? null,
    }));

    return {
      compoundCode,
      batchCount: batches.length,
      stats: {
        shoreA: this.calculateMetricStats(batches.map((b) => b.shoreAHardness)),
        specificGravity: this.calculateMetricStats(batches.map((b) => b.specificGravity)),
        rebound: this.calculateMetricStats(batches.map((b) => b.reboundPercent)),
        tearStrength: this.calculateMetricStats(batches.map((b) => b.tearStrengthKnM)),
        tensile: this.calculateMetricStats(batches.map((b) => b.tensileStrengthMpa)),
        elongation: this.calculateMetricStats(batches.map((b) => b.elongationPercent)),
        tc90: this.calculateMetricStats(batches.map((b) => b.rheometerTc90)),
      },
      batches: batchData,
      config,
      alerts,
    };
  }

  async checkCompoundQuality(compoundCode: string): Promise<QualityCheckResult> {
    const batches = await this.completeBatchesForCompound(compoundCode);

    if (batches.length < 3) {
      return { compoundCode, alertsCreated: 0, alerts: [] };
    }

    const config = await this.configForCompound(compoundCode);
    const latestBatch = batches[0];
    const historicalBatches = batches.slice(1, config.windowSize + 1);

    if (historicalBatches.length < 2) {
      return { compoundCode, alertsCreated: 0, alerts: [] };
    }

    const alertsToCreate: Partial<RubberQualityAlert>[] = [];

    this.checkDriftMetric(
      "Shore A Hardness",
      "shoreAHardness",
      latestBatch.shoreAHardness,
      historicalBatches.map((b) => b.shoreAHardness),
      config.shoreADriftThreshold,
      latestBatch,
      compoundCode,
      alertsToCreate,
    );

    this.checkDriftMetric(
      "Specific Gravity",
      "specificGravity",
      latestBatch.specificGravity,
      historicalBatches.map((b) => b.specificGravity),
      config.specificGravityDriftThreshold,
      latestBatch,
      compoundCode,
      alertsToCreate,
    );

    this.checkDriftMetric(
      "Rebound Resilience",
      "reboundPercent",
      latestBatch.reboundPercent,
      historicalBatches.map((b) => b.reboundPercent),
      config.reboundDriftThreshold,
      latestBatch,
      compoundCode,
      alertsToCreate,
    );

    this.checkDropMetric(
      "Tear Strength",
      "tearStrengthKnM",
      latestBatch.tearStrengthKnM,
      historicalBatches.map((b) => b.tearStrengthKnM),
      config.tearStrengthDropPercent,
      latestBatch,
      compoundCode,
      alertsToCreate,
    );

    this.checkDropMetric(
      "Tensile Strength",
      "tensileStrengthMpa",
      latestBatch.tensileStrengthMpa,
      historicalBatches.map((b) => b.tensileStrengthMpa),
      config.tensileStrengthDropPercent,
      latestBatch,
      compoundCode,
      alertsToCreate,
    );

    this.checkDropMetric(
      "Elongation",
      "elongationPercent",
      latestBatch.elongationPercent,
      historicalBatches.map((b) => b.elongationPercent),
      config.elongationDropPercent,
      latestBatch,
      compoundCode,
      alertsToCreate,
    );

    this.checkCvMetric(
      "TC90",
      "rheometerTc90",
      batches.slice(0, config.windowSize).map((b) => b.rheometerTc90),
      config.tc90CvThreshold,
      latestBatch,
      compoundCode,
      alertsToCreate,
    );

    if (alertsToCreate.length === 0) {
      return { compoundCode, alertsCreated: 0, alerts: [] };
    }

    const savedAlerts = await this.alertRepository.save(
      alertsToCreate.map((a) => this.alertRepository.create(a)),
    );

    const alertDtos = savedAlerts.map((a) => this.mapAlertToDto(a));

    await this.sendAlertEmails(compoundCode, alertDtos);

    return {
      compoundCode,
      alertsCreated: savedAlerts.length,
      alerts: alertDtos,
    };
  }

  async activeAlerts(): Promise<QualityAlertDto[]> {
    const alerts = await this.alertRepository.find({
      where: { acknowledgedAt: IsNull() },
      order: { createdAt: "DESC" },
    });
    return alerts.map((a) => this.mapAlertToDto(a));
  }

  async alertsForCompound(compoundCode: string): Promise<QualityAlertDto[]> {
    const alerts = await this.alertRepository.find({
      where: { compoundCode },
      order: { createdAt: "DESC" },
      take: 50,
    });
    return alerts.map((a) => this.mapAlertToDto(a));
  }

  async acknowledgeAlert(id: number, acknowledgedBy: string): Promise<QualityAlertDto | null> {
    const alert = await this.alertRepository.findOne({ where: { id } });
    if (!alert) return null;

    alert.acknowledgedAt = now().toJSDate();
    alert.acknowledgedBy = acknowledgedBy;
    await this.alertRepository.save(alert);

    return this.mapAlertToDto(alert);
  }

  async configForCompound(compoundCode: string): Promise<QualityConfigDto> {
    const config = await this.configRepository.findOne({ where: { compoundCode } });

    if (config) {
      return {
        id: config.id,
        compoundCode: config.compoundCode,
        compoundDescription: config.compoundDescription ?? null,
        windowSize: config.windowSize,
        shoreADriftThreshold:
          config.shoreADriftThreshold !== null
            ? Number(config.shoreADriftThreshold)
            : DEFAULT_THRESHOLDS.shoreADriftThreshold,
        specificGravityDriftThreshold:
          config.specificGravityDriftThreshold !== null
            ? Number(config.specificGravityDriftThreshold)
            : DEFAULT_THRESHOLDS.specificGravityDriftThreshold,
        reboundDriftThreshold:
          config.reboundDriftThreshold !== null
            ? Number(config.reboundDriftThreshold)
            : DEFAULT_THRESHOLDS.reboundDriftThreshold,
        tearStrengthDropPercent:
          config.tearStrengthDropPercent !== null
            ? Number(config.tearStrengthDropPercent)
            : DEFAULT_THRESHOLDS.tearStrengthDropPercent,
        tensileStrengthDropPercent:
          config.tensileStrengthDropPercent !== null
            ? Number(config.tensileStrengthDropPercent)
            : DEFAULT_THRESHOLDS.tensileStrengthDropPercent,
        elongationDropPercent:
          config.elongationDropPercent !== null
            ? Number(config.elongationDropPercent)
            : DEFAULT_THRESHOLDS.elongationDropPercent,
        tc90CvThreshold:
          config.tc90CvThreshold !== null
            ? Number(config.tc90CvThreshold)
            : DEFAULT_THRESHOLDS.tc90CvThreshold,
        shoreANominal: config.shoreANominal !== null ? Number(config.shoreANominal) : null,
        shoreAMin: config.shoreAMin !== null ? Number(config.shoreAMin) : null,
        shoreAMax: config.shoreAMax !== null ? Number(config.shoreAMax) : null,
        densityNominal: config.densityNominal !== null ? Number(config.densityNominal) : null,
        densityMin: config.densityMin !== null ? Number(config.densityMin) : null,
        densityMax: config.densityMax !== null ? Number(config.densityMax) : null,
        reboundNominal: config.reboundNominal !== null ? Number(config.reboundNominal) : null,
        reboundMin: config.reboundMin !== null ? Number(config.reboundMin) : null,
        reboundMax: config.reboundMax !== null ? Number(config.reboundMax) : null,
        tearStrengthNominal:
          config.tearStrengthNominal !== null ? Number(config.tearStrengthNominal) : null,
        tearStrengthMin: config.tearStrengthMin !== null ? Number(config.tearStrengthMin) : null,
        tearStrengthMax: config.tearStrengthMax !== null ? Number(config.tearStrengthMax) : null,
        tensileNominal: config.tensileNominal !== null ? Number(config.tensileNominal) : null,
        tensileMin: config.tensileMin !== null ? Number(config.tensileMin) : null,
        tensileMax: config.tensileMax !== null ? Number(config.tensileMax) : null,
        elongationNominal:
          config.elongationNominal !== null ? Number(config.elongationNominal) : null,
        elongationMin: config.elongationMin !== null ? Number(config.elongationMin) : null,
        elongationMax: config.elongationMax !== null ? Number(config.elongationMax) : null,
      };
    }

    return {
      id: null,
      compoundCode,
      compoundDescription: null,
      windowSize: DEFAULT_WINDOW_SIZE,
      ...DEFAULT_THRESHOLDS,
      shoreANominal: null,
      shoreAMin: null,
      shoreAMax: null,
      densityNominal: null,
      densityMin: null,
      densityMax: null,
      reboundNominal: null,
      reboundMin: null,
      reboundMax: null,
      tearStrengthNominal: null,
      tearStrengthMin: null,
      tearStrengthMax: null,
      tensileNominal: null,
      tensileMin: null,
      tensileMax: null,
      elongationNominal: null,
      elongationMin: null,
      elongationMax: null,
    };
  }

  async allConfigs(): Promise<QualityConfigDto[]> {
    const compoundCodes = await this.distinctCompoundCodes();
    return Promise.all(compoundCodes.map((code) => this.configForCompound(code)));
  }

  async updateConfig(
    compoundCode: string,
    dto: UpdateQualityConfigDto,
    updatedBy: string,
  ): Promise<QualityConfigDto> {
    let config = await this.configRepository.findOne({ where: { compoundCode } });

    if (!config) {
      config = this.configRepository.create({
        compoundCode,
        windowSize: dto.windowSize ?? DEFAULT_WINDOW_SIZE,
        shoreADriftThreshold: dto.shoreADriftThreshold ?? null,
        specificGravityDriftThreshold: dto.specificGravityDriftThreshold ?? null,
        reboundDriftThreshold: dto.reboundDriftThreshold ?? null,
        tearStrengthDropPercent: dto.tearStrengthDropPercent ?? null,
        tensileStrengthDropPercent: dto.tensileStrengthDropPercent ?? null,
        elongationDropPercent: dto.elongationDropPercent ?? null,
        tc90CvThreshold: dto.tc90CvThreshold ?? null,
        compoundDescription: dto.compoundDescription ?? null,
        shoreANominal: dto.shoreANominal ?? null,
        shoreAMin: dto.shoreAMin ?? null,
        shoreAMax: dto.shoreAMax ?? null,
        densityNominal: dto.densityNominal ?? null,
        densityMin: dto.densityMin ?? null,
        densityMax: dto.densityMax ?? null,
        reboundNominal: dto.reboundNominal ?? null,
        reboundMin: dto.reboundMin ?? null,
        reboundMax: dto.reboundMax ?? null,
        tearStrengthNominal: dto.tearStrengthNominal ?? null,
        tearStrengthMin: dto.tearStrengthMin ?? null,
        tearStrengthMax: dto.tearStrengthMax ?? null,
        tensileNominal: dto.tensileNominal ?? null,
        tensileMin: dto.tensileMin ?? null,
        tensileMax: dto.tensileMax ?? null,
        elongationNominal: dto.elongationNominal ?? null,
        elongationMin: dto.elongationMin ?? null,
        elongationMax: dto.elongationMax ?? null,
        updatedBy,
      });
    } else {
      if (dto.windowSize !== undefined) config.windowSize = dto.windowSize;
      if (dto.shoreADriftThreshold !== undefined) {
        config.shoreADriftThreshold = dto.shoreADriftThreshold;
      }
      if (dto.specificGravityDriftThreshold !== undefined) {
        config.specificGravityDriftThreshold = dto.specificGravityDriftThreshold;
      }
      if (dto.reboundDriftThreshold !== undefined) {
        config.reboundDriftThreshold = dto.reboundDriftThreshold;
      }
      if (dto.tearStrengthDropPercent !== undefined) {
        config.tearStrengthDropPercent = dto.tearStrengthDropPercent;
      }
      if (dto.tensileStrengthDropPercent !== undefined) {
        config.tensileStrengthDropPercent = dto.tensileStrengthDropPercent;
      }
      if (dto.elongationDropPercent !== undefined) {
        config.elongationDropPercent = dto.elongationDropPercent;
      }
      if (dto.tc90CvThreshold !== undefined) {
        config.tc90CvThreshold = dto.tc90CvThreshold;
      }
      if (dto.compoundDescription !== undefined) {
        config.compoundDescription = dto.compoundDescription;
      }
      if (dto.shoreANominal !== undefined) config.shoreANominal = dto.shoreANominal;
      if (dto.shoreAMin !== undefined) config.shoreAMin = dto.shoreAMin;
      if (dto.shoreAMax !== undefined) config.shoreAMax = dto.shoreAMax;
      if (dto.densityNominal !== undefined) config.densityNominal = dto.densityNominal;
      if (dto.densityMin !== undefined) config.densityMin = dto.densityMin;
      if (dto.densityMax !== undefined) config.densityMax = dto.densityMax;
      if (dto.reboundNominal !== undefined) config.reboundNominal = dto.reboundNominal;
      if (dto.reboundMin !== undefined) config.reboundMin = dto.reboundMin;
      if (dto.reboundMax !== undefined) config.reboundMax = dto.reboundMax;
      if (dto.tearStrengthNominal !== undefined) config.tearStrengthNominal = dto.tearStrengthNominal;
      if (dto.tearStrengthMin !== undefined) config.tearStrengthMin = dto.tearStrengthMin;
      if (dto.tearStrengthMax !== undefined) config.tearStrengthMax = dto.tearStrengthMax;
      if (dto.tensileNominal !== undefined) config.tensileNominal = dto.tensileNominal;
      if (dto.tensileMin !== undefined) config.tensileMin = dto.tensileMin;
      if (dto.tensileMax !== undefined) config.tensileMax = dto.tensileMax;
      if (dto.elongationNominal !== undefined) config.elongationNominal = dto.elongationNominal;
      if (dto.elongationMin !== undefined) config.elongationMin = dto.elongationMin;
      if (dto.elongationMax !== undefined) config.elongationMax = dto.elongationMax;
      config.updatedBy = updatedBy;
    }

    await this.configRepository.save(config);
    return this.configForCompound(compoundCode);
  }

  private async distinctCompoundCodes(): Promise<string[]> {
    const cocs = await this.cocRepository
      .createQueryBuilder("coc")
      .select("DISTINCT coc.compound_code", "compoundCode")
      .where("coc.coc_type = :type", { type: SupplierCocType.COMPOUNDER })
      .andWhere("coc.compound_code IS NOT NULL")
      .getRawMany<{ compoundCode: string }>();

    return cocs.map((c) => c.compoundCode).filter((code) => code && code.trim() !== "");
  }

  private async completeBatchesForCompound(compoundCode: string): Promise<RubberCompoundBatch[]> {
    return this.batchRepository
      .createQueryBuilder("batch")
      .innerJoin("batch.supplierCoc", "coc")
      .where("coc.compound_code = :compoundCode", { compoundCode })
      .andWhere("coc.coc_type = :type", { type: SupplierCocType.COMPOUNDER })
      .andWhere("batch.shore_a_hardness IS NOT NULL")
      .andWhere("batch.specific_gravity IS NOT NULL")
      .andWhere("batch.tensile_strength_mpa IS NOT NULL")
      .andWhere("batch.elongation_percent IS NOT NULL")
      .andWhere("batch.tear_strength_kn_m IS NOT NULL")
      .andWhere("batch.rheometer_tc90 IS NOT NULL")
      .orderBy("batch.created_at", "DESC")
      .getMany();
  }

  private async activeAlertCountForCompound(compoundCode: string): Promise<number> {
    return this.alertRepository.count({
      where: { compoundCode, acknowledgedAt: IsNull() },
    });
  }

  private calculateMetricStats(values: (number | null)[]): MetricStats | null {
    const validValues = values.filter((v): v is number => v !== null).map((v) => Number(v));

    if (validValues.length < 2) {
      return null;
    }

    const sum = validValues.reduce((a, b) => a + b, 0);
    const mean = sum / validValues.length;
    const squaredDiffs = validValues.map((v) => (v - mean) ** 2);
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / validValues.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean !== 0 ? (stdDev / mean) * 100 : 0;
    const min = Math.min(...validValues);
    const max = Math.max(...validValues);
    const latestValue = validValues[0];

    const trend = this.calculateTrend(validValues.slice(0, 5));

    return {
      mean: Math.round(mean * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      cv: Math.round(cv * 100) / 100,
      trend,
      latestValue: Math.round(latestValue * 100) / 100,
      sampleCount: validValues.length,
    };
  }

  private calculateTrend(values: number[]): TrendDirection {
    if (values.length < 3) return "stable";

    const n = values.length;
    const indices = Array.from({ length: n }, (_, i) => i);

    const sumX = indices.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = indices.reduce((acc, x, i) => acc + x * values[i], 0);
    const sumX2 = indices.reduce((acc, x) => acc + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    const meanY = sumY / n;
    const threshold = meanY * 0.02;

    if (Math.abs(slope) < threshold) {
      return "stable";
    } else if (slope > 0) {
      return "up";
    } else {
      return "down";
    }
  }

  private determineCompoundStatus(alertCount: number): QualityStatus {
    if (alertCount === 0) return "normal";
    if (alertCount <= 2) return "warning";
    return "critical";
  }

  private checkDriftMetric(
    metricLabel: string,
    metricName: string,
    currentValue: number | null,
    historicalValues: (number | null)[],
    threshold: number,
    batch: RubberCompoundBatch,
    compoundCode: string,
    alerts: Partial<RubberQualityAlert>[],
  ): void {
    if (currentValue === null) return;

    const validHistorical = historicalValues
      .filter((v): v is number => v !== null)
      .map((v) => Number(v));
    if (validHistorical.length < 2) return;

    const mean = validHistorical.reduce((a, b) => a + b, 0) / validHistorical.length;
    const drift = Math.abs(Number(currentValue) - mean);

    if (drift > threshold) {
      const direction = Number(currentValue) > mean ? "above" : "below";
      const severity =
        drift > threshold * 1.5 ? QualityAlertSeverity.CRITICAL : QualityAlertSeverity.WARNING;

      alerts.push({
        compoundCode,
        alertType: QualityAlertType.DRIFT,
        severity,
        metricName,
        title: `${metricLabel} drift detected`,
        message: `${metricLabel} value of ${Number(currentValue).toFixed(2)} is ${drift.toFixed(2)} ${direction} the historical mean of ${mean.toFixed(2)}. Threshold: ${threshold}`,
        metricValue: Number(currentValue),
        thresholdValue: threshold,
        meanValue: mean,
        batchNumber: batch.batchNumber,
        batchId: batch.id,
      });
    }
  }

  private checkDropMetric(
    metricLabel: string,
    metricName: string,
    currentValue: number | null,
    historicalValues: (number | null)[],
    dropPercentThreshold: number,
    batch: RubberCompoundBatch,
    compoundCode: string,
    alerts: Partial<RubberQualityAlert>[],
  ): void {
    if (currentValue === null) return;

    const validHistorical = historicalValues
      .filter((v): v is number => v !== null)
      .map((v) => Number(v));
    if (validHistorical.length < 2) return;

    const mean = validHistorical.reduce((a, b) => a + b, 0) / validHistorical.length;
    const dropPercent = ((mean - Number(currentValue)) / mean) * 100;

    if (dropPercent > dropPercentThreshold) {
      const severity =
        dropPercent > dropPercentThreshold * 1.5
          ? QualityAlertSeverity.CRITICAL
          : QualityAlertSeverity.WARNING;

      alerts.push({
        compoundCode,
        alertType: QualityAlertType.DROP,
        severity,
        metricName,
        title: `${metricLabel} significant drop`,
        message: `${metricLabel} value of ${Number(currentValue).toFixed(2)} represents a ${dropPercent.toFixed(1)}% drop from the historical mean of ${mean.toFixed(2)}. Threshold: ${dropPercentThreshold}%`,
        metricValue: Number(currentValue),
        thresholdValue: dropPercentThreshold,
        meanValue: mean,
        batchNumber: batch.batchNumber,
        batchId: batch.id,
      });
    }
  }

  private checkCvMetric(
    metricLabel: string,
    metricName: string,
    recentValues: (number | null)[],
    cvThreshold: number,
    batch: RubberCompoundBatch,
    compoundCode: string,
    alerts: Partial<RubberQualityAlert>[],
  ): void {
    const validValues = recentValues.filter((v): v is number => v !== null).map((v) => Number(v));
    if (validValues.length < 3) return;

    const mean = validValues.reduce((a, b) => a + b, 0) / validValues.length;
    const variance = validValues.reduce((acc, v) => acc + (v - mean) ** 2, 0) / validValues.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean !== 0 ? (stdDev / mean) * 100 : 0;

    if (cv > cvThreshold) {
      const severity =
        cv > cvThreshold * 1.5 ? QualityAlertSeverity.CRITICAL : QualityAlertSeverity.WARNING;

      alerts.push({
        compoundCode,
        alertType: QualityAlertType.CV_HIGH,
        severity,
        metricName,
        title: `${metricLabel} high variability`,
        message: `${metricLabel} coefficient of variation is ${cv.toFixed(1)}%, exceeding the threshold of ${cvThreshold}%. This indicates inconsistent quality across recent batches.`,
        metricValue: cv,
        thresholdValue: cvThreshold,
        meanValue: mean,
        batchNumber: batch.batchNumber,
        batchId: batch.id,
      });
    }
  }

  private mapAlertToDto(alert: RubberQualityAlert): QualityAlertDto {
    return {
      id: alert.id,
      compoundCode: alert.compoundCode,
      alertType: alert.alertType,
      alertTypeLabel: ALERT_TYPE_LABELS[alert.alertType],
      severity: alert.severity,
      severityLabel: SEVERITY_LABELS[alert.severity],
      metricName: alert.metricName,
      title: alert.title,
      message: alert.message,
      metricValue: Number(alert.metricValue),
      thresholdValue: Number(alert.thresholdValue),
      meanValue: Number(alert.meanValue),
      batchNumber: alert.batchNumber,
      batchId: alert.batchId,
      acknowledgedAt: alert.acknowledgedAt ? alert.acknowledgedAt.toISOString() : null,
      acknowledgedBy: alert.acknowledgedBy,
      createdAt: alert.createdAt.toISOString(),
    };
  }

  private async sendAlertEmails(compoundCode: string, alerts: QualityAlertDto[]): Promise<void> {
    const supportEmail = this.configService.get<string>("SUPPORT_EMAIL") || "info@annix.co.za";
    const frontendUrl = this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
    const qualityLink = `${frontendUrl}/au-rubber/portal/quality-tracking/${encodeURIComponent(compoundCode)}`;

    const criticalAlerts = alerts.filter((a) => a.severity === QualityAlertSeverity.CRITICAL);
    const warningAlerts = alerts.filter((a) => a.severity === QualityAlertSeverity.WARNING);

    const alertsHtml = alerts
      .map(
        (alert) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; background-color: ${alert.severity === "CRITICAL" ? "#fee2e2" : "#fef3c7"}; color: ${alert.severity === "CRITICAL" ? "#991b1b" : "#92400e"};">
            ${alert.severityLabel}
          </span>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 500;">${alert.title}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${alert.batchNumber}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${alert.metricValue.toFixed(2)}</td>
      </tr>
    `,
      )
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Quality Alert - ${compoundCode}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 650px; margin: 0 auto; padding: 20px;">
          <div style="background-color: ${criticalAlerts.length > 0 ? "#fee2e2" : "#fef3c7"}; border-left: 4px solid ${criticalAlerts.length > 0 ? "#dc2626" : "#f59e0b"}; padding: 15px; margin-bottom: 20px;">
            <h1 style="color: ${criticalAlerts.length > 0 ? "#991b1b" : "#92400e"}; margin: 0 0 10px 0; font-size: 20px;">
              Compound Quality Alert
            </h1>
            <p style="margin: 0; color: ${criticalAlerts.length > 0 ? "#991b1b" : "#92400e"};">
              ${alerts.length} quality ${alerts.length === 1 ? "issue" : "issues"} detected for compound ${compoundCode}
            </p>
          </div>

          <div style="background-color: #f3f4f6; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <p style="margin: 0;">
              <strong>Compound Code:</strong> ${compoundCode}<br/>
              <strong>Critical Alerts:</strong> ${criticalAlerts.length}<br/>
              <strong>Warning Alerts:</strong> ${warningAlerts.length}
            </p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: white; border: 1px solid #e5e7eb; border-radius: 8px;">
            <thead>
              <tr style="background-color: #f9fafb;">
                <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Severity</th>
                <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Issue</th>
                <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Batch</th>
                <th style="padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Value</th>
              </tr>
            </thead>
            <tbody>
              ${alertsHtml}
            </tbody>
          </table>

          <p style="margin: 30px 0;">
            <a href="${qualityLink}"
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Quality Details
            </a>
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            This is an automated quality alert from the AU Rubber Portal. Review and acknowledge alerts in the Quality Tracking section.
          </p>
        </div>
      </body>
      </html>
    `;

    const text = `
Compound Quality Alert
======================

${alerts.length} quality issue(s) detected for compound ${compoundCode}

Critical Alerts: ${criticalAlerts.length}
Warning Alerts: ${warningAlerts.length}

${alerts.map((a) => `- [${a.severityLabel}] ${a.title} (Batch: ${a.batchNumber}, Value: ${a.metricValue.toFixed(2)})`).join("\n")}

View details: ${qualityLink}
    `;

    try {
      await this.emailService.sendEmail({
        to: supportEmail,
        subject: `Quality Alert: ${compoundCode} - ${criticalAlerts.length > 0 ? "CRITICAL" : "Warning"}`,
        html,
        text,
      });
      this.logger.log(`Quality alert email sent for compound ${compoundCode}`);
    } catch (error) {
      this.logger.error(`Failed to send quality alert email for ${compoundCode}:`, error);
    }
  }
}
