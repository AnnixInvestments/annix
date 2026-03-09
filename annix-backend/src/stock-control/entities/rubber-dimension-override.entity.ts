import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { StockControlCompany } from "./stock-control-company.entity";

@Entity("rubber_dimension_overrides")
export class RubberDimensionOverride {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "company_id" })
  companyId: number;

  @ManyToOne(() => StockControlCompany)
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "item_type", type: "varchar", length: 30, nullable: true })
  itemType: string | null;

  @Column({ name: "nb_mm", type: "int", nullable: true })
  nbMm: number | null;

  @Column({ name: "od_mm", type: "numeric", precision: 8, scale: 2, nullable: true })
  odMm: number | null;

  @Column({ name: "schedule", type: "varchar", length: 30, nullable: true })
  schedule: string | null;

  @Column({ name: "pipe_length_mm", type: "int" })
  pipeLengthMm: number;

  @Column({ name: "flange_config", type: "varchar", length: 30, nullable: true })
  flangeConfig: string | null;

  @Column({ name: "calculated_width_mm", type: "int" })
  calculatedWidthMm: number;

  @Column({ name: "calculated_length_mm", type: "int" })
  calculatedLengthMm: number;

  @Column({ name: "override_width_mm", type: "int" })
  overrideWidthMm: number;

  @Column({ name: "override_length_mm", type: "int" })
  overrideLengthMm: number;

  @Column({ name: "usage_count", type: "int", default: 1 })
  usageCount: number;

  @Column({ name: "last_used_at", type: "timestamptz" })
  lastUsedAt: Date;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
