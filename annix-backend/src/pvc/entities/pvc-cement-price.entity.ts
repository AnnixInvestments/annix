/**
 * PVC Cement Price Entity
 * Solvent cement costs for PVC joints based on pipe size
 */
export class PvcCementPrice {
  id: number;

  nominalDiameter: number; // DN in mm

  pricePerJoint: number; // Cost per solvent cement joint

  cementVolumeMl: number; // Approximate cement volume per joint in ml

  isActive: boolean;

  createdAt: Date;

  updatedAt: Date;
}
