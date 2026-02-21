import { ApiProperty } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export enum CoatingCategory {
  EPOXY = "epoxy",
  POLYURETHANE = "polyurethane",
  ZINC_RICH = "zinc_rich",
  POLYSILOXANE = "polysiloxane",
  POLYUREA = "polyurea",
  GLASS_FLAKE = "glass_flake",
  INTUMESCENT = "intumescent",
  SILICONE = "silicone",
  FBE = "fbe",
  THREE_LPE = "3lpe",
  HDG = "hdg",
}

export enum ISO12944Category {
  C1 = "C1",
  C2 = "C2",
  C3 = "C3",
  C4 = "C4",
  C5 = "C5",
  CX = "CX",
  IM1 = "Im1",
  IM2 = "Im2",
  IM3 = "Im3",
  IM4 = "Im4",
}

export enum DurabilityClass {
  LOW = "L",
  MEDIUM = "M",
  HIGH = "H",
  VERY_HIGH = "VH",
}

@Entity("sp_coating_rates")
@Index(["coatingCategory", "iso12944Category", "durabilityClass"])
@Index(["supplierId"])
export class SpCoatingRate {
  @ApiProperty({ description: "Primary key", example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: "Rate code for reference", example: "EPOXY-C3-H" })
  @Column({ name: "rate_code", type: "varchar", length: 50, unique: true })
  rateCode: string;

  @ApiProperty({ description: "Coating system name" })
  @Column({ name: "system_name", type: "varchar", length: 200 })
  systemName: string;

  @ApiProperty({ description: "Coating category", enum: CoatingCategory })
  @Column({
    name: "coating_category",
    type: "enum",
    enum: CoatingCategory,
  })
  coatingCategory: CoatingCategory;

  @ApiProperty({
    description: "ISO 12944 corrosivity category",
    enum: ISO12944Category,
    required: false,
  })
  @Column({
    name: "iso_12944_category",
    type: "enum",
    enum: ISO12944Category,
    nullable: true,
  })
  iso12944Category?: ISO12944Category;

  @ApiProperty({
    description: "Durability class",
    enum: DurabilityClass,
    required: false,
  })
  @Column({
    name: "durability_class",
    type: "enum",
    enum: DurabilityClass,
    nullable: true,
  })
  durabilityClass?: DurabilityClass;

  @ApiProperty({ description: "System description" })
  @Column({ name: "description", type: "text", nullable: true })
  description?: string;

  @ApiProperty({ description: "Total nominal DFT in microns" })
  @Column({
    name: "total_dft_um",
    type: "decimal",
    precision: 8,
    scale: 2,
  })
  totalDftUm: number;

  @ApiProperty({ description: "Number of coats" })
  @Column({ name: "number_of_coats", type: "int" })
  numberOfCoats: number;

  @ApiProperty({ description: "Price per m2 for material" })
  @Column({
    name: "material_price_per_m2",
    type: "decimal",
    precision: 12,
    scale: 2,
  })
  materialPricePerM2: number;

  @ApiProperty({ description: "Price per m2 for application labour" })
  @Column({
    name: "labour_price_per_m2",
    type: "decimal",
    precision: 12,
    scale: 2,
  })
  labourPricePerM2: number;

  @ApiProperty({ description: "Total price per m2 (material + labour)" })
  @Column({
    name: "total_price_per_m2",
    type: "decimal",
    precision: 12,
    scale: 2,
  })
  totalPricePerM2: number;

  @ApiProperty({ description: "Shop application multiplier", default: 1.0 })
  @Column({
    name: "shop_multiplier",
    type: "decimal",
    precision: 5,
    scale: 2,
    default: 1.0,
  })
  shopMultiplier: number;

  @ApiProperty({ description: "Field application multiplier", default: 1.3 })
  @Column({
    name: "field_multiplier",
    type: "decimal",
    precision: 5,
    scale: 2,
    default: 1.3,
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
