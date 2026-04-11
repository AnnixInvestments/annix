import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  IsArray,
  IsEnum,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import {
  OptionalEmail,
  OptionalNumber,
  OptionalString,
  RequiredString,
} from "../../lib/dto/validation-decorators";
import {
  FollowUpRecurrence,
  ProspectActivityType,
  ProspectPriority,
  ProspectStatus,
} from "../entities";

export class CreateProspectDto {
  @ApiProperty({ description: "Company name", example: "Acme Industries" })
  @RequiredString({ maxLength: 255 })
  companyName: string;

  @ApiPropertyOptional({ description: "Contact person name", example: "John Smith" })
  @OptionalString({ maxLength: 255 })
  contactName?: string;

  @ApiPropertyOptional({ description: "Contact email", example: "john@example.com" })
  @OptionalEmail()
  contactEmail?: string;

  @ApiPropertyOptional({ description: "Contact phone", example: "+27 11 000 4567" })
  @OptionalString({ maxLength: 50 })
  contactPhone?: string;

  @ApiPropertyOptional({ description: "Contact job title", example: "Procurement Manager" })
  @OptionalString({ maxLength: 100 })
  contactTitle?: string;

  @ApiPropertyOptional({ description: "Street address", example: "123 Main Street" })
  @OptionalString({ maxLength: 500 })
  streetAddress?: string;

  @ApiPropertyOptional({ description: "City", example: "Johannesburg" })
  @OptionalString({ maxLength: 100 })
  city?: string;

  @ApiPropertyOptional({ description: "Province/State", example: "Gauteng" })
  @OptionalString({ maxLength: 100 })
  province?: string;

  @ApiPropertyOptional({ description: "Postal code", example: "2001" })
  @OptionalString({ maxLength: 20 })
  postalCode?: string;

  @ApiPropertyOptional({ description: "Country", example: "South Africa", default: "South Africa" })
  @OptionalString({ maxLength: 100 })
  country?: string;

  @ApiPropertyOptional({ description: "Latitude", example: -26.2041 })
  @OptionalNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: "Longitude", example: 28.0473 })
  @OptionalNumber()
  longitude?: number;

  @ApiPropertyOptional({ description: "Google Place ID" })
  @OptionalString({ maxLength: 255 })
  googlePlaceId?: string;

  @ApiPropertyOptional({
    description: "Prospect status",
    enum: ProspectStatus,
    default: ProspectStatus.NEW,
  })
  @IsEnum(ProspectStatus)
  @IsOptional()
  status?: ProspectStatus;

  @ApiPropertyOptional({
    description: "Priority level",
    enum: ProspectPriority,
    default: ProspectPriority.MEDIUM,
  })
  @IsEnum(ProspectPriority)
  @IsOptional()
  priority?: ProspectPriority;

  @ApiPropertyOptional({ description: "Notes about the prospect" })
  @OptionalString()
  notes?: string;

  @ApiPropertyOptional({ description: "Tags for categorization", example: ["industrial", "steel"] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: "Estimated deal value", example: 150000 })
  @OptionalNumber()
  estimatedValue?: number;

  @ApiPropertyOptional({ description: "Next follow-up date/time" })
  @OptionalString()
  nextFollowUpAt?: string;

  @ApiPropertyOptional({
    description: "Follow-up recurrence pattern",
    enum: FollowUpRecurrence,
    default: FollowUpRecurrence.NONE,
  })
  @IsEnum(FollowUpRecurrence)
  @IsOptional()
  followUpRecurrence?: FollowUpRecurrence;

  @ApiPropertyOptional({ description: "Custom fields for additional data" })
  @IsObject()
  @IsOptional()
  customFields?: Record<string, unknown>;
}

export class UpdateProspectDto extends PartialType(CreateProspectDto) {}

