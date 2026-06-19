import { RubberType } from "./rubber-type.entity";

export enum RubberGrade {
  A = "A",
  B = "B",
  C = "C",
  D = "D",
}

export enum RubberClass {
  IRHD_40 = 40,
  IRHD_50 = 50,
  IRHD_60 = 60,
  IRHD_70 = 70,
}

export class RubberSpecification {
  id: number;

  rubberTypeId: number;

  rubberType: RubberType;

  grade: string;

  hardnessClassIrhd: number;

  tensileStrengthMpaMin: number;

  elongationAtBreakMin: number;

  tensileAfterAgeingMinPercent: number;

  tensileAfterAgeingMaxPercent: number;

  elongationAfterAgeingMinPercent: number;

  elongationAfterAgeingMaxPercent: number;

  hardnessChangeAfterAgeingMax: number;

  heatResistance80cHardnessChangeMax: number | null;

  heatResistance100cHardnessChangeMax: number | null;

  ozoneResistance: string | null;

  chemicalResistanceHardnessChangeMax: number | null;

  waterResistanceMaxPercent: number | null;

  oilResistanceMaxPercent: number | null;

  contaminantReleaseMaxPercent: number | null;

  sansStandard: string;
}
