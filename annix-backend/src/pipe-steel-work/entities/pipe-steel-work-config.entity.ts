import { ApiProperty } from "@nestjs/swagger";
export class PipeSteelWorkConfigEntity {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({
    description: "Configuration key",
    example: "STEEL_DENSITY_KG_M3",
  })
  configKey: string;

  @ApiProperty({ description: "Configuration value", example: "7850" })
  configValue: string;

  @ApiProperty({ description: "Value type", example: "number" })
  valueType: "string" | "number" | "boolean" | "json";

  @ApiProperty({ description: "Description" })
  description: string | null;

  @ApiProperty({ description: "Category", example: "material" })
  category: string | null;

  @ApiProperty({ description: "Unit of measure", example: "kg/m³" })
  unit: string | null;

  createdAt: Date;

  updatedAt: Date;
}
