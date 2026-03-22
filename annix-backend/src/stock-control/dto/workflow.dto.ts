import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

export class ApproveWorkflowStepDto {
  @ApiPropertyOptional({ description: "Base64 signature data URL" })
  @IsOptional()
  @IsString()
  signatureDataUrl?: string;

  @ApiPropertyOptional({ description: "Approval comments" })
  @IsOptional()
  @IsString()
  comments?: string;
}

export class RejectWorkflowStepDto {
  @ApiProperty({ description: "Reason for rejection" })
  @IsString()
  reason: string;
}

export class UpdateStepAssignmentsDto {
  @ApiProperty({ description: "User IDs to assign to the step", type: [Number] })
  @IsArray()
  @IsNumber({}, { each: true })
  userIds: number[];

  @ApiPropertyOptional({ description: "Primary user ID for the step" })
  @IsOptional()
  @IsNumber()
  primaryUserId?: number;
}

export class UpdateNotificationRecipientsDto {
  @ApiProperty({ description: "Email addresses for notifications", type: [String] })
  @IsArray()
  @IsEmail({}, { each: true })
  emails: string[];
}

export class UpdateUserLocationsDto {
  @ApiProperty({ description: "Location IDs to assign to the user", type: [Number] })
  @IsArray()
  @IsNumber({}, { each: true })
  locationIds: number[];
}

export class ScanDispatchItemDto {
  @ApiProperty({ description: "Stock item ID" })
  @IsNumber()
  stockItemId: number;

  @ApiProperty({ description: "Quantity to dispatch", minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: "Additional notes" })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ScanQrDto {
  @ApiProperty({ description: "QR code token" })
  @IsString()
  qrToken: string;
}

export class PushKeysDto {
  @ApiProperty({ description: "P-256 Diffie-Hellman public key" })
  @IsString()
  p256dh: string;

  @ApiProperty({ description: "Authentication secret" })
  @IsString()
  auth: string;
}

export class PushSubscribeDto {
  @ApiProperty({ description: "Push subscription endpoint URL" })
  @IsString()
  endpoint: string;

  @ApiProperty({ description: "Push subscription keys" })
  @ValidateNested()
  @Type(() => PushKeysDto)
  keys: PushKeysDto;
}

export class PushUnsubscribeDto {
  @ApiProperty({ description: "Push subscription endpoint URL to unsubscribe" })
  @IsString()
  endpoint: string;
}

export class UpdateStepLabelDto {
  @ApiProperty({ description: "New label for the workflow step", maxLength: 100 })
  @IsString()
  @MaxLength(100)
  label: string;
}

export class AddStepConfigDto {
  @ApiProperty({ description: "Label for the new step" })
  @IsString()
  label: string;

  @ApiProperty({ description: "Key of the step after which to insert" })
  @IsString()
  afterStepKey: string;

  @ApiPropertyOptional({ description: "Whether this is a background step" })
  @IsOptional()
  @IsBoolean()
  isBackground?: boolean;

  @ApiPropertyOptional({ description: "Step key that triggers this background step" })
  @IsOptional()
  @IsString()
  triggerAfterStep?: string;
}

export class ToggleStepBackgroundDto {
  @ApiProperty({ description: "Whether the step is a background step" })
  @IsBoolean()
  isBackground: boolean;

  @ApiPropertyOptional({ description: "Step key that triggers this background step" })
  @IsOptional()
  @IsString()
  triggerAfterStep?: string;
}

export class UpdateStepFollowsDto {
  @ApiProperty({ description: "The step key this step should follow (null for first)" })
  @IsOptional()
  @IsString()
  triggerAfterStep: string | null;
}

export class ReorderStepConfigsDto {
  @ApiProperty({ description: "Step keys in the desired order", type: [String] })
  @IsArray()
  @IsString({ each: true })
  orderedKeys: string[];
}

export class CompleteBackgroundStepDto {
  @ApiPropertyOptional({ description: "Completion notes" })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectAllocationDto {
  @ApiProperty({ description: "Reason for rejecting the allocation" })
  @IsString()
  reason: string;
}

export class CompleteActionDto {
  @ApiProperty({ description: "Step key to complete action for" })
  @IsString()
  stepKey: string;

  @ApiPropertyOptional({ description: "Action type (primary or secondary)" })
  @IsOptional()
  @IsString()
  actionType?: string;

  @ApiPropertyOptional({ description: "Additional metadata" })
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class UpdateStepActionLabelDto {
  @ApiProperty({ description: "New action label for the workflow step", maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  actionLabel: string | null;
}

export class SubmitQaReviewDto {
  @ApiPropertyOptional({ description: "Whether rubber coating is accepted" })
  @IsOptional()
  @IsBoolean()
  rubberAccepted?: boolean | null;

  @ApiPropertyOptional({ description: "Whether paint coating is accepted" })
  @IsOptional()
  @IsBoolean()
  paintAccepted?: boolean | null;

  @ApiPropertyOptional({ description: "Review notes" })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateInspectionBookingDto {
  @ApiProperty({ description: "Date of inspection (YYYY-MM-DD)" })
  @IsString()
  inspectionDate: string;

  @ApiProperty({ description: "Start time (HH:mm)" })
  @IsString()
  startTime: string;

  @ApiProperty({ description: "End time (HH:mm)" })
  @IsString()
  endTime: string;

  @ApiProperty({ description: "Inspector email address" })
  @IsString()
  @IsEmail()
  inspectorEmail: string;

  @ApiPropertyOptional({ description: "Inspector name" })
  @IsOptional()
  @IsString()
  inspectorName?: string;

  @ApiPropertyOptional({ description: "Booking notes" })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CompleteInspectionDto {
  @ApiPropertyOptional({ description: "Completion notes" })
  @IsOptional()
  @IsString()
  notes?: string;
}
