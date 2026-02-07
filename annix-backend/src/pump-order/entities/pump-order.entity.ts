import { ApiProperty } from "@nestjs/swagger";
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
import { SupplierProfile } from "../../supplier/entities/supplier-profile.entity";
import { PumpOrderItem } from "./pump-order-item.entity";

export enum PumpOrderStatus {
  DRAFT = "draft",
  SUBMITTED = "submitted",
  CONFIRMED = "confirmed",
  IN_PRODUCTION = "in_production",
  READY_FOR_DISPATCH = "ready_for_dispatch",
  DISPATCHED = "dispatched",
  DELIVERED = "delivered",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export enum PumpOrderType {
  NEW_PUMP = "new_pump",
  SPARE_PARTS = "spare_parts",
  REPAIR = "repair",
  RENTAL = "rental",
}

export interface PumpOrderStatusHistoryEvent {
  timestamp: string;
  fromStatus: PumpOrderStatus;
  toStatus: PumpOrderStatus;
  changedBy: string | null;
  notes: string | null;
}

@Entity("pump_orders")
export class PumpOrder {
  @ApiProperty({ description: "Primary key" })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: "Order number", example: "PO-2024-001" })
  @Column({ name: "order_number", type: "varchar", length: 50, unique: true })
  orderNumber: string;

  @ApiProperty({ description: "Customer reference/PO number" })
  @Column({ name: "customer_reference", type: "varchar", length: 100, nullable: true })
  customerReference: string | null;

  @ApiProperty({ description: "Order status", enum: PumpOrderStatus })
  @Column({
    name: "status",
    type: "enum",
    enum: PumpOrderStatus,
    default: PumpOrderStatus.DRAFT,
  })
  status: PumpOrderStatus;

  @ApiProperty({ description: "Order type", enum: PumpOrderType })
  @Column({
    name: "order_type",
    type: "enum",
    enum: PumpOrderType,
  })
  orderType: PumpOrderType;

  @ApiProperty({ description: "Related RFQ ID" })
  @Column({ name: "rfq_id", type: "int", nullable: true })
  rfqId: number | null;

  @ApiProperty({ description: "Customer company name" })
  @Column({ name: "customer_company", type: "varchar", length: 200, nullable: true })
  customerCompany: string | null;

  @ApiProperty({ description: "Customer contact name" })
  @Column({ name: "customer_contact", type: "varchar", length: 200, nullable: true })
  customerContact: string | null;

  @ApiProperty({ description: "Customer email" })
  @Column({ name: "customer_email", type: "varchar", length: 200, nullable: true })
  customerEmail: string | null;

  @ApiProperty({ description: "Customer phone" })
  @Column({ name: "customer_phone", type: "varchar", length: 50, nullable: true })
  customerPhone: string | null;

  @ApiProperty({ description: "Delivery address" })
  @Column({ name: "delivery_address", type: "text", nullable: true })
  deliveryAddress: string | null;

  @ApiProperty({ description: "Requested delivery date" })
  @Column({ name: "requested_delivery_date", type: "date", nullable: true })
  requestedDeliveryDate: Date | null;

  @ApiProperty({ description: "Confirmed delivery date" })
  @Column({ name: "confirmed_delivery_date", type: "date", nullable: true })
  confirmedDeliveryDate: Date | null;

  @ManyToOne(() => SupplierProfile, { nullable: true })
  @JoinColumn({ name: "supplier_id" })
  supplier: SupplierProfile | null;

  @ApiProperty({ description: "Supplier ID" })
  @Column({ name: "supplier_id", type: "int", nullable: true })
  supplierId: number | null;

  @OneToMany(
    () => PumpOrderItem,
    (item) => item.order,
    { cascade: true },
  )
  items: PumpOrderItem[];

  @ApiProperty({ description: "Subtotal in ZAR" })
  @Column({
    name: "subtotal",
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 0,
  })
  subtotal: number;

  @ApiProperty({ description: "VAT amount in ZAR" })
  @Column({
    name: "vat_amount",
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 0,
  })
  vatAmount: number;

  @ApiProperty({ description: "Total amount in ZAR" })
  @Column({
    name: "total_amount",
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 0,
  })
  totalAmount: number;

  @ApiProperty({ description: "Currency code", default: "ZAR" })
  @Column({ name: "currency", type: "varchar", length: 3, default: "ZAR" })
  currency: string;

  @ApiProperty({ description: "Special instructions" })
  @Column({ name: "special_instructions", type: "text", nullable: true })
  specialInstructions: string | null;

  @ApiProperty({ description: "Internal notes" })
  @Column({ name: "internal_notes", type: "text", nullable: true })
  internalNotes: string | null;

  @ApiProperty({ description: "Status history as JSON array" })
  @Column({
    name: "status_history",
    type: "jsonb",
    default: "[]",
  })
  statusHistory: PumpOrderStatusHistoryEvent[];

  @ApiProperty({ description: "Created by user Firebase UID" })
  @Column({ name: "created_by", type: "varchar", length: 100, nullable: true })
  createdBy: string | null;

  @ApiProperty({ description: "Updated by user Firebase UID" })
  @Column({ name: "updated_by", type: "varchar", length: 100, nullable: true })
  updatedBy: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
