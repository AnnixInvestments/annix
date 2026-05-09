import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsEmail, IsOptional, IsString, ValidateNested } from "class-validator";

export class MissingDrawingDto {
  @ApiProperty({
    description: "Drawing reference as it appears in the BOQ",
    example: "J528-303-110",
  })
  @IsString()
  ref: string;

  @ApiProperty({
    description: "Line item numbers from the BOQ that reference this drawing",
    type: [String],
    example: ["a.1", "a.2", "b.4"],
  })
  @IsArray()
  @IsString({ each: true })
  itemNumbers: string[];
}

export class ValveSpecGapDto {
  @ApiProperty({ description: "Line item number of the valve" })
  @IsString()
  itemNumber: string;

  @ApiProperty({ description: "Item description as extracted from the BOQ" })
  @IsString()
  description: string;

  @ApiProperty({
    description:
      "Friendly names of fields the customer must complete before the valve can be priced (e.g. 'Slurry Y/N', 'pH', 'Body material').",
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  missingFields: string[];
}

export class SendRfqClarificationEmailDto {
  @ApiProperty({ description: "Recipient (the customer who submitted the tender)" })
  @IsEmail()
  to: string;

  @ApiPropertyOptional({
    description:
      "Comma-separated CC list — typically the contacts found in the original tender email's CC header plus any extras the customer added on the RFQ form. Always cc'd to info@annix.co.za on the backend in addition to whatever is supplied here.",
  })
  @IsString()
  @IsOptional()
  cc?: string;

  @ApiPropertyOptional({
    description: "Subject line. Backend builds a default if absent.",
  })
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiPropertyOptional({ description: "Customer name for the greeting" })
  @IsString()
  @IsOptional()
  customerName?: string;

  @ApiPropertyOptional({ description: "Project name (used in the subject + opening paragraph)" })
  @IsString()
  @IsOptional()
  projectName?: string;

  @ApiPropertyOptional({ description: "RFQ reference / draft number to surface in the subject" })
  @IsString()
  @IsOptional()
  rfqReference?: string;

  @ApiPropertyOptional({
    description: "Optional free-form note from the customer to append at the end of the email",
  })
  @IsString()
  @IsOptional()
  customNote?: string;

  @ApiProperty({
    description: "Drawing references missing from the upload set",
    type: [MissingDrawingDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MissingDrawingDto)
  missingDrawings: MissingDrawingDto[];

  @ApiProperty({
    description: "Valve items with at least one missing required spec field",
    type: [ValveSpecGapDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ValveSpecGapDto)
  valveSpecGaps: ValveSpecGapDto[];
}

export class SendRfqClarificationEmailResponseDto {
  @ApiProperty({ description: "Whether the email was queued for delivery successfully" })
  success: boolean;

  @ApiPropertyOptional({ description: "Underlying error if delivery failed" })
  error?: string;
}
