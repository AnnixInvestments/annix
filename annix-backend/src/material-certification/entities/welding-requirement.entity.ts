import { ApiProperty } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";

@Entity("welding_requirements")
@Unique(["pNumber", "groupNumber"])
export class WeldingRequirement {
  @ApiProperty({ description: "Primary key", example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: "ASME P-Number (e.g., 1, 5A, 5B, 15E)", example: "1" })
  @Column({ name: "p_number", type: "varchar", length: 10 })
  pNumber: string;

  @ApiProperty({ description: "Group number within P-Number", example: "1" })
  @Column({ name: "group_number", type: "varchar", length: 10, nullable: true })
  groupNumber?: string;

  @ApiProperty({ description: "Material description", example: "Carbon Steel" })
  @Column({ name: "material_description", type: "varchar", length: 100 })
  materialDescription: string;

  @ApiProperty({ description: "Typical specifications", example: "A106 Gr.B, A53 Gr.B" })
  @Column({ name: "typical_specifications", type: "text", nullable: true })
  typicalSpecifications?: string;

  @ApiProperty({ description: "Minimum preheat temperature in Celsius", example: 10 })
  @Column({ name: "preheat_min_c", type: "int", nullable: true })
  preheatMinC?: number;

  @ApiProperty({ description: "Maximum interpass temperature in Celsius", example: 315 })
  @Column({ name: "interpass_max_c", type: "int", nullable: true })
  interpassMaxC?: number;

  @ApiProperty({ description: "Whether PWHT is required", example: true })
  @Column({ name: "pwht_required", type: "boolean", default: false })
  pwhtRequired: boolean;

  @ApiProperty({ description: "PWHT temperature minimum in Celsius", example: 595 })
  @Column({ name: "pwht_temp_min_c", type: "int", nullable: true })
  pwhtTempMinC?: number;

  @ApiProperty({ description: "PWHT temperature maximum in Celsius", example: 650 })
  @Column({ name: "pwht_temp_max_c", type: "int", nullable: true })
  pwhtTempMaxC?: number;

  @ApiProperty({ description: "PWHT hold time in hours per inch of thickness", example: 1 })
  @Column({ name: "pwht_hold_hrs_per_inch", type: "decimal", precision: 4, scale: 2, nullable: true })
  pwhtHoldHrsPerInch?: number;

  @ApiProperty({ description: "Minimum PWHT hold time in hours", example: 0.25 })
  @Column({ name: "pwht_min_hold_hrs", type: "decimal", precision: 4, scale: 2, nullable: true })
  pwhtMinHoldHrs?: number;

  @ApiProperty({ description: "Maximum heating rate in °C/hour", example: 220 })
  @Column({ name: "heating_rate_max_c_per_hr", type: "int", nullable: true })
  heatingRateMaxCPerHr?: number;

  @ApiProperty({ description: "Maximum cooling rate in °C/hour", example: 280 })
  @Column({ name: "cooling_rate_max_c_per_hr", type: "int", nullable: true })
  coolingRateMaxCPerHr?: number;

  @ApiProperty({ description: "Thickness threshold for mandatory PWHT in mm", example: 19 })
  @Column({ name: "pwht_thickness_threshold_mm", type: "decimal", precision: 6, scale: 2, nullable: true })
  pwhtThicknessThresholdMm?: number;

  @ApiProperty({ description: "Recommended filler metal AWS classification", example: "E7018" })
  @Column({ name: "recommended_filler_metal", type: "varchar", length: 50, nullable: true })
  recommendedFillerMetal?: string;

  @ApiProperty({ description: "Additional notes or requirements", required: false })
  @Column({ name: "notes", type: "text", nullable: true })
  notes?: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
