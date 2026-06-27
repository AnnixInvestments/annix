import { ApiProperty } from "@nestjs/swagger";
export enum LearningType {
  EXTRACTION_PATTERN = "extraction_pattern",
  RELEVANCE_RULE = "relevance_rule",
  TERMINOLOGY = "terminology",
  CORRECTION = "correction",
}

export enum LearningSource {
  ADMIN_SEEDED = "admin_seeded",
  USER_CORRECTION = "user_correction",
  AGGREGATED = "aggregated",
  WEB_AUGMENTED = "web_augmented",
  ANON_UNVERIFIED = "anon_unverified",
}

export class NixLearning {
  @ApiProperty({ description: "Primary key" })
  id: number;

  @ApiProperty({ description: "Type of learning data", enum: LearningType })
  learningType: LearningType;

  @ApiProperty({ description: "Source of learning data", enum: LearningSource })
  source: LearningSource;

  @ApiProperty({ description: "Category/domain this learning applies to" })
  category?: string;

  @ApiProperty({ description: "Pattern or rule identifier" })
  patternKey: string;

  @ApiProperty({ description: "Original value before correction" })
  originalValue?: string;

  @ApiProperty({ description: "Corrected or learned value" })
  learnedValue: string;

  @ApiProperty({ description: "Additional context as JSON" })
  context?: Record<string, any>;

  @ApiProperty({ description: "Confidence score from 0 to 1" })
  confidence: number;

  @ApiProperty({
    description: "Number of times this pattern has been confirmed",
  })
  confirmationCount: number;

  @ApiProperty({ description: "Product/service types this applies to" })
  applicableProducts?: string[];

  @ApiProperty({ description: "Whether this rule is active" })
  isActive: boolean;

  @ApiProperty({
    description:
      "True when this row was written by an UNAUTHENTICATED caller (anonymous RFQ / public funnel). Quarantined rows are persisted but excluded from every learning read that feeds a Gemini prompt, so a tokenless actor cannot poison the shared, tenant-unscoped learning set. Absent/false on all legitimate (authenticated + pre-existing) rows.",
    required: false,
  })
  quarantined?: boolean;

  @ApiProperty({
    description:
      "SHA-256 (truncated) of the client IP for an anonymous write — audit correlation of repeat poison sources only. Null/absent for authenticated and pre-existing rows.",
    required: false,
  })
  sourceIpHash?: string;

  createdAt: Date;

  updatedAt: Date;
}
