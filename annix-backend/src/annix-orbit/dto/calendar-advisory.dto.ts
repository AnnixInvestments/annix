import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";

class CalendarAdvisoryPrevSlotDto {
  @IsString()
  @MaxLength(40)
  endsAt: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  locationLabel: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  locationAddress: string | null;
}

class CalendarAdvisoryNextSlotDto {
  @IsString()
  @MaxLength(40)
  startsAt: string;

  @IsString()
  @MaxLength(40)
  endsAt: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  locationLabel: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  locationAddress: string | null;
}

class CalendarAdvisoryConflictDto {
  @IsInt()
  bookingId: number;

  @IsIn(["overlap", "insufficient-travel"])
  type: "overlap" | "insufficient-travel";

  @ValidateNested()
  @Type(() => CalendarAdvisoryPrevSlotDto)
  prevSlot: CalendarAdvisoryPrevSlotDto;

  @ValidateNested()
  @Type(() => CalendarAdvisoryNextSlotDto)
  nextSlot: CalendarAdvisoryNextSlotDto;

  @IsOptional()
  @IsNumber()
  travelMinutes: number | null;

  @IsNumber()
  gapMinutes: number;
}

export class CalendarAdvisoryDto {
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CalendarAdvisoryConflictDto)
  conflicts: CalendarAdvisoryConflictDto[];
}
