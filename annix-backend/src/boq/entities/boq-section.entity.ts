import { ApiProperty } from "@nestjs/swagger";
import { Boq } from "./boq.entity";

/**
 * Stores pre-calculated consolidated BOQ sections for efficient supplier distribution.
 * Each section maps to a capability key that determines which suppliers can access it.
 */
export class BoqSection {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "Parent BOQ", type: () => Boq })
  boq: Boq;

  boqId: number;

  @ApiProperty({
    description: "Section type identifier",
    example: "straight_pipes",
  })
  sectionType: string; // 'straight_pipes', 'bends', 'fittings', 'flanges', 'bnw_sets', 'gaskets', etc.

  @ApiProperty({
    description: "Capability key for supplier matching",
    example: "fabricated_steel",
  })
  capabilityKey: string; // Maps to PRODUCTS_AND_SERVICES value

  @ApiProperty({
    description: "Display title for this section",
    example: "Straight Pipes",
  })
  sectionTitle: string;

  @ApiProperty({
    description: "Consolidated items for this section",
    type: "array",
    items: { type: "object", additionalProperties: true },
  })
  items: any[]; // Array of consolidated items with description, qty, unit, weight, entries, welds, areas

  @ApiProperty({ description: "Total weight in kg for this section" })
  totalWeightKg?: number;

  @ApiProperty({ description: "Number of items in this section" })
  itemCount: number;

  @ApiProperty({ description: "Creation date" })
  createdAt: Date;

  @ApiProperty({ description: "Last update date" })
  updatedAt: Date;
}
