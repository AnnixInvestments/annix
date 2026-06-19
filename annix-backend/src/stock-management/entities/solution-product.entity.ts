import { IssuableProduct } from "./issuable-product.entity";

const numericTransformer = {
  to: (value: number | null) => value,
  from: (value: string | number | null) => (value === null ? null : Number(value)),
};

export class SolutionProduct {
  productId: number;

  product: IssuableProduct;

  activeIngredient: string | null;

  concentrationPct: number | null;

  densityKgPerL: number | null;

  hazardClassification: string | null;

  storageRequirement: string | null;

  shelfLifeMonths: number | null;

  notes: string | null;

  get id(): number {
    return this.productId;
  }

  set id(value: number) {
    this.productId = value;
  }
}
