import { ApiProperty } from "@nestjs/swagger";
import { PumpProduct } from "../../pump-product/entities/pump-product.entity";
import { PumpOrder } from "./pump-order.entity";

export enum PumpOrderItemType {
  NEW_PUMP = "new_pump",
  SPARE_PART = "spare_part",
  ACCESSORY = "accessory",
  SERVICE = "service",
}

export class PumpOrderItem {
  @ApiProperty({ description: "Primary key" })
  id: number;

  order: PumpOrder;

  @ApiProperty({ description: "Order ID" })
  orderId: number;

  product: PumpProduct | null;

  @ApiProperty({ description: "Product ID from catalog" })
  productId: number | null;

  @ApiProperty({ description: "Item type", enum: PumpOrderItemType })
  itemType: PumpOrderItemType;

  @ApiProperty({ description: "Line item description" })
  description: string;

  @ApiProperty({ description: "Pump type code" })
  pumpType: string | null;

  @ApiProperty({ description: "Manufacturer" })
  manufacturer: string | null;

  @ApiProperty({ description: "Model number" })
  modelNumber: string | null;

  @ApiProperty({ description: "Part number/SKU" })
  partNumber: string | null;

  @ApiProperty({ description: "Flow rate in m³/h" })
  flowRate: number | null;

  @ApiProperty({ description: "Head in meters" })
  head: number | null;

  @ApiProperty({ description: "Motor power in kW" })
  motorPowerKw: number | null;

  @ApiProperty({ description: "Casing material" })
  casingMaterial: string | null;

  @ApiProperty({ description: "Impeller material" })
  impellerMaterial: string | null;

  @ApiProperty({ description: "Seal type" })
  sealType: string | null;

  @ApiProperty({ description: "Quantity ordered" })
  quantity: number;

  @ApiProperty({ description: "Unit price in ZAR" })
  unitPrice: number;

  @ApiProperty({ description: "Discount percentage" })
  discountPercent: number;

  @ApiProperty({ description: "Line total in ZAR" })
  lineTotal: number;

  @ApiProperty({ description: "Lead time in days" })
  leadTimeDays: number | null;

  @ApiProperty({ description: "Item-specific notes" })
  notes: string | null;

  @ApiProperty({ description: "Technical specifications as JSON" })
  specifications: Record<string, any> | null;

  createdAt: Date;

  updatedAt: Date;
}
