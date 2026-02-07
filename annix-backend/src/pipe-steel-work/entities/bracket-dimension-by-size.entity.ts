import { ApiProperty } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { BracketTypeEntity } from "./bracket-type.entity";

@Entity("bracket_dimensions_by_size")
@Unique(["bracketTypeCode", "nbMm"])
export class BracketDimensionBySizeEntity {
  @ApiProperty({ description: "Primary key", example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: "Bracket type code", example: "CLEVIS_HANGER" })
  @Column({ name: "bracket_type_code", type: "varchar", length: 50 })
  bracketTypeCode: string;

  @ManyToOne(() => BracketTypeEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "bracket_type_code", referencedColumnName: "typeCode" })
  bracketType: BracketTypeEntity;

  @ApiProperty({ description: "NPS designation", example: '4"' })
  @Column({ name: "nps", type: "varchar", length: 10 })
  nps: string;

  @ApiProperty({ description: "Nominal bore (mm)", example: 100 })
  @Column({ name: "nb_mm", type: "int" })
  nbMm: number;

  @ApiProperty({ description: "Dimension A (mm)", example: 108 })
  @Column({
    name: "dimension_a_mm",
    type: "decimal",
    precision: 8,
    scale: 2,
    nullable: true,
  })
  dimensionAMm: number | null;

  @ApiProperty({ description: "Dimension B (mm)", example: 156 })
  @Column({
    name: "dimension_b_mm",
    type: "decimal",
    precision: 8,
    scale: 2,
    nullable: true,
  })
  dimensionBMm: number | null;

  @ApiProperty({ description: "Rod diameter (mm)", example: 12 })
  @Column({
    name: "rod_diameter_mm",
    type: "decimal",
    precision: 8,
    scale: 2,
    nullable: true,
  })
  rodDiameterMm: number | null;

  @ApiProperty({ description: "Unit weight (kg)", example: 0.82 })
  @Column({ name: "unit_weight_kg", type: "decimal", precision: 8, scale: 3 })
  unitWeightKg: number;

  @ApiProperty({ description: "Maximum load capacity (kg)", example: 900 })
  @Column({ name: "max_load_kg", type: "decimal", precision: 10, scale: 2 })
  maxLoadKg: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
