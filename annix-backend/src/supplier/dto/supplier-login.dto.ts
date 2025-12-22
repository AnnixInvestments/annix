import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SupplierLoginDto {
  @ApiProperty({ description: 'Email address', example: 'supplier@company.co.za' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Password' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ description: 'Device fingerprint hash', example: 'a1b2c3d4e5f6...' })
  @IsString()
  @IsNotEmpty()
  deviceFingerprint: string;

  @ApiPropertyOptional({ description: 'Browser and device information' })
  @IsObject()
  @IsOptional()
  browserInfo?: Record<string, any>;
}

export class SupplierLoginResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  supplier: {
    id: number;
    email: string;
    firstName?: string;
    lastName?: string;
    companyName?: string;
    accountStatus: string;
    onboardingStatus: string;
  };
}
