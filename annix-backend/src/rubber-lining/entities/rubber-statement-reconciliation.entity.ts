import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { RubberCompany } from "./rubber-company.entity";

export enum ReconciliationStatus {
  PENDING = "PENDING",
  EXTRACTING = "EXTRACTING",
  MATCHED = "MATCHED",
  DISCREPANCY = "DISCREPANCY",
  RESOLVED = "RESOLVED",
}

export interface ExtractedStatementLineItem {
  invoiceNumber: string;
  invoiceDate: string | null;
  amount: number;
  isCredit: boolean;
  balance: number | null;
}

export interface ReconciliationMatchSummary {
  matched: number;
  unmatched: number;
  discrepancies: number;
}

@Entity("rubber_statement_reconciliations")
export class RubberStatementReconciliation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "firebase_uid", type: "varchar", length: 100, unique: true })
  firebaseUid: string;

  @Column({ name: "company_id", type: "int" })
  companyId: number;

  @ManyToOne(() => RubberCompany)
  @JoinColumn({ name: "company_id" })
  company: RubberCompany;

  @Column({ name: "period_year", type: "int" })
  periodYear: number;

  @Column({ name: "period_month", type: "int" })
  periodMonth: number;

  @Column({ name: "statement_path", type: "varchar", length: 500 })
  statementPath: string;

  @Column({ name: "original_filename", type: "varchar", length: 300 })
  originalFilename: string;

  @Column({ name: "extracted_data", type: "jsonb", nullable: true })
  extractedData: ExtractedStatementLineItem[] | null;

  @Column({
    name: "status",
    type: "varchar",
    length: 20,
    default: ReconciliationStatus.PENDING,
  })
  status: ReconciliationStatus;

  @Column({ name: "match_summary", type: "jsonb", nullable: true })
  matchSummary: ReconciliationMatchSummary | null;

  @Column({ name: "resolved_by", type: "varchar", length: 100, nullable: true })
  resolvedBy: string | null;

  @Column({ name: "resolved_at", type: "timestamp", nullable: true })
  resolvedAt: Date | null;

  @Column({ name: "notes", type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
