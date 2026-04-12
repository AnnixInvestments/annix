import type { IssuableProductType } from "../entities/issuable-product.entity";
import type { PaintCoatType, PaintSystem } from "../entities/paint-product.entity";
import type { RubberRollStatus } from "../entities/rubber-roll.entity";

export interface BaseIssuableProductDto {
  sku: string;
  name: string;
  description?: string | null;
  categoryId?: number | null;
  unitOfMeasure?: string;
  costPerUnit?: number;
  quantity?: number;
  minStockLevel?: number;
  locationId?: number | null;
  photoUrl?: string | null;
  active?: boolean;
}

export interface PaintProductExtraDto {
  coverageM2PerLitre?: number | null;
  wetFilmThicknessUm?: number | null;
  dryFilmThicknessUm?: number | null;
  coatType?: PaintCoatType | null;
  paintSystem?: PaintSystem | null;
  numberOfParts?: number | null;
  mixingRatio?: string | null;
  potLifeMinutes?: number | null;
  isBanding?: boolean;
  supplierProductCode?: string | null;
  colourCode?: string | null;
  glossLevel?: string | null;
  vocContentGPerL?: number | null;
  densityKgPerL?: number | null;
  datasheetUrl?: string | null;
  msdsUrl?: string | null;
  thinnerReference?: string | null;
  shelfLifeMonths?: number | null;
  surfacePrepRequirement?: string | null;
  minApplicationTempC?: number | null;
  maxApplicationTempC?: number | null;
  substrateCompatibility?: string[] | null;
  packSizeLitres?: number | null;
  componentGroupKey?: string | null;
  componentRole?: string | null;
}

export interface RubberRollExtraDto {
  rollNumber: string;
  compoundCode?: string | null;
  compoundId?: number | null;
  colour?: string | null;
  widthMm?: number | null;
  thicknessMm?: number | null;
  lengthM?: number | null;
  weightKg?: number | null;
  batchNumber?: string | null;
  supplierName?: string | null;
  receivedAt?: string | null;
  status?: RubberRollStatus;
  densityOverrideKgPerM3?: number | null;
}

export interface SolutionExtraDto {
  activeIngredient?: string | null;
  concentrationPct?: number | null;
  densityKgPerL?: number | null;
  hazardClassification?: string | null;
  storageRequirement?: string | null;
  shelfLifeMonths?: number | null;
  notes?: string | null;
}

export type CreateIssuableProductDto =
  | (BaseIssuableProductDto & { productType: "consumable"; consumable?: { notes?: string | null } })
  | (BaseIssuableProductDto & { productType: "paint"; paint?: PaintProductExtraDto })
  | (BaseIssuableProductDto & { productType: "rubber_roll"; rubberRoll: RubberRollExtraDto })
  | (BaseIssuableProductDto & { productType: "solution"; solution?: SolutionExtraDto });

export type UpdateIssuableProductDto = Partial<BaseIssuableProductDto> & {
  paint?: Partial<PaintProductExtraDto>;
  rubberRoll?: Partial<RubberRollExtraDto>;
  solution?: Partial<SolutionExtraDto>;
  consumable?: { notes?: string | null };
};

export interface IssuableProductFilters {
  productType?: IssuableProductType;
  categoryId?: number;
  active?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}
