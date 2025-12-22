import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsPositive,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CustomerAccountStatus } from '../entities/customer-profile.entity';

export class CustomerQueryDto {
  @ApiPropertyOptional({ description: 'Search by company name or email' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by account status', enum: CustomerAccountStatus })
  @IsEnum(CustomerAccountStatus)
  @IsOptional()
  status?: CustomerAccountStatus;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Sort field', default: 'createdAt' })
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort direction', default: 'DESC' })
  @IsString()
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class SuspendCustomerDto {
  @ApiProperty({ description: 'Reason for suspension', example: 'Violation of terms of service' })
  @IsString()
  reason: string;
}

export class ReactivateCustomerDto {
  @ApiPropertyOptional({ description: 'Note for reactivation', example: 'Issue resolved' })
  @IsString()
  @IsOptional()
  note?: string;
}

export class ResetDeviceBindingDto {
  @ApiProperty({ description: 'Reason for device reset', example: 'Customer requested device change' })
  @IsString()
  reason: string;
}

export class CustomerListItemDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  companyName: string;

  @ApiProperty()
  accountStatus: CustomerAccountStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  lastLoginAt?: Date | null;

  @ApiProperty()
  deviceBound: boolean;
}

export class CustomerListResponseDto {
  @ApiProperty({ type: [CustomerListItemDto] })
  items: CustomerListItemDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

export class CustomerDetailDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  jobTitle?: string;

  @ApiPropertyOptional()
  directPhone?: string;

  @ApiPropertyOptional()
  mobilePhone?: string;

  @ApiProperty()
  accountStatus: CustomerAccountStatus;

  @ApiPropertyOptional()
  suspensionReason?: string | null;

  @ApiPropertyOptional()
  suspendedAt?: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  termsAcceptedAt?: Date;

  @ApiProperty()
  company: {
    id: number;
    legalName: string;
    tradingName?: string;
    registrationNumber: string;
    vatNumber?: string;
    industry?: string;
    companySize?: string;
    streetAddress: string;
    city: string;
    provinceState: string;
    postalCode: string;
    country: string;
    primaryPhone: string;
    generalEmail?: string;
    website?: string;
  };

  @ApiPropertyOptional()
  deviceBinding?: {
    id: number;
    deviceFingerprint: string;
    registeredIp: string;
    ipCountry?: string;
    browserInfo: Record<string, any>;
    createdAt: Date;
    isActive: boolean;
  } | null;

  @ApiProperty()
  recentLogins: {
    attemptTime: Date;
    success: boolean;
    failureReason?: string;
    ipAddress: string;
    ipMismatchWarning: boolean;
  }[];
}
