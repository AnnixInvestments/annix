import { ApiProperty } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
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

@Entity("surface_protection_rfqs")
export class SurfaceProtectionRfq {
  @ApiProperty({ description: "Primary key", example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    description: "Type of surface protection",
    enum: SurfaceProtectionType,
  })
  @Column({
    name: "protection_type",
    type: "enum",
    enum: SurfaceProtectionType,
  })
  protectionType: SurfaceProtectionType;

  @ApiProperty({ description: "Substrate material type", enum: SubstrateType })
  @Column({
    name: "substrate_type",
    type: "enum",
    enum: SubstrateType,
    default: SubstrateType.CARBON_STEEL,
  })
  substrateType: SubstrateType;

  @ApiProperty({
    description: "Application method preference",
    enum: ApplicationMethod,
    required: false,
  })
  @Column({
    name: "application_method",
    type: "enum",
    enum: ApplicationMethod,
    nullable: true,
  })
  applicationMethod?: ApplicationMethod;

  @ApiProperty({
    description: "Shop or field application",
    enum: ApplicationLocation,
  })
  @Column({
    name: "application_location",
    type: "enum",
    enum: ApplicationLocation,
    default: ApplicationLocation.SHOP,
  })
  applicationLocation: ApplicationLocation;

  // External coating specifications
  @ApiProperty({
    description: "External coating system type",
    enum: CoatingSystemType,
    required: false,
  })
  @Column({
    name: "external_coating_type",
    type: "enum",
    enum: CoatingSystemType,
    nullable: true,
  })
  externalCoatingType?: CoatingSystemType;

  @ApiProperty({
    description: "ISO 12944 corrosivity category",
    example: "C4",
    required: false,
  })
  @Column({ name: "iso_12944_category", type: "varchar", length: 10, nullable: true })
  iso12944Category?: string;

  @ApiProperty({
    description: "ISO 12944 durability class",
    example: "H",
    required: false,
  })
  @Column({ name: "iso_12944_durability", type: "varchar", length: 10, nullable: true })
  iso12944Durability?: string;

  @ApiProperty({
    description: "External coating system description",
    required: false,
  })
  @Column({ name: "external_system_description", type: "text", nullable: true })
  externalSystemDescription?: string;

  @ApiProperty({
    description: "External coating total DFT in microns",
    required: false,
  })
  @Column({
    name: "external_total_dft_um",
    type: "decimal",
    precision: 8,
    scale: 2,
    nullable: true,
  })
  externalTotalDftUm?: number;

  @ApiProperty({
    description: "Number of external coating coats",
    required: false,
  })
  @Column({ name: "external_number_of_coats", type: "int", nullable: true })
  externalNumberOfCoats?: number;

  @ApiProperty({
    description: "Surface preparation standard (e.g., Sa 2.5)",
    required: false,
  })
  @Column({ name: "surface_prep_standard", type: "varchar", length: 50, nullable: true })
  surfacePrepStandard?: string;

  // Internal lining specifications
  @ApiProperty({
    description: "Internal lining system type",
    enum: LiningSystemType,
    required: false,
  })
  @Column({
    name: "internal_lining_type",
    type: "enum",
    enum: LiningSystemType,
    nullable: true,
  })
  internalLiningType?: LiningSystemType;

  @ApiProperty({
    description: "Internal lining thickness in mm",
    required: false,
  })
  @Column({
    name: "internal_lining_thickness_mm",
    type: "decimal",
    precision: 8,
    scale: 2,
    nullable: true,
  })
  internalLiningThicknessMm?: number;

  @ApiProperty({
    description: "Internal lining system description",
    required: false,
  })
  @Column({ name: "internal_system_description", type: "text", nullable: true })
  internalSystemDescription?: string;

  @ApiProperty({
    description: "Rubber lining grade (for rubber linings)",
    required: false,
  })
  @Column({ name: "rubber_grade", type: "varchar", length: 20, nullable: true })
  rubberGrade?: string;

  @ApiProperty({
    description: "Rubber hardness IRHD (for rubber linings)",
    required: false,
  })
  @Column({ name: "rubber_hardness_irhd", type: "int", nullable: true })
  rubberHardnessIrhd?: number;

  @ApiProperty({
    description: "Ceramic tile type (for ceramic linings)",
    required: false,
  })
  @Column({ name: "ceramic_tile_type", type: "varchar", length: 50, nullable: true })
  ceramicTileType?: string;

  @ApiProperty({
    description: "Ceramic tile thickness in mm (for ceramic linings)",
    required: false,
  })
  @Column({
    name: "ceramic_tile_thickness_mm",
    type: "decimal",
    precision: 6,
    scale: 2,
    nullable: true,
  })
  ceramicTileThicknessMm?: number;

  // Surface area calculations
  @ApiProperty({
    description: "Internal surface area in m2",
    required: false,
  })
  @Column({
    name: "internal_surface_area_m2",
    type: "decimal",
    precision: 12,
    scale: 3,
    nullable: true,
  })
  internalSurfaceAreaM2?: number;

