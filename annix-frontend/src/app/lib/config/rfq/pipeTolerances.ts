export type LengthType = "SRL" | "DRL" | "Custom";

export interface PipeTolerances {
  odTolerancePercent: { min: number; max: number };
  wallTolerancePercent: { min: number; max: number };
  lengthRange: { min: number; max: number };
  lengthType: LengthType;
  standard: string;
  notes?: string;
}

export const PIPE_LENGTH_TYPES: Record<
  LengthType,
  { label: string; minLengthM: number; maxLengthM: number }
> = {
  SRL: { label: "Single Random Length", minLengthM: 4.88, maxLengthM: 6.71 },
  DRL: { label: "Double Random Length", minLengthM: 10.67, maxLengthM: 12.8 },
  Custom: { label: "Custom Length", minLengthM: 0, maxLengthM: 24 },
};

export const ASME_B36_10M_TOLERANCES: Record<string, PipeTolerances> = {
  "NPS 1/8 to 1-1/2": {
    odTolerancePercent: { min: -0.8, max: 0.8 },
    wallTolerancePercent: { min: -12.5, max: 0 },
    lengthRange: { min: 4.88, max: 6.71 },
    lengthType: "SRL",
    standard: "ASME B36.10M",
    notes: "Small bore pipe. OD tolerance ±0.4mm typical",
  },
  "NPS 2 to 4": {
    odTolerancePercent: { min: -0.8, max: 0.8 },
    wallTolerancePercent: { min: -12.5, max: 0 },
    lengthRange: { min: 4.88, max: 6.71 },
    lengthType: "SRL",
    standard: "ASME B36.10M",
    notes: "OD tolerance ±0.8mm typical",
  },
  "NPS 5 to 8": {
    odTolerancePercent: { min: -0.8, max: 0.8 },
    wallTolerancePercent: { min: -12.5, max: 0 },
    lengthRange: { min: 10.67, max: 12.8 },
    lengthType: "DRL",
    standard: "ASME B36.10M",
    notes: "OD tolerance ±1.0mm typical. DRL standard",
  },
  "NPS 10 to 18": {
    odTolerancePercent: { min: -0.4, max: 0.4 },
    wallTolerancePercent: { min: -12.5, max: 0 },
    lengthRange: { min: 10.67, max: 12.8 },
    lengthType: "DRL",
    standard: "ASME B36.10M",
    notes: "Large bore. OD tolerance ±0.4%. DRL standard",
  },
  "NPS 20 and larger": {
    odTolerancePercent: { min: -0.5, max: 0.5 },
    wallTolerancePercent: { min: -12.5, max: 0 },
    lengthRange: { min: 10.67, max: 12.8 },
    lengthType: "DRL",
    standard: "ASME B36.10M",
    notes: "Large bore. OD tolerance ±0.5%. DRL standard",
  },
};

export const ASME_B36_19M_TOLERANCES: Record<string, PipeTolerances> = {
  "NPS 1/8 to 18 (Stainless)": {
    odTolerancePercent: { min: -1.0, max: 1.0 },
    wallTolerancePercent: { min: -12.5, max: 12.5 },
    lengthRange: { min: 4.88, max: 6.71 },
    lengthType: "SRL",
    standard: "ASME B36.19M",
    notes: "Stainless steel pipe tolerances. Wall tolerance symmetrical ±12.5%",
  },
  "NPS 20 and larger (Stainless)": {
    odTolerancePercent: { min: -1.0, max: 1.0 },
    wallTolerancePercent: { min: -12.5, max: 12.5 },
    lengthRange: { min: 10.67, max: 12.8 },
    lengthType: "DRL",
    standard: "ASME B36.19M",
    notes: "Large bore stainless steel. DRL standard",
  },
};

export const API_5L_TOLERANCES: Record<string, PipeTolerances> = {
  "PSL1 (All Sizes)": {
    odTolerancePercent: { min: -0.5, max: 0.5 },
    wallTolerancePercent: { min: -12.5, max: 0 },
    lengthRange: { min: 10.67, max: 12.8 },
    lengthType: "DRL",
    standard: "API 5L PSL1",
    notes: "Standard pipeline tolerance. No CVN testing required",
  },
  "PSL2 (All Sizes)": {
    odTolerancePercent: { min: -0.5, max: 0.5 },
    wallTolerancePercent: { min: -8.0, max: 0 },
    lengthRange: { min: 10.67, max: 12.8 },
    lengthType: "DRL",
    standard: "API 5L PSL2",
    notes: "Tighter wall tolerance. CVN testing required. 100% NDT",
  },
};

export const tolerancesForNps = (
  npsInches: number,
  isStainless: boolean,
): PipeTolerances | null => {
  if (isStainless) {
    if (npsInches >= 20) return ASME_B36_19M_TOLERANCES["NPS 20 and larger (Stainless)"];
    return ASME_B36_19M_TOLERANCES["NPS 1/8 to 18 (Stainless)"];
  }
  if (npsInches < 2) return ASME_B36_10M_TOLERANCES["NPS 1/8 to 1-1/2"];
  if (npsInches <= 4) return ASME_B36_10M_TOLERANCES["NPS 2 to 4"];
  if (npsInches <= 8) return ASME_B36_10M_TOLERANCES["NPS 5 to 8"];
  if (npsInches <= 18) return ASME_B36_10M_TOLERANCES["NPS 10 to 18"];
  return ASME_B36_10M_TOLERANCES["NPS 20 and larger"];
};

export const defaultLengthType = (npsInches: number): LengthType => {
  if (npsInches < 5) return "SRL";
  return "DRL";
};

export const lengthRangeForType = (lengthType: LengthType): { min: number; max: number } => {
  const config = PIPE_LENGTH_TYPES[lengthType];
  return { min: config.minLengthM, max: config.maxLengthM };
};
