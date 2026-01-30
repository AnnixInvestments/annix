import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsInt,
  IsObject,
  IsArray,
  Min,
  Max,
} from 'class-validator';

export class SaveAnonymousDraftDto {
  @ApiProperty({
    description: 'Customer email for recovery',
    example: 'customer@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @ApiProperty({
    description: 'Project name',
    example: '500NB Pipeline Extension',
    required: false,
  })
  @IsOptional()
  @IsString()
  projectName?: string;

  @ApiProperty({
    description: 'Current step in the RFQ form (1-5)',
    example: 2,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  currentStep: number;

  @ApiProperty({
    description: 'Complete form state as JSON',
  })
  @IsObject()
  formData: Record<string, any>;

  @ApiProperty({
    description: 'Global specifications as JSON',
    required: false,
  })
  @IsOptional()
  @IsObject()
  globalSpecs?: Record<string, any>;

  @ApiProperty({
    description: 'Required products/services selected',
    required: false,
  })
  @IsOptional()
  @IsArray()
  requiredProducts?: string[];

  @ApiProperty({
    description: 'Pipe entries as JSON',
    required: false,
  })
  @IsOptional()
  @IsArray()
  entries?: Record<string, any>[];

  @ApiProperty({
    description: 'Browser fingerprint for matching',
    required: false,
  })
  @IsOptional()
  @IsString()
  browserFingerprint?: string;
}

export class AnonymousDraftResponseDto {
  @ApiProperty({ description: 'Draft ID', example: 1 })
  id: number;

  @ApiProperty({
    description: 'Recovery token for email-based retrieval',
    example: 'abc123def456...',
  })
  recoveryToken: string;

  @ApiProperty({
    description: 'Customer email',
    example: 'customer@example.com',
  })
  customerEmail?: string;

  @ApiProperty({ description: 'Project name', example: '500NB Pipeline' })
  projectName?: string;

  @ApiProperty({ description: 'Current form step', example: 2 })
  currentStep: number;

  @ApiProperty({ description: 'Expiry date' })
  expiresAt: Date;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;
}

export class AnonymousDraftFullResponseDto extends AnonymousDraftResponseDto {
  @ApiProperty({ description: 'Complete form data' })
  formData: Record<string, any>;

  @ApiProperty({ description: 'Global specifications' })
  globalSpecs?: Record<string, any>;

  @ApiProperty({ description: 'Required products/services' })
  requiredProducts?: string[];

  @ApiProperty({ description: 'Pipe entries' })
  entries?: Record<string, any>[];
}

export class RequestRecoveryEmailDto {
  @ApiProperty({
    description: 'Customer email to send recovery link to',
    example: 'customer@example.com',
  })
  @IsEmail()
  customerEmail: string;
}

export class RecoveryEmailResponseDto {
  @ApiProperty({ description: 'Success message' })
  message: string;

  @ApiProperty({ description: 'Whether a draft was found', example: true })
  draftFound: boolean;
}
