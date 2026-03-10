import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { JobCard } from "../../entities/job-card.entity";
import { StockControlCompany } from "../../entities/stock-control-company.entity";

export enum DustDebrisResult {
  PASS = "pass",
  FAIL = "fail",
}

export interface DustDebrisTestEntry {
  testNumber: number;
  quantity: number | null;
  coatingType: string | null;
  itemNumber: string | null;
  result: DustDebrisResult;
  testedAt: string | null;
}

@Entity("qc_dust_debris_tests")
export class QcDustDebrisTest {
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

  @Column({ name: "tests", type: "jsonb" })
  tests: DustDebrisTestEntry[];

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
