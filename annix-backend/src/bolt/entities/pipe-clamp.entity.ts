import { ApiProperty } from "@nestjs/swagger";
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity("pipe_clamps")
@Unique(["clampType", "nps"])
export class PipeClampEntity {
  @ApiProperty({ description: "Primary key", example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: "Clamp type code", example: "THREE_BOLT" })
  @Column({ name: "clamp_type", type: "varchar", length: 50 })
  clampType: string;

  @ApiProperty({
    description: "Clamp type description",
    example: "Three-Bolt Pipe Clamp",
  })
  @Column({ name: "clamp_description", type: "varchar", length: 100 })
  clampDescription: string;

  @ApiProperty({ description: "NPS designation", example: '4"' })
  @Column({ type: "varchar", length: 10 })
  nps: string;

  @ApiProperty({ description: "Nominal bore (mm)", example: 100 })
  @Column({ name: "nb_mm", type: "int" })
  nbMm: number;

  @ApiProperty({ description: "Pipe OD range min (mm)", example: 114.3 })
  @Column({ name: "pipe_od_min_mm", type: "decimal", precision: 8, scale: 2 })
  pipeOdMinMm: number;

  @ApiProperty({ description: "Pipe OD range max (mm)", example: 114.3 })
  @Column({ name: "pipe_od_max_mm", type: "decimal", precision: 8, scale: 2 })
  pipeOdMaxMm: number;

  @ApiProperty({ description: "Bolt size designation", example: "M12" })
  @Column({ name: "bolt_size", type: "varchar", length: 20 })
  boltSize: string;

  @ApiProperty({ description: "Number of bolts", example: 3 })
  @Column({ name: "bolt_count", type: "int" })
  boltCount: number;

  @ApiProperty({ description: "Bolt length (mm)", example: 75 })
  @Column({ name: "bolt_length_mm", type: "decimal", precision: 8, scale: 2 })
  boltLengthMm: number;

  @ApiProperty({ description: "Clamp width (mm)", example: 50 })
  @Column({
    name: "clamp_width_mm",
    type: "decimal",
    precision: 8,
    scale: 2,
    nullable: true,
  })
  clampWidthMm: number | null;

  @ApiProperty({ description: "Clamp thickness (mm)", example: 6 })
  @Column({
    name: "clamp_thickness_mm",
    type: "decimal",
    precision: 6,
    scale: 2,
    nullable: true,
  })
  clampThicknessMm: number | null;

  @ApiProperty({ description: "Unit weight (kg)", example: 1.2 })
  @Column({ name: "unit_weight_kg", type: "decimal", precision: 8, scale: 3 })
  unitWeightKg: number;

  @ApiProperty({ description: "Max load capacity (kg)", example: 1500 })
  @Column({ name: "max_load_kg", type: "decimal", precision: 10, scale: 2 })
  maxLoadKg: number;

  @ApiProperty({ description: "Standard", example: "MSS-SP-58" })
  @Column({ type: "varchar", length: 50, nullable: true })
  standard: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
