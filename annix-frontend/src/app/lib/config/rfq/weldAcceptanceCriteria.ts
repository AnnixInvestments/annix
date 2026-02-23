export type NdtMethod = "RT" | "UT" | "MT" | "PT" | "VT";

export interface WeldDefectLimit {
  defectType: string;
  maxSizeMm: number | null;
  maxPercentWall: number | null;
  maxLengthMm: number | null;
  minSpacingMm: number | null;
  notes: string;
}

export interface WeldAcceptanceCriteria {
  standard: string;
  weldClass: string;
  defectLimits: WeldDefectLimit[];
  ndtRequirements: NdtMethod[];
  notes?: string;
}

export const NDT_METHODS: Record<NdtMethod, { label: string; description: string }> = {
  RT: {
    label: "Radiographic Testing",
    description: "X-ray or gamma ray examination for internal defects",
  },
  UT: {
    label: "Ultrasonic Testing",
    description: "Sound wave examination for internal defects and wall thickness",
  },
  MT: {
    label: "Magnetic Particle Testing",
    description: "Surface and near-surface defect detection for ferromagnetic materials",
  },
  PT: {
    label: "Penetrant Testing",
    description: "Surface defect detection using dye penetrant",
  },
  VT: {
    label: "Visual Testing",
    description: "Direct visual examination of weld surface and profile",
  },
};

export const ASME_B31_3_ACCEPTANCE: WeldAcceptanceCriteria = {
  standard: "ASME B31.3",
  weldClass: "Normal Fluid Service",
  defectLimits: [
    {
      defectType: "Cracks",
      maxSizeMm: 0,
      maxPercentWall: 0,
      maxLengthMm: 0,
      minSpacingMm: null,
      notes: "No cracks permitted",
    },
    {
      defectType: "Lack of Fusion",
      maxSizeMm: null,
      maxPercentWall: null,
      maxLengthMm: 25.4,
      minSpacingMm: 152.4,
      notes: "Individual max 25.4mm, cumulative max 8% of weld length",
    },
    {
      defectType: "Incomplete Penetration",
      maxSizeMm: null,
      maxPercentWall: null,
      maxLengthMm: 38.1,
      minSpacingMm: 152.4,
      notes: "Individual max 38.1mm, cumulative max 8% of weld length",
    },
    {
      defectType: "Undercut",
      maxSizeMm: 0.8,
      maxPercentWall: 10,
      maxLengthMm: null,
      minSpacingMm: null,
      notes: "Max 0.8mm or 10% of wall thickness, whichever is less",
    },
    {
      defectType: "Porosity (Isolated)",
      maxSizeMm: 3.2,
      maxPercentWall: 25,
      maxLengthMm: null,
      minSpacingMm: 6.4,
      notes: "Max pore size 3.2mm or 25% of wall, spacing min 4x diameter",
    },
    {
      defectType: "Porosity (Cluster)",
      maxSizeMm: null,
      maxPercentWall: null,
      maxLengthMm: 12.7,
      minSpacingMm: 152.4,
      notes: "Cluster length max 12.7mm, spacing min 152.4mm",
    },
    {
      defectType: "Slag Inclusion",
      maxSizeMm: 3.2,
      maxPercentWall: null,
      maxLengthMm: 50.8,
      minSpacingMm: 152.4,
      notes: "Width max 3.2mm, length max 50.8mm or 2x wall thickness",
    },
    {
      defectType: "Concavity (Root)",
      maxSizeMm: 1.6,
      maxPercentWall: null,
      maxLengthMm: null,
      minSpacingMm: null,
      notes: "Max depth 1.6mm, total thickness must meet minimum",
    },
    {
      defectType: "Convexity (Cap)",
      maxSizeMm: 3.2,
      maxPercentWall: null,
      maxLengthMm: null,
      minSpacingMm: null,
      notes: "Max reinforcement 3.2mm for wall >25mm",
    },
  ],
  ndtRequirements: ["VT", "RT"],
  notes:
    "Normal fluid service per ASME B31.3. Category D fluid service may have relaxed requirements",
};

