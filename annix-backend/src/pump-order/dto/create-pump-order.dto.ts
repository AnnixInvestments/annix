import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
import { PumpOrderType } from '../entities/pump-order.entity';
import { PumpOrderItemType } from '../entities/pump-order-item.entity';

export class CreatePumpOrderItemDto {
  @ApiPropertyOptional({ description: 'Product ID from catalog' })
  @IsOptional()
  @IsInt()
  productId?: number;

  @ApiProperty({ description: 'Item type', enum: PumpOrderItemType })
  @IsEnum(PumpOrderItemType)
  itemType: PumpOrderItemType;

  @ApiProperty({ description: 'Line item description' })
  @IsString()
  @MaxLength(2000)
  description: string;

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

  @ApiProperty({ description: 'Quantity', default: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Unit price in ZAR' })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({ description: 'Discount percentage', default: 0 })
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

export class CreatePumpOrderDto {
  @ApiPropertyOptional({ description: 'Customer reference/PO number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  customerReference?: string;

  @ApiProperty({ description: 'Order type', enum: PumpOrderType })
  @IsEnum(PumpOrderType)
  orderType: PumpOrderType;

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

  @ApiPropertyOptional({ description: 'Supplier ID' })
  @IsOptional()
  @IsInt()
  supplierId?: number;

  @ApiProperty({ description: 'Order items', type: [CreatePumpOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePumpOrderItemDto)
  items: CreatePumpOrderItemDto[];

  @ApiPropertyOptional({ description: 'Currency code', default: 'ZAR' })
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

  @ApiPropertyOptional({ description: 'Created by user Firebase UID' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  createdBy?: string;
}
