// Pump Selection Guide
// Helps users select appropriate pump types based on application requirements

export interface ApplicationProfile {
  value: string;
  label: string;
  description: string;
  characteristics: {
    flowRange: { min: number; max: number; unit: string };
    headRange: { min: number; max: number; unit: string };
    viscosityRange?: { min: number; max: number; unit: string };
    temperatureRange?: { min: number; max: number; unit: string };
    solidsContent?: { max: number; unit: string };
    particleSize?: { max: number; unit: string };
  };
  recommendedPumpTypes: string[];
  considerations: string[];
}

export interface PumpTypeProfile {
  value: string;
  label: string;
  category: "centrifugal" | "positive_displacement" | "special";
  description: string;
  advantages: string[];
  limitations: string[];
  typicalApplications: string[];
  operatingRange: {
    flowM3h: { min: number; max: number };
    headM: { min: number; max: number };
    viscosityCp: { min: number; max: number };
    temperatureC: { min: number; max: number };
    pressureBar: { min: number; max: number };
  };
  efficiencyRange: { min: number; max: number };
  maintenanceLevel: "low" | "medium" | "high";
  capitalCost: "low" | "medium" | "high";
  operatingCost: "low" | "medium" | "high";
}

export const APPLICATION_PROFILES: ApplicationProfile[] = [
  {
    value: "water_supply",
    label: "Water Supply & Distribution",
    description: "Municipal water supply, building services, irrigation",
    characteristics: {
      flowRange: { min: 1, max: 10000, unit: "m³/h" },
      headRange: { min: 10, max: 200, unit: "m" },
      temperatureRange: { min: 5, max: 40, unit: "°C" },
    },
    recommendedPumpTypes: ["end_suction", "split_case", "vertical_turbine", "submersible"],
    considerations: [
      "Energy efficiency critical for continuous operation",
      "Reliability and low maintenance important",
      "Consider variable speed drives for varying demand",
      "Material compatibility with potable water standards",
    ],
  },
  {
    value: "wastewater",
    label: "Wastewater & Sewage",
    description: "Sewage pumping, effluent transfer, sludge handling",
    characteristics: {
      flowRange: { min: 5, max: 5000, unit: "m³/h" },
      headRange: { min: 5, max: 50, unit: "m" },
      solidsContent: { max: 15, unit: "%" },
      particleSize: { max: 100, unit: "mm" },
    },
    recommendedPumpTypes: ["submersible_sewage", "dry_pit_sewage", "progressive_cavity", "chopper"],
    considerations: [
      "Solids handling capability essential",
      "Non-clog impeller design required",
      "Corrosion resistant materials",
      "Easy access for maintenance and cleaning",
    ],
  },
  {
    value: "process_water",
    label: "Industrial Process Water",
    description: "Cooling water, boiler feed, process supply",
    characteristics: {
      flowRange: { min: 1, max: 2000, unit: "m³/h" },
      headRange: { min: 20, max: 500, unit: "m" },
      temperatureRange: { min: 10, max: 180, unit: "°C" },
    },
    recommendedPumpTypes: ["end_suction", "multistage", "vertical_inline", "regenerative_turbine"],
    considerations: [
      "High pressure capability for boiler feed",
      "Temperature rating for hot water applications",
      "Seal selection for temperature and pressure",
      "API 610 compliance for critical services",
    ],
  },
  {
    value: "chemical_transfer",
    label: "Chemical Transfer",
    description: "Acids, alkalis, solvents, corrosive fluids",
    characteristics: {
      flowRange: { min: 0.1, max: 500, unit: "m³/h" },
      headRange: { min: 5, max: 150, unit: "m" },
      temperatureRange: { min: -40, max: 200, unit: "°C" },
    },
    recommendedPumpTypes: [
      "mag_drive",
      "lined_centrifugal",
      "diaphragm",
      "peristaltic",
      "air_operated_double_diaphragm",
    ],
    considerations: [
      "Material compatibility with fluid is critical",
      "Sealless designs preferred for hazardous fluids",
      "Secondary containment requirements",
      "Accurate flow control for dosing applications",
    ],
  },
  {
    value: "oil_gas",
    label: "Oil & Gas",
    description: "Crude oil, refined products, gas processing",
    characteristics: {
      flowRange: { min: 10, max: 5000, unit: "m³/h" },
      headRange: { min: 50, max: 2000, unit: "m" },
      viscosityRange: { min: 1, max: 500, unit: "cP" },
      temperatureRange: { min: -50, max: 400, unit: "°C" },
    },
    recommendedPumpTypes: ["api_610_oh", "api_610_bb", "api_610_vs", "multistage_bb", "screw"],
    considerations: [
      "API 610 compliance mandatory",
      "Explosion-proof motors required",
      "High pressure and temperature ratings",
      "Mechanical seal to API 682",
      "Fire-safe design considerations",
    ],
  },
  {
    value: "mining_slurry",
    label: "Mining & Slurry",
    description: "Mineral slurries, tailings, mill discharge",
    characteristics: {
      flowRange: { min: 50, max: 20000, unit: "m³/h" },
      headRange: { min: 10, max: 100, unit: "m" },
      solidsContent: { max: 70, unit: "%" },
      particleSize: { max: 150, unit: "mm" },
    },
    recommendedPumpTypes: ["slurry_horizontal", "slurry_vertical", "froth", "gravel"],
    considerations: [
      "Abrasion resistant materials essential (Ni-Hard, high chrome, rubber)",
      "Wear parts availability and lead times",
      "Oversized shaft and bearings for slurry service",
      "Consider specific gravity of slurry",
      "NPSH considerations for froth handling",
    ],
  },
  {
    value: "food_beverage",
    label: "Food & Beverage",
    description: "Dairy, beverages, food processing",
    characteristics: {
      flowRange: { min: 0.5, max: 500, unit: "m³/h" },
      headRange: { min: 5, max: 100, unit: "m" },
      viscosityRange: { min: 1, max: 100000, unit: "cP" },
      temperatureRange: { min: -10, max: 150, unit: "°C" },
    },
    recommendedPumpTypes: [
      "sanitary_centrifugal",
      "lobe",
      "progressive_cavity",
      "peristaltic",
      "sine",
    ],
    considerations: [
      "3A or EHEDG certification required",
      "CIP/SIP capability essential",
      "Gentle handling for shear-sensitive products",
      "Stainless steel 316L construction",
      "Polished internal surfaces (Ra < 0.8 μm)",
    ],
  },
  {
    value: "pharmaceutical",
    label: "Pharmaceutical & Biotech",
    description: "API transfer, buffer preparation, chromatography",
    characteristics: {
      flowRange: { min: 0.01, max: 100, unit: "m³/h" },
      headRange: { min: 5, max: 50, unit: "m" },
      temperatureRange: { min: 5, max: 80, unit: "°C" },
    },
    recommendedPumpTypes: ["sanitary_centrifugal", "peristaltic", "diaphragm", "lobe"],
    considerations: [
      "FDA 21 CFR compliance",
      "Full traceability and documentation",
      "Validation support (IQ/OQ/PQ)",
      "Single-use/disposable options",
      "Cleanroom compatible materials",
    ],
  },
  {
    value: "hvac",
    label: "HVAC & Building Services",
    description: "Chilled water, hot water, condenser water",
    characteristics: {
      flowRange: { min: 1, max: 1000, unit: "m³/h" },
      headRange: { min: 10, max: 60, unit: "m" },
      temperatureRange: { min: 5, max: 90, unit: "°C" },
    },
    recommendedPumpTypes: ["end_suction", "vertical_inline", "split_case", "circulator"],
    considerations: [
      "Energy efficiency (IE3/IE4 motors)",
      "Low noise operation",
      "Variable speed capability",
      "Compact footprint for plant rooms",
      "Easy maintenance access",
    ],
  },
  {
    value: "fire_protection",
    label: "Fire Protection",
    description: "Fire pumps, jockey pumps, foam systems",
    characteristics: {
      flowRange: { min: 10, max: 2000, unit: "m³/h" },
      headRange: { min: 40, max: 200, unit: "m" },
    },
    recommendedPumpTypes: ["split_case_fire", "end_suction_fire", "vertical_turbine_fire"],
    considerations: [
      "NFPA 20 / EN 12845 compliance",
      "UL/FM listed components",
      "Diesel and electric driver options",
      "Automatic start on pressure drop",
      "Weekly test run capability",
    ],
  },
  {
    value: "dewatering",
    label: "Dewatering & Drainage",
    description: "Construction dewatering, flood control, drainage",
    characteristics: {
      flowRange: { min: 5, max: 5000, unit: "m³/h" },
      headRange: { min: 5, max: 100, unit: "m" },
      solidsContent: { max: 10, unit: "%" },
    },
    recommendedPumpTypes: ["submersible_dewatering", "self_priming", "wellpoint", "trash"],
    considerations: [
      "Portable and robust construction",
      "Solids handling for sandy/silty water",
      "Self-priming capability useful",
      "Diesel drive for remote locations",
      "Automatic level control",
    ],
  },
  {
    value: "high_viscosity",
    label: "High Viscosity Fluids",
    description: "Oils, polymers, adhesives, pastes",
    characteristics: {
      flowRange: { min: 0.1, max: 200, unit: "m³/h" },
      headRange: { min: 5, max: 50, unit: "m" },
      viscosityRange: { min: 1000, max: 1000000, unit: "cP" },
    },
    recommendedPumpTypes: ["progressive_cavity", "gear", "lobe", "piston", "screw"],
    considerations: [
      "Positive displacement essential above 500 cP",
      "Heating jacket may be required",
      "Gear pump for moderate viscosity",
      "Progressive cavity for very high viscosity",
      "Speed reduction for viscous fluids",
    ],
  },
  {
    value: "metering_dosing",
    label: "Metering & Dosing",
    description: "Chemical dosing, additive injection, precise flow control",
    characteristics: {
      flowRange: { min: 0.001, max: 50, unit: "m³/h" },
      headRange: { min: 1, max: 100, unit: "m" },
    },
    recommendedPumpTypes: ["diaphragm_metering", "peristaltic", "piston_metering", "gear_metering"],
    considerations: [
      "Accuracy and repeatability critical (±1%)",
      "Turndown ratio requirements",
      "Pulsation dampening may be needed",
      "Chemical compatibility",
      "Remote control and monitoring",
    ],
  },
];

