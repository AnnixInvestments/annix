import { ApiProperty } from "@nestjs/swagger";
import { Boq } from "./boq.entity";

export enum BoqItemType {
  STRAIGHT_PIPE = "straight_pipe",
  BEND = "bend",
  FITTING = "fitting",
  FLANGE = "flange",
  VALVE = "valve",
  SUPPORT = "support",
  COATING = "coating",
  LINING = "lining",
  FASTENER = "fastener",
  CUSTOM = "custom",
}

export class BoqLineItem {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "Parent BOQ", type: () => Boq })
  boq: Boq;

  @ApiProperty({ description: "Line number in the BOQ", example: 1 })
  lineNumber: number;

  @ApiProperty({ description: "Item code/reference", required: false })
  itemCode?: string;

  @ApiProperty({
    description: "Item description",
    example: "500NB Sch40 Carbon Steel Pipe",
  })
  description: string;

  @ApiProperty({ description: "Item type", enum: BoqItemType })
  itemType: BoqItemType;

  @ApiProperty({ description: "Unit of measure", example: "meters" })
  unitOfMeasure: string;

  @ApiProperty({ description: "Quantity", example: 100.5 })
  quantity: number;

  @ApiProperty({ description: "Unit weight in kg", required: false })
  unitWeightKg?: number | null;

  @ApiProperty({ description: "Total weight in kg", required: false })
  totalWeightKg?: number | null;

  @ApiProperty({ description: "Unit price", required: false })
  unitPrice?: number | null;

  @ApiProperty({ description: "Total price", required: false })
  totalPrice?: number | null;

  @ApiProperty({ description: "Additional notes", required: false })
  notes?: string;

  @ApiProperty({
    description: "Reference to drawing location",
    required: false,
  })
  drawingReference?: string;

  @ApiProperty({
    description: "Additional specifications as JSON",
    required: false,
  })
  specifications?: Record<string, any>;

  @ApiProperty({ description: "Creation date" })
  createdAt: Date;

  @ApiProperty({ description: "Last update date" })
  updatedAt: Date;
}
