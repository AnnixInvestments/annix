import { ApiProperty } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { RfqItem } from "./rfq-item.entity";

export enum AssemblyType {
  TANK = "tank",
  CHUTE = "chute",
  HOPPER = "hopper",
  UNDERPAN = "underpan",
  CUSTOM = "custom",
}

export enum LiningType {
  RUBBER = "rubber",
  CERAMIC = "ceramic",
  HDPE = "hdpe",
  PU = "pu",
  GLASS_FLAKE = "glass_flake",
  NONE = "none",
}

export interface PlateBomItem {
  mark: string;
  description: string;
  thicknessMm: number;
  lengthMm: number;
  widthMm: number;
  quantity: number;
  weightKg: number;
  areaM2: number;
}

@Entity("tank_chute_rfqs")
export class TankChuteRfq {
  @ApiProperty({ description: "Primary key", example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: "Assembly type", enum: AssemblyType })
  @Column({
    name: "assembly_type",
    type: "enum",
    enum: AssemblyType,
  })
  assemblyType: AssemblyType;

  @ApiProperty({ description: "Drawing reference number" })
  @Column({
    name: "drawing_reference",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  drawingReference?: string;

  @ApiProperty({ description: "Material grade (e.g. S355JR, Bisalloy 400)" })
  @Column({
    name: "material_grade",
    type: "varchar",
    length: 100,
    nullable: true,
  })
  materialGrade?: string;

  @ApiProperty({ description: "Overall length in mm" })
  @Column({
    name: "overall_length_mm",
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
  })
  overallLengthMm?: number;

  @ApiProperty({ description: "Overall width in mm" })
  @Column({
    name: "overall_width_mm",
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
  })
  overallWidthMm?: number;

  @ApiProperty({ description: "Overall height in mm" })
  @Column({
    name: "overall_height_mm",
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
  })
  overallHeightMm?: number;

  @ApiProperty({ description: "Total steel weight in kg" })
  @Column({
    name: "total_steel_weight_kg",
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
  })
  totalSteelWeightKg?: number;

  @ApiProperty({ description: "Weight source: manual or calculated" })
  @Column({
    name: "weight_source",
    type: "varchar",
    length: 20,
    nullable: true,
  })
  weightSource?: string;

  @ApiProperty({ description: "Number of identical assemblies", example: 1 })
  @Column({
    name: "quantity_value",
    type: "int",
    default: 1,
  })
  quantityValue: number;

  @ApiProperty({ description: "Whether internal lining is required" })
  @Column({
    name: "lining_required",
    type: "boolean",
    default: false,
  })
  liningRequired: boolean;

  @ApiProperty({ description: "Lining type", enum: LiningType })
  @Column({
    name: "lining_type",
    type: "enum",
    enum: LiningType,
    nullable: true,
  })
  liningType?: LiningType;

  @ApiProperty({ description: "Lining thickness in mm" })
  @Column({
    name: "lining_thickness_mm",
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
  })
  liningThicknessMm?: number;

  @ApiProperty({ description: "Internal lining area in m²" })
  @Column({
    name: "lining_area_m2",
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
  })
  liningAreaM2?: number;

  @ApiProperty({ description: "Lining wastage percentage" })
  @Column({
    name: "lining_wastage_percent",
    type: "decimal",
    precision: 5,
    scale: 2,
    nullable: true,
  })
  liningWastagePercent?: number;

  @ApiProperty({ description: "Rubber grade (when lining type is rubber)" })
  @Column({
    name: "rubber_grade",
    type: "varchar",
    length: 100,
    nullable: true,
  })
  rubberGrade?: string;

  @ApiProperty({ description: "Rubber hardness Shore A" })
  @Column({
    name: "rubber_hardness_shore",
    type: "int",
    nullable: true,
  })
  rubberHardnessShore?: number;

  @ApiProperty({ description: "Whether external coating is required" })
  @Column({
    name: "coating_required",
    type: "boolean",
    default: false,
  })
  coatingRequired: boolean;

  @ApiProperty({ description: "Coating system description" })
  @Column({
    name: "coating_system",
    type: "text",
    nullable: true,
  })
  coatingSystem?: string;

  @ApiProperty({ description: "External coating area in m²" })
  @Column({
    name: "coating_area_m2",
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
  })
  coatingAreaM2?: number;

  @ApiProperty({ description: "Coating wastage percentage" })
  @Column({
    name: "coating_wastage_percent",
    type: "decimal",
    precision: 5,
    scale: 2,
    nullable: true,
  })
  coatingWastagePercent?: number;

  @ApiProperty({ description: "Surface preparation standard (e.g. Sa 2.5)" })
  @Column({
    name: "surface_prep_standard",
    type: "varchar",
    length: 50,
    nullable: true,
  })
  surfacePrepStandard?: string;

  @ApiProperty({ description: "Plate BOM as JSON array" })
  @Column({
    name: "plate_bom",
    type: "jsonb",
    nullable: true,
  })
  plateBom?: PlateBomItem[];

  @ApiProperty({ description: "BOM total weight in kg" })
  @Column({
    name: "bom_total_weight_kg",
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
  })
  bomTotalWeightKg?: number;

  @ApiProperty({ description: "BOM total area in m²" })
  @Column({
    name: "bom_total_area_m2",
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
  })
  bomTotalAreaM2?: number;

  @ApiProperty({ description: "Steel price per kg" })
  @Column({
    name: "steel_price_per_kg",
    type: "decimal",
    precision: 12,
    scale: 2,
    nullable: true,
  })
  steelPricePerKg?: number;

  @ApiProperty({ description: "Lining price per m²" })
  @Column({
    name: "lining_price_per_m2",
    type: "decimal",
    precision: 12,
    scale: 2,
    nullable: true,
  })
  liningPricePerM2?: number;

  @ApiProperty({ description: "Coating price per m²" })
  @Column({
    name: "coating_price_per_m2",
    type: "decimal",
    precision: 12,
    scale: 2,
    nullable: true,
  })
  coatingPricePerM2?: number;

  @ApiProperty({ description: "Fabrication cost" })
  @Column({
    name: "fabrication_cost",
    type: "decimal",
    precision: 12,
    scale: 2,
    nullable: true,
  })
  fabricationCost?: number;

  @ApiProperty({ description: "Total cost" })
  @Column({
    name: "total_cost",
    type: "decimal",
    precision: 12,
    scale: 2,
    nullable: true,
  })
  totalCost?: number;

  @ApiProperty({ description: "Additional notes" })
  @Column({ name: "notes", type: "text", nullable: true })
  notes?: string;

  @ApiProperty({ description: "Calculation data as JSON" })
  @Column({ name: "calculation_data", type: "jsonb", nullable: true })
  calculationData?: Record<string, unknown>;

  @OneToOne(
    () => RfqItem,
    (rfqItem) => rfqItem.tankChuteDetails,
  )
  @JoinColumn({ name: "rfq_item_id" })
  rfqItem: RfqItem;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
