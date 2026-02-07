import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { ResponseType } from "../entities/nix-clarification.entity";

export class SubmitClarificationDto {
  @ApiProperty({ description: "Clarification ID being answered" })
  @IsNumber()
  clarificationId: number;

  @ApiProperty({ description: "Type of response", enum: ResponseType })
  @IsEnum(ResponseType)
  responseType: ResponseType;

  @ApiPropertyOptional({ description: "Text response" })
  @IsString()
  @IsOptional()
  responseText?: string;

  @ApiPropertyOptional({ description: "Screenshot file path if uploaded" })
  @IsString()
  @IsOptional()
  screenshotPath?: string;

  @ApiPropertyOptional({ description: "Document reference" })
  @IsOptional()
  documentRef?: {
    documentId?: number;
    pageNumber?: number;
    sectionName?: string;
  };

  @ApiPropertyOptional({
    description: "Allow this response to be used for learning",
  })
  @IsOptional()
  allowLearning?: boolean;
}

export class SubmitClarificationResponseDto {
  @ApiProperty({ description: "Success status" })
  success: boolean;

  @ApiPropertyOptional({ description: "Updated extraction data" })
  updatedExtraction?: {
    extractionId: number;
    status: string;
    items?: Array<Record<string, any>>;
  };

  @ApiPropertyOptional({ description: "Any remaining clarifications" })
  remainingClarifications?: number;
}
