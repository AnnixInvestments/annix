import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsArray } from 'class-validator';

export class ProcessDocumentDto {
  @ApiProperty({ description: 'Path or URL to the document' })
  @IsString()
  documentPath: string;

  @ApiPropertyOptional({ description: 'Original filename' })
  @IsString()
  @IsOptional()
  documentName?: string;

  @ApiPropertyOptional({ description: 'User ID processing the document' })
  @IsNumber()
  @IsOptional()
  userId?: number;

  @ApiPropertyOptional({ description: 'RFQ ID to associate extraction with' })
  @IsNumber()
  @IsOptional()
  rfqId?: number;

  @ApiPropertyOptional({ description: 'Product/service types to filter for' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  productTypes?: string[];
}

export class ProcessDocumentResponseDto {
  @ApiProperty({ description: 'Extraction ID' })
  extractionId: number;

  @ApiProperty({ description: 'Processing status' })
  status: string;

  @ApiProperty({ description: 'Extracted items', type: 'array' })
  items?: Array<{
    description: string;
    quantity?: number;
    unit?: string;
    specifications?: Record<string, any>;
    pageReference?: number;
    confidence: number;
  }>;

  @ApiPropertyOptional({ description: 'Pending clarifications' })
  pendingClarifications?: Array<{
    id: number;
    question: string;
    context: Record<string, any>;
  }>;

  @ApiPropertyOptional({ description: 'Error message if failed' })
  error?: string;
}
