import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { RubberProductCoding } from "./rubber-product-coding.entity";

export enum CostRateType {
  CALENDERER_UNCURED = "CALENDERER_UNCURED",
  CALENDERER_CURED_BUFFED = "CALENDERER_CURED_BUFFED",
  COMPOUND = "COMPOUND",
}

@Entity("rubber_cost_rates")
export class RubberCostRate {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({
    name: "rate_type",
    type: "enum",
    enum: CostRateType,
  })
  rateType: CostRateType;

  @Column({
    name: "cost_per_kg_zar",
    type: "decimal",
    precision: 10,
    scale: 2,
  })
  costPerKgZar: number;

  @Index()
  @Column({ name: "compound_coding_id", type: "int", nullable: true })
  compoundCodingId: number | null;

  @ManyToOne(() => RubberProductCoding, { nullable: true })
  @JoinColumn({ name: "compound_coding_id" })
  compoundCoding: RubberProductCoding | null;

  @Column({ name: "notes", type: "text", nullable: true })
  notes: string | null;

  @Column({ name: "updated_by", type: "varchar", length: 100, nullable: true })
  updatedBy: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
