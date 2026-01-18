import { ApiProperty } from '@nestjs/swagger';
import { RegionCoordinates } from '../entities/nix-extraction-region.entity';

export class SaveExtractionRegionDto {
  @ApiProperty({ description: 'Document category (e.g., "vat", "registration", "bee")' })
  documentCategory: string;

  @ApiProperty({ description: 'Field name (e.g., "vatNumber", "companyName")' })
  fieldName: string;

  @ApiProperty({ description: 'Region coordinates on the document' })
  regionCoordinates: RegionCoordinates;

  @ApiProperty({ description: 'Regex pattern for extracting the value', required: false })
  extractionPattern?: string;

  @ApiProperty({ description: 'Sample value extracted from this region', required: false })
  sampleValue?: string;
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
  regionCoordinates: RegionCoordinates;

  @ApiProperty({ description: 'Field name for context' })
  fieldName: string;
}

export class ManualFieldEntryDto {
  @ApiProperty({ description: 'Field name' })
  fieldName: string;

  @ApiProperty({ description: 'Value entered by user' })
  value: string;

  @ApiProperty({ description: 'Region where the value was found (optional)', required: false })
  regionCoordinates?: RegionCoordinates;

  @ApiProperty({ description: 'Document category for learning', required: false })
  documentCategory?: string;
}
