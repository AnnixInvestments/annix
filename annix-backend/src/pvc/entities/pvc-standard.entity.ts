/**
 * PVC Standard Entity
 * Defines various PVC piping standards
 */
export class PvcStandard {
  id: number;

  name: string;

  code: string;

  description: string;

  pvcType: string; // PVC-U, CPVC, PVC-O, PVC-M

  region: string; // EU, USA, South Africa, International

  application: string; // Potable water, Sewage, Industrial, etc.

  displayOrder: number;

  isActive: boolean;

  createdAt: Date;

  updatedAt: Date;
}
