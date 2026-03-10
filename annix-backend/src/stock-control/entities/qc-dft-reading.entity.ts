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

export enum DftCoatType {
  PRIMER = "primer",
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

  @ManyToOne(() => JobCard, { onDelete: "CASCADE" })
  @JoinColumn({ name: "job_card_id" })
  jobCard: JobCard;

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

  @Column({ name: "reading_date", type: "date" })
  readingDate: string;

  @Column({ name: "captured_by_name", type: "varchar", length: 255 })
  capturedByName: string;

  @Column({ name: "captured_by_id", type: "integer", nullable: true })
  capturedById: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
