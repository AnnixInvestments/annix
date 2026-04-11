import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";

const numericTransformer = {
  to: (value: number | null) => value,
  from: (value: string | number | null) => (value === null ? 0 : Number(value)),
};

const numericTransformerNullable = {
  to: (value: number | null) => value,
  from: (value: string | number | null) => (value === null ? null : Number(value)),
};

@Entity("sm_rubber_wastage_bin")
@Unique(["companyId", "colour"])
export class RubberWastageBin {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "company_id", type: "integer" })
  companyId: number;

  @Column({ name: "colour", type: "varchar", length: 64 })
  colour: string;

  @Column({
    name: "current_weight_kg",
    type: "numeric",
    precision: 12,
    scale: 3,
    default: 0,
    transformer: numericTransformer,
  })
  currentWeightKg: number;

  @Column({
    name: "current_value_r",
    type: "numeric",
    precision: 14,
    scale: 4,
    default: 0,
    transformer: numericTransformer,
  })
  currentValueR: number;

  @Column({ name: "location_id", type: "integer", nullable: true })
  locationId: number | null;

  @Column({
    name: "scrap_rate_per_kg_r",
    type: "numeric",
    precision: 10,
    scale: 4,
    nullable: true,
    transformer: numericTransformerNullable,
  })
  scrapRatePerKgR: number | null;

  @Column({ name: "last_emptied_at", type: "timestamp", nullable: true })
  lastEmptiedAt: Date | null;

  @Column({
    name: "last_emptied_value_r",
    type: "numeric",
    precision: 14,
    scale: 4,
    nullable: true,
    transformer: numericTransformerNullable,
  })
  lastEmptiedValueR: number | null;

  @Column({ name: "active", type: "boolean", default: true })
  active: boolean;

  @Column({ name: "notes", type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
