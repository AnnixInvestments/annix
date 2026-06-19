import { ApiProperty } from "@nestjs/swagger";
import { RfqItem } from "./rfq-item.entity";

export enum SurfaceProtectionType {
  EXTERNAL_COATING = "external_coating",
  INTERNAL_LINING = "internal_lining",
  BOTH = "both",
}

export enum CoatingSystemType {
  PAINT = "paint",
  GALVANIZED = "galvanized",
  FBE = "fbe",
  THREE_LPE = "3lpe",
}

export enum LiningSystemType {
  RUBBER = "rubber",
  CERAMIC = "ceramic",
  HDPE = "hdpe",
  PU = "pu",
  GLASS_FLAKE = "glass_flake",
}

export enum SubstrateType {
  CARBON_STEEL = "carbon_steel",
  STAINLESS_STEEL = "stainless_steel",
  GALVANIZED_STEEL = "galvanized_steel",
  ALUMINUM = "aluminum",
  CONCRETE = "concrete",
}

export enum ApplicationMethod {
  AIRLESS_SPRAY = "airless_spray",
  CONVENTIONAL_SPRAY = "conventional_spray",
  BRUSH = "brush",
  ROLLER = "roller",
  HOT_DIP = "hot_dip",
  ELECTROSTATIC = "electrostatic",
}

export enum ApplicationLocation {
  SHOP = "shop",
  FIELD = "field",
  BOTH = "both",
}

export class SurfaceProtectionRfq {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({
    description: "Type of surface protection",
    enum: SurfaceProtectionType,
  })
  protectionType: SurfaceProtectionType;

  @ApiProperty({ description: "Substrate material type", enum: SubstrateType })
  substrateType: SubstrateType;

  @ApiProperty({
    description: "Application method preference",
    enum: ApplicationMethod,
    required: false,
  })
  applicationMethod?: ApplicationMethod;

  @ApiProperty({
    description: "Shop or field application",
    enum: ApplicationLocation,
  })
  applicationLocation: ApplicationLocation;

  // External coating specifications
  @ApiProperty({
    description: "External coating system type",
    enum: CoatingSystemType,
    required: false,
  })
  externalCoatingType?: CoatingSystemType;

  @ApiProperty({
    description: "ISO 12944 corrosivity category",
    example: "C4",
    required: false,
  })
  iso12944Category?: string;

  @ApiProperty({
    description: "ISO 12944 durability class",
    example: "H",
    required: false,
  })
  iso12944Durability?: string;

  @ApiProperty({
    description: "External coating system description",
    required: false,
  })
  externalSystemDescription?: string;

  @ApiProperty({
    description: "External coating total DFT in microns",
    required: false,
  })
  externalTotalDftUm?: number;

  @ApiProperty({
    description: "Number of external coating coats",
    required: false,
  })
  externalNumberOfCoats?: number;

  @ApiProperty({
    description: "Surface preparation standard (e.g., Sa 2.5)",
    required: false,
  })
  surfacePrepStandard?: string;

  // Internal lining specifications
  @ApiProperty({
    description: "Internal lining system type",
    enum: LiningSystemType,
    required: false,
  })
  internalLiningType?: LiningSystemType;

  @ApiProperty({
    description: "Internal lining thickness in mm",
    required: false,
  })
  internalLiningThicknessMm?: number;

  @ApiProperty({
    description: "Internal lining system description",
    required: false,
  })
  internalSystemDescription?: string;

  @ApiProperty({
    description: "Rubber lining grade (for rubber linings)",
    required: false,
  })
  rubberGrade?: string;

  @ApiProperty({
    description: "Rubber hardness IRHD (for rubber linings)",
    required: false,
  })
  rubberHardnessIrhd?: number;

  @ApiProperty({
    description: "Ceramic tile type (for ceramic linings)",
    required: false,
  })
  ceramicTileType?: string;

  @ApiProperty({
    description: "Ceramic tile thickness in mm (for ceramic linings)",
    required: false,
  })
  ceramicTileThicknessMm?: number;

  // Surface area calculations
  @ApiProperty({
    description: "Internal surface area in m2",
    required: false,
  })
  internalSurfaceAreaM2?: number;

  @ApiProperty({
    description: "External surface area in m2",
    required: false,
  })
  externalSurfaceAreaM2?: number;

  @ApiProperty({
    description: "Total surface area including wastage in m2",
    required: false,
  })
  totalSurfaceAreaM2?: number;

  @ApiProperty({
    description: "Wastage percentage applied",
    required: false,
  })
  wastagePercent?: number;

  // Quantity calculations
  @ApiProperty({
    description: "Paint quantity in liters",
    required: false,
  })
  paintQuantityLiters?: number;

  @ApiProperty({
    description: "Rubber sheet quantity in m2",
    required: false,
  })
  rubberQuantityM2?: number;

  @ApiProperty({
    description: "Ceramic tile count",
    required: false,
  })
  ceramicTileCount?: number;

  @ApiProperty({
    description: "Adhesive quantity in kg",
    required: false,
  })
  adhesiveQuantityKg?: number;

  // Environmental conditions for application
  @ApiProperty({
    description: "Ambient temperature for application in Celsius",
    required: false,
  })
  applicationTempC?: number;

  @ApiProperty({
    description: "Relative humidity for application in percent",
    required: false,
  })
  applicationHumidityPercent?: number;

  // Inspection requirements stored as JSON array
  @ApiProperty({
    description: "Required inspection types",
    required: false,
    type: [String],
  })
  inspectionRequirements?: string[];

  // Pricing fields
  @ApiProperty({
    description: "External coating price per m2",
    required: false,
  })
  externalPricePerM2?: number;

  @ApiProperty({
    description: "Internal lining price per m2",
    required: false,
  })
  internalPricePerM2?: number;

  @ApiProperty({
    description: "Surface preparation price per m2",
    required: false,
  })
  surfacePrepPricePerM2?: number;

  @ApiProperty({
    description: "Total external coating cost",
    required: false,
  })
  externalTotalCost?: number;

  @ApiProperty({
    description: "Total internal lining cost",
    required: false,
  })
  internalTotalCost?: number;

  @ApiProperty({
    description: "Total surface protection cost",
    required: false,
  })
  totalCost?: number;

  @ApiProperty({
    description: "Margin percentage applied",
    required: false,
  })
  marginPercent?: number;

  // JSON field for calculation data and additional specs
  @ApiProperty({
    description: "Additional calculation data and specifications",
    required: false,
  })
  calculationData?: Record<string, unknown>;

  @ApiProperty({ description: "Additional notes", required: false })
  notes?: string;

  // Relationships
  @ApiProperty({ description: "Parent RFQ item", type: () => RfqItem })
  rfqItem: RfqItem;

  createdAt: Date;

  updatedAt: Date;
}
