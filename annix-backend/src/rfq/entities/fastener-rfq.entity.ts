import { ApiProperty } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { RfqItem } from "./rfq-item.entity";

export enum FastenerCategory {
  BOLT = "bolt",
  NUT = "nut",
  WASHER = "washer",
  GASKET = "gasket",
  SET_SCREW = "set_screw",
  MACHINE_SCREW = "machine_screw",
  INSERT = "insert",
}

@Entity("fastener_rfqs")
export class FastenerRfq {
  @ApiProperty({ description: "Primary key", example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: "Fastener category", enum: FastenerCategory })
  @Column({ name: "fastener_category", type: "enum", enum: FastenerCategory })
  fastenerCategory: FastenerCategory;

  @ApiProperty({ description: "Specific type within category", example: "hex_bolt" })
  @Column({ name: "specific_type", type: "varchar", length: 100 })
  specificType: string;

  @ApiProperty({ description: "Thread size designation", example: "M16" })
  @Column({ name: "size", type: "varchar", length: 20 })
  size: string;

  @ApiProperty({ description: "Grade/class", example: "8.8" })
  @Column({ name: "grade", type: "varchar", length: 50, nullable: true })
  grade: string | null;

  @ApiProperty({ description: "Material specification", example: "Carbon Steel" })
  @Column({ name: "material", type: "varchar", length: 100, nullable: true })
  material: string | null;

  @ApiProperty({ description: "Surface finish", example: "zinc" })
  @Column({ name: "finish", type: "varchar", length: 50, nullable: true })
  finish: string | null;

  @ApiProperty({ description: "Thread type (coarse/fine)", example: "coarse" })
  @Column({ name: "thread_type", type: "varchar", length: 20, nullable: true })
  threadType: string | null;

  @ApiProperty({ description: "Manufacturing standard", example: "DIN 931" })
  @Column({ name: "standard", type: "varchar", length: 100, nullable: true })
  standard: string | null;

  @ApiProperty({ description: "Length in mm (for bolts/screws)", example: 50 })
  @Column({ name: "length_mm", type: "float", nullable: true })
  lengthMm: number | null;

  @ApiProperty({ description: "Quantity required", example: 100 })
  @Column({ name: "quantity_value", type: "int", default: 1 })
  quantityValue: number;

  @ApiProperty({ description: "Additional notes" })
  @Column({ name: "notes", type: "text", nullable: true })
  notes: string | null;

  @OneToOne(
    () => RfqItem,
    (rfqItem) => rfqItem.fastenerDetails,
  )
  @JoinColumn({ name: "rfq_item_id" })
  rfqItem: RfqItem;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
