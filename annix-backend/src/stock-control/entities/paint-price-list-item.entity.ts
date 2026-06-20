export type PaintCoatRole = "primer" | "intermediate" | "final";

export type PaintGenericType =
  | "zinc-rich-epoxy"
  | "zinc-silicate"
  | "epoxy"
  | "epoxy-mio"
  | "epoxy-mastic"
  | "epoxy-phenolic"
  | "epoxy-glass-flake"
  | "coal-tar-epoxy"
  | "polyurethane"
  | "polysiloxane"
  | "polyurea"
  | "acrylic"
  | "alkyd"
  | "vinyl"
  | "high-temp-silicone"
  | "intumescent"
  | "fbe"
  | "3lpe"
  | "bitumen";

export type PaintFinishType =
  | "aliphatic-pu"
  | "aromatic-pu"
  | "acrylic-pu"
  | "acrylic"
  | "alkyd"
  | "epoxy"
  | "phenolic"
  | "vinyl"
  | "silicone";

export class PaintPriceListItem {
  id: number;

  companyId: number;

  supplierName: string;

  coatType: PaintCoatRole | null;

  productName: string;

  paintType: string | null;

  genericType: PaintGenericType | null;

  finishType: PaintFinishType | null;

  zincRich: boolean;

  mioPigment: boolean;

  surfaceTolerant: boolean;

  heatResistanceC: number | null;

  packSizeLitres: number | null;

  volumeSolidsPercent: number;

  costPerLitre: number;

  costPerKit: number | null;

  upliftPercent: number;

  recommendedMicrons: number | null;

  micronsOverride: number | null;

  thinnerName: string | null;

  thinnerPricePerLitre: number | null;

  maxThinningPercent: number | null;

  active: boolean;

  preferred: boolean;

  createdAt: Date;

  updatedAt: Date;
}
