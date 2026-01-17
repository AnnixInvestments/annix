import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RfqStatus } from '../entities/rfq.entity';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  IsObject,
  Min,
  Max,
} from 'class-validator';

export class SaveRfqDraftDto {
  @ApiPropertyOptional({
    description: 'Existing draft ID (for updates)',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  draftId?: number;

  @ApiPropertyOptional({
    description: 'Customer RFQ reference number',
    example: 'RFQ-2025-001',
  })
  @IsOptional()
  @IsString()
  customerRfqReference?: string;

  @ApiPropertyOptional({
    description: 'Project name',
    example: '500NB Pipeline Extension',
  })
  @IsOptional()
  @IsString()
  projectName?: string;

  @ApiProperty({
    description: 'Current step in the RFQ form (1-5)',
    example: 2,
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  currentStep: number;

  @ApiProperty({
    description: 'Complete form data as JSON',
  })
  @IsObject()
  formData: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Global specifications as JSON',
  })
  @IsOptional()
  @IsObject()
  globalSpecs?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Required products/services selected',
  })
  @IsOptional()
  @IsArray()
  requiredProducts?: string[];

  @ApiPropertyOptional({
    description: 'Straight pipe entries as JSON',
  })
  @IsOptional()
  @IsArray()
  straightPipeEntries?: Record<string, any>[];

  @ApiPropertyOptional({
    description: 'Pending documents metadata',
  })
  @IsOptional()
  @IsArray()
  pendingDocuments?: Record<string, any>[];
}

export class RfqDraftResponseDto {
  @ApiProperty({ description: 'Draft ID', example: 1 })
  id: number;

  @ApiProperty({
    description: 'Draft number',
    example: 'DRAFT-2025-0001',
  })
  draftNumber: string;

  @ApiPropertyOptional({
    description: 'RFQ number (if submitted)',
    example: 'RFQ-2025-0001',
  })
  rfqNumber?: string;

  @ApiPropertyOptional({
    description: 'Customer RFQ reference number',
    example: 'RFQ-2025-001',
  })
  customerRfqReference?: string;

  @ApiProperty({
    description: 'Project name',
    example: '500NB Pipeline Extension',
  })
  projectName?: string;

  @ApiProperty({
    description: 'Current step',
    example: 2,
  })
  currentStep: number;

  @ApiProperty({
    description: 'Completion percentage',
    example: 45,
  })
  completionPercentage: number;

  @ApiProperty({
    description: 'Status of the RFQ',
    example: 'draft',
    enum: RfqStatus,
  })
  status: RfqStatus;

  @ApiProperty({
    description: 'Creation date',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update date',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Whether this draft was converted to an RFQ',
  })
  isConverted: boolean;

  @ApiPropertyOptional({
    description: 'ID of the converted RFQ',
  })
  convertedRfqId?: number;

  @ApiPropertyOptional({
    description: 'Supplier response counts (only for submitted RFQs)',
  })
  supplierCounts?: {
    pending: number;
    declined: number;
    intendToQuote: number;
    quoted: number;
  };
}

export class RfqDraftFullResponseDto extends RfqDraftResponseDto {
  @ApiProperty({
    description: 'Complete form data',
  })
  formData: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Global specifications',
  })
  globalSpecs?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Required products',
  })
  requiredProducts?: string[];

  @ApiPropertyOptional({
    description: 'Straight pipe entries',
  })
  straightPipeEntries?: Record<string, any>[];

  @ApiPropertyOptional({
    description: 'Pending documents',
  })
  pendingDocuments?: Record<string, any>[];
}
