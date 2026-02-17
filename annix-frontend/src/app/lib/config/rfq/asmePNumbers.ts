export interface PNumberInfo {
  pNumber: number;
  subgroups?: string[];
  description: string;
  typicalMaterials: string[];
  notes?: string;
}

export const ASME_P_NUMBERS: PNumberInfo[] = [
  {
    pNumber: 1,
    subgroups: ["1", "2", "3", "4"],
    description: "Carbon Steels",
    typicalMaterials: ["A106 Gr A/B/C", "A53 Gr A/B", "A333 Gr 1/6", "A105", "API 5L Gr B/X42-X80"],
    notes: "Most common P-Number. Subgroups based on tensile strength.",
  },
  {
    pNumber: 3,
    subgroups: ["1", "2", "3"],
    description: "Alloy Steels (0.5% Mo)",
    typicalMaterials: ["A335 P1", "A369 FP1", "A387 Gr 2"],
    notes: "Carbon-molybdenum steels for elevated temperature.",
  },
  {
    pNumber: 4,
    subgroups: ["1", "2"],
    description: "Alloy Steels (1-2% Cr, 0.5% Mo)",
    typicalMaterials: ["A335 P11/P12", "A387 Gr 11/12"],
    notes: "Low chrome-moly steels.",
  },
  {
    pNumber: 5,
    subgroups: ["A", "B", "C"],
    description: "Alloy Steels (2.25-9% Cr)",
    typicalMaterials: ["A335 P22/P5/P9", "A387 Gr 22"],
    notes: "Higher chrome-moly steels.",
  },
  {
    pNumber: 6,
    subgroups: ["1", "2", "3", "4"],
    description: "Martensitic Stainless Steels",
    typicalMaterials: ["A312 TP410/TP410S/TP420", "Type 403/410/420"],
    notes: "Heat-treatable 11-17% Cr steels. Requires preheat and PWHT.",
  },
  {
    pNumber: 7,
    subgroups: ["1", "2"],
    description: "Ferritic Stainless Steels",
    typicalMaterials: ["A312 TP405/TP409/TP430/TP434", "Type 405/430"],
    notes: "11-30% Cr non-hardenable steels.",
  },
  {
    pNumber: 8,
    subgroups: ["1", "2", "3", "4"],
    description: "Austenitic Stainless Steels",
    typicalMaterials: ["A312 TP304/TP304L/TP316/TP316L/TP321/TP347", "Type 304/316/321/347"],
    notes: "18Cr-8Ni and related grades. Most common stainless.",
  },
  {
    pNumber: 9,
    subgroups: ["A", "B", "C"],
    description: "Nickel Alloy Steels (2-4% Ni)",
    typicalMaterials: ["A333 Gr 3/4/7", "A350 LF3", "A420 WPL3"],
    notes: "9A: 2-4% Ni. 9B: 3.5-5.5% Ni. 9C: Higher Ni content. Used for cryogenic service.",
  },
  {
    pNumber: 10,
    subgroups: ["H", "K"],
    description: "Duplex Stainless Steels",
    typicalMaterials: ["A790 S31803/S32205/S32750/S32707"],
    notes: "Austenitic-ferritic (duplex) stainless steels.",
  },
  {
    pNumber: 11,
    subgroups: ["A", "B"],
    description: "High-Nickel Steels (9% Ni)",
    typicalMaterials: ["A333 Gr 5/8", "A353", "A553 Type I"],
    notes: "9% Nickel steels for cryogenic LNG service down to -196°C.",
  },
  {
    pNumber: 15,
    subgroups: ["E"],
    description: "Advanced Cr-Mo Steels (9Cr-1Mo-V)",
    typicalMaterials: ["A335 P91/P92", "A387 Gr 91"],
    notes: "Modified 9Cr-1Mo steels with V and Nb additions.",
  },
  {
    pNumber: 34,
    description: "Copper-Nickel Alloys",
    typicalMaterials: ["B466 C70600 (90-10)", "B466 C71500 (70-30)"],
    notes: "Cu-Ni alloys for marine and seawater service.",
  },
  {
    pNumber: 41,
    description: "Commercially Pure Nickel",
    typicalMaterials: ["Nickel 200", "Nickel 201"],
    notes: "99%+ Nickel. Use 201 above 316°C.",
  },
  {
    pNumber: 42,
    description: "Nickel-Copper Alloys",
    typicalMaterials: ["Monel 400", "Monel K-500"],
    notes: "67Ni-30Cu alloys. Seawater and HF acid resistance.",
  },
  {
    pNumber: 43,
    description: "Nickel-Chromium Alloys",
    typicalMaterials: ["Inconel 600", "Inconel 625", "Inconel 718"],
    notes: "High-temp and corrosion-resistant superalloys.",
  },
  {
    pNumber: 44,
    description: "Nickel-Molybdenum-Chromium Alloys",
    typicalMaterials: ["Hastelloy C-276", "Hastelloy C-22", "Hastelloy B-2"],
    notes: "Maximum corrosion resistance in both oxidizing and reducing acids.",
  },
  {
    pNumber: 45,
    description: "Nickel-Iron-Chromium Alloys",
    typicalMaterials: ["Incoloy 800/800H/800HT", "Incoloy 825"],
    notes: "High-temp alloys with lower Ni content than P-43.",
  },
  {
    pNumber: 51,
    description: "Commercially Pure Titanium",
    typicalMaterials: ["Titanium Gr 1/2/3/4"],
    notes: "Unalloyed titanium. Excellent seawater resistance.",
  },
  {
    pNumber: 52,
    description: "Titanium Alloys",
    typicalMaterials: ["Titanium Gr 5 (Ti-6Al-4V)", "Titanium Gr 7"],
    notes: "Alloyed titanium for high-strength applications.",
  },
];

