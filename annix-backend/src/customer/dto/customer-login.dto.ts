import { IsString, IsNotEmpty, IsEmail, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CustomerLoginDto {
  @ApiProperty({ description: 'Email address', example: 'john.smith@acme.co.za' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Password', example: 'SecureP@ssw0rd!' })
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

export class CustomerLoginResponseDto {
  @ApiProperty({ description: 'JWT access token' })
  accessToken: string;

  @ApiProperty({ description: 'JWT refresh token' })
  refreshToken: string;

  @ApiProperty({ description: 'Token expiration time in seconds' })
  expiresIn: number;

  @ApiProperty({ description: 'Customer profile ID' })
  customerId: number;

  @ApiProperty({ description: 'Customer full name' })
  name: string;

  @ApiProperty({ description: 'Company name' })
  companyName: string;

  @ApiProperty({ description: 'Warning if IP address has changed' })
  ipMismatchWarning?: boolean;

  @ApiProperty({ description: 'Registered IP address' })
  registeredIp?: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;

  @ApiProperty({ description: 'Device fingerprint hash' })
  @IsString()
  @IsNotEmpty()
  deviceFingerprint: string;
}
