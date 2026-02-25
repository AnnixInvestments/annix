export type WeldingCode = "API_1104" | "ASME_B31_3" | "AWS_D1_1";
export type DefectType =
  | "POROSITY"
  | "UNDERCUT"
  | "INCOMPLETE_FUSION"
  | "INCOMPLETE_PENETRATION"
  | "SLAG_INCLUSION"
  | "CRACK"
  | "BURN_THROUGH"
  | "ARC_STRIKE"
  | "SPATTER";

export interface WeldDefectCriteria {
  code: WeldingCode;
  defectType: DefectType;
  defectName: string;
  maxDimensionMm: number | null;
  maxDimensionPctT: number | null;
  spacingRequirement: string | null;
  cumulativeLimit: string | null;
  repairLimit: string | null;
  notes: string | null;
}

export const WELD_DEFECT_CRITERIA: WeldDefectCriteria[] = [
  {
    code: "API_1104",
    defectType: "POROSITY",
    defectName: "Porosity / Gas Pockets",
    maxDimensionMm: 3.2,
    maxDimensionPctT: 25,
    spacingRequirement: "≥25mm between clusters",
    cumulativeLimit: "≤25% of weld length in any 300mm",
    repairLimit: "Repair if exceeds limits",
    notes: "Individual pores ≤3.2mm, scattered porosity acceptable",
  },
  {
    code: "API_1104",
    defectType: "UNDERCUT",
    defectName: "Undercut",
    maxDimensionMm: 0.8,
    maxDimensionPctT: 12.5,
    spacingRequirement: null,
    cumulativeLimit: "≤50mm aggregate in any 300mm",
    repairLimit: "Repair if depth >0.8mm or >12.5%t",
    notes: "Depth must not exceed 0.8mm or 12.5% of wall",
  },
  {
    code: "API_1104",
    defectType: "INCOMPLETE_FUSION",
    defectName: "Incomplete Fusion / LOF",
    maxDimensionMm: 25,
    maxDimensionPctT: null,
    spacingRequirement: null,
    cumulativeLimit: "≤25mm aggregate in any 300mm",
    repairLimit: "Repair required",
    notes: "Not permitted at root",
  },
  {
    code: "API_1104",
    defectType: "INCOMPLETE_PENETRATION",
    defectName: "Incomplete Penetration",
    maxDimensionMm: 25,
    maxDimensionPctT: null,
    spacingRequirement: null,
    cumulativeLimit: "≤25mm aggregate in any 300mm",
    repairLimit: "Repair required",
    notes: "Includes lack of root penetration",
  },
  {
    code: "API_1104",
    defectType: "SLAG_INCLUSION",
    defectName: "Slag Inclusion",
    maxDimensionMm: 50,
    maxDimensionPctT: null,
    spacingRequirement: null,
    cumulativeLimit: "≤50mm aggregate in any 300mm",
    repairLimit: "Repair if exceeds limits",
    notes: "Width ≤3.2mm",
  },
  {
    code: "API_1104",
    defectType: "CRACK",
    defectName: "Cracks (any type)",
    maxDimensionMm: 0,
    maxDimensionPctT: 0,
    spacingRequirement: "Not permitted",
    cumulativeLimit: "Zero tolerance",
    repairLimit: "Mandatory repair",
    notes: "No cracks permitted - must repair",
  },
  {
    code: "API_1104",
    defectType: "BURN_THROUGH",
    defectName: "Burn-Through",
    maxDimensionMm: 6,
    maxDimensionPctT: null,
    spacingRequirement: null,
    cumulativeLimit: "≤13mm aggregate in any 300mm",
    repairLimit: "Repair if >6mm diameter",
    notes: "Individual ≤6mm diameter",
  },
  {
    code: "ASME_B31_3",
    defectType: "POROSITY",
    defectName: "Porosity / Gas Pockets",
    maxDimensionMm: null,
    maxDimensionPctT: 20,
    spacingRequirement: "≥6mm spacing",
    cumulativeLimit: "Per Table 341.3.2",
    repairLimit: "Repair if clustered",
    notes: "Scattered acceptable, clustered requires evaluation",
  },
  {
    code: "ASME_B31_3",
    defectType: "UNDERCUT",
    defectName: "Undercut",
    maxDimensionMm: 0.8,
    maxDimensionPctT: 10,
    spacingRequirement: null,
    cumulativeLimit: "≤1/6 of weld length",
    repairLimit: "Blend or weld repair",
    notes: "Depth ≤0.8mm or 10%t whichever is less",
  },
  {
    code: "ASME_B31_3",
    defectType: "INCOMPLETE_FUSION",
    defectName: "Incomplete Fusion / LOF",
    maxDimensionMm: 0,
    maxDimensionPctT: 0,
    spacingRequirement: "Not permitted",
    cumulativeLimit: "Zero tolerance",
    repairLimit: "Mandatory repair",
    notes: "Not acceptable per B31.3",
  },
  {
    code: "ASME_B31_3",
    defectType: "CRACK",
    defectName: "Cracks (any type)",
    maxDimensionMm: 0,
    maxDimensionPctT: 0,
    spacingRequirement: "Not permitted",
    cumulativeLimit: "Zero tolerance",
    repairLimit: "Mandatory repair",
    notes: "No cracks permitted",
  },
  {
    code: "AWS_D1_1",
    defectType: "POROSITY",
    defectName: "Porosity / Gas Pockets",
    maxDimensionMm: 2.5,
    maxDimensionPctT: null,
    spacingRequirement: "≥25mm spacing",
    cumulativeLimit: "≤10mm in any 25mm length",
    repairLimit: "Repair if exceeds",
    notes: "Piping porosity not permitted",
  },
  {
    code: "AWS_D1_1",
    defectType: "UNDERCUT",
    defectName: "Undercut",
    maxDimensionMm: 1.0,
    maxDimensionPctT: null,
    spacingRequirement: null,
    cumulativeLimit: "≤50mm in any 300mm",
    repairLimit: "Blend or weld repair",
    notes: "Primary members ≤0.25mm depth",
  },
  {
    code: "AWS_D1_1",
    defectType: "CRACK",
    defectName: "Cracks (any type)",
    maxDimensionMm: 0,
    maxDimensionPctT: 0,
    spacingRequirement: "Not permitted",
    cumulativeLimit: "Zero tolerance",
    repairLimit: "Mandatory repair",
    notes: "No cracks permitted",
  },
];

