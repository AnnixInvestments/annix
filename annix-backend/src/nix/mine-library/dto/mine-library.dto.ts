import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsInt, IsOptional, IsString, Length, Max, Min } from "class-validator";

export class MineSummaryDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  mineName: string;

  @ApiProperty()
  operatingCompany: string;

  @ApiProperty()
  province: string;

  @ApiProperty({ description: "Number of NixExtraction rows currently linked to this mine." })
  extractionCount: number;
}

export class MineExtractionRowDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ nullable: true })
  documentNumber: string | null;

  @ApiProperty({ nullable: true })
  documentRevision: string | null;

  @ApiProperty({ nullable: true })
  documentTitle: string | null;

  @ApiProperty({ nullable: true })
  sourceFilename: string | null;

  @ApiProperty()
  status: string;

  @ApiProperty({ nullable: true })
  mineInferenceConfidence: number | null;

  @ApiProperty({ nullable: true })
  mineInferenceReason: string | null;

  @ApiProperty({
    description:
      "Whether this row is the canonical record for its (mineCountry, mineId, documentNumber). The archive page uses this to highlight the latest revision and grey out superseded ones.",
  })
  isLatestRevision: boolean;

  @ApiProperty({
    nullable: true,
    description:
      "When isLatestRevision = false, the extraction id that superseded this one (so the UI can render 'see latest →').",
  })
  supersededByExtractionId: number | null;

  @ApiProperty()
  createdAt: Date;
}

export class DocNumberSearchRowDto {
  @ApiProperty()
  extractionId: number;

  @ApiProperty()
  documentNumber: string;

  @ApiProperty({ nullable: true })
  documentRevision: string | null;

  @ApiProperty({ nullable: true })
  documentTitle: string | null;

  @ApiProperty({ nullable: true })
  mineId: number | null;

  @ApiProperty({ nullable: true })
  mineName: string | null;

  @ApiProperty()
  createdAt: Date;
}

export class DocNumberSearchQueryDto {
  @ApiProperty({ description: "Doc-number prefix or fragment. Min 2 characters." })
  @IsString()
  @Length(2, 128)
  q: string;

  @ApiProperty({ required: false, description: "Restrict to a single mine." })
  @IsOptional()
  @IsInt()
  @Transform(({ value }) => (typeof value === "string" ? Number.parseInt(value, 10) : value))
  mineId?: number;

  @ApiProperty({ required: false, default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Transform(({ value }) => (typeof value === "string" ? Number.parseInt(value, 10) : value))
  limit?: number;
}

export class CreateMineDto {
  @ApiProperty()
  @IsString()
  @Length(1, 255)
  mineName: string;

  @ApiProperty()
  @IsString()
  @Length(1, 255)
  operatingCompany: string;

  @ApiProperty({
    required: false,
    description: "Commodity id from sa_commodities reference table.",
  })
  @IsOptional()
  @IsInt()
  commodityId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  province?: string;

  @ApiProperty({
    required: false,
    description:
      "Optional NixExtraction id to retag against the newly-created mine. When provided, also stamps the extraction's mine_inference_reason as 'manual_create_from_extraction'.",
  })
  @IsOptional()
  @IsInt()
  retagExtractionId?: number;
}

export class CreateMineResponseDto {
  @ApiProperty()
  mine: MineSummaryDto;

  @ApiProperty({
    nullable: true,
    description: "When retagExtractionId was provided, the updated extraction id; otherwise null.",
  })
  retaggedExtractionId: number | null;
}

export class RetagExtractionDto {
  @ApiProperty()
  @IsInt()
  mineId: number;
}

export class DocNumberPrefixGuessDto {
  @ApiProperty({ description: "Filename or doc-number-shaped string to extract a prefix from." })
  @IsString()
  @Length(1, 256)
  source: string;
}

export class DocNumberPrefixResultDto {
  @ApiProperty({ nullable: true })
  prefix: string | null;

  @ApiProperty()
  matchedRule: string;
}

export const DOC_NUMBER_PREFIX_PATTERN = /^([A-Z]{2,8})-/i;

export const guessDocNumberFromFilename = (filename: string): string | null => {
  const stripped = filename.replace(/\.[^./]+$/u, "");
  const match = stripped.match(/^[A-Z]{2,8}-[A-Z0-9-]{3,}/i);
  return match ? match[0] : null;
};
