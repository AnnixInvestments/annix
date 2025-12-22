import {
  IsString,
  IsOptional,
  IsEmail,
  MinLength,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

// Only allow updating specific fields
export class UpdateCustomerProfileDto {
  @ApiPropertyOptional({ description: 'Job title', example: 'Senior Procurement Manager' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  jobTitle?: string;

  @ApiPropertyOptional({ description: 'Direct phone number', example: '+27 11 555 0125' })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  directPhone?: string;

  @ApiPropertyOptional({ description: 'Mobile phone number', example: '+27 82 555 0123' })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  mobilePhone?: string;
}

export class UpdateCompanyAddressDto {
  @ApiPropertyOptional({ description: 'Street address', example: '456 New Industrial Road' })
  @IsString()
  @IsOptional()
  streetAddress?: string;

  @ApiPropertyOptional({ description: 'City', example: 'Cape Town' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'Province or state', example: 'Western Cape' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  provinceState?: string;

  @ApiPropertyOptional({ description: 'Postal code', example: '8000' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Primary contact phone number', example: '+27 21 555 0123' })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  primaryPhone?: string;
}

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password', example: 'OldP@ssw0rd!' })
  @IsString()
  currentPassword: string;

  @ApiProperty({
    description: 'New password (min 12 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char)',
    example: 'NewSecureP@ss1!',
  })
  @IsString()
  @MinLength(12)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/,
    {
      message:
        'Password must be at least 12 characters with at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)',
    },
  )
  newPassword: string;
}

export class CustomerProfileResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  jobTitle: string;

  @ApiProperty()
  directPhone: string;

  @ApiProperty()
  mobilePhone: string;

  @ApiProperty()
  accountStatus: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  company: {
    id: number;
    legalName: string;
    tradingName: string;
    streetAddress: string;
    city: string;
    provinceState: string;
    postalCode: string;
    country: string;
    primaryPhone: string;
  };

  @ApiProperty()
  security: {
    deviceBound: boolean;
    registeredIp: string;
    registeredAt: Date;
  };
}
