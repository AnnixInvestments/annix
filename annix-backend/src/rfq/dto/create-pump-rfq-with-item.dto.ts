import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsObject, IsOptional, IsString, ValidateNested } from "class-validator";
import { CreatePumpRfqDto } from "./create-pump-rfq.dto";
import { CreateRfqDto } from "./create-rfq.dto";

export class CreatePumpRfqWithItemDto {
  @ApiProperty({
    description: "RFQ header information",
    type: CreateRfqDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => CreateRfqDto)
  rfq: CreateRfqDto;

  @ApiProperty({
    description: "Pump specifications",
    type: CreatePumpRfqDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => CreatePumpRfqDto)
  pump: CreatePumpRfqDto;

  @ApiProperty({
    description: "Description for the RFQ item line",
    example: "Centrifugal Pump for Water Transfer - 100 m³/h @ 50m head",
  })
  @IsString()
  itemDescription: string;

  @ApiProperty({
    description: "Additional notes for the item",
    required: false,
    example: "API 610 compliant, outdoor installation",
  })
  @IsOptional()
  @IsString()
  itemNotes?: string;
}
