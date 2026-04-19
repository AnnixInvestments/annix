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

export enum DustDebrisResult {
  PASS = "pass",
  FAIL = "fail",
}

export interface DustDebrisTestEntry {
  testNumber: number;
  quantity: number | null;
  sizeClass: number | null;
  location: string | null;
  coatingType: string | null;
  itemNumber: string | null;
  result: DustDebrisResult;
  testedAt: string | null;
}

export interface DustDebrisAcceptanceCriteria {
  maxQuantity: number;
  maxSizeClass: number;
}

export interface DustDebrisEnvironmentalConditions {
  temperatureC: number | null;
  humidityPercent: number | null;
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

  @Column({ name: "job_card_id" })
  jobCardId: number;

  @Column({ name: "tests", type: "jsonb" })
  tests: DustDebrisTestEntry[];

  @Column({ name: "surface_prep_method", type: "varchar", length: 255, nullable: true })
  surfacePrepMethod: string | null;

  @Column({ name: "acceptance_criteria", type: "jsonb", nullable: true })
  acceptanceCriteria: DustDebrisAcceptanceCriteria | null;

  @Column({ name: "environmental_conditions", type: "jsonb", nullable: true })
  environmentalConditions: DustDebrisEnvironmentalConditions | null;

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
