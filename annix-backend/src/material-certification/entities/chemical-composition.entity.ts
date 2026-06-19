import { ApiProperty } from "@nestjs/swagger";
import { RfqItem } from "../../rfq/entities/rfq-item.entity";

export class ChemicalComposition {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "Carbon content (C) percentage", example: 0.25 })
  carbonPct?: number;

  @ApiProperty({ description: "Manganese content (Mn) percentage", example: 1.2 })
  manganesePct?: number;

  @ApiProperty({ description: "Phosphorus content (P) percentage", example: 0.025 })
  phosphorusPct?: number;

  @ApiProperty({ description: "Sulfur content (S) percentage", example: 0.015 })
  sulfurPct?: number;

  @ApiProperty({ description: "Silicon content (Si) percentage", example: 0.35 })
  siliconPct?: number;

  @ApiProperty({ description: "Chromium content (Cr) percentage", example: 0.5 })
  chromiumPct?: number;

  @ApiProperty({ description: "Molybdenum content (Mo) percentage", example: 0.1 })
  molybdenumPct?: number;

  @ApiProperty({ description: "Nickel content (Ni) percentage", example: 0.3 })
  nickelPct?: number;

  @ApiProperty({ description: "Vanadium content (V) percentage", example: 0.05 })
  vanadiumPct?: number;

  @ApiProperty({ description: "Copper content (Cu) percentage", example: 0.2 })
  copperPct?: number;

  @ApiProperty({ description: "Niobium/Columbium content (Nb) percentage", example: 0.02 })
  niobiumPct?: number;

  @ApiProperty({ description: "Titanium content (Ti) percentage", example: 0.01 })
  titaniumPct?: number;

  @ApiProperty({ description: "Aluminum content (Al) percentage", example: 0.03 })
  aluminumPct?: number;

  @ApiProperty({ description: "Nitrogen content (N) percentage", example: 0.012 })
  nitrogenPct?: number;

  @ApiProperty({ description: "Boron content (B) percentage", example: 0.001 })
  boronPct?: number;

  @ApiProperty({ description: "Heat number reference", required: false })
  heatNumber?: string;

  @ApiProperty({ description: "MTC reference number", required: false })
  mtcReference?: string;

  rfqItem?: RfqItem;

  rfqItemId?: number;

  createdAt: Date;

  updatedAt: Date;
}
