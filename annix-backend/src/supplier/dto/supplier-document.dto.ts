import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  IsBoolean,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  SupplierDocumentType,
  SupplierDocumentValidationStatus,
} from '../entities/supplier-document.entity';

export class VerificationExtractedDataDto {
  @IsOptional()
  @IsString()
  vatNumber?: string;

  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  streetAddress?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  provinceState?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsNumber()
  beeLevel?: number;

  @IsOptional()
  @IsString()
  beeExpiryDate?: string;

  @IsOptional()
  @IsString()
  verificationAgency?: string;

  @IsOptional()
  @IsNumber()
  confidence?: number;
}

export class VerificationFieldResultDto {
  @IsString()
  field: string;

  @IsOptional()
  expected?: string | number | null;

  @IsOptional()
  extracted?: string | number | null;

  @IsBoolean()
  match: boolean;

  @IsOptional()
  @IsNumber()
  similarity?: number;
}

export class VerificationResultDto {
  @IsBoolean()
  success: boolean;

  @IsNumber()
  overallConfidence: number;

  @IsBoolean()
  allFieldsMatch: boolean;

  @IsOptional()
  @IsObject()
  extractedData?: VerificationExtractedDataDto;

  @IsOptional()
  fieldResults?: VerificationFieldResultDto[];
}

export class UploadSupplierDocumentDto {
  @ApiProperty({
    description: 'Document type',
    enum: SupplierDocumentType,
    example: SupplierDocumentType.REGISTRATION_CERT,
  })
  @IsEnum(SupplierDocumentType)
  @IsNotEmpty()
  documentType: SupplierDocumentType;

  @ApiPropertyOptional({
    description: 'Document expiry date',
    example: '2025-12-31',
  })
  @IsDateString()
  @IsOptional()
  expiryDate?: string;

  @ApiPropertyOptional({
    description: 'Pre-verified document verification result from frontend Nix verification',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => VerificationResultDto)
  verificationResult?: VerificationResultDto;
}

export class ReviewDocumentDto {
  @ApiProperty({
    description: 'Validation status',
    enum: SupplierDocumentValidationStatus,
    example: SupplierDocumentValidationStatus.VALID,
  })
  @IsEnum(SupplierDocumentValidationStatus)
  @IsNotEmpty()
  validationStatus: SupplierDocumentValidationStatus;

  @ApiPropertyOptional({
    description: 'Validation notes',
    example: 'Document verified successfully',
  })
  @IsString()
  @IsOptional()
  validationNotes?: string;
}

export class SupplierDocumentResponseDto {
  id: number;
  documentType: SupplierDocumentType;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
  validationStatus: SupplierDocumentValidationStatus;
  validationNotes?: string;
  expiryDate?: Date;
  isRequired: boolean;
}
