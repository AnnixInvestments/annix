import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { RubberCompany } from "./rubber-company.entity";

export enum RequisitionStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  ORDERED = "ORDERED",
  PARTIALLY_RECEIVED = "PARTIALLY_RECEIVED",
  RECEIVED = "RECEIVED",
  CANCELLED = "CANCELLED",
}

export enum RequisitionSourceType {
  LOW_STOCK = "LOW_STOCK",
  MANUAL = "MANUAL",
  EXTERNAL_PO = "EXTERNAL_PO",
}

export const requisitionStatusLabels: Record<RequisitionStatus, string> = {
  [RequisitionStatus.PENDING]: "Pending Approval",
  [RequisitionStatus.APPROVED]: "Approved",
  [RequisitionStatus.ORDERED]: "Ordered",
  [RequisitionStatus.PARTIALLY_RECEIVED]: "Partially Received",
  [RequisitionStatus.RECEIVED]: "Received",
  [RequisitionStatus.CANCELLED]: "Cancelled",
};

export const requisitionSourceLabels: Record<RequisitionSourceType, string> = {
  [RequisitionSourceType.LOW_STOCK]: "Low Stock Alert",
  [RequisitionSourceType.MANUAL]: "Manual Request",
  [RequisitionSourceType.EXTERNAL_PO]: "External PO",
};

@Entity("rubber_purchase_requisitions")
export class RubberPurchaseRequisition {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "firebase_uid", type: "varchar", length: 36, unique: true })
  firebaseUid: string;

  @Column({ name: "requisition_number", type: "varchar", length: 50, unique: true })
  requisitionNumber: string;

  @Column({
    name: "source_type",
    type: "enum",
    enum: RequisitionSourceType,
    default: RequisitionSourceType.MANUAL,
  })
  sourceType: RequisitionSourceType;

  @Column({
    type: "enum",
    enum: RequisitionStatus,
    default: RequisitionStatus.PENDING,
  })
  status: RequisitionStatus;

  @Column({ name: "supplier_company_id", type: "int", nullable: true })
  supplierCompanyId: number | null;

  @ManyToOne(() => RubberCompany, { nullable: true })
  @JoinColumn({ name: "supplier_company_id" })
  supplierCompany: RubberCompany | null;

  @Column({ name: "external_po_number", type: "varchar", length: 100, nullable: true })
  externalPoNumber: string | null;

  @Column({ name: "external_po_document_path", type: "text", nullable: true })
  externalPoDocumentPath: string | null;

  @Column({ name: "expected_delivery_date", type: "date", nullable: true })
  expectedDeliveryDate: Date | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ name: "created_by", type: "varchar", length: 255, nullable: true })
  createdBy: string | null;

  @Column({ name: "approved_by", type: "varchar", length: 255, nullable: true })
  approvedBy: string | null;

  @Column({ name: "approved_at", type: "timestamp", nullable: true })
  approvedAt: Date | null;

  @Column({ name: "rejection_reason", type: "text", nullable: true })
  rejectionReason: string | null;

  @Column({ name: "rejected_by", type: "varchar", length: 255, nullable: true })
  rejectedBy: string | null;

  @Column({ name: "rejected_at", type: "timestamp", nullable: true })
  rejectedAt: Date | null;

  @Column({ name: "ordered_at", type: "timestamp", nullable: true })
  orderedAt: Date | null;

  @Column({ name: "received_at", type: "timestamp", nullable: true })
  receivedAt: Date | null;

  @OneToMany(
    () => RubberPurchaseRequisitionItem,
    (item) => item.requisition,
    { cascade: true },
  )
  items: RubberPurchaseRequisitionItem[];

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}

export enum RequisitionItemType {
  COMPOUND = "COMPOUND",
  ROLL = "ROLL",
}

@Entity("rubber_purchase_requisition_items")
export class RubberPurchaseRequisitionItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "requisition_id", type: "int" })
  requisitionId: number;

  @ManyToOne(
    () => RubberPurchaseRequisition,
    (req) => req.items,
    {
      onDelete: "CASCADE",
    },
  )
  @JoinColumn({ name: "requisition_id" })
  requisition: RubberPurchaseRequisition;

  @Column({
    name: "item_type",
    type: "enum",
    enum: RequisitionItemType,
  })
  itemType: RequisitionItemType;

  @Column({ name: "compound_stock_id", type: "int", nullable: true })
  compoundStockId: number | null;

  @Column({ name: "compound_coding_id", type: "int", nullable: true })
  compoundCodingId: number | null;

  @Column({ name: "compound_name", type: "varchar", length: 255, nullable: true })
  compoundName: string | null;

  @Column({ name: "quantity_kg", type: "decimal", precision: 10, scale: 2 })
  quantityKg: number;

  @Column({
    name: "quantity_received_kg",
    type: "decimal",
    precision: 10,
    scale: 2,
    default: 0,
  })
  quantityReceivedKg: number;

  @Column({
    name: "unit_price",
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
  })
  unitPrice: number | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
