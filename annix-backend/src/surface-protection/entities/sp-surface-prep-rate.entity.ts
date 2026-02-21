import { ApiProperty } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export enum SurfacePrepGrade {
  SA_1 = "Sa 1",
  SA_2 = "Sa 2",
  SA_2_5 = "Sa 2.5",
  SA_3 = "Sa 3",
  ST_2 = "St 2",
  ST_3 = "St 3",
}

export enum SurfacePrepMethod {
  ABRASIVE_BLASTING = "abrasive_blasting",
  WATER_JETTING = "water_jetting",
  POWER_TOOL_CLEANING = "power_tool_cleaning",
  HAND_TOOL_CLEANING = "hand_tool_cleaning",
  CHEMICAL_CLEANING = "chemical_cleaning",
  SWEEP_BLASTING = "sweep_blasting",
}

export enum SubstrateMaterial {
  CARBON_STEEL = "carbon_steel",
  STAINLESS_STEEL = "stainless_steel",
  GALVANIZED_STEEL = "galvanized_steel",
  ALUMINUM = "aluminum",
  CONCRETE = "concrete",
  PREVIOUSLY_COATED = "previously_coated",
}

@Entity("sp_surface_prep_rates")
@Index(["prepGrade", "prepMethod"])
@Index(["supplierId"])
export class SpSurfacePrepRate {
  @ApiProperty({ description: "Primary key", example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: "Rate code for reference", example: "BLAST-SA25" })
  @Column({ name: "rate_code", type: "varchar", length: 50, unique: true })
  rateCode: string;

  @ApiProperty({ description: "Preparation method name" })
  @Column({ name: "method_name", type: "varchar", length: 200 })
  methodName: string;

  @ApiProperty({ description: "Surface preparation grade", enum: SurfacePrepGrade })
  @Column({
    name: "prep_grade",
    type: "enum",
    enum: SurfacePrepGrade,
  })
  prepGrade: SurfacePrepGrade;

  @ApiProperty({ description: "Preparation method", enum: SurfacePrepMethod })
  @Column({
    name: "prep_method",
    type: "enum",
    enum: SurfacePrepMethod,
  })
  prepMethod: SurfacePrepMethod;

  @ApiProperty({ description: "Substrate material", enum: SubstrateMaterial })
  @Column({
    name: "substrate_material",
    type: "enum",
    enum: SubstrateMaterial,
    default: SubstrateMaterial.CARBON_STEEL,
  })
  substrateMaterial: SubstrateMaterial;

  @ApiProperty({ description: "Description", required: false })
  @Column({ name: "description", type: "text", nullable: true })
  description?: string;

  @ApiProperty({ description: "Minimum surface profile in microns", required: false })
  @Column({
    name: "min_profile_um",
    type: "decimal",
    precision: 6,
    scale: 1,
    nullable: true,
  })
  minProfileUm?: number;

  @ApiProperty({ description: "Maximum surface profile in microns", required: false })
  @Column({
    name: "max_profile_um",
    type: "decimal",
    precision: 6,
    scale: 1,
    nullable: true,
  })
  maxProfileUm?: number;

  @ApiProperty({ description: "Price per m2 for labour and equipment" })
  @Column({
    name: "price_per_m2",
    type: "decimal",
    precision: 12,
    scale: 2,
  })
  pricePerM2: number;

  @ApiProperty({ description: "Abrasive cost per m2 (if applicable)", required: false })
  @Column({
    name: "abrasive_cost_per_m2",
    type: "decimal",
    precision: 12,
    scale: 2,
    nullable: true,
  })
  abrasiveCostPerM2?: number;

  @ApiProperty({ description: "Shop application multiplier", default: 1.0 })
  @Column({
    name: "shop_multiplier",
    type: "decimal",
    precision: 5,
    scale: 2,
    default: 1.0,
  })
  shopMultiplier: number;

  @ApiProperty({ description: "Field application multiplier", default: 1.5 })
  @Column({
    name: "field_multiplier",
    type: "decimal",
    precision: 5,
    scale: 2,
    default: 1.5,
  })
  fieldMultiplier: number;

  @ApiProperty({ description: "Currency code", default: "ZAR" })
  @Column({ type: "varchar", length: 3, default: "ZAR" })
  currency: string;

  @ApiProperty({ description: "Supplier company ID", required: false })
  @Column({ name: "supplier_id", type: "int", nullable: true })
  supplierId?: number;

  @ApiProperty({ description: "Effective from date", required: false })
  @Column({ name: "effective_from", type: "date", nullable: true })
  effectiveFrom?: Date;

  @ApiProperty({ description: "Effective to date", required: false })
  @Column({ name: "effective_to", type: "date", nullable: true })
  effectiveTo?: Date;

  @ApiProperty({ description: "Is rate active", default: true })
  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
