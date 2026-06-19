import { ApiProperty } from "@nestjs/swagger";
import { StructuralSteelSection } from "./structural-steel-section.entity";

export class StructuralSteelType {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "Type name", example: "Angle" })
  name: string;

  @ApiProperty({ description: "Type code for internal use", example: "angle" })
  code: string;

  @ApiProperty({ description: "Description of the steel type" })
  description: string;

  @ApiProperty({ description: "Display order for sorting", example: 1 })
  displayOrder: number;

  @ApiProperty({ description: "Whether this type is active", default: true })
  isActive: boolean;

  createdAt: Date;

  sections: StructuralSteelSection[];
}
