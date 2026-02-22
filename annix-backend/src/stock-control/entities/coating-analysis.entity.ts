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

export enum CoatingAnalysisStatus {
  PENDING = "pending",
  ANALYSED = "analysed",
  FAILED = "failed",
}

export interface CoatDetail {
  product: string;
  genericType: string | null;
  area: "external" | "internal";
  minDftUm: number;
  maxDftUm: number;
  solidsByVolumePercent: number;
  coverageM2PerLiter: number;
  litersRequired: number;
}

export interface StockAssessmentItem {
  product: string;
  stockItemId: number | null;
  stockItemName: string | null;
  currentStock: number;
  required: number;
  unit: string;
  sufficient: boolean;
}

@Entity("job_card_coating_analyses")
export class JobCardCoatingAnalysis {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "job_card_id" })
  jobCardId: number;

  @ManyToOne(() => JobCard, { onDelete: "CASCADE" })
  @JoinColumn({ name: "job_card_id" })
  jobCard: JobCard;

  @Column({ name: "application_type", type: "varchar", length: 50, nullable: true })
  applicationType: string | null;

  @Column({ name: "surface_prep", type: "varchar", length: 100, nullable: true })
  surfacePrep: string | null;

  @Column({ name: "ext_m2", type: "numeric", precision: 12, scale: 4, default: 0 })
  extM2: number;

  @Column({ name: "int_m2", type: "numeric", precision: 12, scale: 4, default: 0 })
  intM2: number;

  @Column({ type: "jsonb", default: [] })
  coats: CoatDetail[];

  @Column({ name: "stock_assessment", type: "jsonb", default: [] })
  stockAssessment: StockAssessmentItem[];

  @Column({ name: "raw_notes", type: "text", nullable: true })
  rawNotes: string | null;

  @Column({ type: "varchar", length: 50, default: CoatingAnalysisStatus.PENDING })
  status: CoatingAnalysisStatus;

  @Column({ type: "text", nullable: true })
  error: string | null;

  @Column({ name: "analysed_at", type: "timestamp", nullable: true })
  analysedAt: Date | null;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
