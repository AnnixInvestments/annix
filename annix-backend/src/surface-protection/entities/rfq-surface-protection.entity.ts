import { ApiProperty } from "@nestjs/swagger";
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
import { Rfq } from "../../rfq/entities/rfq.entity";

@Entity("rfq_surface_protection")
@Index(["rfqId"], { unique: true })
export class RfqSurfaceProtection {
  @ApiProperty({ description: "Primary key", example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: "RFQ ID" })
  @Column({ name: "rfq_id", type: "int" })
  rfqId: number;

  @ManyToOne(() => Rfq, { onDelete: "CASCADE" })
  @JoinColumn({ name: "rfq_id" })
  rfq: Rfq;

  // External coating specifications
  @ApiProperty({ description: "External coating required" })
  @Column({ name: "external_coating_required", type: "boolean", default: false })
  externalCoatingRequired: boolean;

  @ApiProperty({ description: "External coating type", required: false })
  @Column({ name: "external_coating_type", type: "varchar", length: 50, nullable: true })
  externalCoatingType?: string;

  @ApiProperty({ description: "External coating system code", required: false })
  @Column({ name: "external_system_code", type: "varchar", length: 50, nullable: true })
  externalSystemCode?: string;

  @ApiProperty({ description: "External system description", required: false })
  @Column({ name: "external_system_description", type: "text", nullable: true })
  externalSystemDescription?: string;

  @ApiProperty({ description: "ISO 12944 corrosivity category", required: false })
  @Column({ name: "iso_12944_category", type: "varchar", length: 10, nullable: true })
  iso12944Category?: string;

  @ApiProperty({ description: "ISO 12944 durability class", required: false })
  @Column({ name: "iso_12944_durability", type: "varchar", length: 10, nullable: true })
  iso12944Durability?: string;

  @ApiProperty({ description: "External total DFT in microns", required: false })
  @Column({
    name: "external_total_dft_um",
    type: "decimal",
    precision: 8,
    scale: 2,
    nullable: true,
  })
  externalTotalDftUm?: number;

  @ApiProperty({ description: "Surface preparation standard", required: false })
  @Column({ name: "surface_prep_standard", type: "varchar", length: 50, nullable: true })
  surfacePrepStandard?: string;

  // Internal lining specifications
  @ApiProperty({ description: "Internal lining required" })
  @Column({ name: "internal_lining_required", type: "boolean", default: false })
  internalLiningRequired: boolean;

  @ApiProperty({ description: "Internal lining type", required: false })
  @Column({ name: "internal_lining_type", type: "varchar", length: 50, nullable: true })
  internalLiningType?: string;

  @ApiProperty({ description: "Internal lining thickness in mm", required: false })
  @Column({
    name: "internal_lining_thickness_mm",
    type: "decimal",
    precision: 8,
    scale: 2,
    nullable: true,
  })
  internalLiningThicknessMm?: number;

  @ApiProperty({ description: "Internal lining description", required: false })
  @Column({ name: "internal_lining_description", type: "text", nullable: true })
  internalLiningDescription?: string;

  @ApiProperty({ description: "Rubber grade (for rubber linings)", required: false })
  @Column({ name: "rubber_grade", type: "varchar", length: 20, nullable: true })
  rubberGrade?: string;

  @ApiProperty({ description: "Rubber hardness IRHD", required: false })
  @Column({ name: "rubber_hardness_irhd", type: "int", nullable: true })
  rubberHardnessIrhd?: number;

  @ApiProperty({ description: "Ceramic tile type", required: false })
  @Column({ name: "ceramic_tile_type", type: "varchar", length: 50, nullable: true })
  ceramicTileType?: string;

  // Application details
  @ApiProperty({ description: "Substrate type", required: false })
  @Column({ name: "substrate_type", type: "varchar", length: 50, nullable: true })
  substrateType?: string;

  @ApiProperty({ description: "Application method", required: false })
  @Column({ name: "application_method", type: "varchar", length: 50, nullable: true })
  applicationMethod?: string;