export const defectCriteriaByCode = (code: WeldingCode): WeldDefectCriteria[] => {
  return WELD_DEFECT_CRITERIA.filter((c) => c.code === code);
};

export const defectCriteriaByType = (
  code: WeldingCode,
  defectType: DefectType,
): WeldDefectCriteria | null => {
  return WELD_DEFECT_CRITERIA.find((c) => c.code === code && c.defectType === defectType) ?? null;
};

export const weldingCodeLabel = (code: WeldingCode): string => {
  const labels: Record<WeldingCode, string> = {
    API_1104: "API 1104 (Pipeline Welding)",
    ASME_B31_3: "ASME B31.3 (Process Piping)",
    AWS_D1_1: "AWS D1.1 (Structural Welding)",
  };
  return labels[code];
};

export const defectTypeLabel = (type: DefectType): string => {
  const labels: Record<DefectType, string> = {
    POROSITY: "Porosity",
    UNDERCUT: "Undercut",
    INCOMPLETE_FUSION: "Incomplete Fusion",
    INCOMPLETE_PENETRATION: "Incomplete Penetration",
    SLAG_INCLUSION: "Slag Inclusion",
    CRACK: "Crack",
    BURN_THROUGH: "Burn-Through",
    ARC_STRIKE: "Arc Strike",
    SPATTER: "Spatter",
  };
  return labels[type];
};

export const SOUR_SERVICE_HARDNESS_LIMITS = {
  maxHrc: 22,
  maxHv: 248,
  maxHb: 237,
  notes: "Per NACE MR0175/ISO 15156 for carbon and low-alloy steels",
};
