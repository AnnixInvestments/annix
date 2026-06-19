export class ShopLaborRate {
  id: number;

  code: string; // 'carbon_steel', 'stainless_steel', 'aluminum', etc.

  name: string;

  description: string;

  materialType: string;

  ratePerHour: number;

  currency: string;

  effectiveFrom: Date;

  effectiveTo: Date;

  isActive: boolean;

  createdAt: Date;

  updatedAt: Date;
}
