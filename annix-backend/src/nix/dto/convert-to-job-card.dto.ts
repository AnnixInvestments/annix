import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsOptional, IsString, ValidateNested } from "class-validator";
import { QuotePdfSnapshotDto } from "./quote-pdf.dto";

/**
 * Payload for `POST /nix/sessions/:id/convert-to-job-card`.
 *
 * We reuse the existing `QuotePdfSnapshotDto` for the pooled-items payload
 * because the frontend already computes that shape for the PDF + email
 * flow. Saves us re-implementing the pooling / dedup / spec-line
 * composition on the backend just so the JC import sees the same item
 * boundaries the customer saw on the quote.
 *
 * `jobNumber` and `jobName` are required so we don't leak quote-internal
 * naming into the JC (workshop staff need their own identifiers). The
 * other optional fields default to whatever the quote knows about the
 * customer; the modal pre-fills them.
 */
export class ConvertToJobCardDto {
  @ApiProperty({
    description:
      "Frontend-computed pooled-items snapshot — same shape the PDF / email endpoints use. The conversion writes one JobCardLineItem per item across all pools, in the order the frontend supplied.",
    type: QuotePdfSnapshotDto,
  })
  @ValidateNested()
  @Type(() => QuotePdfSnapshotDto)
  snapshot: QuotePdfSnapshotDto;

  @ApiProperty({
    description:
      "Job number (e.g. 'JC-2026-0042'). Required. The modal pre-fills via auto-generation on the frontend but the quoter can override before submitting.",
  })
  @IsString()
  jobNumber: string;

  @ApiProperty({ description: "Human-readable job name shown on the JC list." })
  @IsString()
  jobName: string;

  @ApiProperty({
    required: false,
    description: "Optional due date (ISO yyyy-mm-dd or full timestamp).",
  })
  @IsOptional()
  @IsString()
  dueDate?: string;

  @ApiProperty({ required: false, description: "Optional site location." })
  @IsOptional()
  @IsString()
  siteLocation?: string;

  @ApiProperty({ required: false, description: "Optional contact person on the customer side." })
  @IsOptional()
  @IsString()
  contactPerson?: string;
}

export class ConvertToJobCardResponseDto {
  @ApiProperty({ description: "Newly-created JobCard id." })
  jobCardId: number;

  @ApiProperty({ description: "The jobNumber the JC was saved with." })
  jobNumber: string;
}