export interface NonExistentPNumberInfo {
  pNumber: number;
  reason: string;
  correctClassification?: string;
  notes: string;
}

export const NON_EXISTENT_P_NUMBERS: NonExistentPNumberInfo[] = [
  {
    pNumber: 2,
    reason: "Does not exist in ASME Section IX",
    correctClassification:
      "ASME P-Number sequence skips from P-1 to P-3. Materials sometimes incorrectly cited as P-2 are typically P-1 or P-3.",
    notes:
      "The original request for 'P-Number 2 (3% Nickel Steel for A333 Gr 3)' is incorrect. A333 Gr 3 is correctly classified as P-Number 9A (2-4% Nickel Steels).",
  },
  {
    pNumber: 46,
    reason: "Does not exist - Cobalt alloys are F-Numbers (welding consumables)",
    correctClassification:
      "Cobalt-base alloys like Stellite are classified as F-Numbers in ASME Section IX Table QW-432 (filler metals), not P-Numbers (base metals).",
    notes:
      "F-6 covers Co-Cr bare electrodes and rods. P-49 exists for Ni-Cr-Co-Mo-Fe-W alloys (cobalt-containing nickel superalloys), but P-46 does not exist.",
  },
];

export interface WeldingConsumableInfo {
  fNumber: number;
  description: string;
  typicalProducts: string[];
  notes?: string;
}

export const COBALT_WELDING_CONSUMABLES: WeldingConsumableInfo[] = [
  {
    fNumber: 6,
    description: "Cobalt-Chromium Bare Electrodes and Rods",
    typicalProducts: [
      "Stellite 6 (AWS A5.21 ERCoCr-A)",
      "Stellite 12",
      "Stellite 21",
      "Tribaloy T-400/T-800",
    ],
    notes:
      "Hard-facing alloys for wear resistance. Deposited as weld overlay on valve seats, pump components, and wear surfaces. Not base metal - these are welding consumables classified as F-Numbers per ASME Section IX Table QW-432.",
  },
];

export const pNumberInfo = (pNumber: number): PNumberInfo | null => {
  return ASME_P_NUMBERS.find((p) => p.pNumber === pNumber) ?? null;
};

export const pNumberExists = (pNumber: number): boolean => {
  return ASME_P_NUMBERS.some((p) => p.pNumber === pNumber);
};

export const nonExistentPNumberInfo = (pNumber: number): NonExistentPNumberInfo | null => {
  return NON_EXISTENT_P_NUMBERS.find((p) => p.pNumber === pNumber) ?? null;
};

export const pNumberForMaterial = (materialSpec: string): number | null => {
  const spec = materialSpec.toUpperCase();

  if (spec.includes("A333") && spec.includes("GR") && spec.includes("3")) {
    return 9;
  }
  if (spec.includes("A333") && spec.includes("GR") && spec.includes("5")) {
    return 11;
  }
  if (spec.includes("A333") && spec.includes("GR") && spec.includes("8")) {
    return 11;
  }
  if (spec.includes("STELLITE") || spec.includes("TRIBALOY")) {
    return null;
  }
  return null;
};

export const formatPNumber = (pNumber: number, subgroup?: string): string => {
  if (subgroup) {
    return `P-No. ${pNumber}${subgroup}`;
  }
  return `P-No. ${pNumber}`;
};
