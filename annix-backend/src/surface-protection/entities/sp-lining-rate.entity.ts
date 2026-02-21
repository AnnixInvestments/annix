import { ApiProperty } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export enum LiningCategory {
  NATURAL_RUBBER = "natural_rubber",
  NEOPRENE = "neoprene",
  NITRILE = "nitrile",
  BUTYL = "butyl",
  EPDM = "epdm",
  HYPALON = "hypalon",
  VITON = "viton",
  POLYURETHANE = "polyurethane",
  ALUMINA_92 = "alumina_92",
  ALUMINA_99 = "alumina_99",
  ZTA = "zta",
  SILICON_CARBIDE = "silicon_carbide",
  BASALT = "basalt",
  HDPE = "hdpe",
  GLASS_FLAKE = "glass_flake",
}

export enum LiningType {
  RUBBER = "rubber",
  CERAMIC = "ceramic",
  POLYMER = "polymer",
}

export enum CureMethod {
  AUTOCLAVE = "autoclave",
  COLD_VULCANIZATION = "cold_vulcanization",
  AMBIENT = "ambient",
}

@Entity("sp_lining_rates")
@Index(["liningCategory", "thicknessMm"])
@Index(["supplierId"])
export class SpLiningRate {
  @ApiProperty({ description: "Primary key", example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: "Rate code for reference", example: "NR-6MM" })
  @Column({ name: "rate_code", type: "varchar", length: 50, unique: true })
  rateCode: string;

  @ApiProperty({ description: "Lining system name" })
  @Column({ name: "system_name", type: "varchar", length: 200 })
  systemName: string;

  @ApiProperty({ description: "Lining type", enum: LiningType })
  @Column({
    name: "lining_type",
    type: "enum",
    enum: LiningType,
  })
  liningType: LiningType;

  @ApiProperty({ description: "Lining category/material", enum: LiningCategory })
  @Column({
    name: "lining_category",
    type: "enum",
    enum: LiningCategory,
  })
  liningCategory: LiningCategory;

  @ApiProperty({ description: "Lining thickness in mm" })
  @Column({
    name: "thickness_mm",
    type: "decimal",
    precision: 6,
    scale: 2,
  })
  thicknessMm: number;

  @ApiProperty({ description: "System description", required: false })
  @Column({ name: "description", type: "text", nullable: true })
  description?: string;

  @ApiProperty({ description: "Rubber hardness IRHD (for rubber)", required: false })
  @Column({ name: "hardness_irhd", type: "int", nullable: true })
  hardnessIrhd?: number;

  @ApiProperty({ description: "Cure method (for rubber)", enum: CureMethod, required: false })
  @Column({
    name: "cure_method",
    type: "enum",
    enum: CureMethod,
    nullable: true,
  })
  cureMethod?: CureMethod;

  @ApiProperty({ description: "Ceramic tile size in mm (for ceramic)", required: false })
  @Column({ name: "tile_size_mm", type: "varchar", length: 50, nullable: true })
  tileSizeMm?: string;

  @ApiProperty({ description: "Maximum operating temperature in Celsius" })
  @Column({
    name: "max_temp_c",
    type: "decimal",
    precision: 6,
    scale: 1,
    nullable: true,
  })
  maxTempC?: number;

  @ApiProperty({ description: "Price per m2 for material" })
  @Column({
    name: "material_price_per_m2",
    type: "decimal",
    precision: 12,
    scale: 2,
  })
  materialPricePerM2: number;

  @ApiProperty({ description: "Price per m2 for installation labour" })
  @Column({
    name: "labour_price_per_m2",
    type: "decimal",
    precision: 12,
    scale: 2,
  })
  labourPricePerM2: number;

  @ApiProperty({ description: "Adhesive price per m2", required: false })
  @Column({
    name: "adhesive_price_per_m2",
    type: "decimal",
    precision: 12,
    scale: 2,
    nullable: true,
  })
  adhesivePricePerM2?: number;

  @ApiProperty({ description: "Total price per m2" })
  @Column({
    name: "total_price_per_m2",
    type: "decimal",
    precision: 12,
    scale: 2,
  })
  totalPricePerM2: number;

  @ApiProperty({ description: "Autoclave cure premium multiplier", default: 1.0 })
  @Column({
    name: "autoclave_multiplier",
    type: "decimal",
    precision: 5,
    scale: 2,
    default: 1.0,
  })
  autoclaveMultiplier: number;

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
