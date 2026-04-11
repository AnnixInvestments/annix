import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";

export type RubberCompoundFamily =
  | "NR"
  | "SBR"
  | "NBR"
  | "EPDM"
  | "CR"
  | "FKM"
  | "IIR"
  | "BR"
  | "CSM"
  | "PU"
  | "other";

export type RubberCompoundDatasheetStatus =
  | "missing"
  | "pending_upload"
  | "uploaded"
  | "extracted"
  | "verified";

const numericTransformer = {
  to: (value: number | null) => value,
  from: (value: string | number | null) => (value === null ? null : Number(value)),
};

@Entity("sm_rubber_compound")
@Unique(["companyId", "code"])
export class RubberCompound {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "company_id", type: "integer" })
  companyId: number;

  @Column({ name: "code", type: "varchar", length: 100 })
  code: string;

  @Column({ name: "name", type: "varchar", length: 255 })
  name: string;

  @Column({ name: "supplier_id", type: "integer", nullable: true })
  supplierId: number | null;

  @Column({ name: "supplier_name", type: "varchar", length: 255, nullable: true })
  supplierName: string | null;

  @Column({ name: "compound_family", type: "varchar", length: 32, default: "other" })
  compoundFamily: RubberCompoundFamily;

  @Column({ name: "shore_hardness", type: "integer", nullable: true })
  shoreHardness: number | null;

  @Column({
    name: "density_kg_per_m3",
    type: "numeric",
    precision: 8,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  densityKgPerM3: number | null;

  @Column({
    name: "specific_gravity",
    type: "numeric",
    precision: 6,
    scale: 4,
    nullable: true,
    transformer: numericTransformer,
  })
  specificGravity: number | null;

  @Column({
    name: "temp_range_min_c",
    type: "numeric",
    precision: 6,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  tempRangeMinC: number | null;

  @Column({
    name: "temp_range_max_c",
    type: "numeric",
    precision: 6,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  tempRangeMaxC: number | null;

  @Column({
    name: "elongation_at_break_pct",
    type: "numeric",
    precision: 6,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  elongationAtBreakPct: number | null;

  @Column({
    name: "tensile_strength_mpa",
    type: "numeric",
    precision: 6,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  tensileStrengthMpa: number | null;

  @Column({ name: "chemical_resistance", type: "text", array: true, nullable: true })
  chemicalResistance: string[] | null;

  @Column({ name: "default_colour", type: "varchar", length: 64, nullable: true })
  defaultColour: string | null;

  @Column({
    name: "datasheet_status",
    type: "varchar",
    length: 32,
    default: "missing",
  })
  datasheetStatus: RubberCompoundDatasheetStatus;

  @Column({ name: "last_extraction_datasheet_id", type: "integer", nullable: true })
  lastExtractionDatasheetId: number | null;

  @Column({ name: "legacy_firebase_uid", type: "varchar", length: 128, nullable: true })
  legacyFirebaseUid: string | null;

  @Column({ name: "notes", type: "text", nullable: true })
  notes: string | null;

  @Column({ name: "active", type: "boolean", default: true })
  active: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
