import { ApiProperty } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";

@Entity("rfq_sequences")
@Unique(["year"])
export class RfqSequence {
  @ApiProperty({ description: "Primary key", example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: "Year for this sequence", example: 2026 })
  @Column({ name: "year", type: "int" })
  year: number;

  @ApiProperty({
    description: "Last used sequence number for this year",
    example: 42,
  })
  @Column({ name: "last_sequence", type: "int", default: 0 })
  lastSequence: number;

  @ApiProperty({ description: "Creation date" })
  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @ApiProperty({ description: "Last update date" })
  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
