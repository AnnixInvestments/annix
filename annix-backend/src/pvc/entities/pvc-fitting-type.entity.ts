import { PvcFittingWeight } from "./pvc-fitting-weight.entity";

/**
 * PVC Fitting Type Entity
 * Defines various PVC fitting types (elbows, tees, couplings, etc.)
 */
export class PvcFittingType {
  id: number;

  name: string;

  code: string;

  description: string;

  numJoints: number; // Number of solvent cement joints or socket joints

  isSocket: boolean; // Socket (solvent cement) vs other joining methods

  isFlanged: boolean; // Flanged connection

  isThreaded: boolean; // Threaded connection

  category: string; // elbow, tee, coupling, reducer, cap, union, valve, etc.

  angleDegrees: number; // For elbows: 45, 90, etc.

  displayOrder: number;

  isActive: boolean;

  weights: PvcFittingWeight[];

  createdAt: Date;

  updatedAt: Date;
}
