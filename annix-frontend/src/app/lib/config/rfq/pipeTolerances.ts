export type ToleranceStandard = "ASME_B36_10M" | "ASME_B36_19M" | "API_5L";

export interface PipeToleranceSpec {
  standard: ToleranceStandard;
  standardName: string;
  npsMin: number;
  npsMax: number;
  odTolerancePct: number;
  odToleranceMmMax: number | null;
  wallTolerancePctUnder: number;
  wallTolerancePctOver: number;
  lengthSrlPlusMm: number;
  lengthSrlMinusMm: number;
  lengthDrlPlusMm: number;
  lengthDrlMinusMm: number;
  straightnessPerLength: string;
  weightTolerancePct: number;
}

export const PIPE_TOLERANCES: PipeToleranceSpec[] = [
  {
    standard: "ASME_B36_10M",
    standardName: "ASME B36.10M (Carbon Steel)",
    npsMin: 0.125,
    npsMax: 18,
    odTolerancePct: 0.4,
    odToleranceMmMax: null,
    wallTolerancePctUnder: 12.5,
    wallTolerancePctOver: 0,
    lengthSrlPlusMm: 152,
    lengthSrlMinusMm: 0,
    lengthDrlPlusMm: 152,
    lengthDrlMinusMm: 0,
    straightnessPerLength: "1:2000",
    weightTolerancePct: 3.5,
  },
  {
    standard: "ASME_B36_10M",
    standardName: "ASME B36.10M (Carbon Steel)",
    npsMin: 18.001,
    npsMax: 80,
    odTolerancePct: 0.8,
    odToleranceMmMax: 12.5,
    wallTolerancePctUnder: 12.5,
    wallTolerancePctOver: 0,
    lengthSrlPlusMm: 76,
    lengthSrlMinusMm: 0,
    lengthDrlPlusMm: 76,
    lengthDrlMinusMm: 0,
    straightnessPerLength: "1:2000",
    weightTolerancePct: 3.5,
  },
  {
    standard: "ASME_B36_19M",
    standardName: "ASME B36.19M (Stainless Steel)",
    npsMin: 0.125,
    npsMax: 12,
    odTolerancePct: 0.4,
    odToleranceMmMax: null,
    wallTolerancePctUnder: 12.5,
    wallTolerancePctOver: 12.5,
    lengthSrlPlusMm: 152,
    lengthSrlMinusMm: 0,
    lengthDrlPlusMm: 152,
    lengthDrlMinusMm: 0,
    straightnessPerLength: "1:2000",
    weightTolerancePct: 5.0,
  },
  {
    standard: "ASME_B36_19M",
    standardName: "ASME B36.19M (Stainless Steel)",
    npsMin: 12.001,
    npsMax: 36,
    odTolerancePct: 0.5,
    odToleranceMmMax: null,
    wallTolerancePctUnder: 12.5,
    wallTolerancePctOver: 12.5,
    lengthSrlPlusMm: 152,
    lengthSrlMinusMm: 0,
    lengthDrlPlusMm: 152,
    lengthDrlMinusMm: 0,
    straightnessPerLength: "1:2000",
    weightTolerancePct: 5.0,
  },
  {
    standard: "API_5L",
    standardName: "API 5L (Line Pipe)",
    npsMin: 0.125,
    npsMax: 20,
    odTolerancePct: 0.5,
    odToleranceMmMax: null,
    wallTolerancePctUnder: 12.5,
    wallTolerancePctOver: 15.0,
    lengthSrlPlusMm: 152,
    lengthSrlMinusMm: 0,
    lengthDrlPlusMm: 305,
    lengthDrlMinusMm: 0,
    straightnessPerLength: "1:600",
    weightTolerancePct: 3.5,
  },
  {
    standard: "API_5L",
    standardName: "API 5L (Line Pipe)",
    npsMin: 20.001,
    npsMax: 80,
    odTolerancePct: 0.75,
    odToleranceMmMax: null,
    wallTolerancePctUnder: 12.5,
    wallTolerancePctOver: 15.0,
    lengthSrlPlusMm: 152,
    lengthSrlMinusMm: 0,
    lengthDrlPlusMm: 305,
    lengthDrlMinusMm: 0,
    straightnessPerLength: "1:600",
    weightTolerancePct: 3.5,
  },
];

export const toleranceForPipe = (
  standard: ToleranceStandard,
  npsInches: number,
): PipeToleranceSpec | null => {
  return (
    PIPE_TOLERANCES.find(
      (t) => t.standard === standard && npsInches >= t.npsMin && npsInches <= t.npsMax,
    ) ?? null
  );
};

export const toleranceStandardLabel = (standard: ToleranceStandard): string => {
  const labels: Record<ToleranceStandard, string> = {
    ASME_B36_10M: "ASME B36.10M (Carbon Steel)",
    ASME_B36_19M: "ASME B36.19M (Stainless Steel)",
    API_5L: "API 5L (Line Pipe)",
  };
  return labels[standard];
};

export interface ToleranceCalculation {
  odMm: number;
  wallMm: number;
  odMinMm: number;
  odMaxMm: number;
  wallMinMm: number;
  wallMaxMm: number;
  standard: ToleranceStandard;
}

export const calculateTolerances = (
  odMm: number,
  wallMm: number,
  standard: ToleranceStandard,
  npsInches: number,
): ToleranceCalculation | null => {
  const spec = toleranceForPipe(standard, npsInches);
  if (!spec) return null;

  const odToleranceMm = spec.odToleranceMmMax
    ? Math.min(odMm * (spec.odTolerancePct / 100), spec.odToleranceMmMax)
    : odMm * (spec.odTolerancePct / 100);

  const wallUnderMm = wallMm * (spec.wallTolerancePctUnder / 100);
  const wallOverMm = wallMm * (spec.wallTolerancePctOver / 100);

  return {
    odMm,
    wallMm,
    odMinMm: Math.round((odMm - odToleranceMm) * 100) / 100,
    odMaxMm: Math.round((odMm + odToleranceMm) * 100) / 100,
    wallMinMm: Math.round((wallMm - wallUnderMm) * 100) / 100,
    wallMaxMm: Math.round((wallMm + wallOverMm) * 100) / 100,
    standard,
  };
};
