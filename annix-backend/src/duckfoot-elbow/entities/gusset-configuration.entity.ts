export type GussetPlacementType = "HEEL_ONLY" | "SYMMETRICAL" | "FULL_COVERAGE";
export type GussetMaterialGrade = "Q235" | "A36" | "A283_C";
export type GussetWeldType = "FULL_PENETRATION" | "FILLET";

export class GussetConfiguration {
  id: number;

  dnMin: number;

  dnMax: number;

  pressureClassMin: number | null;

  pressureClassMax: number | null;

  gussetCount: number;

  thicknessMm: number;

  placementType: GussetPlacementType;

  heelOffsetMm: number;

  gussetAngleDegrees: number;

  symmetrySpacingDegrees: number;

  materialGrade: GussetMaterialGrade;

  allowableStressMpa: number;

  weldType: GussetWeldType;

  weldElectrode: string;

  preheatTempC: number | null;

  pwhtRequired: boolean;

  notes: string | null;
}
