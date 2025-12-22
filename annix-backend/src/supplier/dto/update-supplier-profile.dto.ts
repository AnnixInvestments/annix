import {
  IsString,
  IsOptional,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSupplierProfileDto {
  @ApiPropertyOptional({ description: 'First name', example: 'John' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name', example: 'Smith' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ description: 'Job title or role', example: 'Sales Manager' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  jobTitle?: string;

  @ApiPropertyOptional({ description: 'Direct phone number', example: '+27 21 555 0125' })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  directPhone?: string;

  @ApiPropertyOptional({ description: 'Mobile phone number', example: '+27 82 555 0123' })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  mobilePhone?: string;

  @ApiPropertyOptional({ description: 'Accept terms and conditions' })
  @IsBoolean()
  @IsOptional()
  acceptTerms?: boolean;

  @ApiPropertyOptional({ description: 'Accept security policy' })
  @IsBoolean()
  @IsOptional()
  acceptSecurityPolicy?: boolean;
}
