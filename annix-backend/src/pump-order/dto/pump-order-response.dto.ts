import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  PumpOrderStatus,
  PumpOrderStatusHistoryEvent,
  PumpOrderType,
} from "../entities/pump-order.entity";
import { PumpOrderItemType } from "../entities/pump-order-item.entity";

export class PumpOrderItemResponseDto {
  @ApiProperty({ description: "Item ID" })
  id: number;

  @ApiProperty({ description: "Order ID" })
  orderId: number;

  @ApiPropertyOptional({ description: "Product ID from catalog" })
  productId: number | null;

  @ApiProperty({ description: "Item type", enum: PumpOrderItemType })
  itemType: PumpOrderItemType;

  @ApiProperty({ description: "Line item description" })
  description: string;

  @ApiPropertyOptional({ description: "Pump type code" })
  pumpType: string | null;

  @ApiPropertyOptional({ description: "Manufacturer" })
  manufacturer: string | null;

  @ApiPropertyOptional({ description: "Model number" })
  modelNumber: string | null;

  @ApiPropertyOptional({ description: "Part number/SKU" })
  partNumber: string | null;

  @ApiPropertyOptional({ description: "Flow rate in m³/h" })
  flowRate: number | null;

  @ApiPropertyOptional({ description: "Head in meters" })
  head: number | null;

  @ApiPropertyOptional({ description: "Motor power in kW" })
  motorPowerKw: number | null;

  @ApiPropertyOptional({ description: "Casing material" })
  casingMaterial: string | null;

  @ApiPropertyOptional({ description: "Impeller material" })
  impellerMaterial: string | null;

  @ApiPropertyOptional({ description: "Seal type" })
  sealType: string | null;

  @ApiProperty({ description: "Quantity" })
  quantity: number;

  @ApiProperty({ description: "Unit price in ZAR" })
  unitPrice: number;

  @ApiProperty({ description: "Discount percentage" })
  discountPercent: number;

  @ApiProperty({ description: "Line total in ZAR" })
  lineTotal: number;

  @ApiPropertyOptional({ description: "Lead time in days" })
  leadTimeDays: number | null;

  @ApiPropertyOptional({ description: "Item-specific notes" })
  notes: string | null;

  @ApiPropertyOptional({ description: "Technical specifications" })
  specifications: Record<string, any> | null;

  @ApiProperty({ description: "Created at timestamp" })
  createdAt: Date;

  @ApiProperty({ description: "Updated at timestamp" })
  updatedAt: Date;
}

export class PumpOrderResponseDto {
  @ApiProperty({ description: "Order ID" })
  id: number;

  @ApiProperty({ description: "Order number" })
  orderNumber: string;

  @ApiPropertyOptional({ description: "Customer reference/PO number" })
  customerReference: string | null;

  @ApiProperty({ description: "Order status", enum: PumpOrderStatus })
  status: PumpOrderStatus;

  @ApiProperty({ description: "Order type", enum: PumpOrderType })
  orderType: PumpOrderType;

  @ApiPropertyOptional({ description: "Related RFQ ID" })
  rfqId: number | null;

  @ApiPropertyOptional({ description: "Customer company name" })
  customerCompany: string | null;

  @ApiPropertyOptional({ description: "Customer contact name" })
  customerContact: string | null;

  @ApiPropertyOptional({ description: "Customer email" })
  customerEmail: string | null;

  @ApiPropertyOptional({ description: "Customer phone" })
  customerPhone: string | null;

  @ApiPropertyOptional({ description: "Delivery address" })
  deliveryAddress: string | null;

  @ApiPropertyOptional({ description: "Requested delivery date" })
  requestedDeliveryDate: Date | null;

  @ApiPropertyOptional({ description: "Confirmed delivery date" })
  confirmedDeliveryDate: Date | null;

  @ApiPropertyOptional({ description: "Supplier ID" })
  supplierId: number | null;

  @ApiProperty({ description: "Order items", type: [PumpOrderItemResponseDto] })
  items: PumpOrderItemResponseDto[];

  @ApiProperty({ description: "Subtotal in ZAR" })
  subtotal: number;

  @ApiProperty({ description: "VAT amount in ZAR" })
  vatAmount: number;

  @ApiProperty({ description: "Total amount in ZAR" })
  totalAmount: number;

  @ApiProperty({ description: "Currency code" })
  currency: string;

  @ApiPropertyOptional({ description: "Special instructions" })
  specialInstructions: string | null;

  @ApiPropertyOptional({ description: "Internal notes" })
  internalNotes: string | null;

  @ApiProperty({ description: "Status history" })
  statusHistory: PumpOrderStatusHistoryEvent[];

  @ApiPropertyOptional({ description: "Created by user" })
  createdBy: string | null;

  @ApiPropertyOptional({ description: "Updated by user" })
  updatedBy: string | null;

  @ApiProperty({ description: "Created at timestamp" })
  createdAt: Date;

  @ApiProperty({ description: "Updated at timestamp" })
  updatedAt: Date;
}

export class PumpOrderListResponseDto {
  @ApiProperty({ description: "List of orders", type: [PumpOrderResponseDto] })
  data: PumpOrderResponseDto[];

  @ApiProperty({ description: "Total count" })
  total: number;

  @ApiProperty({ description: "Current page" })
  page: number;

  @ApiProperty({ description: "Items per page" })
  limit: number;

  @ApiProperty({ description: "Total pages" })
  totalPages: number;
}

export class PumpOrderSummaryDto {
  @ApiProperty({ description: "Total orders" })
  totalOrders: number;

  @ApiProperty({ description: "Orders by status" })
  byStatus: Record<PumpOrderStatus, number>;

  @ApiProperty({ description: "Orders by type" })
  byType: Record<PumpOrderType, number>;

  @ApiProperty({ description: "Total revenue" })
  totalRevenue: number;

  @ApiProperty({ description: "Average order value" })
  averageOrderValue: number;
}
