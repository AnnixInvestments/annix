import { AnsiB169FittingType } from "./ansi-b16-9-fitting-type.entity";

export class AnsiB169FittingDimension {
  id: number;

  fittingTypeId: number;

  fittingType: AnsiB169FittingType;

  nps: string;

  nbMm: number;

  outsideDiameterMm: number;

  schedule: string;

  wallThicknessMm: number;

  branchNps: string | null;

  branchOdMm: number | null;

  centerToFaceAMm: number | null;

  centerToFaceBMm: number | null;

  centerToCenterOMm: number | null;

  backToFaceKMm: number | null;

  centerToEndCMm: number | null;

  centerToEndMMm: number | null;

  weightKg: number | null;
}
