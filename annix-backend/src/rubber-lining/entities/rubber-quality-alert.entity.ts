import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export enum QualityAlertType {
  DRIFT = "DRIFT",
  DROP = "DROP",
  CV_HIGH = "CV_HIGH",
}

export enum QualityAlertSeverity {
  WARNING = "WARNING",
  CRITICAL = "CRITICAL",
}

@Entity("rubber_quality_alerts")
export class RubberQualityAlert {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "compound_code", type: "varchar", length: 100 })
  compoundCode: string;

  @Column({
    name: "alert_type",
    type: "enum",
    enum: QualityAlertType,
  })
  alertType: QualityAlertType;

  @Column({
    name: "severity",
    type: "enum",
    enum: QualityAlertSeverity,
  })
  severity: QualityAlertSeverity;

  @Column({ name: "metric_name", type: "varchar", length: 50 })
  metricName: string;

  @Column({ name: "title", type: "varchar", length: 200 })
  title: string;

  @Column({ name: "message", type: "text" })
  message: string;

  @Column({
    name: "metric_value",
    type: "decimal",
    precision: 10,
    scale: 4,
  })
  metricValue: number;

  @Column({
    name: "threshold_value",
    type: "decimal",
    precision: 10,
    scale: 4,
  })
  thresholdValue: number;

  @Column({
    name: "mean_value",
    type: "decimal",
    precision: 10,
    scale: 4,
  })
  meanValue: number;

  @Column({ name: "batch_number", type: "varchar", length: 100 })
  batchNumber: string;

  @Column({ name: "batch_id", type: "int" })
  batchId: number;

  @Column({ name: "acknowledged_at", type: "timestamp", nullable: true })
  acknowledgedAt: Date | null;

  @Column({ name: "acknowledged_by", type: "varchar", length: 100, nullable: true })
  acknowledgedBy: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