export class ProspectResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  ownerId: number;

  @ApiProperty()
  companyName: string;

  @ApiPropertyOptional()
  contactName: string | null;

  @ApiPropertyOptional()
  contactEmail: string | null;

  @ApiPropertyOptional()
  contactPhone: string | null;

  @ApiPropertyOptional()
  contactTitle: string | null;

  @ApiPropertyOptional()
  streetAddress: string | null;

  @ApiPropertyOptional()
  city: string | null;

  @ApiPropertyOptional()
  province: string | null;

  @ApiPropertyOptional()
  postalCode: string | null;

  @ApiProperty()
  country: string;

  @ApiPropertyOptional()
  latitude: number | null;

  @ApiPropertyOptional()
  longitude: number | null;

  @ApiProperty({ enum: ProspectStatus })
  status: ProspectStatus;

  @ApiProperty({ enum: ProspectPriority })
  priority: ProspectPriority;

  @ApiPropertyOptional()
  notes: string | null;

  @ApiPropertyOptional()
  tags: string[] | null;

  @ApiPropertyOptional()
  estimatedValue: number | null;

  @ApiPropertyOptional()
  lastContactedAt: Date | null;

  @ApiPropertyOptional()
  nextFollowUpAt: Date | null;

  @ApiProperty({ enum: FollowUpRecurrence })
  followUpRecurrence: FollowUpRecurrence;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class NearbyProspectsQueryDto {
  @ApiProperty({ description: "Center latitude", example: -26.2041 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ description: "Center longitude", example: 28.0473 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({ description: "Radius in kilometers", example: 10, default: 10 })
  @IsNumber()
  @IsOptional()
  @Min(0.1)
  @Max(500)
  radiusKm?: number;

  @ApiPropertyOptional({ description: "Maximum results to return", example: 20, default: 20 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class BulkUpdateStatusDto {
  @ApiProperty({ description: "Array of prospect IDs to update", example: [1, 2, 3] })
  @IsArray()
  @IsNumber({}, { each: true })
  ids: number[];

  @ApiProperty({ description: "New status for all selected prospects", enum: ProspectStatus })
  @IsEnum(ProspectStatus)
  status: ProspectStatus;
}

export class BulkUpdateStatusResponseDto {
  @ApiProperty({ description: "Number of prospects updated" })
  updated: number;

  @ApiProperty({ description: "IDs of prospects that were updated" })
  updatedIds: number[];

  @ApiProperty({
    description: "IDs of prospects that were not found (belong to another user or don't exist)",
  })
  notFoundIds: number[];
}

export class BulkDeleteDto {
  @ApiProperty({ description: "Array of prospect IDs to delete", example: [1, 2, 3] })
  @IsArray()
  @IsNumber({}, { each: true })
  ids: number[];
}

export class BulkDeleteResponseDto {
  @ApiProperty({ description: "Number of prospects deleted" })
  deleted: number;

  @ApiProperty({ description: "IDs of prospects that were deleted" })
  deletedIds: number[];

  @ApiProperty({ description: "IDs of prospects that were not found" })
  notFoundIds: number[];
}

export class ImportProspectRowDto {
  @ApiPropertyOptional()
  @OptionalString()
  companyName?: string;

  @ApiPropertyOptional()
  @OptionalString()
  contactName?: string;

  @ApiPropertyOptional()
  @OptionalEmail()
  contactEmail?: string;

  @ApiPropertyOptional()
  @OptionalString()
  contactPhone?: string;

  @ApiPropertyOptional()
  @OptionalString()
  contactTitle?: string;

  @ApiPropertyOptional()
  @OptionalString()
  streetAddress?: string;

  @ApiPropertyOptional()
  @OptionalString()
  city?: string;

  @ApiPropertyOptional()
  @OptionalString()
  province?: string;

  @ApiPropertyOptional()
  @OptionalString()
  postalCode?: string;

  @ApiPropertyOptional()
  @OptionalString()
  country?: string;

  @ApiPropertyOptional({ enum: ProspectStatus })
  @IsEnum(ProspectStatus)
  @IsOptional()
  status?: ProspectStatus;

  @ApiPropertyOptional({ enum: ProspectPriority })
  @IsEnum(ProspectPriority)
  @IsOptional()
  priority?: ProspectPriority;

  @ApiPropertyOptional()
  @OptionalString()
  notes?: string;

  @ApiPropertyOptional()
  @OptionalString()
  tags?: string;

  @ApiPropertyOptional()
  @OptionalString()
  estimatedValue?: string;
}

export class ImportProspectsDto {
  @ApiProperty({ description: "Array of prospect data rows to import" })
  @IsArray()
  rows: ImportProspectRowDto[];

  @ApiPropertyOptional({
    description: "Whether to skip rows with validation errors",
    default: true,
  })
  @IsOptional()
  skipInvalid?: boolean;
}

export class ImportProspectsResultDto {
  @ApiProperty({ description: "Number of prospects successfully imported" })
  imported: number;

  @ApiProperty({ description: "Number of rows that were skipped due to errors" })
  skipped: number;

  @ApiProperty({ description: "Details of any errors encountered" })
  errors: Array<{ row: number; error: string }>;

  @ApiProperty({ description: "IDs of newly created prospects" })
  createdIds: number[];
}

export class MergeProspectsDto {
  @ApiProperty({ description: "ID of the prospect to keep as primary", example: 1 })
  @IsNumber()
  primaryId: number;

  @ApiProperty({ description: "IDs of prospects to merge into primary", example: [2, 3] })
  @IsArray()
  @IsNumber({}, { each: true })
  mergeIds: number[];

  @ApiPropertyOptional({ description: "Optional field overrides for the merged prospect" })
  @IsOptional()
  fieldOverrides?: Partial<CreateProspectDto>;
}

export class MergeProspectsResponseDto {
  @ApiProperty({ description: "The merged prospect" })
  prospect: ProspectResponseDto;

  @ApiProperty({ description: "Number of prospects that were merged and deleted" })
  mergedCount: number;
}

export class BulkTagOperationDto {
  @ApiProperty({ description: "Prospect IDs to update", example: [1, 2, 3] })
  @IsArray()
  @IsNumber({}, { each: true })
  ids: number[];

  @ApiProperty({ description: "Tags to add or remove", example: ["VIP", "Priority"] })
  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @ApiProperty({ description: "Operation to perform", enum: ["add", "remove"] })
  @IsIn(["add", "remove"])
  operation: "add" | "remove";
}

export class BulkTagOperationResponseDto {
  @ApiProperty({ description: "Number of prospects updated" })
  updated: number;

  @ApiProperty({ description: "IDs of prospects that were updated" })
  updatedIds: number[];
}

export class ProspectActivityResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  prospectId: number;

  @ApiProperty()
  userId: number;

  @ApiPropertyOptional()
  userName: string | null;

  @ApiProperty({ enum: ProspectActivityType })
  activityType: ProspectActivityType;

  @ApiPropertyOptional()
  oldValues: Record<string, unknown> | null;

  @ApiPropertyOptional()
  newValues: Record<string, unknown> | null;

  @ApiPropertyOptional()
  description: string | null;

  @ApiProperty()
  createdAt: Date;
}
