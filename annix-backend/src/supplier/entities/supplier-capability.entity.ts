import { SupplierProfile } from "./supplier-profile.entity";

export enum ProductCategory {
  // Legacy values (kept for backwards compatibility)
  STRAIGHT_PIPE = "straight_pipe",
  BENDS = "bends",
  FLANGES = "flanges",
  FITTINGS = "fittings",
  VALVES = "valves",
  FABRICATION = "fabrication",
  COATING = "coating",
  INSPECTION = "inspection",
  OTHER = "other",
  // New unified values matching PRODUCTS_AND_SERVICES
  FABRICATED_STEEL = "fabricated_steel",
  FASTENERS_GASKETS = "fasteners_gaskets",
  SURFACE_PROTECTION = "surface_protection",
  HDPE = "hdpe",
  PVC = "pvc",
  STRUCTURAL_STEEL = "structural_steel",
  TRANSPORT_INSTALL = "transport_install",
  // Valves & Instruments
  VALVES_INSTRUMENTS = "valves_instruments",
  // Pumps & Pump Parts
  PUMPS = "pumps",
}

export enum MaterialSpecialization {
  CARBON_STEEL = "carbon_steel",
  STAINLESS_STEEL = "stainless_steel",
  ALLOY_STEEL = "alloy_steel",
  HDPE = "hdpe",
  PVC = "pvc",
  RUBBER = "rubber",
  OTHER = "other",
}

export enum CertificationLevel {
  ISO_9001 = "iso_9001",
  ISO_14001 = "iso_14001",
  ISO_45001 = "iso_45001",
  ASME = "asme",
  API = "api",
  SABS = "sabs",
  CE_MARKED = "ce_marked",
  NONE = "none",
}

export class SupplierCapability {
  id: number;

  supplierProfileId: number;

  supplierProfile: SupplierProfile;

  // Product/Service Category
  productCategory: ProductCategory;

  // Material Specializations
  materialSpecializations: MaterialSpecialization[];

  // Capacity and Capabilities
  monthlyCapacityTons: number;

  sizeRangeDescription: string; // e.g., "DN15 - DN600", "6\" - 48\""

  pressureRatings: string; // e.g., "PN10 - PN40", "150# - 600#"

  // Geographic Coverage
  operationalRegions: string[]; // e.g., ["Gauteng", "Western Cape", "KZN"]

  nationwideCoverage: boolean;

  internationalSupply: boolean;

  // Certifications
  certifications: CertificationLevel[];

  certificationExpiryDate: Date;

  // Lead Times
  standardLeadTimeDays: number;

  expeditedLeadTimeDays: number;

  // Minimum Order
  minimumOrderValue: number;

  minimumOrderQuantity: string;

  // Quality and Compliance
  millTestCertificates: boolean;

  thirdPartyInspection: boolean;

  qualityDocumentation: string;

  // Additional Details
  notes: string;

  isActive: boolean;

  // Capability Score (for FR-P8)
  capabilityScore: number; // 0-100 score based on completeness, certifications, performance

  lastVerifiedAt: Date;

  createdAt: Date;

  updatedAt: Date;
}
