import { ApiProperty } from "@nestjs/swagger";
export class StructuralSteelGrade {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "Grade code", example: "A36" })
  code: string;

  @ApiProperty({ description: "Full name", example: "ASTM A36" })
  name: string;

  @ApiProperty({ description: "Standard (ASTM, EN, etc.)", example: "ASTM" })
  standard: string;

  @ApiProperty({ description: "Minimum yield strength in MPa", example: 250 })
  yieldStrengthMpa: number;

  @ApiProperty({ description: "Minimum tensile strength in MPa", example: 400 })
  tensileStrengthMpa: number;

  @ApiProperty({
    description: "Compatible steel types",
    example: ["angle", "channel", "beam"],
  })
  compatibleTypes: string[];

  @ApiProperty({ description: "Description of the grade" })
  description: string;

  @ApiProperty({ description: "Display order for sorting", example: 1 })
  displayOrder: number;

  @ApiProperty({ description: "Whether this grade is active", default: true })
  isActive: boolean;

  createdAt: Date;
}