  @ApiProperty({
    description: "External surface area in m2",
    required: false,
  })
  @Column({
    name: "external_surface_area_m2",
    type: "decimal",
    precision: 12,
    scale: 3,
    nullable: true,
  })
  externalSurfaceAreaM2?: number;

  @ApiProperty({
    description: "Total surface area including wastage in m2",
    required: false,
  })
  @Column({
    name: "total_surface_area_m2",
    type: "decimal",
    precision: 12,
    scale: 3,
    nullable: true,
  })
  totalSurfaceAreaM2?: number;

  @ApiProperty({
    description: "Wastage percentage applied",
    required: false,
  })
  @Column({
    name: "wastage_percent",
    type: "decimal",
    precision: 5,
    scale: 2,
    nullable: true,
  })
  wastagePercent?: number;

  // Quantity calculations
  @ApiProperty({
    description: "Paint quantity in liters",
    required: false,
  })
  @Column({
    name: "paint_quantity_liters",
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
  })
  paintQuantityLiters?: number;

  @ApiProperty({
    description: "Rubber sheet quantity in m2",
    required: false,
  })
  @Column({
    name: "rubber_quantity_m2",
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
  })
  rubberQuantityM2?: number;

  @ApiProperty({
    description: "Ceramic tile count",
    required: false,
  })
  @Column({ name: "ceramic_tile_count", type: "int", nullable: true })
  ceramicTileCount?: number;

  @ApiProperty({
    description: "Adhesive quantity in kg",
    required: false,
  })
  @Column({
    name: "adhesive_quantity_kg",
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
  })
  adhesiveQuantityKg?: number;

  // Environmental conditions for application
  @ApiProperty({
    description: "Ambient temperature for application in Celsius",
    required: false,
  })
  @Column({
    name: "application_temp_c",
    type: "decimal",
    precision: 5,
    scale: 1,
    nullable: true,
  })
  applicationTempC?: number;

  @ApiProperty({
    description: "Relative humidity for application in percent",
    required: false,
  })
  @Column({
    name: "application_humidity_percent",
    type: "decimal",
    precision: 5,
    scale: 1,
    nullable: true,
  })
  applicationHumidityPercent?: number;

  // Inspection requirements stored as JSON array
  @ApiProperty({
    description: "Required inspection types",
    required: false,
    type: [String],
  })
  @Column({ name: "inspection_requirements", type: "jsonb", nullable: true })
  inspectionRequirements?: string[];

  // Pricing fields
  @ApiProperty({
    description: "External coating price per m2",
    required: false,
  })
  @Column({
    name: "external_price_per_m2",
    type: "decimal",
    precision: 12,
    scale: 2,
    nullable: true,
  })
  externalPricePerM2?: number;

  @ApiProperty({
    description: "Internal lining price per m2",
    required: false,
  })
  @Column({
    name: "internal_price_per_m2",
    type: "decimal",
    precision: 12,
    scale: 2,
    nullable: true,
  })
  internalPricePerM2?: number;

  @ApiProperty({
    description: "Surface preparation price per m2",
    required: false,
  })
  @Column({
    name: "surface_prep_price_per_m2",
    type: "decimal",
    precision: 12,
    scale: 2,
    nullable: true,
  })
  surfacePrepPricePerM2?: number;

  @ApiProperty({
    description: "Total external coating cost",
    required: false,
  })
  @Column({
    name: "external_total_cost",
    type: "decimal",
    precision: 15,
    scale: 2,
    nullable: true,
  })
  externalTotalCost?: number;

  @ApiProperty({
    description: "Total internal lining cost",
    required: false,
  })
  @Column({
    name: "internal_total_cost",
    type: "decimal",
    precision: 15,
    scale: 2,
    nullable: true,
  })
  internalTotalCost?: number;

  @ApiProperty({
    description: "Total surface protection cost",
    required: false,
  })
  @Column({
    name: "total_cost",
    type: "decimal",
    precision: 15,
    scale: 2,
    nullable: true,
  })
  totalCost?: number;

  @ApiProperty({
    description: "Margin percentage applied",
    required: false,
  })
  @Column({
    name: "margin_percent",
    type: "decimal",
    precision: 5,
    scale: 2,
    nullable: true,
  })
  marginPercent?: number;

  // JSON field for calculation data and additional specs
  @ApiProperty({
    description: "Additional calculation data and specifications",
    required: false,
  })
  @Column({ name: "calculation_data", type: "jsonb", nullable: true })
  calculationData?: Record<string, unknown>;

  @ApiProperty({ description: "Additional notes", required: false })
  @Column({ name: "notes", type: "text", nullable: true })
  notes?: string;

  // Relationships
  @ApiProperty({ description: "Parent RFQ item", type: () => RfqItem })
  @OneToOne(
    () => RfqItem,
    (rfqItem) => rfqItem.surfaceProtectionDetails,
    {
      onDelete: "CASCADE",
    },
  )
  @JoinColumn({ name: "rfq_item_id" })
  rfqItem: RfqItem;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
