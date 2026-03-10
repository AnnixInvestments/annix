import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { StockControlCompany } from "../../entities/stock-control-company.entity";

export interface ShoreHardnessReadings {
  column1: number[];
  column2: number[];
  column3: number[];
  column4: number[];
  itemLabels?: string[];
}

export interface ShoreHardnessAverages {
  column1: number | null;
  column2: number | null;
  column3: number | null;
  column4: number | null;
  overall: number | null;
}

@Entity("qc_shore_hardness")
export class QcShoreHardness {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "job_card_id" })
  jobCardId: number;

  @Column({ name: "rubber_spec", type: "varchar", length: 255 })
  rubberSpec: string;

  @Column({ name: "rubber_batch_number", type: "varchar", length: 255, nullable: true })
  rubberBatchNumber: string | null;

  @Column({ name: "required_shore", type: "integer" })
  requiredShore: number;

  @Column({ name: "readings", type: "jsonb" })
  readings: ShoreHardnessReadings;

  @Column({ name: "averages", type: "jsonb" })
  averages: ShoreHardnessAverages;

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
