import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { JobCard } from "./job-card.entity";
import { StockControlCompany } from "./stock-control-company.entity";

export enum QcCheckResult {
  PASS = "pass",
  FAIL = "fail",
}

export interface BlastingCheck {
  blastProfileBatchNo: string | null;
  contaminationFree: QcCheckResult | null;
  sa25Grade: QcCheckResult | null;
  inspectorName: string | null;
}

export interface SolutionUsed {
  productName: string;
  typeBatch: string | null;
  result: QcCheckResult;
  inspectorName: string | null;
}

export interface LiningCheck {
  preCureLinedAsPerDrawing: QcCheckResult | null;
  preCureInspectorName: string | null;
  visualDefectInspection: QcCheckResult | null;
  visualDefectInspectorName: string | null;
}

export interface CureCycleRecord {
  cycleNumber: number;
  timeIn: string | null;
  timeOut: string | null;
  pressureBar: number | null;
}

export interface PaintingCheck {
  coat: "primer" | "intermediate" | "final";
  batchNumber: string | null;
  dftMicrons: number | null;
  result: QcCheckResult | null;
  inspectorName: string | null;
}

export interface FinalInspection {
  linedAsPerDrawing: QcCheckResult | null;
  visualInspection: QcCheckResult | null;
  testPlate: QcCheckResult | null;
  shoreHardness: number | null;
  sparkTest: QcCheckResult | null;
  sparkTestVoltagePerMm: number | null;
  inspectorName: string | null;
}

@Entity("qc_release_certificates")
export class QcReleaseCertificate {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @ManyToOne(() => JobCard, { onDelete: "CASCADE" })
  @JoinColumn({ name: "job_card_id" })
  jobCard: JobCard;

  @Column({ name: "job_card_id" })
  jobCardId: number;

  @Column({ name: "certificate_number", type: "varchar", length: 100, nullable: true })
  certificateNumber: string | null;

  @Column({ name: "blasting_check", type: "jsonb", nullable: true })
  blastingCheck: BlastingCheck | null;

  @Column({ name: "solutions_used", type: "jsonb", default: "[]" })
  solutionsUsed: SolutionUsed[];

  @Column({ name: "lining_check", type: "jsonb", nullable: true })
  liningCheck: LiningCheck | null;

  @Column({ name: "cure_cycles", type: "jsonb", default: "[]" })
  cureCycles: CureCycleRecord[];

  @Column({ name: "painting_checks", type: "jsonb", default: "[]" })
  paintingChecks: PaintingCheck[];

  @Column({ name: "final_inspection", type: "jsonb", nullable: true })
  finalInspection: FinalInspection | null;

  @Column({ name: "comments", type: "text", nullable: true })
  comments: string | null;

  @Column({ name: "certificate_date", type: "date", nullable: true })
  certificateDate: string | null;

  @Column({ name: "final_approval_name", type: "varchar", length: 255, nullable: true })
  finalApprovalName: string | null;

  @Column({ name: "final_approval_signature_url", type: "text", nullable: true })
  finalApprovalSignatureUrl: string | null;

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
