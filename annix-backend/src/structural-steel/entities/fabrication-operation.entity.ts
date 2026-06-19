export class FabricationOperation {
  id: number;

  name: string;

  code: string;

  description: string;

  unit: string; // 'hole', 'meter', 'each', 'kg', 'mm'

  hoursPerUnit: number;

  costPerUnit: number;

  stainlessMultiplier: number;

  displayOrder: number;

  isActive: boolean;

  createdAt: Date;

  updatedAt: Date;
}
