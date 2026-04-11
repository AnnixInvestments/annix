export type IssuableProductType =
  | "consumable"
  | "paint"
  | "rubber_roll"
  | "rubber_offcut"
  | "solution";

export interface IssuableProductDto {
  id: number;
  companyId: number;
  productType: IssuableProductType;
  sku: string;
  name: string;
  description: string | null;
  categoryId: number | null;
  unitOfMeasure: string;
  costPerUnit: number;
  quantity: number;
  minStockLevel: number;
  locationId: number | null;
  photoUrl: string | null;
  active: boolean;
  legacyStockItemId: number | null;
  category?: ProductCategoryDto | null;
  consumable?: ConsumableProductDetailDto | null;
  paint?: PaintProductDetailDto | null;
  rubberRoll?: RubberRollDetailDto | null;
  rubberOffcut?: RubberOffcutDetailDto | null;
  solution?: SolutionProductDetailDto | null;
}

export interface ConsumableProductDetailDto {
  productId: number;
  notes: string | null;
}

export interface PaintProductDetailDto {
  productId: number;
  coverageM2PerLitre: number | null;
  wetFilmThicknessUm: number | null;
  dryFilmThicknessUm: number | null;
  coatType: string | null;
  paintSystem: string | null;
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
}

export interface RubberRollDetailDto {
  productId: number;
  rollNumber: string;
  compoundCode: string | null;
  compoundId: number | null;
  colour: string | null;
  widthMm: number | null;
  thicknessMm: number | null;
  lengthM: number | null;
  weightKg: number | null;
  batchNumber: string | null;
  supplierName: string | null;
  receivedAt: string | null;
  status: string;
}

export interface RubberOffcutDetailDto {
  productId: number;
  offcutNumber: string;
  sourceRollId: number | null;
  compoundCode: string | null;
  colour: string | null;
  widthMm: number;
  lengthM: number;
  thicknessMm: number;
  computedWeightKg: number | null;
  status: string;
}

export interface SolutionProductDetailDto {
  productId: number;
  activeIngredient: string | null;
  concentrationPct: number | null;
  densityKgPerL: number | null;
  hazardClassification: string | null;
}

export interface ProductCategoryDto {
  id: number;
  companyId: number;
  productType: IssuableProductType;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
  iconKey: string | null;
  active: boolean;
}

export interface IssuableProductListResultDto {
  items: IssuableProductDto[];
  total: number;
  page: number;
  pageSize: number;
}
