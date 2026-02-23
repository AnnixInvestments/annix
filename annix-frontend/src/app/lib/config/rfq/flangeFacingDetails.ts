export type FlangeFacingType = "RF" | "FF" | "RTJ" | "LMF" | "SMF";
export type RtjGrooveType = "R" | "RX" | "BX";

export interface FlangeFacingConfig {
  type: FlangeFacingType;
  label: string;
  description: string;
  raisedFaceHeightMm?: number;
  standard: string;
}

export interface RtjGrooveConfig {
  type: RtjGrooveType;
  label: string;
  description: string;
  pressureClasses: string[];
  maxPressureBar: number;
  notes: string;
}

export const FLANGE_FACING_TYPES: Record<FlangeFacingType, FlangeFacingConfig> = {
  RF: {
    type: "RF",
    label: "Raised Face",
    description: "Standard raised face with serrated finish",
    standard: "ASME B16.5",
  },
  FF: {
    type: "FF",
    label: "Flat Face",
    description: "Full face contact, typically for cast iron or GRP flanges",
    standard: "ASME B16.5",
  },
  RTJ: {
    type: "RTJ",
    label: "Ring Type Joint",
    description: "Metal-to-metal seal using ring gasket in groove",
    standard: "ASME B16.5",
  },
  LMF: {
    type: "LMF",
    label: "Large Male Face",
    description: "Male projection face for tongue and groove joints",
    standard: "ASME B16.5",
  },
  SMF: {
    type: "SMF",
    label: "Small Male Face",
    description: "Smaller male projection for specific applications",
    standard: "ASME B16.5",
  },
};

export const RF_RAISED_FACE_HEIGHTS: Record<string, { heightMm: number; classes: string[] }> = {
  standard: {
    heightMm: 1.6,
    classes: ["150", "300"],
  },
  intermediate: {
    heightMm: 6.4,
    classes: ["400", "600", "900"],
  },
  high: {
    heightMm: 6.4,
    classes: ["1500", "2500"],
  },
};

export const RTJ_GROOVE_TYPES: Record<RtjGrooveType, RtjGrooveConfig> = {
  R: {
    type: "R",
    label: "R-Type (Oval/Octagonal)",
    description: "Standard ring groove for oval or octagonal ring gaskets",
    pressureClasses: ["150", "300", "400", "600", "900", "1500", "2500"],
    maxPressureBar: 700,
    notes: "Most common RTJ type. Reusable groove with proper ring replacement",
  },
  RX: {
    type: "RX",
    label: "RX-Type (Pressure-Energized)",
    description: "Pressure-energized ring for higher pressure applications",
    pressureClasses: ["900", "1500", "2500"],
    maxPressureBar: 1400,
    notes: "Self-energizing seal. Better for pressure cycling applications",
  },
  BX: {
    type: "BX",
    label: "BX-Type (High Pressure)",
    description: "High-pressure ring for extreme service",
    pressureClasses: ["2500", "5000", "10000", "15000", "20000"],
    maxPressureBar: 2100,
    notes: "API 6A standard for wellhead and Christmas tree applications",
  },
};

export const raisedFaceHeightMm = (pressureClass: string): number => {
  const classNum = parseInt(pressureClass, 10);
  if (classNum <= 300) return 1.6;
  return 6.4;
};

export const rtjGrooveForClass = (pressureClass: string): RtjGrooveType => {
  const classNum = parseInt(pressureClass, 10);
  if (classNum >= 5000) return "BX";
  if (classNum >= 900) return "RX";
  return "R";
};

export const facingTypesForService = (
  pressureBar: number,
  temperatureC: number,
  isCorrosive: boolean,
): FlangeFacingType[] => {
  const types: FlangeFacingType[] = [];
  if (pressureBar < 100 && !isCorrosive) {
    types.push("RF");
    if (temperatureC < 200) types.push("FF");
  } else if (pressureBar >= 100) {
    types.push("RF");
    if (pressureBar >= 400 || temperatureC > 400 || isCorrosive) {
      types.push("RTJ");
    }
  } else {
    types.push("RF", "RTJ");
  }
  return types;
};

export const FLANGE_SURFACE_FINISHES: Record<
  string,
  { raRangeUm: [number, number]; application: string }
> = {
  "Stock Finish": {
    raRangeUm: [3.2, 6.3],
    application: "Standard RF gaskets, spiral wound, ring joint",
  },
  "Smooth Finish": {
    raRangeUm: [0.8, 1.6],
    application: "RTJ faces, metal-to-metal seals",
  },
  "Serrated Finish": {
    raRangeUm: [3.2, 6.3],
    application: "Standard RF with soft gaskets",
  },
  "Phonographic Finish": {
    raRangeUm: [3.2, 12.5],
    application: "RF faces for spiral wound gaskets",
  },
};

