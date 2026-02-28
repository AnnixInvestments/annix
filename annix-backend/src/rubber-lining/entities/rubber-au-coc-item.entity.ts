import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { RubberAuCoc } from "./rubber-au-coc.entity";
import { RubberRollStock } from "./rubber-roll-stock.entity";

export interface TestDataSummary {
  batchNumbers: string[];
  shoreAHardness?: { min: number; max: number; avg: number };
  specificGravity?: { min: number; max: number; avg: number };
  reboundPercent?: { min: number; max: number; avg: number };
  tearStrengthKnM?: { min: number; max: number; avg: number };
  tensileStrengthMpa?: { min: number; max: number; avg: number };
  elongationPercent?: { min: number; max: number; avg: number };
  rheometerSMin?: { min: number; max: number; avg: number };
  rheometerSMax?: { min: number; max: number; avg: number };
  rheometerTs2?: { min: number; max: number; avg: number };
  rheometerTc90?: { min: number; max: number; avg: number };
  allBatchesPassed: boolean;
}

@Entity("rubber_au_coc_items")
export class RubberAuCocItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "firebase_uid", type: "varchar", length: 100, unique: true })
  firebaseUid: string;

  @Column({ name: "au_coc_id", type: "int" })
  auCocId: number;

  @ManyToOne(() => RubberAuCoc, { onDelete: "CASCADE" })
  @JoinColumn({ name: "au_coc_id" })
  auCoc: RubberAuCoc;

  @Column({ name: "roll_stock_id", type: "int" })
  rollStockId: number;

  @ManyToOne(() => RubberRollStock)
  @JoinColumn({ name: "roll_stock_id" })
  rollStock: RubberRollStock;

  @Column({ name: "test_data_summary", type: "jsonb", nullable: true })
  testDataSummary: TestDataSummary | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
