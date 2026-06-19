export enum QualityAlertType {
  DRIFT = "DRIFT",
  DROP = "DROP",
  CV_HIGH = "CV_HIGH",
}

export enum QualityAlertSeverity {
  WARNING = "WARNING",
  CRITICAL = "CRITICAL",
}

export class RubberQualityAlert {
  id: number;

  compoundCode: string;

  alertType: QualityAlertType;

  severity: QualityAlertSeverity;

  metricName: string;

  title: string;

  message: string;

  metricValue: number;

  thresholdValue: number;

  meanValue: number;

  batchNumber: string;

  batchId: number;

  acknowledgedAt: Date | null;

  acknowledgedBy: string | null;

  createdAt: Date;

  updatedAt: Date;
}