export const PUMP_TYPE_PROFILES: PumpTypeProfile[] = [
  {
    value: "end_suction",
    label: "End Suction Centrifugal",
    category: "centrifugal",
    description: "Single stage, close-coupled or frame-mounted, horizontal shaft",
    advantages: [
      "Simple construction",
      "Low capital cost",
      "Easy maintenance",
      "Wide range of materials",
      "Compact footprint",
    ],
    limitations: [
      "Limited to moderate pressures",
      "NPSH requirements",
      "Not suitable for high viscosity",
      "Efficiency drops at low flows",
    ],
    typicalApplications: ["Water supply", "HVAC", "General industrial", "Irrigation"],
    operatingRange: {
      flowM3h: { min: 1, max: 1000 },
      headM: { min: 5, max: 150 },
      viscosityCp: { min: 0.3, max: 100 },
      temperatureC: { min: -30, max: 180 },
      pressureBar: { min: 0, max: 25 },
    },
    efficiencyRange: { min: 50, max: 85 },
    maintenanceLevel: "low",
    capitalCost: "low",
    operatingCost: "low",
  },
  {
    value: "split_case",
    label: "Horizontal Split Case",
    category: "centrifugal",
    description: "Double suction impeller, axially split casing",
    advantages: [
      "High efficiency",
      "Balanced axial thrust",
      "High flow capacity",
      "Long bearing life",
      "Easy maintenance (no pipe removal)",
    ],
    limitations: ["Higher capital cost", "Larger footprint", "Requires proper foundation"],
    typicalApplications: ["Municipal water", "Fire protection", "Cooling water", "Large HVAC"],
    operatingRange: {
      flowM3h: { min: 100, max: 20000 },
      headM: { min: 15, max: 200 },
      viscosityCp: { min: 0.3, max: 50 },
      temperatureC: { min: -20, max: 150 },
      pressureBar: { min: 0, max: 25 },
    },
    efficiencyRange: { min: 75, max: 90 },
    maintenanceLevel: "low",
    capitalCost: "medium",
    operatingCost: "low",
  },
  {
    value: "multistage",
    label: "Multistage Centrifugal",
    category: "centrifugal",
    description: "Multiple impellers in series for high head",
    advantages: [
      "High pressure capability",
      "Smooth, continuous flow",
      "Good efficiency at design point",
      "Compact for high pressure",
    ],
    limitations: [
      "Complex construction",
      "Higher maintenance cost",
      "Sensitive to off-design operation",
      "NPSH critical",
    ],
    typicalApplications: ["Boiler feed", "RO feed", "High-rise buildings", "Pipeline boosting"],
    operatingRange: {
      flowM3h: { min: 1, max: 500 },
      headM: { min: 50, max: 2000 },
      viscosityCp: { min: 0.3, max: 50 },
      temperatureC: { min: -30, max: 200 },
      pressureBar: { min: 0, max: 100 },
    },
    efficiencyRange: { min: 60, max: 85 },
    maintenanceLevel: "medium",
    capitalCost: "high",
    operatingCost: "medium",
  },
  {
    value: "vertical_turbine",
    label: "Vertical Turbine",
    category: "centrifugal",
    description: "Multi-stage, wet pit or can-type installation",
    advantages: [
      "Self-priming (submerged)",
      "High lift capability",
      "Small footprint",
      "Handles varying water levels",
    ],
    limitations: [
      "Shaft alignment critical",
      "Long shaft assemblies",
      "Difficult bearing access",
      "Higher maintenance cost",
    ],
    typicalApplications: ["Deep wells", "Cooling towers", "River intake", "Fire pumps"],
    operatingRange: {
      flowM3h: { min: 50, max: 10000 },
      headM: { min: 20, max: 500 },
      viscosityCp: { min: 0.3, max: 20 },
      temperatureC: { min: 0, max: 90 },
      pressureBar: { min: 0, max: 50 },
    },
    efficiencyRange: { min: 70, max: 88 },
    maintenanceLevel: "high",
    capitalCost: "high",
    operatingCost: "medium",
  },
  {
    value: "submersible",
    label: "Submersible",
    category: "centrifugal",
    description: "Motor and pump submerged, close-coupled",
    advantages: [
      "Self-priming",
      "No shaft alignment issues",
      "Quiet operation",
      "Flood proof",
      "Small above-ground footprint",
    ],
    limitations: [
      "Motor cooling by pumped fluid",
      "Retrieval needed for maintenance",
      "Cable entry sealing critical",
      "Limited motor cooling at low flows",
    ],
    typicalApplications: ["Boreholes", "Sewage", "Dewatering", "Drainage"],
    operatingRange: {
      flowM3h: { min: 1, max: 5000 },
      headM: { min: 5, max: 400 },
      viscosityCp: { min: 0.3, max: 50 },
      temperatureC: { min: 0, max: 60 },
      pressureBar: { min: 0, max: 40 },
    },
    efficiencyRange: { min: 55, max: 85 },
    maintenanceLevel: "medium",
    capitalCost: "medium",
    operatingCost: "medium",
  },
  {
    value: "slurry",
    label: "Slurry Pump",
    category: "centrifugal",
    description: "Heavy-duty design for abrasive slurries",
    advantages: [
      "Handles high solids concentrations",
      "Abrasion resistant",
      "Robust construction",
      "Large passages",
    ],
    limitations: [
      "Lower efficiency",
      "High wear part consumption",
      "Frequent maintenance",
      "High operating cost",
    ],
    typicalApplications: ["Mining", "Dredging", "Tailings", "Mineral processing"],
    operatingRange: {
      flowM3h: { min: 10, max: 20000 },
      headM: { min: 10, max: 100 },
      viscosityCp: { min: 1, max: 2000 },
      temperatureC: { min: 0, max: 80 },
      pressureBar: { min: 0, max: 20 },
    },
    efficiencyRange: { min: 40, max: 75 },
    maintenanceLevel: "high",
    capitalCost: "high",
    operatingCost: "high",
  },
  {
    value: "progressive_cavity",
    label: "Progressive Cavity",
    category: "positive_displacement",
    description: "Helical rotor in elastomer stator",
    advantages: [
      "Handles high viscosity",
      "Gentle pumping action",
      "Self-priming",
      "Handles solids and fibres",
      "Smooth, non-pulsating flow",
    ],
    limitations: [
      "Stator wear",
      "Temperature limited by elastomer",
      "Cannot run dry",
      "Lower pressure per stage",
    ],
    typicalApplications: ["Sludge", "Wastewater", "Food", "Chemicals", "Oil & gas"],
    operatingRange: {
      flowM3h: { min: 0.1, max: 500 },
      headM: { min: 5, max: 200 },
      viscosityCp: { min: 1, max: 1000000 },
      temperatureC: { min: -20, max: 150 },
      pressureBar: { min: 0, max: 48 },
    },
    efficiencyRange: { min: 50, max: 80 },
    maintenanceLevel: "medium",
    capitalCost: "medium",
    operatingCost: "medium",
  },
  {
    value: "gear",
    label: "Gear Pump",
    category: "positive_displacement",
    description: "External or internal gear design",
    advantages: [
      "Excellent for viscous fluids",
      "Self-priming",
      "Compact",
      "Bi-directional",
      "Precise flow control",
    ],
    limitations: [
      "Cannot handle solids",
      "Noisy at high speeds",
      "Wear with low-lubricity fluids",
      "Pulsating flow",
    ],
    typicalApplications: ["Oils", "Polymers", "Fuel transfer", "Lubrication"],
    operatingRange: {
      flowM3h: { min: 0.01, max: 500 },
      headM: { min: 10, max: 200 },
      viscosityCp: { min: 1, max: 500000 },
      temperatureC: { min: -40, max: 300 },
      pressureBar: { min: 0, max: 200 },
    },
    efficiencyRange: { min: 70, max: 90 },
    maintenanceLevel: "low",
    capitalCost: "medium",
    operatingCost: "low",
  },
  {
    value: "diaphragm",
    label: "Diaphragm Pump",
    category: "positive_displacement",
    description: "Reciprocating diaphragm, air or mechanically operated",
    advantages: [
      "Sealless - no leakage",
      "Self-priming",
      "Can run dry",
      "Handles solids and slurries",
      "Intrinsically safe",
    ],
    limitations: ["Pulsating flow", "Diaphragm life", "Limited pressure", "Air consumption (AODD)"],
    typicalApplications: ["Chemicals", "Mining", "Paint", "Food", "Wastewater"],
    operatingRange: {
      flowM3h: { min: 0.01, max: 100 },
      headM: { min: 5, max: 80 },
      viscosityCp: { min: 0.3, max: 50000 },
      temperatureC: { min: -40, max: 180 },
      pressureBar: { min: 0, max: 10 },
    },
    efficiencyRange: { min: 30, max: 70 },
    maintenanceLevel: "medium",
    capitalCost: "medium",
    operatingCost: "medium",
  },
  {
    value: "peristaltic",
    label: "Peristaltic (Hose) Pump",
    category: "positive_displacement",
    description: "Rotating shoes compress flexible hose/tube",
    advantages: [
      "Sealless design",
      "Gentle pumping",
      "Can run dry",
      "Easy tube replacement",
      "No valves to clog",
    ],
    limitations: ["Tube/hose wear", "Pulsating flow", "Limited pressure", "Limited flow rate"],
    typicalApplications: ["Metering", "Laboratory", "Pharmaceutical", "Food", "Abrasive slurries"],
    operatingRange: {
      flowM3h: { min: 0.001, max: 100 },
      headM: { min: 5, max: 150 },
      viscosityCp: { min: 0.3, max: 100000 },
      temperatureC: { min: -20, max: 120 },
      pressureBar: { min: 0, max: 16 },
    },
    efficiencyRange: { min: 50, max: 80 },
    maintenanceLevel: "medium",
    capitalCost: "medium",
    operatingCost: "medium",
  },
  {
    value: "lobe",
    label: "Rotary Lobe Pump",
    category: "positive_displacement",
    description: "Counter-rotating lobes with timing gears",
    advantages: [
      "Gentle product handling",
      "Good for shear-sensitive fluids",
      "CIP/SIP capable",
      "Bi-directional",
      "Self-priming",
    ],
    limitations: [
      "Cannot handle solids",
      "Timing gear maintenance",
      "Limited dry-running",
      "Pulsating flow",
    ],
    typicalApplications: ["Food & beverage", "Pharmaceutical", "Cosmetics", "Chemicals"],
    operatingRange: {
      flowM3h: { min: 0.1, max: 500 },
      headM: { min: 5, max: 100 },
      viscosityCp: { min: 1, max: 1000000 },
      temperatureC: { min: -30, max: 200 },
      pressureBar: { min: 0, max: 20 },
    },
    efficiencyRange: { min: 60, max: 85 },
    maintenanceLevel: "medium",
    capitalCost: "high",
    operatingCost: "medium",
  },
  {
    value: "screw",
    label: "Screw Pump",
    category: "positive_displacement",
    description: "One, two, or three intermeshing screws",
    advantages: [
      "Non-pulsating flow",
      "Low noise",
      "Self-priming",
      "Handles viscous fluids well",
      "High pressure capability",
    ],
    limitations: [
      "Expensive",
      "Cannot handle solids",
      "Tight clearances sensitive to wear",
      "Temperature limitations",
    ],
    typicalApplications: ["Fuel oil", "Hydraulic systems", "Lubrication", "High pressure"],
    operatingRange: {
      flowM3h: { min: 0.1, max: 500 },
      headM: { min: 10, max: 400 },
      viscosityCp: { min: 1, max: 1000000 },
      temperatureC: { min: -40, max: 300 },
      pressureBar: { min: 0, max: 100 },
    },
    efficiencyRange: { min: 70, max: 90 },
    maintenanceLevel: "low",
    capitalCost: "high",
    operatingCost: "low",
  },
];

