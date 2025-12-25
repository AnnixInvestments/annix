import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsBoolean,
  IsIn,
  MinLength,
  Matches,
  ValidateNested,
  IsObject,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CompanyDetailsDto {
  @ApiProperty({ description: 'Company legal name', example: 'Acme Industrial Solutions (Pty) Ltd' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  legalName: string;

  @ApiPropertyOptional({ description: 'Trading name if different from legal name', example: 'Acme Industrial' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  tradingName?: string;

  @ApiProperty({ description: 'Company registration number', example: '2020/123456/07' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  registrationNumber: string;

  @ApiPropertyOptional({ description: 'VAT registration number', example: '4123456789' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  vatNumber?: string;

  @ApiPropertyOptional({ description: 'Industry type', example: 'Mining' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  industry?: string;

  @ApiPropertyOptional({ description: 'Company size category', example: 'medium' })
  @IsIn(['micro', 'small', 'medium', 'large', 'enterprise'])
  @IsOptional()
  companySize?: string;

  @ApiProperty({ description: 'Street address', example: '123 Industrial Road' })
  @IsString()
  @IsNotEmpty()
  streetAddress: string;

  @ApiProperty({ description: 'City', example: 'Johannesburg' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city: string;

  @ApiProperty({ description: 'Province or state', example: 'Gauteng' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  provinceState: string;

  @ApiProperty({ description: 'Postal code', example: '2000' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  postalCode: string;

  @ApiPropertyOptional({ description: 'Country', example: 'South Africa', default: 'South Africa' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  country?: string;

  @ApiProperty({ description: 'Primary contact phone number', example: '+27 11 555 0123' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  primaryPhone: string;

  @ApiPropertyOptional({ description: 'Fax number', example: '+27 11 555 0124' })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  faxNumber?: string;

  @ApiPropertyOptional({ description: 'General company email', example: 'info@acme.co.za' })
  @IsEmail()
  @IsOptional()
  generalEmail?: string;

  @ApiPropertyOptional({ description: 'Company website', example: 'https://www.acme.co.za' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  website?: string;
}

export class UserDetailsDto {
  @ApiProperty({ description: 'First name', example: 'John' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ description: 'Last name', example: 'Smith' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @ApiPropertyOptional({ description: 'Job title or role', example: 'Procurement Manager' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  jobTitle?: string;

  @ApiProperty({ description: 'Email address (used as login)', example: 'john.smith@acme.co.za' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Password (min 10 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char)',
    example: 'SecureP@ss!',
  })
  @IsString()
  @MinLength(10)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{10,}$/,
    {
      message:
        'Password must be at least 10 characters with at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)',
    },
  )
  password: string;

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

export class DeviceBindingDto {
  @ApiProperty({ description: 'Device fingerprint hash', example: 'a1b2c3d4e5f6...' })
  @IsString()
  @IsNotEmpty()
  deviceFingerprint: string;

  @ApiPropertyOptional({ description: 'Browser and device information' })
  @IsObject()
  @IsOptional()
  browserInfo?: Record<string, any>;

  @ApiProperty({ description: 'Terms and conditions accepted', example: true })
  @IsBoolean()
  termsAccepted: boolean;

  @ApiProperty({
    description: 'Security policy accepted (account locked to this device)',
    example: true,
  })
  @IsBoolean()
  securityPolicyAccepted: boolean;
}

export class CreateCustomerRegistrationDto {
  @ApiProperty({ description: 'Company details', type: CompanyDetailsDto })
  @ValidateNested()
  @Type(() => CompanyDetailsDto)
  company: CompanyDetailsDto;

  @ApiProperty({ description: 'User details', type: UserDetailsDto })
  @ValidateNested()
  @Type(() => UserDetailsDto)
  user: UserDetailsDto;

  @ApiProperty({ description: 'Security binding details', type: DeviceBindingDto })
  @ValidateNested()
  @Type(() => DeviceBindingDto)
  security: DeviceBindingDto;
}
