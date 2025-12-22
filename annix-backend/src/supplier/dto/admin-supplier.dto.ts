import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SupplierAccountStatus } from '../entities/supplier-profile.entity';

export class RejectSupplierDto {
  @ApiProperty({ description: 'Rejection reason', example: 'Documents expired or invalid' })
  @IsString()
  @IsNotEmpty()
  rejectionReason: string;

  @ApiProperty({
    description: 'Steps the supplier needs to take to resolve the issue',
    example: '1. Upload valid Tax Clearance Certificate\n2. Ensure BEE Certificate is not expired',
  })
  @IsString()
  @IsNotEmpty()
  remediationSteps: string;
}

export class SuspendSupplierDto {
  @ApiProperty({ description: 'Suspension reason', example: 'Compliance violation' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class UpdateSupplierStatusDto {
  @ApiProperty({
    description: 'New account status',
    enum: SupplierAccountStatus,
    example: SupplierAccountStatus.ACTIVE,
  })
  @IsEnum(SupplierAccountStatus)
  @IsNotEmpty()
  status: SupplierAccountStatus;

  @ApiPropertyOptional({ description: 'Reason for status change' })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class SupplierListItemDto {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  accountStatus: string;
  onboardingStatus: string;
  createdAt: Date;
}

export class SupplierDetailDto extends SupplierListItemDto {
  company?: {
    id: number;
    legalName: string;
    tradingName?: string;
    registrationNumber: string;
    taxNumber?: string;
    vatNumber?: string;
    city: string;
    provinceState: string;
    country: string;
    primaryContactName: string;
    primaryContactEmail: string;
    primaryContactPhone: string;
    industryType?: string;
  };
  documents: {
    id: number;
    documentType: string;
    fileName: string;
    validationStatus: string;
    uploadedAt: Date;
  }[];
  onboarding: {
    status: string;
    companyDetailsComplete: boolean;
    documentsComplete: boolean;
    submittedAt?: Date;
    rejectionReason?: string;
    remediationSteps?: string;
    resubmissionCount: number;
  };
}
