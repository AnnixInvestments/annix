export class RubberBondingAgent {
  id: number;

  companyId: number;

  supplier: string | null;

  name: string;

  packSizeLitres: number | null;

  pricePerTin: number | null;

  pricePerLitre: number | null;

  areaCoverPerLitre: number | null;

  active: boolean;

  preferred: boolean;

  createdAt: Date;

  updatedAt: Date;
}
