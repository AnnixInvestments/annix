import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsIn, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";

export class ExpectedCompanyDataDto {
  @ApiPropertyOptional({
    description: "Expected VAT number",
    example: "4123456789",
  })
  @IsString()
  @IsOptional()
  vatNumber?: string;

  @ApiPropertyOptional({
    description: "Expected company registration number",
    example: "2020/123456/07",
  })
  @IsString()
  @IsOptional()
  registrationNumber?: string;

  @ApiPropertyOptional({
    description: "Expected company legal name",
    example: "ACME INDUSTRIES (PTY) LTD",
  })
  @IsString()
  @IsOptional()
  companyName?: string;

  @ApiPropertyOptional({
    description: "Expected street address",
    example: "123 MAIN STREET",
  })
  @IsString()
  @IsOptional()
  streetAddress?: string;

  @ApiPropertyOptional({
    description: "Expected city",
    example: "JOHANNESBURG",
  })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({
    description: "Expected province/state",
    example: "GAUTENG",
  })
  @IsString()
  @IsOptional()
  provinceState?: string;

  @ApiPropertyOptional({ description: "Expected postal code", example: "2000" })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiPropertyOptional({ description: "Expected BEE level (1-8)", example: 2 })
  @IsNumber()
  @IsOptional()
  beeLevel?: number;
}

export class VerifyRegistrationDocumentDto {
  @ApiProperty({
    description: "Document type",
    enum: ["vat", "registration", "bee"],
  })
  @IsString()
  @IsIn(["vat", "registration", "bee"])
  documentType: "vat" | "registration" | "bee";

  @ApiProperty({
    description: "Expected company data to verify against",
    type: ExpectedCompanyDataDto,
  })
  @ValidateNested()
  @Type(() => ExpectedCompanyDataDto)
  expectedData: ExpectedCompanyDataDto;
}

export class BatchDocumentDto {
  @ApiProperty({
    description: "Document type",
    enum: ["vat", "registration", "bee"],
  })
  @IsString()
  @IsIn(["vat", "registration", "bee"])
  documentType: "vat" | "registration" | "bee";
}

export class VerifyRegistrationBatchDto {
  @ApiProperty({
    description: "Array of document types corresponding to uploaded files",
    type: [BatchDocumentDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchDocumentDto)
  documents: BatchDocumentDto[];

  @ApiProperty({
    description: "Expected company data to verify against",
    type: ExpectedCompanyDataDto,
  })
  @ValidateNested()
  @Type(() => ExpectedCompanyDataDto)
  expectedData: ExpectedCompanyDataDto;
}

export class FieldVerificationResultDto {
  @ApiProperty({ description: "Field name" })
  field: string;

  @ApiProperty({ description: "Expected value", nullable: true })
  expected: string | number | null;

  @ApiProperty({ description: "Extracted value from document", nullable: true })
  extracted: string | number | null;

  @ApiProperty({ description: "Whether the values match" })
  match: boolean;

  @ApiPropertyOptional({
    description: "Similarity percentage for fuzzy matches",
  })
  similarity?: number;

  @ApiPropertyOptional({ description: "Suggested auto-correct value" })
  autoCorrectValue?: string | number;
}

export class ExtractedRegistrationDataDto {
  @ApiPropertyOptional({ description: "Extracted VAT number" })
  vatNumber?: string;

  @ApiPropertyOptional({ description: "Extracted registration number" })
  registrationNumber?: string;

  @ApiPropertyOptional({ description: "Extracted company name" })
  companyName?: string;

  @ApiPropertyOptional({ description: "Extracted street address" })
  streetAddress?: string;

  @ApiPropertyOptional({ description: "Extracted city" })
  city?: string;

  @ApiPropertyOptional({ description: "Extracted province/state" })
  provinceState?: string;

  @ApiPropertyOptional({ description: "Extracted postal code" })
  postalCode?: string;

  @ApiPropertyOptional({ description: "Extracted BEE level" })
  beeLevel?: number;

  @ApiPropertyOptional({ description: "Extracted BEE expiry date" })
  beeExpiryDate?: string;

  @ApiPropertyOptional({ description: "Extracted verification agency" })
  verificationAgency?: string;

  @ApiProperty({ description: "OCR confidence score (0-1)" })
  confidence: number;

  @ApiProperty({
    description: "List of fields successfully extracted",
    type: [String],
  })
  fieldsExtracted: string[];
}

export class AutoCorrectionDto {
  @ApiProperty({ description: "Field name" })
  field: string;

  @ApiProperty({ description: "Suggested corrected value" })
  value: string | number;
}

export class VerifyRegistrationDocumentResponseDto {
  @ApiProperty({ description: "Whether verification was successful" })
  success: boolean;

  @ApiProperty({
    description: "Document type that was verified",
    enum: ["vat", "registration", "bee"],
  })
  documentType: "vat" | "registration" | "bee";

  @ApiProperty({
    description: "Data extracted from the document",
    type: ExtractedRegistrationDataDto,
  })
  extractedData: ExtractedRegistrationDataDto;

  @ApiProperty({
    description: "Field-by-field verification results",
    type: [FieldVerificationResultDto],
  })
  fieldResults: FieldVerificationResultDto[];

  @ApiProperty({ description: "Overall confidence score (0-1)" })
  overallConfidence: number;

  @ApiProperty({ description: "Whether all expected fields matched" })
  allFieldsMatch: boolean;

  @ApiProperty({
    description: "Suggested auto-corrections",
    type: [AutoCorrectionDto],
  })
  autoCorrections: AutoCorrectionDto[];

  @ApiProperty({ description: "Warning messages", type: [String] })
  warnings: string[];

  @ApiProperty({
    description: "OCR method used",
    enum: ["pdf-parse", "tesseract", "ai", "region", "none"],
  })
  ocrMethod: "pdf-parse" | "tesseract" | "ai" | "region" | "none";

  @ApiProperty({ description: "Processing time in milliseconds" })
  processingTimeMs: number;

  @ApiPropertyOptional({ description: "Human-readable mismatch report" })
  mismatchReport?: string;
}

export class VerifyRegistrationBatchResponseDto {
  @ApiProperty({
    description: "Results for each document",
    type: [VerifyRegistrationDocumentResponseDto],
  })
  results: VerifyRegistrationDocumentResponseDto[];

  @ApiProperty({ description: "Whether all documents verified successfully" })
  allSuccess: boolean;

  @ApiProperty({ description: "Whether all fields across all documents match" })
  allFieldsMatch: boolean;

  @ApiProperty({
    description: "Combined auto-corrections from all documents",
    type: [AutoCorrectionDto],
  })
  combinedAutoCorrections: AutoCorrectionDto[];

  @ApiProperty({ description: "Total processing time in milliseconds" })
  totalProcessingTimeMs: number;
}
