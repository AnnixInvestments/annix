import { ApiProperty } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export enum SystemStandard {
  ISO_12944 = "ISO 12944",
  NORSOK_M501 = "NORSOK M-501",
  SSPC = "SSPC",
  AS_NZS_2312 = "AS/NZS 2312",
  ISO_21809 = "ISO 21809",
}

export enum SystemApplication {
  EXTERNAL_ATMOSPHERIC = "external_atmospheric",
  EXTERNAL_BURIED = "external_buried",
  EXTERNAL_SUBMERGED = "external_submerged",
  INTERNAL_DRY = "internal_dry",
  INTERNAL_IMMERSION = "internal_immersion",
  INTERNAL_ABRASIVE = "internal_abrasive",
  HIGH_TEMPERATURE = "high_temperature",
  FIRE_PROTECTION = "fire_protection",
}

@Entity("coating_systems")
@Index(["systemCode"])
@Index(["systemStandard", "application"])
export class CoatingSystem {
  @ApiProperty({ description: "Primary key", example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    description: "System code (e.g., ISO system number)",
    example: "C4.07",
  })
  @Column({ name: "system_code", type: "varchar", length: 50, unique: true })
  systemCode: string;

  @ApiProperty({ description: "System name" })
  @Column({ name: "system_name", type: "varchar", length: 200 })
  systemName: string;

  @ApiProperty({ description: "Coating standard", enum: SystemStandard })
  @Column({
    name: "system_standard",
    type: "enum",
    enum: SystemStandard,
  })
  systemStandard: SystemStandard;

  @ApiProperty({ description: "Application type", enum: SystemApplication })
  @Column({
    name: "application",
    type: "enum",
    enum: SystemApplication,
  })
  application: SystemApplication;

  @ApiProperty({ description: "Full system description" })
  @Column({ name: "description", type: "text" })
  description: string;

  @ApiProperty({ description: "Supported corrosivity categories (comma-separated)" })
  @Column({ name: "corrosivity_categories", type: "varchar", length: 50 })
  corrosivityCategories: string;

  @ApiProperty({ description: "Supported durability classes (comma-separated)" })
  @Column({ name: "durability_classes", type: "varchar", length: 20 })
  durabilityClasses: string;

  @ApiProperty({ description: "Minimum total DFT in microns" })
  @Column({
    name: "min_total_dft_um",
    type: "decimal",
    precision: 8,
    scale: 2,
  })
  minTotalDftUm: number;

  @ApiProperty({ description: "Maximum total DFT in microns" })
  @Column({
    name: "max_total_dft_um",
    type: "decimal",
    precision: 8,
    scale: 2,
  })
  maxTotalDftUm: number;

  @ApiProperty({ description: "Number of coats" })
  @Column({ name: "number_of_coats", type: "int" })
  numberOfCoats: number;

  @ApiProperty({ description: "Required surface preparation grade" })
  @Column({ name: "surface_prep_grade", type: "varchar", length: 20 })
  surfacePrepGrade: string;

  @ApiProperty({ description: "Coat specifications as JSON array" })
  @Column({ name: "coat_specifications", type: "jsonb" })
  coatSpecifications: Array<{
    coatNumber: number;
    coatType: string;
    genericType: string;
    minDftUm: number;
    maxDftUm: number;
    recoatWindowHours?: string;
  }>;

  @ApiProperty({ description: "Primer generic type" })
  @Column({ name: "primer_type", type: "varchar", length: 100 })
  primerType: string;

  @ApiProperty({ description: "Intermediate coat generic type", required: false })
  @Column({ name: "intermediate_type", type: "varchar", length: 100, nullable: true })
  intermediateType?: string;

  @ApiProperty({ description: "Topcoat generic type", required: false })
  @Column({ name: "topcoat_type", type: "varchar", length: 100, nullable: true })
  topcoatType?: string;

  @ApiProperty({ description: "Minimum operating temperature in Celsius", required: false })
  @Column({
    name: "min_operating_temp_c",
    type: "decimal",
    precision: 6,
    scale: 1,
    nullable: true,
  })
  minOperatingTempC?: number;

  @ApiProperty({ description: "Maximum operating temperature in Celsius", required: false })
  @Column({
    name: "max_operating_temp_c",
    type: "decimal",
    precision: 6,
    scale: 1,
    nullable: true,
  })
  maxOperatingTempC?: number;

  @ApiProperty({ description: "Chemical resistance notes", required: false })
  @Column({ name: "chemical_resistance", type: "text", nullable: true })
  chemicalResistance?: string;

  @ApiProperty({ description: "UV resistance rating", required: false })
  @Column({ name: "uv_resistance", type: "varchar", length: 50, nullable: true })
  uvResistance?: string;

  @ApiProperty({ description: "Is this a recommended/preferred system" })
  @Column({ name: "is_recommended", type: "boolean", default: false })
  isRecommended: boolean;

  @ApiProperty({ description: "System is active", default: true })
  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  @ApiProperty({ description: "Additional notes", required: false })
  @Column({ name: "notes", type: "text", nullable: true })
  notes?: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
