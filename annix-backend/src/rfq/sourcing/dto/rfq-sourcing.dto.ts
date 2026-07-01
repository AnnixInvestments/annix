import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from "class-validator";

export class PlanSourcingDto {
  @ApiProperty({ description: "NixExtractionSession id whose extracted items drive the plan." })
  @IsInt()
  @Min(1)
  sessionId: number;
}

export class ReassignItemDto {
  @ApiProperty({ description: "NixExtractionSession id owning the sourcing plan." })
  @IsInt()
  @Min(1)
  sessionId: number;

  @ApiProperty({ description: "Row number of the extracted item to move." })
  @IsInt()
  @Min(0)
  rowNumber: number;

  @ApiProperty({
    description: "Target bucket reference (supplierProfileId::category) to move the item into.",
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  targetBucketRef: string;
}

export class UpdateDraftBodyDto {
  @ApiProperty({ description: "NixExtractionSession id owning the sourcing plan." })
  @IsInt()
  @Min(1)
  sessionId: number;

  @ApiProperty({ description: "Bucket reference (supplierProfileId::category) to edit." })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  bucketRef: string;

  @ApiProperty({ description: "Reviewer-edited draft email body for this supplier bucket." })
  @IsString()
  @MaxLength(20000)
  body: string;
}

export class DraftAiDto {
  @ApiProperty({ description: "NixExtractionSession id owning the sourcing plan." })
  @IsInt()
  @Min(1)
  sessionId: number;

  @ApiProperty({ description: "Bucket reference (supplierProfileId::category) to draft for." })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  bucketRef: string;
}

export class PublishBucketDto {
  @ApiProperty({ description: "NixExtractionSession id owning the sourcing plan." })
  @IsInt()
  @Min(1)
  sessionId: number;

  @ApiProperty({
    description: "Bucket reference (supplierProfileId::category) to publish as a BOQ.",
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  bucketRef: string;
}

export class SendSourcingDto {
  @ApiProperty({ description: "NixExtractionSession id owning the sourcing plan." })
  @IsInt()
  @Min(1)
  sessionId: number;

  @ApiProperty({ description: "Bucket reference (supplierProfileId::category) to send." })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  bucketRef: string;

  @ApiProperty({
    description: "Re-send even when a prior send audit exists for this bucket. Defaults to false.",
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
