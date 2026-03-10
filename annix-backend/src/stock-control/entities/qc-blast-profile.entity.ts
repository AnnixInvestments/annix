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

  @ManyToOne(() => JobCard, { onDelete: "CASCADE" })
  @JoinColumn({ name: "job_card_id" })
  jobCard: JobCard;

  @Column({ name: "job_card_id" })
  jobCardId: number;

  @Column({ name: "spec_microns", type: "numeric", precision: 8, scale: 2 })
  specMicrons: number;

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

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
