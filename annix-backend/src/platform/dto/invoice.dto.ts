import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString } from "class-validator";
import {
  InvoiceExtractionStatus,
  InvoiceSourceModule,
  InvoiceStatus,
  InvoiceType,
} from "../entities/invoice.entity";

export class InvoiceFilterDto {
  @ApiPropertyOptional({ enum: InvoiceSourceModule })
  @IsOptional()
  @IsEnum(InvoiceSourceModule)
  sourceModule?: InvoiceSourceModule;

  @ApiPropertyOptional({ enum: InvoiceType })
  @IsOptional()
  @IsEnum(InvoiceType)
  invoiceType?: InvoiceType;

  @ApiPropertyOptional({ enum: InvoiceStatus })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional({ enum: InvoiceExtractionStatus })
  @IsOptional()
  @IsEnum(InvoiceExtractionStatus)
  extractionStatus?: InvoiceExtractionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateTo?: string;

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
