import { ApiProperty } from "@nestjs/swagger";
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

export class PumpOrder {
  @ApiProperty({ description: "Primary key" })
  id: number;

  @ApiProperty({ description: "Order number", example: "PO-2024-001" })
  orderNumber: string;

  @ApiProperty({ description: "Customer reference/PO number" })
  customerReference: string | null;

  @ApiProperty({ description: "Order status", enum: PumpOrderStatus })
  status: PumpOrderStatus;

  @ApiProperty({ description: "Order type", enum: PumpOrderType })
  orderType: PumpOrderType;

  @ApiProperty({ description: "Related RFQ ID" })
  rfqId: number | null;

  @ApiProperty({ description: "Customer company name" })
  customerCompany: string | null;

  @ApiProperty({ description: "Customer contact name" })
  customerContact: string | null;

  @ApiProperty({ description: "Customer email" })
  customerEmail: string | null;

  @ApiProperty({ description: "Customer phone" })
  customerPhone: string | null;

  @ApiProperty({ description: "Delivery address" })
  deliveryAddress: string | null;

  @ApiProperty({ description: "Requested delivery date" })
  requestedDeliveryDate: Date | null;

  @ApiProperty({ description: "Confirmed delivery date" })
  confirmedDeliveryDate: Date | null;

  supplier: SupplierProfile | null;

  @ApiProperty({ description: "Supplier ID" })
  supplierId: number | null;

  items: PumpOrderItem[];

  @ApiProperty({ description: "Subtotal in ZAR" })
  subtotal: number;

  @ApiProperty({ description: "VAT amount in ZAR" })
  vatAmount: number;

  @ApiProperty({ description: "Total amount in ZAR" })
  totalAmount: number;

  @ApiProperty({ description: "Currency code", default: "ZAR" })
  currency: string;

  @ApiProperty({ description: "Special instructions" })
  specialInstructions: string | null;

  @ApiProperty({ description: "Internal notes" })
  internalNotes: string | null;

  @ApiProperty({ description: "Status history as JSON array" })
  statusHistory: PumpOrderStatusHistoryEvent[];

  @ApiProperty({ description: "Created by user Firebase UID" })
  createdBy: string | null;

  @ApiProperty({ description: "Updated by user Firebase UID" })
  updatedBy: string | null;

  createdAt: Date;

  updatedAt: Date;
}