export const B16_5_MATERIAL_GROUPS = [
  { group: "1.1", materials: "C-Si Steel", flange: "A105", pipe: "A106 Gr.B" },
  { group: "1.2", materials: "C-Mn-Si Steel", flange: "A350 LF2", pipe: "A333 Gr.6" },
  { group: "1.3", materials: "C-Mn-Si-V Steel", flange: "A350 LF3", pipe: "A333 Gr.3" },
  { group: "1.4", materials: "C-Mn Steel", flange: "A181 Cl.60", pipe: "A53 Gr.B" },
  { group: "1.5", materials: "C Steel", flange: "A181 Cl.70", pipe: "A106 Gr.C" },
  { group: "1.7", materials: "C-Si Steel (killed)", flange: "A350 LF6 Cl.1", pipe: "A333 Gr.1" },
  { group: "1.9", materials: "C-Mn-Si Steel", flange: "A350 LF6 Cl.2", pipe: "A333 Gr.6" },
  { group: "1.10", materials: "Mn-0.5Mo Steel", flange: "A182 F1", pipe: "A335 P1" },
  { group: "1.13", materials: "1/2Cr-1/2Mo Steel", flange: "A182 F2", pipe: "A335 P2" },
  { group: "1.14", materials: "3/4Ni-1/2Mo-1/3Cr-V", flange: "A182 F3V", pipe: "A335 P3" },
  { group: "2.1", materials: "304 Stainless", flange: "A182 F304", pipe: "A312 TP304" },
  { group: "2.2", materials: "304L Stainless", flange: "A182 F304L", pipe: "A312 TP304L" },
  { group: "2.3", materials: "304H Stainless", flange: "A182 F304H", pipe: "A312 TP304H" },
  { group: "2.4", materials: "316 Stainless", flange: "A182 F316", pipe: "A312 TP316" },
  { group: "2.5", materials: "316L Stainless", flange: "A182 F316L", pipe: "A312 TP316L" },
  { group: "2.6", materials: "316H Stainless", flange: "A182 F316H", pipe: "A312 TP316H" },
  { group: "2.7", materials: "317 Stainless", flange: "A182 F317", pipe: "A312 TP317" },
  { group: "2.8", materials: "321 Stainless", flange: "A182 F321", pipe: "A312 TP321" },
  { group: "2.9", materials: "321H Stainless", flange: "A182 F321H", pipe: "A312 TP321H" },
  { group: "2.10", materials: "347 Stainless", flange: "A182 F347", pipe: "A312 TP347" },
  { group: "2.11", materials: "347H Stainless", flange: "A182 F347H", pipe: "A312 TP347H" },
  { group: "3.1", materials: "1Cr-1/2Mo Steel", flange: "A182 F12 Cl.2", pipe: "A335 P12" },
  { group: "3.2", materials: "1-1/4Cr-1/2Mo Steel", flange: "A182 F11 Cl.2", pipe: "A335 P11" },
  { group: "3.3", materials: "2-1/4Cr-1Mo Steel", flange: "A182 F22 Cl.3", pipe: "A335 P22" },
  { group: "3.4", materials: "3Cr-1Mo Steel", flange: "A182 F21", pipe: "A335 P21" },
  { group: "3.5", materials: "5Cr-1/2Mo Steel", flange: "A182 F5", pipe: "A335 P5" },
  { group: "3.6", materials: "5Cr-1/2Mo-Si Steel", flange: "A182 F5a", pipe: "A335 P5b" },
  { group: "3.7", materials: "7Cr-1/2Mo Steel", flange: "A182 F7", pipe: "A335 P7" },
  { group: "3.8", materials: "9Cr-1Mo Steel", flange: "A182 F9", pipe: "A335 P9" },
  { group: "3.10", materials: "9Cr-1Mo-V Steel (P91)", flange: "A182 F91", pipe: "A335 P91" },
  { group: "3.12", materials: "5Cr-1/2Mo-Ti Steel", flange: "A182 F5c", pipe: "A335 P5c" },
  { group: "3.14", materials: "9Cr-2W Steel (P92)", flange: "A182 F92", pipe: "A335 P92" },
  { group: "3.16", materials: "3-1/2Ni Steel", flange: "A350 LF3", pipe: "A333 Gr.3" },
  { group: "3.17", materials: "9Ni Steel", flange: "A350 LF9", pipe: "A333 Gr.8" },
  { group: "3.18", materials: "Duplex Stainless 2205", flange: "A182 F51", pipe: "A790 S31803" },
];

export const materialGroupForFlange = (
  flangeSpec: string,
): { group: string; materials: string; pipe: string } | null => {
  const found = B16_5_MATERIAL_GROUPS.find(
    (g) => flangeSpec.includes(g.flange) || g.flange === flangeSpec,
  );
  return found ? { group: found.group, materials: found.materials, pipe: found.pipe } : null;
};
