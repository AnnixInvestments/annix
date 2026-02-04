import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { RegionCoordinates } from '../entities/nix-extraction-region.entity';

export class RegionCoordinatesDto {
  @ApiProperty({ description: 'X coordinate' })
  @IsNumber()
  x: number;

  @ApiProperty({ description: 'Y coordinate' })
  @IsNumber()
  y: number;

  @ApiProperty({ description: 'Width of the region' })
  @IsNumber()
  width: number;

  @ApiProperty({ description: 'Height of the region' })
  @IsNumber()
  height: number;

  @ApiProperty({ description: 'Page number (1-indexed)' })
  @IsNumber()
  pageNumber: number;
}

export class SaveExtractionRegionDto {
  @ApiProperty({
    description: 'Document category (e.g., "vat", "registration", "bee")',
  })
  @IsString()
  @IsNotEmpty()
  documentCategory: string;

  @ApiProperty({ description: 'Field name (e.g., "vatNumber", "companyName")' })
  @IsString()
  @IsNotEmpty()
  fieldName: string;

  @ApiProperty({ description: 'Region coordinates for the value on the document' })
  @ValidateNested()
  @Type(() => RegionCoordinatesDto)
  regionCoordinates: RegionCoordinatesDto;

  @ApiProperty({
    description: 'Region coordinates for the label on the document (optional)',
    required: false,
  })
  @ValidateNested()
  @Type(() => RegionCoordinatesDto)
  @IsOptional()
  labelCoordinates?: RegionCoordinatesDto;

  @ApiProperty({
    description: 'Text extracted from label region (optional)',
    required: false,
  })
  @IsString()
  @IsOptional()
  labelText?: string;

  @ApiProperty({
    description: 'Regex pattern for extracting the value',
    required: false,
  })
  @IsString()
  @IsOptional()
  extractionPattern?: string;

  @ApiProperty({
    description: 'Sample value extracted from this region',
    required: false,
  })
  @IsString()
  @IsOptional()
  sampleValue?: string;

  @ApiProperty({
    description: 'Whether this is an admin-defined custom field',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isCustomField?: boolean;
}

export class PdfPageImageDto {
  @ApiProperty({ description: 'Page number (1-indexed)' })
  pageNumber: number;

  @ApiProperty({ description: 'Base64 encoded PNG image' })
  imageData: string;

  @ApiProperty({ description: 'Image width in pixels' })
  width: number;

  @ApiProperty({ description: 'Image height in pixels' })
  height: number;
}

export class PdfPagesResponseDto {
  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({ description: 'Array of page images', type: [PdfPageImageDto] })
  pages: PdfPageImageDto[];
}

export class ExtractionRegionResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  documentCategory: string;

  @ApiProperty()
  fieldName: string;

  @ApiProperty()
  regionCoordinates: RegionCoordinates;

  @ApiProperty({ required: false })
  extractionPattern?: string;

  @ApiProperty({ required: false })
  sampleValue?: string;

  @ApiProperty()
  useCount: number;

  @ApiProperty()
  successCount: number;
}

export class ExtractFromRegionDto {
  @ApiProperty({ description: 'Region coordinates to extract from' })
  @ValidateNested()
  @Type(() => RegionCoordinatesDto)
  regionCoordinates: RegionCoordinatesDto;

  @ApiProperty({ description: 'Field name for context' })
  @IsString()
  @IsNotEmpty()
  fieldName: string;
}

export class ManualFieldEntryDto {
  @ApiProperty({ description: 'Field name' })
  @IsString()
  @IsNotEmpty()
  fieldName: string;

  @ApiProperty({ description: 'Value entered by user' })
  @IsString()
  @IsNotEmpty()
  value: string;

  @ApiProperty({
    description: 'Region where the value was found (optional)',
    required: false,
  })
  @ValidateNested()
  @Type(() => RegionCoordinatesDto)
  @IsOptional()
  regionCoordinates?: RegionCoordinatesDto;

  @ApiProperty({
    description: 'Document category for learning',
    required: false,
  })
  @IsString()
  @IsOptional()
  documentCategory?: string;
}

export class SaveCustomFieldValueDto {
  @ApiProperty({ description: 'Entity type' })
  @IsString()
  @IsNotEmpty()
  entityType: 'customer' | 'supplier';

  @ApiProperty({ description: 'Entity ID (customer or supplier ID)' })
  @IsNumber()
  entityId: number;

  @ApiProperty({ description: 'Custom field name' })
  @IsString()
  @IsNotEmpty()
  fieldName: string;

  @ApiProperty({ description: 'Field value' })
  @IsString()
  @IsOptional()
  fieldValue?: string;

  @ApiProperty({ description: 'Document category' })
  @IsString()
  @IsNotEmpty()
  documentCategory: string;

  @ApiProperty({ description: 'Document ID the value was extracted from', required: false })
  @IsNumber()
  @IsOptional()
  extractedFromDocumentId?: number;

  @ApiProperty({ description: 'OCR confidence score', required: false })
  @IsNumber()
  @IsOptional()
  confidence?: number;
}
