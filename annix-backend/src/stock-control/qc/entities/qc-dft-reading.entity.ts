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

export enum DftCoatType {
  PRIMER = "primer",
  INTERMEDIATE = "intermediate",
  FINAL = "final",
}

export interface DftReadingEntry {
  itemNumber: number;
  reading: number;
}

@Entity("qc_dft_readings")
export class QcDftReading {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "job_card_id" })
  jobCardId: number;

  @Column({ name: "coat_type", type: "varchar", length: 20 })
  coatType: DftCoatType;

  @Column({ name: "paint_product", type: "varchar", length: 255 })
  paintProduct: string;

  @Column({ name: "batch_number", type: "varchar", length: 255, nullable: true })
  batchNumber: string | null;

  @Column({ name: "spec_min_microns", type: "numeric", precision: 8, scale: 2 })
  specMinMicrons: number;

  @Column({ name: "spec_max_microns", type: "numeric", precision: 8, scale: 2 })
  specMaxMicrons: number;

  @Column({ name: "readings", type: "jsonb" })
  readings: DftReadingEntry[];

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
