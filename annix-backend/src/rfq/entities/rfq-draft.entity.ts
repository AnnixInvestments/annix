import { ApiProperty } from "@nestjs/swagger";
import { User } from "../../user/entities/user.entity";
import { Rfq } from "./rfq.entity";

export class RfqDraft {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({
    description: "Auto-generated draft number",
    example: "DRAFT-2025-0001",
  })
  draftNumber: string;

  @ApiProperty({
    description: "Customer RFQ reference number (user-inputted)",
    example: "RFQ-2025-001",
  })
  customerRfqReference?: string;

  @ApiProperty({
    description: "Project name (for display purposes)",
    example: "500NB Pipeline Extension",
  })
  projectName?: string;

  @ApiProperty({
    description: "Current step in the RFQ form (1-5)",
    example: 2,
  })
  currentStep: number;

  @ApiProperty({
    description: "Complete form state as JSON",
  })
  formData: Record<string, any>;

  @ApiProperty({
    description: "Global specifications as JSON",
  })
  globalSpecs?: Record<string, any>;

  @ApiProperty({
    description: "Required products/services selected",
  })
  requiredProducts?: string[];

  @ApiProperty({
    description: "Straight pipe entries as JSON",
  })
  straightPipeEntries?: Record<string, any>[];

  @ApiProperty({
    description: "Pending documents metadata",
  })
  pendingDocuments?: Record<string, any>[];

  @ApiProperty({
    description: "Completion percentage (0-100)",
    example: 45,
  })
  completionPercentage: number;

  @ApiProperty({
    description: "User who created this draft",
    type: () => User,
  })
  createdBy: User;

  // Scalar FK shape used by the Mongo schema (where createdBy is only a
  // populate virtual that mongoose drops on save). Undecorated on purpose —
  // TypeORM ignores it; the relation above is the relational source of truth.
  createdById?: number;

  @ApiProperty({
    description: "ID of the converted RFQ (if submitted)",
    required: false,
  })
  convertedRfqId?: number;

  convertedRfq?: Rfq;

  @ApiProperty({ description: "Whether this draft was converted to an RFQ" })
  isConverted: boolean;

  @ApiProperty({ description: "Creation date" })
  createdAt: Date;

  @ApiProperty({ description: "Last update date" })
  updatedAt: Date;
}
