import { ApiProperty } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { RfqItem } from "../../rfq/entities/rfq-item.entity";

@Entity("chemical_compositions")
export class ChemicalComposition {
  @ApiProperty({ description: "Primary key", example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: "Carbon content (C) percentage", example: 0.25 })
  @Column({ name: "carbon_pct", type: "decimal", precision: 5, scale: 3, nullable: true })
  carbonPct?: number;

  @ApiProperty({ description: "Manganese content (Mn) percentage", example: 1.2 })
  @Column({ name: "manganese_pct", type: "decimal", precision: 5, scale: 3, nullable: true })
  manganesePct?: number;

  @ApiProperty({ description: "Phosphorus content (P) percentage", example: 0.025 })
  @Column({ name: "phosphorus_pct", type: "decimal", precision: 5, scale: 4, nullable: true })
  phosphorusPct?: number;

  @ApiProperty({ description: "Sulfur content (S) percentage", example: 0.015 })
  @Column({ name: "sulfur_pct", type: "decimal", precision: 5, scale: 4, nullable: true })
  sulfurPct?: number;

  @ApiProperty({ description: "Silicon content (Si) percentage", example: 0.35 })
  @Column({ name: "silicon_pct", type: "decimal", precision: 5, scale: 3, nullable: true })
  siliconPct?: number;

  @ApiProperty({ description: "Chromium content (Cr) percentage", example: 0.5 })
  @Column({ name: "chromium_pct", type: "decimal", precision: 5, scale: 3, nullable: true })
  chromiumPct?: number;

  @ApiProperty({ description: "Molybdenum content (Mo) percentage", example: 0.1 })
  @Column({ name: "molybdenum_pct", type: "decimal", precision: 5, scale: 3, nullable: true })
  molybdenumPct?: number;

  @ApiProperty({ description: "Nickel content (Ni) percentage", example: 0.3 })
  @Column({ name: "nickel_pct", type: "decimal", precision: 5, scale: 3, nullable: true })
  nickelPct?: number;

  @ApiProperty({ description: "Vanadium content (V) percentage", example: 0.05 })
  @Column({ name: "vanadium_pct", type: "decimal", precision: 5, scale: 4, nullable: true })
  vanadiumPct?: number;

  @ApiProperty({ description: "Copper content (Cu) percentage", example: 0.2 })
  @Column({ name: "copper_pct", type: "decimal", precision: 5, scale: 3, nullable: true })
  copperPct?: number;

  @ApiProperty({ description: "Niobium/Columbium content (Nb) percentage", example: 0.02 })
  @Column({ name: "niobium_pct", type: "decimal", precision: 5, scale: 4, nullable: true })
  niobiumPct?: number;

  @ApiProperty({ description: "Titanium content (Ti) percentage", example: 0.01 })
  @Column({ name: "titanium_pct", type: "decimal", precision: 5, scale: 4, nullable: true })
  titaniumPct?: number;

  @ApiProperty({ description: "Aluminum content (Al) percentage", example: 0.03 })
  @Column({ name: "aluminum_pct", type: "decimal", precision: 5, scale: 4, nullable: true })
  aluminumPct?: number;

  @ApiProperty({ description: "Nitrogen content (N) percentage", example: 0.012 })
  @Column({ name: "nitrogen_pct", type: "decimal", precision: 5, scale: 4, nullable: true })
  nitrogenPct?: number;

  @ApiProperty({ description: "Boron content (B) percentage", example: 0.001 })
  @Column({ name: "boron_pct", type: "decimal", precision: 6, scale: 5, nullable: true })
  boronPct?: number;

  @ApiProperty({ description: "Heat number reference", required: false })
  @Column({ name: "heat_number", type: "varchar", length: 50, nullable: true })
  heatNumber?: string;

  @ApiProperty({ description: "MTC reference number", required: false })
  @Column({ name: "mtc_reference", type: "varchar", length: 100, nullable: true })
  mtcReference?: string;

  @ManyToOne(() => RfqItem, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "rfq_item_id" })
  rfqItem?: RfqItem;

  @Column({ name: "rfq_item_id", type: "int", nullable: true })
  rfqItemId?: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
