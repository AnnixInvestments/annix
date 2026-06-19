import { HdpeFittingType } from "./hdpe-fitting-type.entity";

export class HdpeFittingWeight {
  id: number;

  fittingTypeId: number;

  fittingType: HdpeFittingType;

  nominalBore: number; // DN in mm

  weightKg: number; // Weight per fitting in kg

  isActive: boolean;

  createdAt: Date;

  updatedAt: Date;
}
