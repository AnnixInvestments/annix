import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { ProspectPriority, ProspectStatus } from "../entities";

export class CreateProspectDto {
  @ApiProperty({ description: "Company name", example: "Acme Industries" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  companyName: string;

  @ApiPropertyOptional({ description: "Contact person name", example: "John Smith" })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  contactName?: string;

  @ApiPropertyOptional({ description: "Contact email", example: "john@acme.com" })
  @IsEmail()
  @IsOptional()
  contactEmail?: string;

  @ApiPropertyOptional({ description: "Contact phone", example: "+27 11 123 4567" })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  contactPhone?: string;

  @ApiPropertyOptional({ description: "Contact job title", example: "Procurement Manager" })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  contactTitle?: string;

  @ApiPropertyOptional({ description: "Street address", example: "123 Main Street" })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  streetAddress?: string;

  @ApiPropertyOptional({ description: "City", example: "Johannesburg" })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: "Province/State", example: "Gauteng" })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  province?: string;

  @ApiPropertyOptional({ description: "Postal code", example: "2001" })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional({ description: "Country", example: "South Africa", default: "South Africa" })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ description: "Latitude", example: -26.2041 })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ description: "Longitude", example: 28.0473 })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({ description: "Google Place ID" })
  @IsString()
  @IsOptional()
  @MaxLength(255)
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
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: "Tags for categorization", example: ["industrial", "steel"] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: "Estimated deal value", example: 150000 })
  @IsNumber()
  @IsOptional()
  estimatedValue?: number;

  @ApiPropertyOptional({ description: "Next follow-up date/time" })
  @IsString()
  @IsOptional()
  nextFollowUpAt?: string;

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

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class NearbyProspectsQueryDto {
  @ApiProperty({ description: "Center latitude", example: -26.2041 })
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: "Center longitude", example: 28.0473 })
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({ description: "Radius in kilometers", example: 10, default: 10 })
  @IsNumber()
  @IsOptional()
  radiusKm?: number;

  @ApiPropertyOptional({ description: "Maximum results to return", example: 20, default: 20 })
  @IsNumber()
  @IsOptional()
  limit?: number;
}
