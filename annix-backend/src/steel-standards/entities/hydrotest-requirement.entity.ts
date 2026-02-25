import { ApiProperty } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";

@Entity("hydrotest_requirements")
@Unique(["code"])
export class HydrotestRequirement {
  @ApiProperty({ description: "Primary key", example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: "Code reference", example: "ASME_B31.3" })
  @Column({ type: "varchar", length: 20 })
  code: string;

  @ApiProperty({ description: "Code display name", example: "ASME B31.3 Process Piping" })
  @Column({ name: "code_display_name", type: "varchar", length: 100 })
  codeDisplayName: string;

  @ApiProperty({ description: "Test pressure multiplier of design pressure", example: 1.5 })
  @Column({ name: "test_pressure_multiplier", type: "decimal", precision: 4, scale: 2 })
  testPressureMultiplier: number;

  @ApiProperty({
    description: "Test pressure formula description",
    example: "1.5 x Design Pressure",
  })
  @Column({ name: "test_pressure_formula", type: "varchar", length: 100 })
  testPressureFormula: string;

  @ApiProperty({ description: "Minimum hold time in minutes", example: 10 })
  @Column({ name: "hold_time_minutes", type: "int" })
  holdTimeMinutes: number;

  @ApiProperty({ description: "Hold time per mm of wall thickness (minutes)", example: 0 })
  @Column({
    name: "hold_time_per_mm_wall",
    type: "decimal",
    precision: 4,
    scale: 2,
    nullable: true,
  })
  holdTimePerMmWall: number | null;

  @ApiProperty({ description: "Maximum allowable volume loss percentage", example: 1.5 })
  @Column({ name: "volume_loss_max_pct", type: "decimal", precision: 4, scale: 2 })
  volumeLossMaxPct: number;

  @ApiProperty({ description: "Minimum test temperature in Celsius", example: 16 })
  @Column({ name: "temperature_min_c", type: "int" })
  temperatureMinC: number;

  @ApiProperty({ description: "Test medium options", example: "WATER" })
  @Column({ type: "varchar", length: 20 })
  medium: string;

  @ApiProperty({ description: "Pneumatic test allowed", example: false })
  @Column({ name: "pneumatic_allowed", type: "boolean", default: false })
  pneumaticAllowed: boolean;

  @ApiProperty({ description: "Pneumatic test pressure multiplier if allowed", example: 1.1 })
  @Column({ name: "pneumatic_multiplier", type: "decimal", precision: 4, scale: 2, nullable: true })
  pneumaticMultiplier: number | null;

  @ApiProperty({ description: "Additional notes" })
  @Column({ type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
