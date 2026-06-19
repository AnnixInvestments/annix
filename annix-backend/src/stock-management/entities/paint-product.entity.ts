import { IssuableProduct } from "./issuable-product.entity";

export type PaintCoatType = "primer" | "intermediate" | "finish" | "sealer" | "banding";
export type PaintSystem = "epoxy" | "polyurethane" | "alkyd" | "zinc_rich" | "acrylic" | "other";

const numericTransformer = {
  to: (value: number | null) => value,
  from: (value: string | number | null) => (value === null ? null : Number(value)),
};

export class PaintProduct {
  productId: number;

  product: IssuableProduct;

  coverageM2PerLitre: number | null;

  wetFilmThicknessUm: number | null;

  dryFilmThicknessUm: number | null;

  coatType: PaintCoatType | null;

  paintSystem: PaintSystem | null;

  numberOfParts: number | null;

  mixingRatio: string | null;

  potLifeMinutes: number | null;

  isBanding: boolean;

  supplierProductCode: string | null;

  colourCode: string | null;

  glossLevel: string | null;

  vocContentGPerL: number | null;

  densityKgPerL: number | null;

  datasheetUrl: string | null;

  msdsUrl: string | null;

  thinnerReference: string | null;

  shelfLifeMonths: number | null;

  surfacePrepRequirement: string | null;

  minApplicationTempC: number | null;

  maxApplicationTempC: number | null;

  substrateCompatibility: string[] | null;

  packSizeLitres: number | null;

  componentGroupKey: string | null;

  componentRole: string | null;

  get id(): number {
    return this.productId;
  }

  set id(value: number) {
    this.productId = value;
  }
}
