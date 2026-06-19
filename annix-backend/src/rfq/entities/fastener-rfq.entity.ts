import { ApiProperty } from "@nestjs/swagger";
import { RfqItem } from "./rfq-item.entity";

export enum FastenerCategory {
  BOLT = "bolt",
  NUT = "nut",
  WASHER = "washer",
  GASKET = "gasket",
  SET_SCREW = "set_screw",
  MACHINE_SCREW = "machine_screw",
  INSERT = "insert",
}

export class FastenerRfq {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "Fastener category", enum: FastenerCategory })
  fastenerCategory: FastenerCategory;

  @ApiProperty({ description: "Specific type within category", example: "hex_bolt" })
  specificType: string;

  @ApiProperty({ description: "Thread size designation", example: "M16" })
  size: string;

  @ApiProperty({ description: "Grade/class", example: "8.8" })
  grade: string | null;

  @ApiProperty({ description: "Material specification", example: "Carbon Steel" })
  material: string | null;

  @ApiProperty({ description: "Surface finish", example: "zinc" })
  finish: string | null;

  @ApiProperty({ description: "Thread type (coarse/fine)", example: "coarse" })
  threadType: string | null;

  @ApiProperty({ description: "Manufacturing standard", example: "DIN 931" })
  standard: string | null;

  @ApiProperty({ description: "Length in mm (for bolts/screws)", example: 50 })
  lengthMm: number | null;

  @ApiProperty({ description: "Quantity required", example: 100 })
  quantityValue: number;

  @ApiProperty({ description: "Additional notes" })
  notes: string | null;

  rfqItem: RfqItem;

  createdAt: Date;

  updatedAt: Date;
}
