export interface ArSteelPlateThickness {
  thicknessMm: number;
  weightKgPerM2: number;
  recommendedUse: string;
}

export const AR_STEEL_PLATE_THICKNESSES: ArSteelPlateThickness[] = [
  { thicknessMm: 6, weightKgPerM2: 47.1, recommendedUse: "Light wear liners, chutes" },
  { thicknessMm: 8, weightKgPerM2: 62.8, recommendedUse: "General wear liners" },
  { thicknessMm: 10, weightKgPerM2: 78.5, recommendedUse: "Standard wear liners, hoppers" },
  { thicknessMm: 12, weightKgPerM2: 94.2, recommendedUse: "Heavy-duty wear liners" },
  { thicknessMm: 16, weightKgPerM2: 125.6, recommendedUse: "High-impact zones, crusher liners" },
  { thicknessMm: 20, weightKgPerM2: 157.0, recommendedUse: "Severe abrasion, impact zones" },
  { thicknessMm: 25, weightKgPerM2: 196.3, recommendedUse: "Extreme wear applications" },
  { thicknessMm: 30, weightKgPerM2: 235.5, recommendedUse: "Maximum protection applications" },
  { thicknessMm: 40, weightKgPerM2: 314.0, recommendedUse: "Specialized heavy-duty applications" },
  { thicknessMm: 50, weightKgPerM2: 392.5, recommendedUse: "Extreme heavy-duty applications" },
];

export interface ArSteelGrade {
  grade: string;
  hardnessBHN: string;
  minYieldMpa: number;
  maxTempC: number;
  notes: string;
}

export const AR_STEEL_GRADES: ArSteelGrade[] = [
  {
    grade: "AR400",
    hardnessBHN: "360-440",
    minYieldMpa: 1000,
    maxTempC: 200,
    notes: "Good balance of hardness and toughness. Most common grade.",
  },
  {
    grade: "AR450",
    hardnessBHN: "430-480",
    minYieldMpa: 1200,
    maxTempC: 200,
    notes: "Higher hardness for more abrasive materials.",
  },
  {
    grade: "AR500",
    hardnessBHN: "460-544",
    minYieldMpa: 1400,
    maxTempC: 200,
    notes: "Maximum hardness. More brittle - not for high-impact applications.",
  },
  {
    grade: "Hardox 400",
    hardnessBHN: "370-430",
    minYieldMpa: 1000,
    maxTempC: 200,
    notes: "SSAB brand. Excellent combination of hardness and toughness.",
  },
  {
    grade: "Hardox 450",
    hardnessBHN: "420-480",
    minYieldMpa: 1200,
    maxTempC: 200,
    notes: "SSAB brand. Higher wear resistance than Hardox 400.",
  },
  {
    grade: "Hardox 500",
    hardnessBHN: "470-530",
    minYieldMpa: 1400,
    maxTempC: 200,
    notes: "SSAB brand. For extreme abrasion where impact is minimal.",
  },
];

export const isArSteelSpec = (steelSpecName?: string): boolean => {
  if (!steelSpecName) return false;
  const upperName = steelSpecName.toUpperCase();
  return (
    upperName.includes("AR400") ||
    upperName.includes("AR450") ||
    upperName.includes("AR500") ||
    upperName.includes("HARDOX") ||
    upperName.includes("WEAR") ||
    upperName.includes("ABRASION")
  );
};

export const arSteelScheduleList = (): Array<{
  id: number;
  scheduleDesignation: string;
  wallThicknessMm: number;
}> => {
  return AR_STEEL_PLATE_THICKNESSES.map((plate, index) => ({
    id: 90000 + index,
    scheduleDesignation: `${plate.thicknessMm}mm Plate`,
    wallThicknessMm: plate.thicknessMm,
  }));
};

export const recommendedArPlateThickness = (
  applicationSeverity: "light" | "standard" | "heavy" | "extreme",
): number => {
  const recommendations: Record<string, number> = {
    light: 6,
    standard: 10,
    heavy: 16,
    extreme: 25,
  };
  return recommendations[applicationSeverity] || 10;
};
