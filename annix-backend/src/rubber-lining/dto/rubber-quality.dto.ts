import { IsNumber, IsOptional, IsString } from "class-validator";
import { QualityAlertSeverity, QualityAlertType } from "../entities/rubber-quality-alert.entity";

export type TrendDirection = "up" | "down" | "stable";

export interface MetricStats {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  cv: number;
  trend: TrendDirection;
  latestValue: number;
  sampleCount: number;
}

export type QualityStatus = "normal" | "warning" | "critical";

export class CompoundQualitySummaryDto {
  compoundCode: string;
  batchCount: number;
  lastBatchDate: string | null;
  shoreA: MetricStats | null;
  tc90: MetricStats | null;
  tensile: MetricStats | null;
  elongation: MetricStats | null;
  tearStrength: MetricStats | null;
  specificGravity: MetricStats | null;
  rebound: MetricStats | null;
  status: QualityStatus;
  activeAlertCount: number;
}

export interface BatchMetricData {
  batchId: number;
  batchNumber: string;
  createdAt: string;
  shoreA: number | null;
  specificGravity: number | null;
  rebound: number | null;
  tearStrength: number | null;
  tensile: number | null;
  elongation: number | null;
  tc90: number | null;
}

export class CompoundQualityDetailDto {
  compoundCode: string;
  batchCount: number;
  stats: {
    shoreA: MetricStats | null;
    specificGravity: MetricStats | null;
    rebound: MetricStats | null;
    tearStrength: MetricStats | null;
    tensile: MetricStats | null;
    elongation: MetricStats | null;
    tc90: MetricStats | null;
  };
  batches: BatchMetricData[];
  config: QualityConfigDto;
  alerts: QualityAlertDto[];
}

export class QualityAlertDto {
  id: number;
  compoundCode: string;
  alertType: QualityAlertType;
  alertTypeLabel: string;
  severity: QualityAlertSeverity;
  severityLabel: string;
  metricName: string;
  title: string;
  message: string;
  metricValue: number;
  thresholdValue: number;
  meanValue: number;
  batchNumber: string;
  batchId: number;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  createdAt: string;
}

export class QualityConfigDto {
  id: number | null;
  compoundCode: string;
  windowSize: number;
  shoreADriftThreshold: number;
  specificGravityDriftThreshold: number;
  reboundDriftThreshold: number;
  tearStrengthDropPercent: number;
  tensileStrengthDropPercent: number;
  elongationDropPercent: number;
  tc90CvThreshold: number;
}

export class UpdateQualityConfigDto {
  @IsOptional()
  @IsNumber()
  windowSize?: number;

  @IsOptional()
  @IsNumber()
  shoreADriftThreshold?: number | null;

  @IsOptional()
  @IsNumber()
  specificGravityDriftThreshold?: number | null;

  @IsOptional()
  @IsNumber()
  reboundDriftThreshold?: number | null;

  @IsOptional()
  @IsNumber()
  tearStrengthDropPercent?: number | null;

  @IsOptional()
  @IsNumber()
  tensileStrengthDropPercent?: number | null;

  @IsOptional()
  @IsNumber()
  elongationDropPercent?: number | null;

  @IsOptional()
  @IsNumber()
  tc90CvThreshold?: number | null;
}

export class AcknowledgeAlertDto {
  @IsString()
  acknowledgedBy: string;
}

export class QualityCheckResult {
  compoundCode: string;
  alertsCreated: number;
  alerts: QualityAlertDto[];
}
