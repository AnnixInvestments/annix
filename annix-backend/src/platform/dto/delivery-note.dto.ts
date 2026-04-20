import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, MaxLength } from "class-validator";
import {
  DeliveryNoteSourceModule,
  DeliveryNoteStatus,
  DeliveryNoteType,
} from "../entities/delivery-note.entity";

export class DeliveryNoteFilterDto {
  @ApiPropertyOptional({ enum: DeliveryNoteSourceModule })
  @IsOptional()
  @IsEnum(DeliveryNoteSourceModule)
  sourceModule?: DeliveryNoteSourceModule;

  @ApiPropertyOptional({ enum: DeliveryNoteType })
  @IsOptional()
  @IsEnum(DeliveryNoteType)
  deliveryNoteType?: DeliveryNoteType;

  @ApiPropertyOptional({ enum: DeliveryNoteStatus })
  @IsOptional()
  @IsEnum(DeliveryNoteStatus)
  status?: DeliveryNoteStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Transform(({ value }) => (value ? Number(value) : undefined))
  supplierContactId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Transform(({ value }) => (value ? Number(value) : undefined))
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Transform(({ value }) => (value ? Number(value) : undefined))
  limit?: number;
}

export class CreateDeliveryNoteDto {
  @ApiProperty({ enum: DeliveryNoteSourceModule })
  @IsEnum(DeliveryNoteSourceModule)
  sourceModule: DeliveryNoteSourceModule;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  deliveryNumber: string;

  @ApiPropertyOptional({ enum: DeliveryNoteType })
  @IsOptional()
  @IsEnum(DeliveryNoteType)
  deliveryNoteType?: DeliveryNoteType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  supplierName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  supplierContactId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deliveryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  customerReference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  receivedBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  createdBy?: string;
}

export class UpdateDeliveryNoteDto {
  @ApiPropertyOptional({ enum: DeliveryNoteStatus })
  @IsOptional()
  @IsEnum(DeliveryNoteStatus)
  status?: DeliveryNoteStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  supplierName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  supplierContactId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deliveryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  customerReference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  extractedData?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documentPath?: string;
}