  @ApiProperty({ description: "Application location (shop/field/both)", required: false })
  @Column({ name: "application_location", type: "varchar", length: 20, nullable: true })
  applicationLocation?: string;

  // Environmental conditions
  @ApiProperty({ description: "Application temperature in Celsius", required: false })
  @Column({
    name: "application_temp_c",
    type: "decimal",
    precision: 5,
    scale: 1,
    nullable: true,
  })
  applicationTempC?: number;

  @ApiProperty({ description: "Application humidity percent", required: false })
  @Column({
    name: "application_humidity_percent",
    type: "decimal",
    precision: 5,
    scale: 1,
    nullable: true,
  })
  applicationHumidityPercent?: number;

  // Inspection requirements
  @ApiProperty({ description: "Inspection requirements as JSON array", required: false })
  @Column({ name: "inspection_requirements", type: "jsonb", nullable: true })
  inspectionRequirements?: string[];

  // Surface area calculations
  @ApiProperty({ description: "Total internal surface area in m2", required: false })
  @Column({
    name: "total_internal_area_m2",
    type: "decimal",
    precision: 12,
    scale: 3,
    nullable: true,
  })
  totalInternalAreaM2?: number;

  @ApiProperty({ description: "Total external surface area in m2", required: false })
  @Column({
    name: "total_external_area_m2",
    type: "decimal",
    precision: 12,
    scale: 3,
    nullable: true,
  })
  totalExternalAreaM2?: number;

  @ApiProperty({ description: "Wastage percentage", required: false })
  @Column({
    name: "wastage_percent",
    type: "decimal",
    precision: 5,
    scale: 2,
    nullable: true,
  })
  wastagePercent?: number;

  // Quantity calculations
  @ApiProperty({ description: "Total paint quantity in liters", required: false })
  @Column({
    name: "total_paint_liters",
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
  })
  totalPaintLiters?: number;

  @ApiProperty({ description: "Total rubber quantity in m2", required: false })
  @Column({
    name: "total_rubber_m2",
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
  })
  totalRubberM2?: number;

  @ApiProperty({ description: "Total ceramic tile count", required: false })
  @Column({ name: "total_ceramic_tiles", type: "int", nullable: true })
  totalCeramicTiles?: number;

  // Pricing
  @ApiProperty({ description: "External coating total cost", required: false })
  @Column({
    name: "external_coating_cost",
    type: "decimal",
    precision: 15,
    scale: 2,
    nullable: true,
  })
  externalCoatingCost?: number;

  @ApiProperty({ description: "Internal lining total cost", required: false })
  @Column({
    name: "internal_lining_cost",
    type: "decimal",
    precision: 15,
    scale: 2,
    nullable: true,
  })
  internalLiningCost?: number;

  @ApiProperty({ description: "Surface preparation total cost", required: false })
  @Column({
    name: "surface_prep_cost",
    type: "decimal",
    precision: 15,
    scale: 2,
    nullable: true,
  })
  surfacePrepCost?: number;

  @ApiProperty({ description: "Total surface protection cost", required: false })
  @Column({
    name: "total_sp_cost",
    type: "decimal",
    precision: 15,
    scale: 2,
    nullable: true,
  })
  totalSpCost?: number;

  @ApiProperty({ description: "Margin percentage", required: false })
  @Column({
    name: "margin_percent",
    type: "decimal",
    precision: 5,
    scale: 2,
    nullable: true,
  })
  marginPercent?: number;

  @ApiProperty({ description: "SP specification confirmed by user" })
  @Column({ name: "is_confirmed", type: "boolean", default: false })
  isConfirmed: boolean;

  @ApiProperty({ description: "Additional notes", required: false })
  @Column({ name: "notes", type: "text", nullable: true })
  notes?: string;

  // Full calculation data as JSON for flexibility
  @ApiProperty({ description: "Full calculation and specification data", required: false })
  @Column({ name: "specification_data", type: "jsonb", nullable: true })
  specificationData?: Record<string, unknown>;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
