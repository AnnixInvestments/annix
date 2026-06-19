export class FabricationComplexity {
  id: number;

  level: string; // 'simple', 'medium', 'complex'

  name: string;

  description: string;

  hoursPerTon: number;

  laborMultiplier: number;

  examples: string[];

  displayOrder: number;

  isActive: boolean;

  createdAt: Date;

  updatedAt: Date;
}
