export class HdpeStubPrice {
  id: number;

  nominalBore: number; // DN in mm

  pricePerStub: number; // Fixed price per stub

  weightKg: number; // Weight of stub (optional, may be in fitting weights)

  currency: string;

  effectiveFrom: Date;

  effectiveTo: Date;

  isActive: boolean;

  createdAt: Date;

  updatedAt: Date;
}
