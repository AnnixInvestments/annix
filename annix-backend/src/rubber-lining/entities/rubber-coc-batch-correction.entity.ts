import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { RubberCompoundBatch } from "./rubber-compound-batch.entity";
import { RubberSupplierCoc } from "./rubber-supplier-coc.entity";

@Entity("rubber_coc_batch_corrections")
export class RubberCocBatchCorrection {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => RubberSupplierCoc, { onDelete: "CASCADE" })
  @JoinColumn({ name: "supplier_coc_id" })
  supplierCoc: RubberSupplierCoc;

  @Column({ name: "supplier_coc_id" })
  supplierCocId: number;

  @ManyToOne(() => RubberCompoundBatch, { onDelete: "CASCADE" })
  @JoinColumn({ name: "compound_batch_id" })
  compoundBatch: RubberCompoundBatch;

  @Column({ name: "compound_batch_id" })
  compoundBatchId: number;

  @Column({ name: "supplier_name", type: "varchar", length: 255, nullable: true })
  supplierName: string | null;

  @Column({ name: "compound_code", type: "varchar", length: 100, nullable: true })
  compoundCode: string | null;

  @Column({ name: "batch_number", type: "varchar", length: 100 })
  batchNumber: string;

  @Column({ name: "field_name", type: "varchar", length: 50 })
  fieldName: string;

  @Column({ name: "original_value", type: "text", nullable: true })
  originalValue: string | null;

  @Column({ name: "corrected_value", type: "text" })
  correctedValue: string;

  @Column({ name: "corrected_by", type: "varchar", length: 100, nullable: true })
  correctedBy: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
