import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { StockControlCompany } from "../../entities/stock-control-company.entity";

export enum PullTestResult {
  PASS = "pass",
  FAIL = "fail",
}

export interface PullTestSolution {
  product: string;
  batchNumber: string | null;
  result: PullTestResult;
}

export interface ForceGaugeInfo {
  make: string;
  certificateNumber: string | null;
  expiryDate: string | null;
}

export interface PullTestAreaReading {
  area: string;
  result: PullTestResult;
  reading: string;
}

@Entity("qc_pull_tests")
export class QcPullTest {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "job_card_id" })
  jobCardId: number;

  @Column({ name: "item_description", type: "varchar", length: 255, nullable: true })
  itemDescription: string | null;

  @Column({ name: "quantity", type: "integer", nullable: true })
  quantity: number | null;

  @Column({ name: "solutions", type: "jsonb" })
  solutions: PullTestSolution[];

  @Column({ name: "force_gauge", type: "jsonb" })
  forceGauge: ForceGaugeInfo;

  @Column({ name: "area_readings", type: "jsonb" })
  areaReadings: PullTestAreaReading[];

  @Column({ name: "comments", type: "text", nullable: true })
  comments: string | null;

  @Column({ name: "reading_date", type: "date" })
  readingDate: string;

  @Column({ name: "final_approval_name", type: "varchar", length: 255, nullable: true })
  finalApprovalName: string | null;

  @Column({ name: "final_approval_date", type: "date", nullable: true })
  finalApprovalDate: string | null;

  @Column({ name: "captured_by_name", type: "varchar", length: 255 })
  capturedByName: string;

  @Column({ name: "captured_by_id", type: "integer", nullable: true })
  capturedById: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
