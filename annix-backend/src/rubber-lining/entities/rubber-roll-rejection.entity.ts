import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { RubberRollStock } from "./rubber-roll-stock.entity";
import { RubberSupplierCoc } from "./rubber-supplier-coc.entity";

export enum RollRejectionStatus {
  PENDING_RETURN = "PENDING_RETURN",
  RETURNED = "RETURNED",
  REPLACEMENT_RECEIVED = "REPLACEMENT_RECEIVED",
  CLOSED = "CLOSED",
}

@Entity("rubber_roll_rejections")
@Index(["originalSupplierCocId", "rollNumber"], { unique: true })
export class RubberRollRejection {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "firebase_uid", type: "varchar", length: 100, unique: true })
  firebaseUid: string;

  @Column({ name: "original_supplier_coc_id", type: "int" })
  originalSupplierCocId: number;

  @ManyToOne(() => RubberSupplierCoc, { nullable: false })
  @JoinColumn({ name: "original_supplier_coc_id" })
  originalSupplierCoc: RubberSupplierCoc;

  @Column({ name: "roll_number", type: "varchar", length: 100 })
  rollNumber: string;

  @Column({ name: "roll_stock_id", type: "int", nullable: true })
  rollStockId: number | null;

  @ManyToOne(() => RubberRollStock, { nullable: true })
  @JoinColumn({ name: "roll_stock_id" })
  rollStock: RubberRollStock | null;

  @Column({ name: "rejection_reason", type: "text" })
  rejectionReason: string;

  @Column({ name: "rejected_by", type: "varchar", length: 100 })
  rejectedBy: string;

  @Column({ name: "rejected_at", type: "timestamp" })
  rejectedAt: Date;

  @Column({ name: "return_document_path", type: "varchar", length: 500, nullable: true })
  returnDocumentPath: string | null;

  @Column({ name: "replacement_supplier_coc_id", type: "int", nullable: true })
  replacementSupplierCocId: number | null;

  @ManyToOne(() => RubberSupplierCoc, { nullable: true })
  @JoinColumn({ name: "replacement_supplier_coc_id" })
  replacementSupplierCoc: RubberSupplierCoc | null;

  @Column({ name: "replacement_roll_number", type: "varchar", length: 100, nullable: true })
  replacementRollNumber: string | null;

  @Column({
    name: "status",
    type: "enum",
    enum: RollRejectionStatus,
    default: RollRejectionStatus.PENDING_RETURN,
  })
  status: RollRejectionStatus;

  @Column({ name: "notes", type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
