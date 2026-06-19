import { HdpeFittingWeight } from "./hdpe-fitting-weight.entity";

export class HdpeFittingType {
  id: number;

  name: string;

  code: string;

  description: string;

  numButtwelds: number; // Number of butt welds required

  isMolded: boolean; // Molded vs fabricated

  isFabricated: boolean;

  category: string; // elbow, tee, reducer, cap, stub, etc.

  displayOrder: number;

  isActive: boolean;

  weights: HdpeFittingWeight[];

  createdAt: Date;

  updatedAt: Date;
}
