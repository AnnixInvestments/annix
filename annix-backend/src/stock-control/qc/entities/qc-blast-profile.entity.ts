import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Company } from "../../../platform/entities/company.entity";
import { StockControlCompany } from "../../entities/stock-control-company.entity";

export interface BlastProfileReadingEntry {
  itemNumber: number;
  reading: number;
}

@Entity("qc_blast_profiles")
export class QcBlastProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "job_card_id" })
  jobCardId: number;

  @Column({ name: "profile_type", type: "varchar", length: 50, default: "'blast'" })
  profileType: string;

  @Column({ name: "coat_label", type: "varchar", length: 255, nullable: true })
  coatLabel: string | null;

  @Column({ name: "spec_microns", type: "numeric", precision: 8, scale: 2 })
  specMicrons: number;

  @Column({ name: "abrasive_batch_number", type: "varchar", length: 255, nullable: true })
  abrasiveBatchNumber: string | null;

  @Column({ name: "readings", type: "jsonb" })
  readings: BlastProfileReadingEntry[];

  @Column({ name: "average_microns", type: "numeric", precision: 8, scale: 2, nullable: true })
  averageMicrons: number | null;

  @Column({ name: "temperature", type: "numeric", precision: 5, scale: 1, nullable: true })
  temperature: number | null;

  @Column({ name: "humidity", type: "numeric", precision: 5, scale: 1, nullable: true })
  humidity: number | null;

  @Column({ name: "reading_date", type: "date" })
  readingDate: string;

  @Column({ name: "captured_by_name", type: "varchar", length: 255 })
  capturedByName: string;

  @Column({ name: "captured_by_id", type: "integer", nullable: true })
  capturedById: number | null;

  @ManyToOne(() => Company, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "unified_company_id" })
  unifiedCompany?: Company | null;

  @Column({ name: "unified_company_id", nullable: true })
  unifiedCompanyId?: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
