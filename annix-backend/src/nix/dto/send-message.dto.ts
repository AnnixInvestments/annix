import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from "class-validator";

export interface SendMessageContext {
  currentRfqItems?: any[];
  lastValidationIssues?: any[];
  pageContext?: {
    currentPage: string;
    rfqType?: string;
    portalContext: "customer" | "supplier" | "admin" | "general";
  };
  guidedMode?: {
    isActive: boolean;
    currentStep: number;
    currentFieldId: string | null;
    completedFields: string[];
    skippedFields: string[];
  };
}

export class SendMessageBodyDto {
  @ApiProperty({ description: "User chat message" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32000)
  message: string;

  @ApiProperty({ description: "Optional chat context", required: false })
  @IsOptional()
  @IsObject()
  context?: SendMessageContext;
}
