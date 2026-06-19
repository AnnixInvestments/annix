import { ApiProperty } from "@nestjs/swagger";
import { StructuralSteelType } from "./structural-steel-type.entity";

export class StructuralSteelSection {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "Steel type ID" })
  typeId: number;

  steelType: StructuralSteelType;

  @ApiProperty({ description: "Section designation", example: "50x50x5" })
  designation: string;

  @ApiProperty({
    description: "Dimensions as JSON",
    example: { leg1: 50, leg2: 50, thickness: 5 },
  })
  dimensions: Record<string, number>;

  @ApiProperty({ description: "Weight per meter in kg/m", example: 3.77 })
  weightKgPerM: number;

  @ApiProperty({
    description: "Surface area per meter in m²/m",
    example: 0.193,
  })
  surfaceAreaM2PerM: number;

  @ApiProperty({
    description: "Available grades for this section",
    example: ["A36", "A572-50"],
  })
  grades: string[];

  @ApiProperty({ description: "Section area in mm²", nullable: true })
  sectionAreaMm2: number;

  @ApiProperty({ description: "Moment of inertia Ix in cm⁴", nullable: true })
  momentOfInertiaIxCm4: number;

  @ApiProperty({ description: "Moment of inertia Iy in cm⁴", nullable: true })
  momentOfInertiaIyCm4: number;

  @ApiProperty({ description: "Section modulus Zx in cm³", nullable: true })
  sectionModulusZxCm3: number;

  @ApiProperty({ description: "Section modulus Zy in cm³", nullable: true })
  sectionModulusZyCm3: number;

  @ApiProperty({ description: "Display order for sorting", example: 1 })
  displayOrder: number;

  @ApiProperty({ description: "Whether this section is active", default: true })
  isActive: boolean;

  createdAt: Date;
}
