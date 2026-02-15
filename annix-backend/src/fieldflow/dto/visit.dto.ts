import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { VisitOutcome, VisitType } from "../entities";

export class CreateVisitDto {
  @ApiProperty({ description: "Prospect ID" })
  @IsNumber()
  @IsNotEmpty()
  prospectId: number;

  @ApiPropertyOptional({
    description: "Visit type",
    enum: VisitType,
    default: VisitType.SCHEDULED,
  })
  @IsEnum(VisitType)
  @IsOptional()
  visitType?: VisitType;

  @ApiPropertyOptional({ description: "Scheduled time for the visit" })
  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @ApiPropertyOptional({ description: "Notes about the visit" })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateVisitDto extends PartialType(CreateVisitDto) {
  @ApiPropertyOptional({ description: "Visit start time" })
  @IsDateString()
  @IsOptional()
  startedAt?: string;

  @ApiPropertyOptional({ description: "Visit end time" })
  @IsDateString()
  @IsOptional()
  endedAt?: string;

  @ApiPropertyOptional({
    description: "Visit outcome",
    enum: VisitOutcome,
  })
  @IsEnum(VisitOutcome)
  @IsOptional()
  outcome?: VisitOutcome;

  @ApiPropertyOptional({ description: "Name of contact met during visit" })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  contactMet?: string;

  @ApiPropertyOptional({ description: "Next steps after visit" })
  @IsString()
  @IsOptional()
  nextSteps?: string;

  @ApiPropertyOptional({ description: "Follow-up date" })
  @IsDateString()
  @IsOptional()
  followUpDate?: string;
}

export class CheckInDto {
  @ApiProperty({ description: "Check-in latitude" })
  @IsNumber()
  @IsNotEmpty()
  latitude: number;

  @ApiProperty({ description: "Check-in longitude" })
  @IsNumber()
  @IsNotEmpty()
  longitude: number;
}

export class CheckOutDto {
  @ApiProperty({ description: "Check-out latitude" })
  @IsNumber()
  @IsNotEmpty()
  latitude: number;

  @ApiProperty({ description: "Check-out longitude" })
  @IsNumber()
  @IsNotEmpty()
  longitude: number;

  @ApiPropertyOptional({
    description: "Visit outcome",
    enum: VisitOutcome,
  })
  @IsEnum(VisitOutcome)
  @IsOptional()
  outcome?: VisitOutcome;

  @ApiPropertyOptional({ description: "Notes about the visit" })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: "Contact met during visit" })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  contactMet?: string;

  @ApiPropertyOptional({ description: "Next steps" })
  @IsString()
  @IsOptional()
  nextSteps?: string;
}

export class VisitResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  prospectId: number;

  @ApiProperty()
  salesRepId: number;

  @ApiProperty({ enum: VisitType })
  visitType: VisitType;

  @ApiPropertyOptional()
  scheduledAt: Date | null;

  @ApiPropertyOptional()
  startedAt: Date | null;

  @ApiPropertyOptional()
  endedAt: Date | null;

  @ApiPropertyOptional()
  checkInLatitude: number | null;

  @ApiPropertyOptional()
  checkInLongitude: number | null;

  @ApiPropertyOptional()
  checkOutLatitude: number | null;

  @ApiPropertyOptional()
  checkOutLongitude: number | null;

  @ApiPropertyOptional({ enum: VisitOutcome })
  outcome: VisitOutcome | null;

  @ApiPropertyOptional()
  notes: string | null;

  @ApiPropertyOptional()
  contactMet: string | null;

  @ApiPropertyOptional()
  nextSteps: string | null;

  @ApiPropertyOptional()
  followUpDate: Date | null;

  @ApiProperty()
  createdAt: Date;
}