export const API_1104_ACCEPTANCE: WeldAcceptanceCriteria = {
  standard: "API 1104",
  weldClass: "Pipeline Welding",
  defectLimits: [
    {
      defectType: "Cracks",
      maxSizeMm: 0,
      maxPercentWall: 0,
      maxLengthMm: 0,
      minSpacingMm: null,
      notes: "No cracks permitted",
    },
    {
      defectType: "Incomplete Penetration (IP)",
      maxSizeMm: null,
      maxPercentWall: null,
      maxLengthMm: 25.4,
      minSpacingMm: 152.4,
      notes: "Individual max 25.4mm, total max 25.4mm in 305mm weld",
    },
    {
      defectType: "Incomplete Fusion (IF)",
      maxSizeMm: null,
      maxPercentWall: null,
      maxLengthMm: 25.4,
      minSpacingMm: 152.4,
      notes: "Individual max 25.4mm, total max 25.4mm in 305mm weld",
    },
    {
      defectType: "Internal Concavity (IC)",
      maxSizeMm: null,
      maxPercentWall: null,
      maxLengthMm: null,
      minSpacingMm: null,
      notes: "Density must not exceed that of adjacent base metal",
    },
    {
      defectType: "Burn-Through (BT)",
      maxSizeMm: 6.4,
      maxPercentWall: null,
      maxLengthMm: 12.7,
      minSpacingMm: 152.4,
      notes: "Max 6.4mm wide, 12.7mm long. Max 2 per 305mm weld",
    },
    {
      defectType: "Slag Inclusion (SI)",
      maxSizeMm: null,
      maxPercentWall: null,
      maxLengthMm: 50.8,
      minSpacingMm: 152.4,
      notes: "Individual max 50.8mm or 2x wall, total max 8% of weld",
    },
    {
      defectType: "Porosity (P)",
      maxSizeMm: 3.2,
      maxPercentWall: 25,
      maxLengthMm: null,
      minSpacingMm: null,
      notes: "Individual max 3.2mm, distribution per API 1104 Table 6",
    },
    {
      defectType: "Undercut (UC)",
      maxSizeMm: 0.8,
      maxPercentWall: 12.5,
      maxLengthMm: 50.8,
      minSpacingMm: null,
      notes: "Max 0.8mm or 12.5% of wall. Total max 50.8mm in 305mm",
    },
    {
      defectType: "Accumulation (AC)",
      maxSizeMm: null,
      maxPercentWall: null,
      maxLengthMm: 50.8,
      minSpacingMm: null,
      notes: "Total accumulated defects max 50.8mm in 305mm weld",
    },
  ],
  ndtRequirements: ["VT", "RT", "UT"],
  notes: "API 1104 pipeline welding standard. AUT may substitute for RT",
};

export const ASME_IX_ACCEPTANCE: WeldAcceptanceCriteria = {
  standard: "ASME Section IX",
  weldClass: "Procedure/Performance Qualification",
  defectLimits: [
    {
      defectType: "Cracks",
      maxSizeMm: 0,
      maxPercentWall: 0,
      maxLengthMm: 0,
      minSpacingMm: null,
      notes: "No cracks permitted",
    },
    {
      defectType: "Root Concavity",
      maxSizeMm: null,
      maxPercentWall: null,
      maxLengthMm: null,
      minSpacingMm: null,
      notes: "Total thickness including concavity must meet minimum required",
    },
    {
      defectType: "Melt-Through",
      maxSizeMm: null,
      maxPercentWall: null,
      maxLengthMm: null,
      minSpacingMm: null,
      notes: "Not cause for rejection if surface is acceptable",
    },
  ],
  ndtRequirements: ["VT", "RT"],
  notes: "ASME Section IX for welder qualification. Per QW-191 acceptance criteria",
};

export const acceptanceCriteriaForStandard = (standard: string): WeldAcceptanceCriteria | null => {
  const normalizedStandard = standard.toUpperCase().replace(/\s+/g, "");
  if (normalizedStandard.includes("B31.3") || normalizedStandard.includes("B313")) {
    return ASME_B31_3_ACCEPTANCE;
  }
  if (normalizedStandard.includes("1104") || normalizedStandard.includes("API1104")) {
    return API_1104_ACCEPTANCE;
  }
  if (normalizedStandard.includes("SECTIONIX") || normalizedStandard.includes("ASMEIX")) {
    return ASME_IX_ACCEPTANCE;
  }
  return null;
};

export const HYDROTEST_REQUIREMENTS = {
  ASME_B31_3: {
    pressureMultiplier: 1.5,
    minHoldMinutes: 10,
    maxPressureMpa: null,
    notes: "1.5 × design pressure. Hold time minimum 10 minutes. Monitor for leaks",
  },
  API_5L_PSL2: {
    pressureMultiplier: 1.25,
    minHoldMinutes: 5,
    maxPressureMpa: null,
    notes: "Mill test per API 5L. Factory hydrotest at 125% SMYS for 5 seconds minimum",
  },
  ASME_B16_5: {
    pressureMultiplier: 1.5,
    minHoldMinutes: null,
    maxPressureMpa: null,
    notes: "Shell test at 1.5 × rating pressure at 38°C",
  },
};

export const ndtMethodsForService = (
  pressureBar: number,
  temperatureC: number,
  isCorrosive: boolean,
  isPipeline: boolean,
): NdtMethod[] => {
  const methods: NdtMethod[] = ["VT"];
  if (isPipeline) {
    methods.push("RT", "UT");
    return methods;
  }
  if (pressureBar > 100 || Math.abs(temperatureC) > 200 || isCorrosive) {
    methods.push("RT");
  }
  if (pressureBar > 200 || temperatureC > 400) {
    methods.push("UT");
  }
  if (pressureBar <= 50 && !isCorrosive) {
    methods.push("MT", "PT");
  }
  return methods;
};