export interface SelectionCriteria {
  application?: string;
  flowRateM3h: number;
  headM: number;
  viscosityCp?: number;
  temperatureC?: number;
  solidsPercent?: number;
  particleSizeMm?: number;
  fluidType?: "water" | "chemical" | "slurry" | "oil" | "food" | "viscous";
  operatingMode?: "continuous" | "intermittent" | "variable";
  priorities?: ("efficiency" | "cost" | "reliability" | "maintenance" | "footprint")[];
}

export interface SelectionResult {
  recommendedTypes: {
    type: PumpTypeProfile;
    score: number;
    reasons: string[];
    warnings: string[];
  }[];
  applicationNotes: string[];
  considerations: string[];
}

export const selectPumpType = (criteria: SelectionCriteria): SelectionResult => {
  const { flowRateM3h, headM, viscosityCp = 1, temperatureC = 25, solidsPercent = 0 } = criteria;

  const recommendations = PUMP_TYPE_PROFILES.map((pumpType) => {
    let score = 100;
    const reasons: string[] = [];
    const warnings: string[] = [];

    const { operatingRange } = pumpType;

    if (flowRateM3h < operatingRange.flowM3h.min) {
      score -= 30;
      warnings.push(`Flow rate below minimum (${operatingRange.flowM3h.min} m³/h)`);
    } else if (flowRateM3h > operatingRange.flowM3h.max) {
      score -= 50;
      warnings.push(`Flow rate exceeds maximum (${operatingRange.flowM3h.max} m³/h)`);
    } else {
      reasons.push("Flow rate within operating range");
    }

    if (headM < operatingRange.headM.min) {
      score -= 20;
      warnings.push(`Head below typical minimum (${operatingRange.headM.min} m)`);
    } else if (headM > operatingRange.headM.max) {
      score -= 50;
      warnings.push(`Head exceeds maximum (${operatingRange.headM.max} m)`);
    } else {
      reasons.push("Head within operating range");
    }

    if (viscosityCp > operatingRange.viscosityCp.max) {
      score -= 60;
      warnings.push(`Viscosity exceeds pump capability (max ${operatingRange.viscosityCp.max} cP)`);
    } else if (viscosityCp > 100 && pumpType.category === "centrifugal") {
      score -= 30;
      warnings.push("High viscosity - consider positive displacement");
    } else if (viscosityCp > 500 && pumpType.category === "positive_displacement") {
      reasons.push("Well suited for high viscosity fluids");
      score += 10;
    }

    if (temperatureC < operatingRange.temperatureC.min) {
      score -= 30;
      warnings.push(`Temperature below minimum (${operatingRange.temperatureC.min}°C)`);
    } else if (temperatureC > operatingRange.temperatureC.max) {
      score -= 40;
      warnings.push(`Temperature exceeds maximum (${operatingRange.temperatureC.max}°C)`);
    }

    if (solidsPercent > 0) {
      if (pumpType.value === "slurry") {
        score += 20;
        reasons.push("Designed for solids handling");
      } else if (pumpType.value === "progressive_cavity" || pumpType.value === "diaphragm") {
        score += 10;
        reasons.push("Can handle moderate solids");
      } else if (pumpType.category === "centrifugal" && pumpType.value !== "submersible") {
        score -= 20;
        warnings.push("Not designed for solids - may cause wear");
      } else if (pumpType.value === "gear" || pumpType.value === "screw") {
        score -= 40;
        warnings.push("Cannot handle solids");
      }
    }

    if (criteria.priorities?.includes("efficiency")) {
      const avgEff = (pumpType.efficiencyRange.min + pumpType.efficiencyRange.max) / 2;
      score += (avgEff - 60) / 3;
      if (avgEff > 80) {
        reasons.push("High efficiency");
      }
    }

    if (criteria.priorities?.includes("cost")) {
      if (pumpType.capitalCost === "low") {
        score += 15;
        reasons.push("Low capital cost");
      } else if (pumpType.capitalCost === "high") {
        score -= 10;
      }
    }

    if (criteria.priorities?.includes("maintenance")) {
      if (pumpType.maintenanceLevel === "low") {
        score += 15;
        reasons.push("Low maintenance requirements");
      } else if (pumpType.maintenanceLevel === "high") {
        score -= 10;
        warnings.push("Higher maintenance requirements");
      }
    }

    if (criteria.application) {
      const appProfile = APPLICATION_PROFILES.find((a) => a.value === criteria.application);
      if (
        appProfile?.recommendedPumpTypes.some(
          (t) => pumpType.value.includes(t) || t.includes(pumpType.value),
        )
      ) {
        score += 20;
        reasons.push(`Commonly used in ${appProfile.label} applications`);
      }
    }

    return {
      type: pumpType,
      score: Math.max(0, Math.min(100, score)),
      reasons,
      warnings,
    };
  });

  recommendations.sort((a, b) => b.score - a.score);

  const applicationNotes: string[] = [];
  const considerations: string[] = [];

  if (viscosityCp > 100) {
    applicationNotes.push("High viscosity fluid - positive displacement pumps recommended");
    considerations.push("Consider heating jacket if viscosity can be reduced");
  }

  if (solidsPercent > 5) {
    applicationNotes.push("High solids content - ensure pump can handle particle size");
    considerations.push("Plan for accelerated wear part replacement");
  }

  if (criteria.operatingMode === "variable") {
    considerations.push("Variable flow - consider VFD for centrifugal pumps");
    considerations.push("Positive displacement pumps provide constant flow regardless of pressure");
  }

  if (temperatureC > 100) {
    considerations.push("High temperature - verify seal and material compatibility");
  }

  if (criteria.fluidType === "chemical") {
    considerations.push("Verify material compatibility with fluid");
    considerations.push("Consider sealless pump designs (mag-drive, canned motor)");
  }

  return {
    recommendedTypes: recommendations.slice(0, 5),
    applicationNotes,
    considerations,
  };
};

export const pumpTypeLabel = (value: string): string => {
  const profile = PUMP_TYPE_PROFILES.find((p) => p.value === value);
  return profile?.label ?? value;
};

export const applicationLabel = (value: string): string => {
  const profile = APPLICATION_PROFILES.find((a) => a.value === value);
  return profile?.label ?? value;
};
