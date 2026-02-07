import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("sla_config")
export class SlaConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "response_time_hours", default: 24 })
  responseTimeHours: number;

  @Column({ name: "excellent_threshold_hours", default: 4 })
  excellentThresholdHours: number;

  @Column({ name: "good_threshold_hours", default: 12 })
  goodThresholdHours: number;

  @Column({ name: "acceptable_threshold_hours", default: 24 })
  acceptableThresholdHours: number;

  @Column({ name: "poor_threshold_hours", default: 48 })
  poorThresholdHours: number;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
