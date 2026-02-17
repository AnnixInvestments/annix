export interface MaterialLimits {
  minTempC: number;
  maxTempC: number;
  maxPressureBar: number;
  type: string;
  notes?: string;
  pNumber?: number;
  pGroup?: number;
  defaultGrade?: string;
  isNotForPressureService?: boolean;
  hardnessBHN?: string;
}

export const MATERIAL_LIMITS: Record<string, MaterialLimits> = {
  "SABS 62 Medium": {
    minTempC: -20,
    maxTempC: 300,
    maxPressureBar: 25,
    type: "Carbon Steel ERW",
    notes:
      "General purpose ERW pipe (medium grade). Pressure derated above 100°C: 25 bar at ambient, ~20 bar at 200°C, ~15 bar at 300°C.",
    pNumber: 1,
    pGroup: 1,
  },
  "SABS 62 Heavy": {
    minTempC: -20,
    maxTempC: 300,
    maxPressureBar: 35,
    type: "Carbon Steel ERW",
    notes:
      "General purpose ERW pipe (heavy grade). Pressure derated above 100°C: 35 bar at ambient, ~28 bar at 200°C, ~21 bar at 300°C.",
    pNumber: 1,
    pGroup: 1,
  },
  "SABS 62": {
    minTempC: -20,
    maxTempC: 300,
    maxPressureBar: 25,
    type: "Carbon Steel ERW",
    notes:
      "General purpose ERW pipe. For pressure service, specify Medium or Heavy grade. Not recommended above 300°C.",
    pNumber: 1,
    pGroup: 1,
  },
  "SABS 719": {
    minTempC: -20,
    maxTempC: 300,
    maxPressureBar: 16,
    type: "Carbon Steel ERW",
    notes:
      "Large bore ERW pipe for aqueous fluids. Working pressure 16 bar at ambient (per SANS 719). Derated above 100°C.",
    pNumber: 1,
    pGroup: 1,
  },
  "ASTM A106 Gr. A": {
    minTempC: -29,
    maxTempC: 427,
    maxPressureBar: 400,
    type: "Carbon Steel Seamless",
    notes: "High temperature seamless pipe",
    pNumber: 1,
    pGroup: 1,
    defaultGrade: "A",
  },
  "ASTM A106 Gr. B": {
    minTempC: -29,
    maxTempC: 427,
    maxPressureBar: 400,
    type: "Carbon Steel Seamless",
    notes: "High temperature seamless pipe",
    pNumber: 1,
    pGroup: 1,
    defaultGrade: "B",
  },
  "ASTM A106 Gr. C": {
    minTempC: -29,
    maxTempC: 427,
    maxPressureBar: 400,
    type: "Carbon Steel Seamless",
    notes: "High temperature seamless pipe (higher strength)",
    pNumber: 1,
    pGroup: 2,
    defaultGrade: "C",
  },
  "ASTM A106": {
    minTempC: -29,
    maxTempC: 427,
    maxPressureBar: 400,
    type: "Carbon Steel Seamless",
    notes: "High temperature seamless pipe",
    pNumber: 1,
    pGroup: 1,
    defaultGrade: "B",
  },
  "ASTM A53 Gr. A": {
    minTempC: -29,
    maxTempC: 400,
    maxPressureBar: 250,
    type: "Carbon Steel",
    notes: "General purpose pipe",
    pNumber: 1,
    pGroup: 1,
    defaultGrade: "A",
  },
  "ASTM A53 Gr. B": {
    minTempC: -29,
    maxTempC: 400,
    maxPressureBar: 250,
    type: "Carbon Steel",
    notes: "General purpose pipe",
    pNumber: 1,
    pGroup: 1,
    defaultGrade: "B",
  },
  "ASTM A53": {
    minTempC: -29,
    maxTempC: 400,
    maxPressureBar: 250,
    type: "Carbon Steel",
    notes: "General purpose pipe - seamless or welded",
    pNumber: 1,
    pGroup: 1,
    defaultGrade: "B",
  },
  "ASTM A333 Gr. 6": {
    minTempC: -100,
    maxTempC: 400,
    maxPressureBar: 250,
    type: "Low-Temp Carbon Steel",
    notes: "For temperatures down to -46°C",
    pNumber: 1,
    pGroup: 1,
    defaultGrade: "6",
  },
  "ASTM A333 Gr. 3": {
    minTempC: -100,
    maxTempC: 400,
    maxPressureBar: 250,
    type: "Low-Temp 3.5Ni Steel",
    notes: "For temperatures down to -100°C",
    pNumber: 9,
    pGroup: 1,
    defaultGrade: "3",
  },
  "ASTM A333 Gr. 8": {
    minTempC: -196,
    maxTempC: 400,
    maxPressureBar: 250,
    type: "Cryogenic 9Ni Steel",
    notes: "For cryogenic service down to -196°C",
    pNumber: 11,
    pGroup: 1,
    defaultGrade: "8",
  },
  "ASTM A333": {
    minTempC: -100,
    maxTempC: 400,
    maxPressureBar: 250,
    type: "Low-Temp Carbon Steel",
    notes: "For temperatures down to -100°C",
    pNumber: 1,
    pGroup: 1,
    defaultGrade: "6",
  },
  "API 5L Gr. B": {
    minTempC: -29,
    maxTempC: 400,
    maxPressureBar: 250,
    type: "Line Pipe Carbon Steel",
    notes: "Oil and gas pipeline",
    pNumber: 1,
    pGroup: 1,
    defaultGrade: "B",
  },
  "API 5L X52": {
    minTempC: -29,
    maxTempC: 400,
    maxPressureBar: 250,
    type: "Line Pipe Carbon Steel",
    notes: "Higher strength pipeline",
    pNumber: 1,
    pGroup: 2,
    defaultGrade: "X52",
  },
  "API 5L X60": {
    minTempC: -29,
    maxTempC: 400,
    maxPressureBar: 250,
    type: "Line Pipe Carbon Steel",
    notes: "High strength pipeline",
    pNumber: 1,
    pGroup: 2,
    defaultGrade: "X60",
  },
  "API 5L": {
    minTempC: -29,
    maxTempC: 400,
    maxPressureBar: 250,
    type: "Line Pipe Carbon Steel",
    notes: "Oil and gas pipeline",
    pNumber: 1,
    pGroup: 1,
    defaultGrade: "B",
  },
  "ASTM A179": {
    minTempC: -29,
    maxTempC: 400,
    maxPressureBar: 160,
    type: "Heat Exchanger Tube",
    notes: "Cold-drawn seamless",
    pNumber: 1,
    pGroup: 1,
  },
  "ASTM A192": {
    minTempC: -29,
    maxTempC: 454,
    maxPressureBar: 250,
    type: "Boiler Tube",
    notes: "High-pressure boiler service",
    pNumber: 1,
    pGroup: 1,
  },
  "ASTM A500 Gr. A": {
    minTempC: -29,
    maxTempC: 200,
    maxPressureBar: 0,
    type: "Structural Tubing",
    notes:
      "NOT FOR PRESSURE SERVICE - Cold-formed welded structural tubing. Use for structural support only. Min yield 228 MPa (33 ksi).",
    isNotForPressureService: true,
    defaultGrade: "A",
  },
  "ASTM A500 Gr. B": {
    minTempC: -29,
    maxTempC: 200,
    maxPressureBar: 0,
    type: "Structural Tubing",
    notes:
      "NOT FOR PRESSURE SERVICE - Cold-formed welded structural tubing. Use for structural support only. Min yield 290 MPa (42 ksi).",
    isNotForPressureService: true,
    defaultGrade: "B",
  },
  "ASTM A500 Gr. C": {
    minTempC: -29,
    maxTempC: 200,
    maxPressureBar: 0,
    type: "Structural Tubing",
    notes:
      "NOT FOR PRESSURE SERVICE - Cold-formed welded structural tubing. Use for structural support only. Min yield 317 MPa (46 ksi).",
    isNotForPressureService: true,
    defaultGrade: "C",
  },
  "ASTM A500": {
    minTempC: -29,
    maxTempC: 200,
    maxPressureBar: 0,
    type: "Structural Tubing",
    notes:
      "NOT FOR PRESSURE SERVICE - Cold-formed welded structural tubing. Use for structural support only.",
    isNotForPressureService: true,
  },
  "ASTM A335 P1": {
    minTempC: -29,
    maxTempC: 538,
    maxPressureBar: 400,
    type: "Alloy Steel 0.5Mo",
    notes: "Elevated temperature service",
    pNumber: 3,
    pGroup: 1,
    defaultGrade: "P1",
  },
  "ASTM A335 P11": {
    minTempC: -29,
    maxTempC: 593,
    maxPressureBar: 400,
    type: "Alloy Steel 1.25Cr-0.5Mo",
    notes: "High temperature service",
    pNumber: 4,
    pGroup: 1,
    defaultGrade: "P11",
  },
  "ASTM A335 P12": {
    minTempC: -29,
    maxTempC: 593,
    maxPressureBar: 400,
    type: "Alloy Steel 1Cr-0.5Mo",
    notes: "High temperature service",
    pNumber: 4,
    pGroup: 1,
    defaultGrade: "P12",
  },
  "ASTM A335 P22": {
    minTempC: -29,
    maxTempC: 593,
    maxPressureBar: 400,
    type: "Alloy Steel 2.25Cr-1Mo",
    notes: "High temperature service",
    pNumber: 5,
    pGroup: 1,
    defaultGrade: "P22",
  },
  "ASTM A335 P5": {
    minTempC: -29,
    maxTempC: 593,
    maxPressureBar: 400,
    type: "Alloy Steel 5Cr-0.5Mo",
    notes: "High temperature service",
    pNumber: 5,
    pGroup: 1,
    defaultGrade: "P5",
  },
  "ASTM A335 P9": {
    minTempC: -29,
    maxTempC: 593,
    maxPressureBar: 400,
    type: "Alloy Steel 9Cr-1Mo",
    notes: "High temperature service",
    pNumber: 5,
    pGroup: 1,
    defaultGrade: "P9",
  },
  "ASTM A335 P91": {
    minTempC: -29,
    maxTempC: 649,
    maxPressureBar: 400,
    type: "Alloy Steel 9Cr-1Mo-V",
    notes: "Advanced high temperature service",
    pNumber: 15,
    pGroup: 1,
    defaultGrade: "P91",
  },
  "ASTM A335 P92": {
    minTempC: -29,
    maxTempC: 649,
    maxPressureBar: 400,
    type: "Alloy Steel 9Cr-2W",
    notes: "Advanced high temperature service",
    pNumber: 15,
    pGroup: 1,
    defaultGrade: "P92",
  },
  "ASTM A335": {
    minTempC: -29,
    maxTempC: 593,
    maxPressureBar: 400,
    type: "Alloy Steel Chrome-Moly",
    notes: "High temperature alloy",
    pNumber: 4,
    pGroup: 1,
  },
  "ASTM A312 TP304": {
    minTempC: -196,
    maxTempC: 816,
    maxPressureBar: 400,
    type: "Stainless Steel 18Cr-8Ni",
    notes: "General purpose austenitic",
    pNumber: 8,
    pGroup: 1,
    defaultGrade: "TP304",
  },
  "ASTM A312 TP304L": {
    minTempC: -196,
    maxTempC: 816,
    maxPressureBar: 400,
    type: "Stainless Steel 18Cr-8Ni Low C",
    notes: "Improved weldability",
    pNumber: 8,
    pGroup: 1,
    defaultGrade: "TP304L",
  },
  "ASTM A312 TP316": {
    minTempC: -196,
    maxTempC: 816,
    maxPressureBar: 400,
    type: "Stainless Steel 16Cr-12Ni-2Mo",
    notes: "Improved corrosion resistance",
    pNumber: 8,
    pGroup: 1,
    defaultGrade: "TP316",
  },
  "ASTM A312 TP316L": {
    minTempC: -196,
    maxTempC: 816,
    maxPressureBar: 400,
    type: "Stainless Steel 16Cr-12Ni-2Mo Low C",
    notes: "Improved weldability + corrosion resistance",
    pNumber: 8,
    pGroup: 1,
    defaultGrade: "TP316L",
  },
  "ASTM A312 TP321": {
    minTempC: -196,
    maxTempC: 816,
    maxPressureBar: 400,
    type: "Stainless Steel 18Cr-10Ni-Ti",
    notes: "Stabilized for high temperature",
    pNumber: 8,
    pGroup: 1,
    defaultGrade: "TP321",
  },
  "ASTM A312 TP347": {
    minTempC: -196,
    maxTempC: 816,
    maxPressureBar: 400,
    type: "Stainless Steel 18Cr-10Ni-Nb",
    notes: "Stabilized for high temperature",
    pNumber: 8,
    pGroup: 1,
    defaultGrade: "TP347",
  },
  "ASTM A312 TP309S": {
    minTempC: -196,
    maxTempC: 1038,
    maxPressureBar: 400,
    type: "Stainless Steel 23Cr-12Ni",
    notes: "High temperature oxidation resistance",
    pNumber: 8,
    pGroup: 2,
    defaultGrade: "TP309S",
  },
  "ASTM A312 TP310S": {
    minTempC: -196,
    maxTempC: 1093,
    maxPressureBar: 400,
    type: "Stainless Steel 25Cr-20Ni",
    notes: "Highest temperature austenitic",
    pNumber: 8,
    pGroup: 2,
    defaultGrade: "TP310S",
  },
  "ASTM A312": {
    minTempC: -196,
    maxTempC: 816,
    maxPressureBar: 400,
    type: "Stainless Steel",
    notes: "Austenitic stainless - wide temp range",
    pNumber: 8,
    pGroup: 1,
    defaultGrade: "TP304",
  },
  "ASTM A358": {
    minTempC: -196,
    maxTempC: 816,
    maxPressureBar: 400,
    type: "Stainless Steel Welded",
    notes: "Electric-fusion welded stainless",
    pNumber: 8,
    pGroup: 1,
  },
  AR400: {
    minTempC: -40,
    maxTempC: 200,
    maxPressureBar: 0,
    type: "Abrasion-Resistant Steel",
    notes:
      "NOT FOR PRESSURE SERVICE - Wear liner applications only. Hardness-rated steel that softens above 200°C. Requires specific engineering analysis for any pressure containment.",
    hardnessBHN: "360-440",
    isNotForPressureService: true,
  },
  AR450: {
    minTempC: -40,
    maxTempC: 200,
    maxPressureBar: 0,
    type: "Abrasion-Resistant Steel",
    notes:
      "NOT FOR PRESSURE SERVICE - Wear liner applications only. Hardness-rated steel that softens above 200°C. Requires specific engineering analysis for any pressure containment.",
    hardnessBHN: "430-480",
    isNotForPressureService: true,
  },
  AR500: {
    minTempC: -40,
    maxTempC: 200,
    maxPressureBar: 0,
    type: "Abrasion-Resistant Steel",
    notes:
      "NOT FOR PRESSURE SERVICE - Wear liner applications only. Hardness-rated steel that softens above 200°C. More brittle than AR400/AR450. Requires specific engineering analysis for any pressure containment.",
    hardnessBHN: "460-544",
    isNotForPressureService: true,
  },
  Hardox: {
    minTempC: -40,
    maxTempC: 200,
    maxPressureBar: 0,
    type: "Abrasion-Resistant Steel",
    notes:
      "NOT FOR PRESSURE SERVICE - Wear liner applications only. Hardness-rated steel that softens above 200°C.",
    isNotForPressureService: true,
  },
  "API 5L X42": {
    minTempC: -29,
    maxTempC: 400,
    maxPressureBar: 250,
    type: "Line Pipe Carbon Steel",
    notes: "Pipeline grade - 42,000 psi min yield strength",
    pNumber: 1,
    pGroup: 1,
    defaultGrade: "X42",
  },
  "API 5L X46": {
    minTempC: -29,
    maxTempC: 400,
    maxPressureBar: 250,
    type: "Line Pipe Carbon Steel",
    notes: "Pipeline grade - 46,000 psi min yield strength",
    pNumber: 1,
    pGroup: 1,
    defaultGrade: "X46",
  },
  "API 5L X56": {
    minTempC: -29,
    maxTempC: 400,
    maxPressureBar: 250,
    type: "Line Pipe Carbon Steel",
    notes: "Pipeline grade - 56,000 psi min yield strength",
    pNumber: 1,
    pGroup: 2,
    defaultGrade: "X56",
  },
  "API 5L X65": {
    minTempC: -29,
    maxTempC: 400,
    maxPressureBar: 250,
    type: "Line Pipe Carbon Steel",
    notes: "High strength pipeline - 65,000 psi min yield strength",
    pNumber: 1,
    pGroup: 2,
    defaultGrade: "X65",
  },
  "API 5L X70": {
    minTempC: -29,
    maxTempC: 400,
    maxPressureBar: 250,
    type: "Line Pipe Carbon Steel",
    notes: "High strength pipeline - 70,000 psi min yield strength",
    pNumber: 1,
    pGroup: 2,
    defaultGrade: "X70",
  },
  "API 5L X80": {
    minTempC: -29,
    maxTempC: 400,
    maxPressureBar: 250,
    type: "Line Pipe Carbon Steel",
    notes: "Ultra-high strength pipeline - 80,000 psi min yield strength",
    pNumber: 1,
    pGroup: 3,
    defaultGrade: "X80",
  },
  "API 5L Gr. A": {
    minTempC: -29,
    maxTempC: 400,
    maxPressureBar: 250,
    type: "Line Pipe Carbon Steel",
    notes: "Pipeline grade - lower strength, good weldability",
    pNumber: 1,
    pGroup: 1,
    defaultGrade: "A",
  },
  "API 5L X90": {
    minTempC: -29,
    maxTempC: 400,
    maxPressureBar: 250,
    type: "Line Pipe Carbon Steel",
    notes:
      "Ultra-high strength pipeline - 90,000 psi min yield strength. Requires special welding procedures.",
    pNumber: 1,
    pGroup: 3,
    defaultGrade: "X90",
  },
  "API 5L X100": {
    minTempC: -29,
    maxTempC: 400,
    maxPressureBar: 250,
    type: "Line Pipe Carbon Steel",
    notes:
      "Ultra-high strength pipeline - 100,000 psi min yield strength. Requires special welding procedures and preheat.",
    pNumber: 1,
    pGroup: 3,
    defaultGrade: "X100",
  },
  "ASTM A333 Gr. 1": {
    minTempC: -45,
    maxTempC: 400,
    maxPressureBar: 250,
    type: "Low-Temp Carbon Steel",
    notes: "Killed carbon steel for temperatures down to -45°C",
    pNumber: 1,
    pGroup: 1,
    defaultGrade: "1",
  },
  "ASTM A333 Gr. 4": {
    minTempC: -100,
    maxTempC: 400,
    maxPressureBar: 250,
    type: "Low-Temp 0.75Ni Steel",
    notes: "0.75% Nickel alloy for temperatures down to -100°C",
    pNumber: 9,
    pGroup: 1,
    defaultGrade: "4",
  },
  "ASTM A333 Gr. 7": {
    minTempC: -100,
    maxTempC: 400,
    maxPressureBar: 250,
    type: "Low-Temp 2.5Ni Steel",
    notes: "2.5% Nickel alloy for temperatures down to -100°C",
    pNumber: 9,
    pGroup: 1,
    defaultGrade: "7",
  },
  "ASTM A790 S31803": {
    minTempC: -50,
    maxTempC: 315,
    maxPressureBar: 400,
    type: "Duplex Stainless Steel",
    notes:
      "Duplex 2205 (UNS S31803) - 22Cr-5Ni-3Mo. Excellent chloride stress corrosion resistance. Max temp limited by sigma phase formation.",
    pNumber: 10,
    pGroup: 1,
    defaultGrade: "S31803",
  },
  "ASTM A790 S32205": {
    minTempC: -50,
    maxTempC: 315,
    maxPressureBar: 400,
    type: "Duplex Stainless Steel",
    notes:
      "Duplex 2205 (UNS S32205) - 22Cr-5Ni-3Mo. Improved version of S31803 with tighter composition. Max temp limited by sigma phase formation.",
    pNumber: 10,
    pGroup: 1,
    defaultGrade: "S32205",
  },
  "ASTM A790 S32750": {
    minTempC: -50,
    maxTempC: 315,
    maxPressureBar: 400,
    type: "Super Duplex Stainless Steel",
    notes:
      "Super Duplex 2507 (25Cr-7Ni-4Mo). Higher strength and corrosion resistance than standard duplex. Max temp 315°C due to sigma phase.",
    pNumber: 10,
    pGroup: 1,
    defaultGrade: "S32750",
  },
  "ASTM A790": {
    minTempC: -50,
    maxTempC: 315,
    maxPressureBar: 400,
    type: "Duplex Stainless Steel",
    notes:
      "Duplex stainless steel pipe. Superior corrosion resistance and strength vs austenitic. Max temp 315°C due to sigma phase.",
    pNumber: 10,
    pGroup: 1,
    defaultGrade: "S32205",
  },
  "ASTM A358 TP304": {
    minTempC: -196,
    maxTempC: 816,
    maxPressureBar: 400,
    type: "Stainless Steel Welded 18Cr-8Ni",
    notes: "Electric-fusion welded 304 stainless steel pipe",
    pNumber: 8,
    pGroup: 1,
    defaultGrade: "TP304",
  },
  "ASTM A358 TP304L": {
    minTempC: -196,
    maxTempC: 816,
    maxPressureBar: 400,
    type: "Stainless Steel Welded 18Cr-8Ni Low C",
    notes: "Electric-fusion welded 304L stainless steel pipe - improved weldability",
    pNumber: 8,
    pGroup: 1,
    defaultGrade: "TP304L",
  },
  "ASTM A358 TP316": {
    minTempC: -196,
    maxTempC: 816,
    maxPressureBar: 400,
    type: "Stainless Steel Welded 16Cr-12Ni-2Mo",
    notes: "Electric-fusion welded 316 stainless steel pipe - improved corrosion resistance",
    pNumber: 8,
    pGroup: 1,
    defaultGrade: "TP316",
  },
  "ASTM A358 TP316L": {
    minTempC: -196,
    maxTempC: 816,
    maxPressureBar: 400,
    type: "Stainless Steel Welded 16Cr-12Ni-2Mo Low C",
    notes:
      "Electric-fusion welded 316L stainless steel pipe - improved weldability + corrosion resistance",
    pNumber: 8,
    pGroup: 1,
    defaultGrade: "TP316L",
  },
  "EN 10216-1": {
    minTempC: -20,
    maxTempC: 300,
    maxPressureBar: 250,
    type: "European Seamless Steel",
    notes: "EN seamless non-alloy steel for pressure purposes at room temperature",
    pNumber: 1,
    pGroup: 1,
  },
  "EN 10216-2": {
    minTempC: -20,
    maxTempC: 550,
    maxPressureBar: 250,
    type: "European Seamless Alloy Steel",
    notes: "EN seamless non-alloy and alloy steel for elevated temperature",
    pNumber: 1,
    pGroup: 1,
  },
  "EN 10216": {
    minTempC: -20,
    maxTempC: 450,
    maxPressureBar: 250,
    type: "European Seamless Steel",
    notes: "EN seamless steel tubes for pressure purposes",
    pNumber: 1,
    pGroup: 1,
  },
  "EN 10217-1": {
    minTempC: -20,
    maxTempC: 300,
    maxPressureBar: 200,
    type: "European Welded Steel",
    notes: "EN welded non-alloy steel for pressure purposes at room temperature",
    pNumber: 1,
    pGroup: 1,
  },
  "EN 10217-2": {
    minTempC: -20,
    maxTempC: 550,
    maxPressureBar: 200,
    type: "European Welded Alloy Steel",
    notes: "EN welded non-alloy and alloy steel for elevated temperature",
    pNumber: 1,
    pGroup: 1,
  },
  "EN 10217": {
    minTempC: -20,
    maxTempC: 400,
    maxPressureBar: 200,
    type: "European Welded Steel",
    notes: "EN welded steel tubes for pressure purposes",
    pNumber: 1,
    pGroup: 1,
  },
  "EN 10255 Medium": {
    minTempC: -20,
    maxTempC: 300,
    maxPressureBar: 25,
    type: "European ERW Medium",
    notes: "EN non-alloy steel tubes suitable for welding. Medium grade.",
    pNumber: 1,
    pGroup: 1,
  },
  "EN 10255 Heavy": {
    minTempC: -20,
    maxTempC: 300,
    maxPressureBar: 40,
    type: "European ERW Heavy",
    notes: "EN non-alloy steel tubes suitable for welding. Heavy grade.",
    pNumber: 1,
    pGroup: 1,
  },
  "EN 10255": {
    minTempC: -20,
    maxTempC: 300,
    maxPressureBar: 25,
    type: "European ERW Steel",
    notes: "EN non-alloy steel tubes suitable for welding - similar to SABS 62",
    pNumber: 1,
    pGroup: 1,
  },
  "Incoloy 800": {
    minTempC: -196,
    maxTempC: 816,
    maxPressureBar: 400,
    type: "Nickel-Iron-Chromium Alloy",
    notes:
      "High-temperature alloy (32Ni-21Cr-46Fe). Excellent oxidation and carburization resistance. Use for furnace parts, petrochemical equipment.",
    pNumber: 45,
    pGroup: 1,
  },
  "Incoloy 800H": {
    minTempC: -196,
    maxTempC: 900,
    maxPressureBar: 400,
    type: "Nickel-Iron-Chromium Alloy",
    notes:
      "Solution-annealed variant with controlled carbon (0.06-0.10%) for improved high-temp creep and rupture properties. Max temp 900°C for long-term service.",
    pNumber: 45,
    pGroup: 1,
  },
  "Incoloy 800HT": {
    minTempC: -196,
    maxTempC: 900,
    maxPressureBar: 400,
    type: "Nickel-Iron-Chromium Alloy",
    notes:
      "High-temp variant with Al+Ti for improved creep strength. Max temp 900°C for long-term service.",
    pNumber: 45,
    pGroup: 1,
  },
  Incoloy: {
    minTempC: -196,
    maxTempC: 816,
    maxPressureBar: 400,
    type: "Nickel-Iron-Chromium Alloy",
    notes:
      "High-temperature nickel-iron-chromium alloy. Specify grade (800, 800H, 800HT) for best results.",
    pNumber: 45,
    pGroup: 1,
  },
  "Titanium Gr. 2": {
    minTempC: -59,
    maxTempC: 316,
    maxPressureBar: 400,
    type: "Commercially Pure Titanium",
    notes:
      "Unalloyed titanium with excellent corrosion resistance. Use for seawater, chloride environments. Max temp 316°C.",
    pNumber: 51,
    pGroup: 1,
  },
  "Titanium Gr. 5": {
    minTempC: -59,
    maxTempC: 316,
    maxPressureBar: 400,
    type: "Titanium Alloy Ti-6Al-4V",
    notes:
      "High-strength titanium alloy (6% Al, 4% V). Use for high-stress, corrosion-resistant applications. Max temp 316°C.",
    pNumber: 52,
    pGroup: 1,
  },
  "Titanium Gr. 7": {
    minTempC: -59,
    maxTempC: 316,
    maxPressureBar: 400,
    type: "Titanium with Palladium",
    notes: "Ti with 0.15% Pd for enhanced corrosion resistance in reducing acids. Max temp 316°C.",
    pNumber: 52,
    pGroup: 1,
  },
  Titanium: {
    minTempC: -59,
    maxTempC: 316,
    maxPressureBar: 400,
    type: "Titanium",
    notes:
      "Titanium pipe/tube. Specify grade (Gr. 2, Gr. 5, Gr. 7) for specific applications. Excellent corrosion resistance.",
    pNumber: 51,
    pGroup: 1,
  },
  "Inconel 625": {
    minTempC: -196,
    maxTempC: 982,
    maxPressureBar: 400,
    type: "Nickel-Chromium-Molybdenum Alloy",
    notes:
      "High-strength nickel superalloy (58Ni-22Cr-9Mo). Excellent fatigue and corrosion resistance. Use for severe environments.",
    pNumber: 43,
    pGroup: 1,
  },
  "Inconel 600": {
    minTempC: -196,
    maxTempC: 871,
    maxPressureBar: 400,
    type: "Nickel-Chromium Alloy",
    notes:
      "Nickel-chromium alloy (72Ni-15Cr). Good oxidation resistance at high temperatures. Use for furnaces, heat treatment equipment.",
    pNumber: 43,
    pGroup: 1,
  },
  Inconel: {
    minTempC: -196,
    maxTempC: 871,
    maxPressureBar: 400,
    type: "Nickel Superalloy",
    notes: "Nickel-chromium superalloy. Specify grade (600, 625, etc.) for specific applications.",
    pNumber: 43,
    pGroup: 1,
  },
  "Hastelloy C-276": {
    minTempC: -196,
    maxTempC: 677,
    maxPressureBar: 400,
    type: "Nickel-Molybdenum-Chromium Alloy",
    notes:
      "Corrosion-resistant superalloy (57Ni-16Mo-16Cr). Excellent in reducing and oxidizing environments. Use for chemical processing.",
    pNumber: 44,
    pGroup: 1,
  },
  Hastelloy: {
    minTempC: -196,
    maxTempC: 677,
    maxPressureBar: 400,
    type: "Nickel Superalloy",
    notes:
      "Corrosion-resistant nickel superalloy. Specify grade (C-276, C-22, etc.) for specific applications.",
    pNumber: 44,
    pGroup: 1,
  },
  Monel: {
    minTempC: -196,
    maxTempC: 538,
    maxPressureBar: 400,
    type: "Nickel-Copper Alloy",
    notes:
      "Monel 400 (67Ni-30Cu). Excellent resistance to seawater and hydrofluoric acid. Max temp 538°C.",
    pNumber: 42,
    pGroup: 1,
  },
  "Monel 400": {
    minTempC: -196,
    maxTempC: 538,
    maxPressureBar: 400,
    type: "Nickel-Copper Alloy",
    notes:
      "67Ni-30Cu alloy. Excellent resistance to seawater, hydrofluoric acid, and alkaline solutions. Max temp 538°C.",
    pNumber: 42,
    pGroup: 1,
  },
};

