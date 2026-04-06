import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";
import { StockControlCompany } from "../../entities/stock-control-company.entity";

@Entity("qc_environmental_records")
@Unique("UQ_env_record_company_job_date", ["companyId", "jobCardId", "recordDate"])
export class QcEnvironmentalRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "job_card_id" })
  jobCardId: number;

  @Column({ name: "record_date", type: "date" })
  recordDate: string;

  @Column({ name: "humidity", type: "numeric", precision: 5, scale: 1 })
  humidity: number;

  @Column({ name: "temperature_c", type: "numeric", precision: 5, scale: 1 })
  temperatureC: number;

  @Column({ name: "dew_point_c", type: "numeric", precision: 5, scale: 1, nullable: true })
  dewPointC: number | null;

  @Column({ name: "notes", type: "text", nullable: true })
  notes: string | null;

  @Column({ name: "recorded_by_name", type: "varchar", length: 255 })
  recordedByName: string;

  @Column({ name: "recorded_by_id", type: "integer", nullable: true })
  recordedById: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
