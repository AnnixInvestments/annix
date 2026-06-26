import { ApiProperty } from "@nestjs/swagger";
import { Boq } from "../../boq/entities/boq.entity";
import { Drawing } from "../../drawings/entities/drawing.entity";
import { User } from "../../user/entities/user.entity";
import { RfqDocument } from "./rfq-document.entity";
import { RfqItem } from "./rfq-item.entity";

export enum RfqStatus {
  DRAFT = "draft",
  SUBMITTED = "submitted",
  PENDING = "pending",
  IN_REVIEW = "in_review",
  QUOTED = "quoted",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
  CANCELLED = "cancelled",
}

export class Rfq {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({
    description: "Auto-generated RFQ number",
    example: "RFQ-2025-0001",
  })
  rfqNumber: string;

  // Idempotency key generated client-side on submit. The unique
  // constraint stops duplicate rfqs from being created when the
  // Next.js dev proxy retries a long POST that timed out, when
  // the user double-clicks Submit, or when HMR resets React state
  // mid-submit. Nullable so historical rows aren't broken.
  @ApiProperty({
    description: "Client-generated idempotency key for the submission attempt",
    required: false,
  })
  submissionId?: string | null;

  @ApiProperty({
    description: "Project name",
    example: "500NB Pipeline Extension",
  })
  projectName: string;

  @ApiProperty({ description: "Project description", required: false })
  description?: string;

  @ApiProperty({ description: "Customer company name", required: false })
  customerName?: string;

  @ApiProperty({ description: "Customer email", required: false })
  customerEmail?: string;

  @ApiProperty({ description: "Customer phone number", required: false })
  customerPhone?: string;

  @ApiProperty({ description: "Required delivery date", required: false })
  requiredDate?: Date | null;

  @ApiProperty({ description: "RFQ status", enum: RfqStatus })
  status: RfqStatus;

  @ApiProperty({
    description: "When the customer accepted the quote",
    required: false,
  })
  acceptedAt?: Date | null;

  @ApiProperty({
    description: "When the customer rejected the quote",
    required: false,
  })
  rejectedAt?: Date | null;

  @ApiProperty({
    description: "User id of the customer who accepted or rejected the quote",
    required: false,
  })
  decisionByUserId?: number | null;

  @ApiProperty({
    description: "Reason supplied by the customer when rejecting the quote",
    required: false,
  })
  rejectionReason?: string | null;

  @ApiProperty({ description: "Additional notes", required: false })
  notes?: string;

  @ApiProperty({ description: "Total estimated weight in kg", required: false })
  totalWeightKg?: number;

  @ApiProperty({ description: "Total estimated cost", required: false })
  totalCost?: number;

  @ApiProperty({ description: "Estimated headcount for the project", required: false })
  estimatedHeadcount?: number | null;

  @ApiProperty({
    description: "Radius around project site to search for candidates (km)",
    required: false,
  })
  radiusKm?: number | null;

  @ApiProperty({ description: "Project site location (free text for geocoding)", required: false })
  projectLocation?: string | null;

  @ApiProperty({ description: "Geocoded project lat", required: false })
  projectLocationLat?: number | null;

  @ApiProperty({ description: "Geocoded project lon", required: false })
  projectLocationLon?: number | null;

  @ApiProperty({
    description: "User who created this RFQ",
    type: () => User,
    required: false,
  })
  createdBy?: User;

  @ApiProperty({ description: "RFQ items", type: () => [RfqItem] })
  items: RfqItem[];

  @ApiProperty({ description: "Attached documents", type: () => [RfqDocument] })
  documents: RfqDocument[];

  @ApiProperty({ description: "Linked drawings", type: () => [Drawing] })
  drawings: Drawing[];

  @ApiProperty({ description: "Linked BOQs", type: () => [Boq] })
  boqs: Boq[];

  @ApiProperty({ description: "Creation date" })
  createdAt: Date;

  @ApiProperty({ description: "Last update date" })
  updatedAt: Date;
}
