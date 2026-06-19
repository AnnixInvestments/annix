/**
 * PVC Pipe Specification Entity
 * Based on EN 1452 (ISO 1452-2) standards for PVC-U pressure pipes
 * DN = nominal outside diameter in mm for metric PVC-U
 * PN = Pressure Nominal rating in bar
 */
export class PvcPipeSpecification {
  id: number;

  nominalDiameter: number; // DN in mm (12, 16, 20, 25, 32, ..., 1000)

  outerDiameter: number; // OD in mm (for PVC-U, OD = DN)

  pressureRating: number; // PN rating in bar (6, 8, 10, 12.5, 16, 20, 25)

  wallThickness: number; // Minimum wall thickness in mm from EN 1452

  innerDiameter: number; // OD - 2 * wall (mm)

  weightKgPerM: number; // Weight per meter (kg/m)

  pvcType: string; // PVC-U, CPVC, PVC-O, PVC-M

  standard: string; // EN_1452, ISO_1452, ASTM_D1785, SABS_966

  displayOrder: number;

  isActive: boolean;

  createdAt: Date;

  updatedAt: Date;
}