export const materialLimits = (steelSpecName: string): MaterialLimits | null => {
  if (!steelSpecName) return null;
  for (const [pattern, limits] of Object.entries(MATERIAL_LIMITS)) {
    if (steelSpecName.includes(pattern)) {
      return limits;
    }
  }
  return null;
};

export interface MaterialSuitabilityResult {
  isSuitable: boolean;
  warnings: string[];
  recommendation?: string;
  limits?: MaterialLimits;
}

export const checkMaterialSuitability = (
  steelSpecName: string,
  temperatureC: number | undefined,
  pressureBar: number | undefined,
): MaterialSuitabilityResult => {
  const limits = materialLimits(steelSpecName);
  const warnings: string[] = [];

  if (!limits) {
    return { isSuitable: true, warnings: [], limits: undefined };
  }

  let isSuitable = true;

  if (limits.isNotForPressureService) {
    warnings.push(
      `WARNING: ${steelSpecName} is NOT rated for pressure service. This material is designed for wear/abrasion resistance only and requires specific engineering analysis for any pressure containment applications.`,
    );
    if (pressureBar !== undefined && pressureBar > 0) {
      isSuitable = false;
      warnings.push(
        `${steelSpecName} cannot be used for pressure applications (${pressureBar} bar specified). Use carbon steel or alloy steel for pressure service.`,
      );
    }
  }

  if (temperatureC !== undefined) {
    if (temperatureC < limits.minTempC) {
      isSuitable = false;
      warnings.push(
        `Temperature ${temperatureC}°C is below minimum ${limits.minTempC}°C for ${steelSpecName}`,
      );
    }
    if (temperatureC > limits.maxTempC) {
      isSuitable = false;
      warnings.push(
        `Temperature ${temperatureC}°C exceeds maximum ${limits.maxTempC}°C for ${steelSpecName}`,
      );
      if (limits.isNotForPressureService) {
        warnings.push(
          `${steelSpecName} will soften and lose hardness above ${limits.maxTempC}°C due to tempering effects.`,
        );
      }
    }
  }

  if (
    !limits.isNotForPressureService &&
    pressureBar !== undefined &&
    pressureBar > limits.maxPressureBar
  ) {
    warnings.push(
      `Pressure ${pressureBar} bar may require special consideration for ${steelSpecName} (typical max: ${limits.maxPressureBar} bar)`,
    );
  }

  let recommendation: string | undefined;
  if (!isSuitable) {
    if (limits.isNotForPressureService && pressureBar !== undefined && pressureBar > 0) {
      recommendation =
        "For pressure service, use ASTM A106 Grade B (carbon steel), ASTM A335 P11/P22 (alloy steel), or ASTM A312 TP304/TP316 (stainless steel)";
    } else if (temperatureC !== undefined && temperatureC > 400) {
      recommendation =
        "Consider ASTM A106 Grade B (up to 427°C), ASTM A335 P11/P22 (up to 593°C), or ASTM A312 stainless (up to 816°C)";
    } else if (temperatureC !== undefined && temperatureC < -29) {
      recommendation =
        "Consider ASTM A333 Grade 6 (down to -100°C) or ASTM A312 stainless (down to -196°C)";
    }
  }

  return { isSuitable, warnings, recommendation, limits };
};

export const suitableMaterials = (
  temperatureC: number | undefined,
  pressureBar: number | undefined,
): string[] => {
  const suitable: string[] = [];

  for (const [pattern, limits] of Object.entries(MATERIAL_LIMITS)) {
    let isOk = true;

    if (limits.isNotForPressureService && pressureBar !== undefined && pressureBar > 0) {
      isOk = false;
    }

    if (temperatureC !== undefined) {
      if (temperatureC < limits.minTempC || temperatureC > limits.maxTempC) {
        isOk = false;
      }
    }

    if (
      !limits.isNotForPressureService &&
      pressureBar !== undefined &&
      pressureBar > limits.maxPressureBar
    ) {
      isOk = false;
    }

    if (isOk) {
      suitable.push(pattern);
    }
  }

  return suitable;
};

export const isWearResistantSteel = (steelSpecName: string): boolean => {
  const limits = materialLimits(steelSpecName);
  return limits?.isNotForPressureService === true;
};
