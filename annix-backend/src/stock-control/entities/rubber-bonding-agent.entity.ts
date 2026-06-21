export type RubberBondingCoverageBasis = "litre" | "gram" | "none";

export class RubberBondingAgent {
  id: number;

  companyId: number;

  supplier: string | null;

  name: string;

  packSizeLitres: number | null;

  pricePerTin: number | null;

  pricePerLitre: number | null;

  areaCoverPerLitre: number | null;

  coverageBasis: RubberBondingCoverageBasis;

  gramsPerM2: number | null;

  active: boolean;

  preferred: boolean;

  createdAt: Date;

  updatedAt: Date;
}
