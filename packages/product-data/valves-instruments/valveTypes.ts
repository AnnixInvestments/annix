// Valves, Meters & Instruments Module - Valve Types Configuration
// Reference: API 6D, API 600, API 608, ASME B16.34

export type ValveCategory = "isolation" | "control" | "check" | "safety" | "specialty";

export interface ValveType {
  value: string;
  label: string;
  description: string;
  category: ValveCategory;
  motion: "quarter_turn" | "linear" | "self_actuated";
  icon: string;
  apiStandard?: string;
  typicalApplications: string[];
}

export const VALVE_TYPES: ValveType[] = [
  // Isolation Valves - Quarter Turn
  {
    value: "ball_valve",
    label: "Ball Valve",
    description: "Spherical ball with bore, excellent shutoff, quarter-turn operation",
    category: "isolation",
    motion: "quarter_turn",
    icon: "⚫",
    apiStandard: "API 608",
    typicalApplications: ["On/off service", "Gas isolation", "General process", "High pressure"],
  },
  {
    value: "butterfly_valve",
    label: "Butterfly Valve",
    description: "Disc rotates in flow, compact and economical for large sizes",
    category: "isolation",
    motion: "quarter_turn",
    icon: "🦋",
    apiStandard: "API 609",
    typicalApplications: ["Large diameter", "Low pressure", "HVAC", "Water treatment"],
  },
  {
    value: "plug_valve",
    label: "Plug Valve",
    description: "Cylindrical or tapered plug with port, quick shutoff",
    category: "isolation",
    motion: "quarter_turn",
    icon: "🔌",
    apiStandard: "API 599",
    typicalApplications: ["Fuel gas", "Petrochemical", "Slurry", "Multi-port diverting"],
  },

  // Isolation Valves - Linear
  {
    value: "gate_valve",
    label: "Gate Valve",
    description: "Wedge or parallel gate for full bore shutoff",
    category: "isolation",
    motion: "linear",
    icon: "🚪",
    apiStandard: "API 600/602",
    typicalApplications: ["Pipeline", "Full flow", "Infrequent operation", "Water/steam"],
  },
  {
    value: "globe_valve",
    label: "Globe Valve",
    description: "Disc moves perpendicular to seat, good throttling capability",
    category: "control",
    motion: "linear",
    icon: "🌐",
    apiStandard: "API 623",
    typicalApplications: ["Flow regulation", "Steam", "Cooling water", "Process control"],
  },
  {
    value: "knife_gate",
    label: "Knife Gate Valve",
    description: "Sharp-edged gate for slurry and solids isolation",
    category: "isolation",
    motion: "linear",
    icon: "🔪",
    typicalApplications: ["Slurry", "Pulp/paper", "Mining", "Wastewater"],
  },
  {
    value: "diaphragm_valve",
    label: "Diaphragm Valve",
    description: "Flexible diaphragm isolates mechanism from process",
    category: "isolation",
    motion: "linear",
    icon: "🔵",
    typicalApplications: ["Corrosive fluids", "Pharmaceutical", "Food", "Slurry"],
  },
  {
    value: "pinch_valve",
    label: "Pinch Valve",
    description: "Sleeve pinched closed, full bore, abrasion resistant",
    category: "isolation",
    motion: "linear",
    icon: "🤏",
    typicalApplications: ["Abrasive slurry", "Mining", "Dry solids", "Pneumatic conveying"],
  },

  // Check Valves
  {
    value: "swing_check",
    label: "Swing Check Valve",
    description: "Hinged disc swings open with flow",
    category: "check",
    motion: "self_actuated",
    icon: "↩️",
    apiStandard: "API 594",
    typicalApplications: ["Pump discharge", "Pipeline", "General service"],
  },
  {
    value: "tilting_disc_check",
    label: "Tilting Disc Check",
    description: "Disc tilts on pivot, faster closing, reduced water hammer",
    category: "check",
    motion: "self_actuated",
    icon: "↩️",
    typicalApplications: ["High velocity", "Compressor discharge", "Power plants"],
  },
  {
    value: "dual_plate_check",
    label: "Dual Plate (Wafer) Check",
    description: "Two half-discs, compact wafer design",
    category: "check",
    motion: "self_actuated",
    icon: "↩️",
    typicalApplications: ["Compact spaces", "Low pressure drop", "Vertical/horizontal"],
  },
  {
    value: "lift_check",
    label: "Lift Check Valve",
    description: "Disc lifts from seat, piston or ball type",
    category: "check",
    motion: "self_actuated",
    icon: "↩️",
    typicalApplications: ["High pressure", "Steam", "Compressible fluids"],
  },
  {
    value: "foot_valve",
    label: "Foot Valve",
    description: "Check valve at pump suction with strainer",
    category: "check",
    motion: "self_actuated",
    icon: "🦶",
    typicalApplications: ["Pump priming", "Well pumps", "Suction lines"],
  },

  // Control Valves
  {
    value: "control_globe",
    label: "Control Valve (Globe)",
    description: "Globe-style with actuator for modulating control",
    category: "control",
    motion: "linear",
    icon: "🎛️",
    typicalApplications: ["Flow control", "Pressure control", "Temperature control"],
  },
  {
    value: "control_ball",
    label: "Control Valve (Ball)",
    description: "Characterized ball for rotary control applications",
    category: "control",
    motion: "quarter_turn",
    icon: "🎛️",
    typicalApplications: ["High capacity", "Severe service", "Noise reduction"],
  },
  {
    value: "control_butterfly",
    label: "Control Valve (Butterfly)",
    description: "Butterfly with positioner for large flow control",
    category: "control",
    motion: "quarter_turn",
    icon: "🎛️",
    typicalApplications: ["Large diameter control", "HVAC", "Cooling water"],
  },
  {
    value: "pressure_reducing",
    label: "Pressure Reducing Valve (PRV)",
    description: "Self-acting valve to reduce downstream pressure",
    category: "control",
    motion: "self_actuated",
    icon: "⬇️",
    typicalApplications: ["Steam pressure reduction", "Water distribution", "Gas regulation"],
  },

  // Safety Valves
  {
    value: "safety_relief",
    label: "Safety Relief Valve (PSV)",
    description: "Protects equipment from overpressure",
    category: "safety",
    motion: "self_actuated",
    icon: "⚠️",
    apiStandard: "API 526",
    typicalApplications: ["Pressure vessels", "Boilers", "Pipelines", "Process vessels"],
  },
  {
    value: "pilot_operated_prv",
    label: "Pilot Operated Relief Valve",
    description: "Pilot controls main valve for tight shutoff",
    category: "safety",
    motion: "self_actuated",
    icon: "⚠️",
    apiStandard: "API 526",
    typicalApplications: ["High pressure", "Gas service", "Large orifice"],
  },
  {
    value: "rupture_disc",
    label: "Rupture Disc",
    description: "Non-reclosing pressure relief device",
    category: "safety",
    motion: "self_actuated",
    icon: "💥",
    typicalApplications: ["Emergency relief", "Corrosive service", "Fast opening"],
  },
  {
    value: "vacuum_breaker",
    label: "Vacuum Breaker / Air Valve",
    description: "Admits air to prevent vacuum collapse",
    category: "safety",
    motion: "self_actuated",
    icon: "🌬️",
    typicalApplications: ["Pipeline", "Tanks", "Vacuum protection"],
  },

  // Specialty Valves
  {
    value: "solenoid_valve",
    label: "Solenoid Valve",
    description: "Electrically operated for on/off or piloting",
    category: "specialty",
    motion: "linear",
    icon: "⚡",
    typicalApplications: ["Automation", "Safety shutdown", "Pilot service"],
  },
  {
    value: "needle_valve",
    label: "Needle Valve",
    description: "Fine adjustment for small flows, tapered stem",
    category: "specialty",
    motion: "linear",
    icon: "📍",
    typicalApplications: ["Instrumentation", "Sampling", "Gauge isolation"],
  },
  {
    value: "float_valve",
    label: "Float Valve",
    description: "Level-actuated for tank filling",
    category: "specialty",
    motion: "self_actuated",
    icon: "🎈",
    typicalApplications: ["Tank level control", "Cisterns", "Cooling towers"],
  },
  {
    value: "three_way_valve",
    label: "Three-Way Valve",
    description: "Mixing or diverting flow between three ports",
    category: "specialty",
    motion: "quarter_turn",
    icon: "🔀",
    typicalApplications: ["Mixing", "Diverting", "Bypass", "Heat exchangers"],
  },
];

export const getValvesByCategory = (category: ValveCategory): ValveType[] =>
  VALVE_TYPES.filter((valve) => valve.category === category);

export const getValveByValue = (value: string): ValveType | undefined =>
  VALVE_TYPES.find((valve) => valve.value === value);

export const getValvesByMotion = (motion: ValveType["motion"]): ValveType[] =>
  VALVE_TYPES.filter((valve) => valve.motion === motion);

export const getIsolationValves = (): ValveType[] => getValvesByCategory("isolation");
export const getControlValves = (): ValveType[] => getValvesByCategory("control");
export const getCheckValves = (): ValveType[] => getValvesByCategory("check");
export const getSafetyValves = (): ValveType[] => getValvesByCategory("safety");
