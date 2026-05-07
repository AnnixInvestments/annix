import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { DocumentRole } from "../entities/nix-extraction.entity";

export class ProcessDocumentDto {
  @ApiProperty({ description: "Path or URL to the document" })
  @IsString()
  documentPath: string;

  @ApiPropertyOptional({ description: "Original filename" })
  @IsString()
  @IsOptional()
  documentName?: string;

  @ApiPropertyOptional({ description: "User ID processing the document" })
  @IsNumber()
  @IsOptional()
  userId?: number;

  @ApiPropertyOptional({
    description: "RFQ ID to associate extraction with (legacy — prefer sourceModule/sourceId)",
  })
  @IsNumber()
  @IsOptional()
  rfqId?: number;

  @ApiPropertyOptional({
    description:
      "Owning module key for polymorphic source linkage (e.g. 'rfq', 'asca'). When 'rfq' is supplied alongside rfqId, sourceId is automatically backfilled.",
  })
  @IsString()
  @IsOptional()
  sourceModule?: string;

  @ApiPropertyOptional({ description: "Source entity ID within the owning module." })
  @IsNumber()
  @IsOptional()
  sourceId?: number;

  @ApiPropertyOptional({
    description:
      "Extraction profile key driving prompt + post-extraction handler (e.g. 'rfq-piping', 'asca-quote-documents'). Resolved via NixExtractionProfileRegistry. Defaults to 'rfq-piping' when an rfqId is supplied without an explicit profile.",
  })
  @IsString()
  @IsOptional()
  extractionProfile?: string;

  @ApiPropertyOptional({
    description:
      "Role of this document within a quote pack — 'drawing', 'specification', or 'other'. Drives role-specific extraction prompts and the cross-document linker's ordering (drawings first, specs second with drawings as context).",
    enum: DocumentRole,
  })
  @IsEnum(DocumentRole)
  @IsOptional()
  documentRole?: DocumentRole;

  @ApiPropertyOptional({ description: "Product/service types to filter for" })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  productTypes?: string[];
}

export class ProcessDocumentResponseDto {
  @ApiProperty({ description: "Extraction ID" })
  extractionId: number;

  @ApiProperty({ description: "Processing status" })
  status: string;

  @ApiProperty({ description: "Extracted items", type: "array" })
  items?: Array<{
    description: string;
    quantity?: number;
    unit?: string;
    specifications?: Record<string, any>;
    pageReference?: number;
    confidence: number;
  }>;

  @ApiPropertyOptional({ description: "Pending clarifications" })
  pendingClarifications?: Array<{
    id: number;
    question: string;
    context: Record<string, any>;
  }>;

  @ApiPropertyOptional({ description: "Error message if failed" })
  error?: string;
}
