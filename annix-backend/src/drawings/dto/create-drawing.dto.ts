import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateDrawingDto {
  @ApiProperty({
    description: "Drawing title",
    example: "Pipeline Section A - General Arrangement",
  })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ description: "Drawing description" })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: "Associated RFQ ID" })
  @IsOptional()
  @IsNumber()
  rfqId?: number;
}
