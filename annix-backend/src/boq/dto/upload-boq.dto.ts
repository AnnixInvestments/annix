import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString } from "class-validator";

export class UploadBoqDto {
  @ApiProperty({
    description: "BOQ title",
    example: "Pipeline Section A - Materials",
  })
  @IsString()
  title: string;

  @ApiProperty({ description: "BOQ description", required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: "Drawing ID to link", required: false })
  @IsOptional()
  @IsNumber()
  drawingId?: number;

  @ApiProperty({ description: "RFQ ID to link", required: false })
  @IsOptional()
  @IsNumber()
  rfqId?: number;
}

export interface ParsedBoqLineItem {
  itemCode: string | null;
  description: string;
  itemType: string;
  unitOfMeasure: string;
  quantity: number;
  unitWeightKg: number | null;
  unitPrice: number | null;
  notes: string | null;
  drawingReference: string | null;
}

export interface ParsedBoqData {
  title?: string;
  description?: string;
  lineItems: ParsedBoqLineItem[];
  errors: string[];
  warnings: string[];
}
