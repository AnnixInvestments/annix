import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsNumber,
  IsArray,
  ValidateNested,
  IsDateString,
  Min,
  MaxLength,
  IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PumpOrderStatus, PumpOrderType } from '../entities/pump-order.entity';
import { PumpOrderItemType } from '../entities/pump-order-item.entity';

export class UpdatePumpOrderItemDto {
  @ApiPropertyOptional({ description: 'Item ID for existing items' })
  @IsOptional()
  @IsInt()
  id?: number;

  @ApiPropertyOptional({ description: 'Product ID from catalog' })
  @IsOptional()
  @IsInt()
  productId?: number;

  @ApiPropertyOptional({ description: 'Item type', enum: PumpOrderItemType })
  @IsOptional()
  @IsEnum(PumpOrderItemType)
  itemType?: PumpOrderItemType;

  @ApiPropertyOptional({ description: 'Line item description' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: 'Pump type code' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  pumpType?: string;

  @ApiPropertyOptional({ description: 'Manufacturer' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  manufacturer?: string;

  @ApiPropertyOptional({ description: 'Model number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  modelNumber?: string;

  @ApiPropertyOptional({ description: 'Part number/SKU' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  partNumber?: string;

  @ApiPropertyOptional({ description: 'Flow rate in m³/h' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  flowRate?: number;

  @ApiPropertyOptional({ description: 'Head in meters' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  head?: number;

  @ApiPropertyOptional({ description: 'Motor power in kW' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  motorPowerKw?: number;

  @ApiPropertyOptional({ description: 'Casing material' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  casingMaterial?: string;

  @ApiPropertyOptional({ description: 'Impeller material' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  impellerMaterial?: string;

  @ApiPropertyOptional({ description: 'Seal type' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sealType?: string;

  @ApiPropertyOptional({ description: 'Quantity' })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ description: 'Unit price in ZAR' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional({ description: 'Discount percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPercent?: number;

  @ApiPropertyOptional({ description: 'Lead time in days' })
  @IsOptional()
  @IsInt()
  @Min(0)
  leadTimeDays?: number;

  @ApiPropertyOptional({ description: 'Item-specific notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Technical specifications as JSON' })
  @IsOptional()
  specifications?: Record<string, any>;
}

export class UpdatePumpOrderDto {
  @ApiPropertyOptional({ description: 'Customer reference/PO number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  customerReference?: string;

  @ApiPropertyOptional({ description: 'Order status', enum: PumpOrderStatus })
  @IsOptional()
  @IsEnum(PumpOrderStatus)
  status?: PumpOrderStatus;

  @ApiPropertyOptional({ description: 'Order type', enum: PumpOrderType })
  @IsOptional()
  @IsEnum(PumpOrderType)
  orderType?: PumpOrderType;

  @ApiPropertyOptional({ description: 'Related RFQ ID' })
  @IsOptional()
  @IsInt()
  rfqId?: number;

  @ApiPropertyOptional({ description: 'Customer company name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  customerCompany?: string;

  @ApiPropertyOptional({ description: 'Customer contact name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  customerContact?: string;

  @ApiPropertyOptional({ description: 'Customer email' })
  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  customerEmail?: string;

  @ApiPropertyOptional({ description: 'Customer phone' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  customerPhone?: string;

  @ApiPropertyOptional({ description: 'Delivery address' })
  @IsOptional()
  @IsString()
  deliveryAddress?: string;

  @ApiPropertyOptional({ description: 'Requested delivery date' })
  @IsOptional()
  @IsDateString()
  requestedDeliveryDate?: string;

  @ApiPropertyOptional({ description: 'Confirmed delivery date' })
  @IsOptional()
  @IsDateString()
  confirmedDeliveryDate?: string;

  @ApiPropertyOptional({ description: 'Supplier ID' })
  @IsOptional()
  @IsInt()
  supplierId?: number;

  @ApiPropertyOptional({ description: 'Order items', type: [UpdatePumpOrderItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdatePumpOrderItemDto)
  items?: UpdatePumpOrderItemDto[];

  @ApiPropertyOptional({ description: 'Currency code' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ description: 'Special instructions' })
  @IsOptional()
  @IsString()
  specialInstructions?: string;

  @ApiPropertyOptional({ description: 'Internal notes' })
  @IsOptional()
  @IsString()
  internalNotes?: string;

  @ApiPropertyOptional({ description: 'Updated by user Firebase UID' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  updatedBy?: string;

  @ApiPropertyOptional({ description: 'Status change notes' })
  @IsOptional()
  @IsString()
  statusChangeNotes?: string;
}
