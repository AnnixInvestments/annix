import { ApiProperty } from "@nestjs/swagger";
import { Rfq } from "../../rfq/entities/rfq.entity";

export class RfqSurfaceProtection {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "RFQ ID" })
  rfqId: number;

  rfq: Rfq;

  // External coating specifications
  @ApiProperty({ description: "External coating required" })
  externalCoatingRequired: boolean;

  @ApiProperty({ description: "External coating type", required: false })
  externalCoatingType?: string;

  @ApiProperty({ description: "External coating system code", required: false })
  externalSystemCode?: string;

  @ApiProperty({ description: "External system description", required: false })
  externalSystemDescription?: string;

  @ApiProperty({ description: "ISO 12944 corrosivity category", required: false })
  iso12944Category?: string;

  @ApiProperty({ description: "ISO 12944 durability class", required: false })
  iso12944Durability?: string;

  @ApiProperty({ description: "External total DFT in microns", required: false })
  externalTotalDftUm?: number;

  @ApiProperty({ description: "Surface preparation standard", required: false })
  surfacePrepStandard?: string;

  // Internal lining specifications
  @ApiProperty({ description: "Internal lining required" })
  internalLiningRequired: boolean;

  @ApiProperty({ description: "Internal lining type", required: false })
  internalLiningType?: string;

  @ApiProperty({ description: "Internal lining thickness in mm", required: false })
  internalLiningThicknessMm?: number;

  @ApiProperty({ description: "Internal lining description", required: false })
  internalLiningDescription?: string;

  @ApiProperty({ description: "Rubber grade (for rubber linings)", required: false })
  rubberGrade?: string;

  @ApiProperty({ description: "Rubber hardness IRHD", required: false })
  rubberHardnessIrhd?: number;

  @ApiProperty({ description: "Ceramic tile type", required: false })
  ceramicTileType?: string;

  // Application details
  @ApiProperty({ description: "Substrate type", required: false })
  substrateType?: string;

  @ApiProperty({ description: "Application method", required: false })
  applicationMethod?: string;

  @ApiProperty({ description: "Application location (shop/field/both)", required: false })
  applicationLocation?: string;

  // Environmental conditions
  @ApiProperty({ description: "Application temperature in Celsius", required: false })
  applicationTempC?: number;

  @ApiProperty({ description: "Application humidity percent", required: false })
  applicationHumidityPercent?: number;

  // Inspection requirements
  @ApiProperty({ description: "Inspection requirements as JSON array", required: false })
  inspectionRequirements?: string[];

  // Surface area calculations
  @ApiProperty({ description: "Total internal surface area in m2", required: false })
  totalInternalAreaM2?: number;

  @ApiProperty({ description: "Total external surface area in m2", required: false })
  totalExternalAreaM2?: number;

  @ApiProperty({ description: "Wastage percentage", required: false })
  wastagePercent?: number;

  // Quantity calculations
  @ApiProperty({ description: "Total paint quantity in liters", required: false })
  totalPaintLiters?: number;

  @ApiProperty({ description: "Total rubber quantity in m2", required: false })
  totalRubberM2?: number;

  @ApiProperty({ description: "Total ceramic tile count", required: false })
  totalCeramicTiles?: number;

  // Pricing
  @ApiProperty({ description: "External coating total cost", required: false })
  externalCoatingCost?: number;

  @ApiProperty({ description: "Internal lining total cost", required: false })
  internalLiningCost?: number;

  @ApiProperty({ description: "Surface preparation total cost", required: false })
  surfacePrepCost?: number;

  @ApiProperty({ description: "Total surface protection cost", required: false })
  totalSpCost?: number;

  @ApiProperty({ description: "Margin percentage", required: false })
  marginPercent?: number;

  @ApiProperty({ description: "SP specification confirmed by user" })
  isConfirmed: boolean;

  @ApiProperty({ description: "Additional notes", required: false })
  notes?: string;

  // Full calculation data as JSON for flexibility
  @ApiProperty({ description: "Full calculation and specification data", required: false })
  specificationData?: Record<string, unknown>;

  createdAt: Date;

  updatedAt: Date;
}
