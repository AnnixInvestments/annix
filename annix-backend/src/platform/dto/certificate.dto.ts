import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString } from "class-validator";
import {
  CertificateCategory,
  CertificateProcessingStatus,
  CertificateSourceModule,
} from "../entities/certificate.entity";

export class CertificateFilterDto {
  @ApiPropertyOptional({ enum: CertificateSourceModule })
  @IsOptional()
  @IsEnum(CertificateSourceModule)
  sourceModule?: CertificateSourceModule;

  @ApiPropertyOptional({ enum: CertificateCategory })
  @IsOptional()
  @IsEnum(CertificateCategory)
  certificateCategory?: CertificateCategory;

  @ApiPropertyOptional({ enum: CertificateProcessingStatus })
  @IsOptional()
  @IsEnum(CertificateProcessingStatus)
  processingStatus?: CertificateProcessingStatus;

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
  @IsString()
  compoundCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Transform(({ value }) => (value ? Number(value) : undefined))
  jobCardId?: number;

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
