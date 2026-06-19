import { ApiProperty } from "@nestjs/swagger";
import { User } from "../../user/entities/user.entity";

export enum WorkflowType {
  DRAWING_REVIEW = "drawing_review",
  BOQ_REVIEW = "boq_review",
  RFQ_REVIEW = "rfq_review",
}

export enum ReviewEntityType {
  DRAWING = "drawing",
  BOQ = "boq",
  RFQ = "rfq",
}

export enum ReviewStatus {
  DRAFT = "draft",
  SUBMITTED = "submitted",
  UNDER_REVIEW = "under_review",
  CHANGES_REQUESTED = "changes_requested",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export class ReviewWorkflow {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "Type of workflow", enum: WorkflowType })
  workflowType: WorkflowType;

  @ApiProperty({
    description: "Entity type being reviewed",
    enum: ReviewEntityType,
  })
  entityType: ReviewEntityType;

  @ApiProperty({ description: "ID of the entity being reviewed", example: 1 })
  entityId: number;

  @ApiProperty({ description: "Current review status", enum: ReviewStatus })
  currentStatus: ReviewStatus;

  @ApiProperty({
    description: "Previous status",
    enum: ReviewStatus,
    required: false,
  })
  previousStatus?: ReviewStatus;

  @ApiProperty({
    description: "User who submitted for review",
    type: () => User,
  })
  submittedBy: User;

  @ApiProperty({
    description: "Assigned reviewer",
    type: () => User,
    required: false,
  })
  assignedReviewer?: User;

  @ApiProperty({
    description: "User who made the decision",
    type: () => User,
    required: false,
  })
  decidedBy?: User;

  @ApiProperty({ description: "Notes from the decision", required: false })
  decisionNotes?: string;

  @ApiProperty({ description: "When the item was submitted", required: false })
  submittedAt?: Date;

  @ApiProperty({ description: "When the decision was made", required: false })
  decidedAt?: Date;

  @ApiProperty({ description: "Due date for review", required: false })
  dueDate?: Date;

  @ApiProperty({
    description: "Whether this is the active workflow for the entity",
  })
  isActive: boolean;

  @ApiProperty({ description: "Creation date" })
  createdAt: Date;

  @ApiProperty({ description: "Last update date" })
  updatedAt: Date;
}
