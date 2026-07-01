import { ApiProperty } from "@nestjs/swagger";
import { Drawing } from "../../drawings/entities/drawing.entity";
import { Rfq } from "../../rfq/entities/rfq.entity";
import { User } from "../../user/entities/user.entity";
import { BoqLineItem } from "./boq-line-item.entity";

export enum BoqStatus {
  DRAFT = "draft",
  SUBMITTED = "submitted",
  UNDER_REVIEW = "under_review",
  CHANGES_REQUESTED = "changes_requested",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export class Boq {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({
    description: "Auto-generated BOQ number",
    example: "BOQ-2025-0001",
  })
  boqNumber: string;

  @ApiProperty({
    description: "BOQ title",
    example: "Pipeline Section A - Materials List",
  })
  title: string;

  @ApiProperty({ description: "BOQ description", required: false })
  description?: string;

  @ApiProperty({ description: "BOQ status", enum: BoqStatus })
  status: BoqStatus;

  @ApiProperty({
    description: "Associated drawing",
    type: () => Drawing,
    required: false,
  })
  drawing?: Drawing;

  @ApiProperty({
    description: "Associated RFQ",
    type: () => Rfq,
    required: false,
  })
  rfq?: Rfq;

  @ApiProperty({ description: "User who created the BOQ", type: () => User })
  createdBy: User;

  @ApiProperty({ description: "Line items", type: () => [BoqLineItem] })
  lineItems: BoqLineItem[];

  @ApiProperty({ description: "Total quantity", required: false })
  totalQuantity?: number;

  @ApiProperty({ description: "Total weight in kg", required: false })
  totalWeightKg?: number;

  @ApiProperty({ description: "Total estimated cost", required: false })
  totalEstimatedCost?: number;

  @ApiProperty({
    description:
      "NixExtractionSession id this BOQ was materialized from when published via the RFQ sourcing in-app quote surface (issue #432). Null for BOQs created through the normal drawing/RFQ flow.",
    required: false,
  })
  sourceSessionId?: number | null;

  @ApiProperty({
    description:
      "Sourcing bucket reference (supplierProfileId::category) this BOQ was materialized from. Null for non-sourcing BOQs.",
    required: false,
  })
  sourceBucketRef?: string | null;

  @ApiProperty({ description: "Creation date" })
  createdAt: Date;

  @ApiProperty({ description: "Last update date" })
  updatedAt: Date;
}
