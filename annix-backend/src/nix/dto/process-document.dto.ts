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

  @ApiPropertyOptional({
    description:
      "ID of the NixExtractionSession this document belongs to. When supplied, prior session siblings (typically previously-uploaded drawings) are passed to the role-aware system prompt as Gemini context — that's how a specification upload can cross-link its clauses to the items the drawings reference.",
  })
  @IsNumber()
  @IsOptional()
  sessionId?: number;

  @ApiPropertyOptional({ description: "Product/service types to filter for" })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  productTypes?: string[];

  @ApiPropertyOptional({
    description:
      "When true, skip the extractor + profile handler entirely — just mirror the source file to S3 and return success. Used to archive documents that aren't BOQ/spec extraction targets (e.g. the .eml itself, tender-spec PDFs not yet supported by an extraction profile, images) so the file is persisted immediately on upload rather than only at RFQ submission. The NixExtraction record is created with status COMPLETED and empty items.",
  })
  @IsOptional()
  skipExtraction?: boolean;
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

  @ApiPropertyOptional({
    description:
      "Profile-handler-produced metadata (e.g. RFQ piping supplier bundles, duplicates, drawing references). Shape depends on the active extractionProfile.",
  })
  profileMetadata?: Record<string, any>;

  @ApiPropertyOptional({ description: "Error message if failed" })
  error?: string;

  @ApiPropertyOptional({
    description:
      "Outcome of the revision-supersession check (issue #264). 'first' = no prior version on file. 'same' = same revision already extracted. 'newer' = this upload supersedes an older canonical version. 'older' = an older revision was uploaded while a newer one is on file (frontend should warn). 'unknown' = revisions can't be ordered (frontend should prompt).",
  })
  revisionVerdict?: {
    action: "first" | "same" | "duplicate-in-session" | "newer" | "older" | "unknown";
    canonicalExtractionId?: number;
    canonicalRevision?: string | null;
    previousCanonicalExtractionId?: number;
    previousCanonicalRevision?: string | null;
    latestExtractionId?: number;
    latestRevision?: string | null;
    otherExtractionId?: number;
    otherRevision?: string | null;
  };
}
