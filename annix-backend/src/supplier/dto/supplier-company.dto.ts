import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsArray,
  IsIn,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SupplierCompanyDto {
  @ApiProperty({ description: 'Company legal name', example: 'ABC Supplies (Pty) Ltd' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  legalName: string;

  @ApiPropertyOptional({ description: 'Trading name if different from legal name', example: 'ABC Supplies' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  tradingName?: string;

  @ApiProperty({ description: 'Company registration number (CIPC)', example: '2020/123456/07' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  registrationNumber: string;

  @ApiPropertyOptional({ description: 'Tax number', example: '1234567890' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  taxNumber?: string;

  @ApiPropertyOptional({ description: 'VAT registration number', example: '4123456789' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  vatNumber?: string;

  @ApiProperty({ description: 'Street address', example: '456 Supplier Avenue' })
  @IsString()
  @IsNotEmpty()
  streetAddress: string;

  @ApiPropertyOptional({ description: 'Address line 2', example: 'Unit 5' })
  @IsString()
  @IsOptional()
  addressLine2?: string;

  @ApiProperty({ description: 'City', example: 'Cape Town' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city: string;

  @ApiProperty({ description: 'Province or state', example: 'Western Cape' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  provinceState: string;

  @ApiProperty({ description: 'Postal code', example: '8001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  postalCode: string;

  @ApiPropertyOptional({ description: 'Country', example: 'South Africa', default: 'South Africa' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  country?: string;

  @ApiProperty({ description: 'Primary contact name', example: 'Jane Doe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  primaryContactName: string;

  @ApiProperty({ description: 'Primary contact email', example: 'jane@abcsupplies.co.za' })
  @IsEmail()
  @IsNotEmpty()
  primaryContactEmail: string;

  @ApiProperty({ description: 'Primary contact phone', example: '+27 21 555 0123' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  primaryContactPhone: string;

  @ApiPropertyOptional({ description: 'Company main phone number', example: '+27 21 555 0100' })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  primaryPhone?: string;

  @ApiPropertyOptional({ description: 'Fax number', example: '+27 21 555 0101' })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  faxNumber?: string;

  @ApiPropertyOptional({ description: 'General company email', example: 'info@abcsupplies.co.za' })
  @IsEmail()
  @IsOptional()
  generalEmail?: string;

  @ApiPropertyOptional({ description: 'Company website', example: 'https://www.abcsupplies.co.za' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  website?: string;

  @ApiPropertyOptional({
    description: 'Operational regions',
    example: ['Gauteng', 'Western Cape', 'KwaZulu-Natal'],
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  operationalRegions?: string[];

  @ApiPropertyOptional({ description: 'Industry type', example: 'Manufacturing' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  industryType?: string;

  @ApiPropertyOptional({ description: 'Company size category', example: 'medium' })
  @IsIn(['micro', 'small', 'medium', 'large', 'enterprise'])
  @IsOptional()
  companySize?: string;
}
