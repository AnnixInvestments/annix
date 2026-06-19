import { ApiProperty } from "@nestjs/swagger";
import { User } from "../../user/entities/user.entity";
import { NixExtraction } from "./nix-extraction.entity";

export enum ClarificationStatus {
  PENDING = "pending",
  ANSWERED = "answered",
  SKIPPED = "skipped",
  EXPIRED = "expired",
}

export enum ClarificationType {
  MISSING_INFO = "missing_info",
  AMBIGUOUS = "ambiguous",
  CONFIRMATION = "confirmation",
  RELEVANCE = "relevance",
}

export enum ResponseType {
  TEXT = "text",
  SCREENSHOT = "screenshot",
  DOCUMENT_REFERENCE = "document_reference",
  SELECTION = "selection",
}

export class NixClarification {
  @ApiProperty({ description: "Primary key" })
  id: number;

  extraction?: NixExtraction;

  extractionId?: number;

  user?: User;

  userId?: number;

  @ApiProperty({
    description: "Type of clarification needed",
    enum: ClarificationType,
  })
  clarificationType: ClarificationType;

  @ApiProperty({
    description: "Status of clarification",
    enum: ClarificationStatus,
  })
  status: ClarificationStatus;

  @ApiProperty({ description: "Question to display to user" })
  question: string;

  @ApiProperty({ description: "Context about what needs clarification" })
  context?: {
    itemDescription?: string;
    pageNumber?: number;
    sectionName?: string;
    extractedValue?: string;
    suggestedOptions?: string[];
    rowNumber?: number;
    itemNumber?: string;
    itemType?: string;
    extractedMaterial?: string | null;
    extractedDiameter?: number | null;
    extractedLength?: number | null;
    extractedAngle?: number | null;
    extractedFlangeConfig?: string | null;
    extractedQuantity?: number;
    confidence?: number;
    clarificationReason?: string | null;
    isSpecificationHeader?: boolean;
    cellRef?: string;
    rawText?: string;
    parsedMaterialGrade?: string | null;
    parsedWallThickness?: string | null;
    parsedLining?: string | null;
    parsedExternalCoating?: string | null;
    parsedStandard?: string | null;
    parsedSchedule?: string | null;
    missingFields?: string[];
  };

  @ApiProperty({ description: "Type of response received", enum: ResponseType })
  responseType?: ResponseType;

  @ApiProperty({ description: "User response text" })
  responseText?: string;

  @ApiProperty({ description: "Path to uploaded screenshot if applicable" })
  responseScreenshotPath?: string;

  @ApiProperty({ description: "Document reference if applicable" })
  responseDocumentRef?: {
    documentId?: number;
    pageNumber?: number;
    sectionName?: string;
  };

  @ApiProperty({
    description: "Whether this clarification was used for learning",
  })
  usedForLearning: boolean;

  createdAt: Date;

  updatedAt: Date;

  answeredAt?: Date;
}
