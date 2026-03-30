import type { NominalOutsideDiameter } from "./pipe-dimension";

export interface FlangeStandard {
  id: number;
  code: string;
}

export interface FlangePressureClass {
  id: number;
  designation: string;
  standard?: FlangeStandard;
}

export interface FlangeType {
  id: number;
  code: string;
  name: string;
  abbreviation: string;
  description?: string;
  standardReference?: string;
}

export interface FlangeDimensionLookup {
  id: number;
  D: number;
  b: number;
  d4: number;
  f: number;
  num_holes: number;
  d1: number;
  pcd: number;
  mass_kg: number;
  nominalOutsideDiameter: NominalOutsideDiameter;
  standard: FlangeStandard;
  pressureClass: FlangePressureClass;
  bolt?: {
    id: number;
    diameter_mm: number;
    thread_pitch: number;
    length_mm: number;
    mass_kg: number;
  };
}

export interface FlangeTypeWeightResult {
  found: boolean;
  weightKg: number | null;
  nominalBoreMm: number;
  pressureClass: string;
  flangeTypeCode: string;
  flangeStandardCode: string | null;
  notes?: string;
}

export interface FlangeTypeWeightRecord {
  id: number;
  flange_standard_id: number | null;
  pressure_class: string;
  flange_type_code: string;
  nominal_bore_mm: number;
  weight_kg: number;
}

export interface BnwSetInfoResult {
  found: boolean;
  boltSize: string;
  weightPerHoleKg: number;
  numHoles: number;
  totalWeightKg: number;
  pressureClass: string;
  nominalBoreMm: number;
  notes?: string;
}

export interface BnwSetWeightRecord {
  id: number;
  pressure_class: string;
  nominal_bore_mm: number;
  bolt_size: string;
  weight_per_hole_kg: number;
  num_holes: number;
}

export interface RetainingRingWeightResult {
  found: boolean;
  weightKg: number;
  nominalBoreMm: number;
  notes?: string;
}

export interface RetainingRingWeightRecord {
  id: number;
  nominal_bore_mm: number;
  weight_kg: number;
}

export interface NbOdLookupResult {
  found: boolean;
  nominalBoreMm: number;
  outsideDiameterMm: number;
  notes?: string;
}

export interface NbOdLookupRecord {
  id: number;
  nominal_bore_mm: number;
  outside_diameter_mm: number;
}

export interface GasketWeightRecord {
  id: number;
  gasket_type: string;
  nominal_bore_mm: number;
  weight_kg: number;
  inner_diameter_mm: number | null;
  outer_diameter_mm: number | null;
  thickness_mm: number | null;
  flange_standard: string | null;
  pressure_class: string | null;
  material: string | null;
}
