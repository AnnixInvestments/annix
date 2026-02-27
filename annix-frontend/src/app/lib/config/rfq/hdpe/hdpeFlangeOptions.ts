export type HdpeFlangeType = "none" | "stub_backing_steel" | "stub_backing_gi" | "stub_backing_ss";

export type HdpeFlangeDrillingStandard = "SANS1123" | "EN1092" | "ANSI_B16_5" | "AS4087";

export interface HdpeFlangeOption {
  value: HdpeFlangeType;
  label: string;
  description: string;
  backingMaterial: string | null;
  suitableForSizes: { min: number; max: number };
  pressureRatings: string[];
}

export const HDPE_FLANGE_OPTIONS: HdpeFlangeOption[] = [
  {
    value: "none",
    label: "No Flange (Plain End)",
    description: "Plain pipe end for butt fusion or electrofusion connection",
    backingMaterial: null,
    suitableForSizes: { min: 20, max: 1200 },
    pressureRatings: [],
  },
  {
    value: "stub_backing_steel",
    label: "Stub End + Steel Backing Ring",
    description: "HDPE stub end with carbon steel backing flange for industrial applications",
    backingMaterial: "Carbon Steel",
    suitableForSizes: { min: 50, max: 630 },
    pressureRatings: ["PN10", "PN16", "PN25"],
  },
  {
    value: "stub_backing_gi",
    label: "Stub End + G.I. Backing Ring",
    description: "HDPE stub end with galvanized iron backing flange for water applications",
    backingMaterial: "Galvanized Iron",
    suitableForSizes: { min: 50, max: 315 },
    pressureRatings: ["PN10", "PN16"],
  },
  {
    value: "stub_backing_ss",
    label: "Stub End + Stainless Steel Backing Ring",
    description: "HDPE stub end with stainless steel backing flange for corrosive environments",
    backingMaterial: "Stainless Steel 304/316",
    suitableForSizes: { min: 50, max: 315 },
    pressureRatings: ["PN10", "PN16", "PN25"],
  },
];

export interface HdpeFlangeDrillingOption {
  value: HdpeFlangeDrillingStandard;
  label: string;
  description: string;
  region: string;
}

export const HDPE_FLANGE_DRILLING_OPTIONS: HdpeFlangeDrillingOption[] = [
  {
    value: "SANS1123",
    label: "SANS 1123",
    description: "South African standard (Table D/E/F)",
    region: "South Africa",
  },
  {
    value: "EN1092",
    label: "EN 1092-1",
    description: "European standard (PN10, PN16, PN25)",
    region: "Europe",
  },
  {
    value: "ANSI_B16_5",
    label: "ANSI B16.5",
    description: "American standard (Class 150, 300)",
    region: "USA",
  },
  {
    value: "AS4087",
    label: "AS 4087",
    description: "Australian standard",
    region: "Australia",
  },
];

export const hdpeFlangeOptionByValue = (value: HdpeFlangeType): HdpeFlangeOption | null =>
  HDPE_FLANGE_OPTIONS.find((o) => o.value === value) ?? null;

export const suitableHdpeFlangeOptionsForSize = (outsideDiameterMm: number): HdpeFlangeOption[] =>
  HDPE_FLANGE_OPTIONS.filter(
    (opt) =>
      outsideDiameterMm >= opt.suitableForSizes.min &&
      outsideDiameterMm <= opt.suitableForSizes.max,
  );
