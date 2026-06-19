import { PvcFittingType } from "./pvc-fitting-type.entity";

/**
 * PVC Fitting Weight Entity
 * Weight data for PVC fittings by nominal diameter and pressure rating
 */
export class PvcFittingWeight {
  id: number;

  fittingTypeId: number;

  fittingType: PvcFittingType;

  nominalDiameter: number; // DN in mm

  pressureRating: number; // PN rating (some fittings may vary by pressure class)

  weightKg: number; // Weight per fitting in kg

  isActive: boolean;

  createdAt: Date;

  updatedAt: Date;
}
