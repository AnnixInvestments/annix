import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export enum MonthlyAccountType {
  PAYABLE = "PAYABLE",
  RECEIVABLE = "RECEIVABLE",
}

export enum MonthlyAccountStatus {
  DRAFT = "DRAFT",
  GENERATED = "GENERATED",
  PENDING_SIGNOFF = "PENDING_SIGNOFF",
  SIGNED_OFF = "SIGNED_OFF",
}

@Entity("rubber_monthly_accounts")
export class RubberMonthlyAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "firebase_uid", type: "varchar", length: 100, unique: true })
  firebaseUid: string;

  @Column({ name: "period_year", type: "int" })
  periodYear: number;

  @Column({ name: "period_month", type: "int" })
  periodMonth: number;

  @Column({
    name: "account_type",
    type: "varchar",
    length: 20,
  })
  accountType: MonthlyAccountType;

  @Column({
    name: "status",
    type: "varchar",
    length: 20,
    default: MonthlyAccountStatus.DRAFT,
  })
  status: MonthlyAccountStatus;

  @Column({ name: "pdf_path", type: "varchar", length: 500, nullable: true })
  pdfPath: string | null;

  @Column({ name: "generated_at", type: "timestamp", nullable: true })
  generatedAt: Date | null;

  @Column({ name: "generated_by", type: "varchar", length: 100, nullable: true })
  generatedBy: string | null;

  @Column({ name: "snapshot_data", type: "jsonb", nullable: true })
  snapshotData: Record<string, unknown> | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
