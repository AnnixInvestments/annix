import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SupplierDocumentType, SupplierDocumentValidationStatus } from '../entities/supplier-document.entity';

export class UploadSupplierDocumentDto {
  @ApiProperty({
    description: 'Document type',
    enum: SupplierDocumentType,
    example: SupplierDocumentType.REGISTRATION_CERT,
  })
  @IsEnum(SupplierDocumentType)
  @IsNotEmpty()
  documentType: SupplierDocumentType;

  @ApiPropertyOptional({ description: 'Document expiry date', example: '2025-12-31' })
  @IsDateString()
  @IsOptional()
  expiryDate?: string;
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

  @ApiPropertyOptional({ description: 'Validation notes', example: 'Document verified successfully' })
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
