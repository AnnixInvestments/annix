// Valves, Meters & Instruments Module - Pricing Structures
// Reference pricing data for quotation estimates

// ============================================================================
// VALVE PRICING STRUCTURE
// ============================================================================

export interface ValvePriceFactors {
  sizeMultiplier: number;
  materialMultiplier: number;
  pressureClassMultiplier: number;
  connectionMultiplier: number;
}

export interface ValveBasePricing {
  valveType: string;
  basePrice: number; // ZAR for DN50 Class 150 carbon steel flanged
  description: string;
}

export const VALVE_BASE_PRICES: ValveBasePricing[] = [
  { valveType: "ball_valve", basePrice: 2500, description: "Two-piece ball valve" },
  { valveType: "ball_valve_3pc", basePrice: 3500, description: "Three-piece ball valve" },
  { valveType: "ball_valve_trunnion", basePrice: 8000, description: "Trunnion mounted ball valve" },
  { valveType: "butterfly_valve_wafer", basePrice: 1200, description: "Wafer butterfly valve" },
  { valveType: "butterfly_valve_lug", basePrice: 1800, description: "Lug butterfly valve" },
  {
    valveType: "butterfly_valve_double_offset",
    basePrice: 4500,
    description: "Double offset butterfly",
  },
  {
    valveType: "butterfly_valve_triple_offset",
    basePrice: 12000,
    description: "Triple offset butterfly",
  },
  { valveType: "gate_valve", basePrice: 3000, description: "Wedge gate valve" },
  { valveType: "gate_valve_knife", basePrice: 2500, description: "Knife gate valve" },
  { valveType: "globe_valve", basePrice: 4500, description: "Globe valve" },
  { valveType: "check_valve_swing", basePrice: 2000, description: "Swing check valve" },
  { valveType: "check_valve_dual_plate", basePrice: 2500, description: "Dual plate check valve" },
  { valveType: "check_valve_lift", basePrice: 3500, description: "Lift check valve" },
  { valveType: "plug_valve", basePrice: 4000, description: "Lubricated plug valve" },
  { valveType: "diaphragm_valve", basePrice: 3500, description: "Weir diaphragm valve" },
  { valveType: "pinch_valve", basePrice: 4000, description: "Pinch valve with sleeve" },
  { valveType: "needle_valve", basePrice: 800, description: "Needle valve" },
  { valveType: "safety_relief", basePrice: 8000, description: "Safety relief valve (PSV)" },
  { valveType: "control_globe", basePrice: 15000, description: "Globe control valve body" },
  { valveType: "control_ball", basePrice: 18000, description: "Ball control valve body" },
  { valveType: "control_butterfly", basePrice: 8000, description: "Butterfly control valve body" },
];

// Size multipliers (relative to DN50)
export const VALVE_SIZE_MULTIPLIERS: Record<string, number> = {
  "15": 0.6,
  "20": 0.7,
  "25": 0.8,
  "32": 0.9,
  "40": 0.95,
  "50": 1.0,
  "65": 1.3,
  "80": 1.6,
  "100": 2.0,
  "125": 2.5,
  "150": 3.0,
  "200": 4.5,
  "250": 6.5,
  "300": 9.0,
  "350": 12.0,
  "400": 16.0,
  "450": 20.0,
  "500": 25.0,
  "600": 35.0,
  "750": 55.0,
  "900": 80.0,
  "1000": 100.0,
  "1200": 140.0,
};

// Material multipliers (relative to carbon steel)
export const VALVE_MATERIAL_MULTIPLIERS: Record<string, number> = {
  wcb: 1.0, // Carbon steel baseline
  lcb: 1.15,
  wc6: 1.4,
  cf8: 1.8, // SS 304
  cf8m: 2.0, // SS 316
  cf3: 1.9, // SS 304L
  cf3m: 2.1, // SS 316L
  duplex: 3.5,
  super_duplex: 5.0,
  cast_iron: 0.7,
  ductile_iron: 0.85,
  bronze: 1.3,
  monel: 6.0,
  hastelloy_c: 8.0,
  titanium: 10.0,
  pvc: 0.4,
  cpvc: 0.5,
  pvdf: 0.8,
  pp: 0.35,
};

// Pressure class multipliers (relative to Class 150)
export const VALVE_PRESSURE_MULTIPLIERS: Record<string, number> = {
  pn6: 0.8,
  pn10: 0.85,
  pn16: 0.9,
  pn25: 1.0,
  pn40: 1.15,
  pn64: 1.4,
  pn100: 1.8,
  class_150: 1.0,
  class_300: 1.3,
  class_600: 1.8,
  class_900: 2.5,
  class_1500: 3.5,
  class_2500: 5.0,
};

// Connection type multipliers
export const VALVE_CONNECTION_MULTIPLIERS: Record<string, number> = {
  flanged_rf: 1.0,
  flanged_ff: 0.95,
  flanged_rtj: 1.15,
  threaded_bsp: 0.7,
  threaded_npt: 0.7,
  socket_weld: 0.85,
  butt_weld: 0.9,
  wafer: 0.6,
  lug: 0.75,
  grooved: 0.8,
  tri_clamp: 1.3,
  compression: 0.65,
};

export interface ValvePriceCalculationInput {
  valveType: string;
  sizeDN: string;
  bodyMaterial: string;
  pressureClass: string;
  connectionType: string;
}

export interface ValvePriceCalculationResult {
  basePrice: number;
  sizeAdjusted: number;
  materialAdjusted: number;
  pressureAdjusted: number;
  connectionAdjusted: number;
  subtotal: number;
  notes: string[];
}

export const calculateValvePrice = (
  input: ValvePriceCalculationInput,
): ValvePriceCalculationResult | null => {
  const baseValve = VALVE_BASE_PRICES.find((v) => v.valveType === input.valveType);
  if (!baseValve) return null;

  const sizeMultiplier = VALVE_SIZE_MULTIPLIERS[input.sizeDN] ?? 1.0;
  const materialMultiplier = VALVE_MATERIAL_MULTIPLIERS[input.bodyMaterial] ?? 1.0;
  const pressureMultiplier = VALVE_PRESSURE_MULTIPLIERS[input.pressureClass] ?? 1.0;
  const connectionMultiplier = VALVE_CONNECTION_MULTIPLIERS[input.connectionType] ?? 1.0;

  const notes: string[] = [];

  const sizeAdjusted = baseValve.basePrice * sizeMultiplier;
  const materialAdjusted = sizeAdjusted * materialMultiplier;
  const pressureAdjusted = materialAdjusted * pressureMultiplier;
  const connectionAdjusted = pressureAdjusted * connectionMultiplier;

  notes.push(`Size multiplier (DN${input.sizeDN}): ${sizeMultiplier}x`);
  notes.push(`Material multiplier: ${materialMultiplier}x`);
  notes.push(`Pressure class multiplier: ${pressureMultiplier}x`);
  notes.push(`Connection multiplier: ${connectionMultiplier}x`);
  notes.push("Prices are estimates - confirm with supplier");

  return {
    basePrice: baseValve.basePrice,
    sizeAdjusted: Math.round(sizeAdjusted),
    materialAdjusted: Math.round(materialAdjusted),
    pressureAdjusted: Math.round(pressureAdjusted),
    connectionAdjusted: Math.round(connectionAdjusted),
    subtotal: Math.round(connectionAdjusted),
    notes,
  };
};

// ============================================================================
// ACTUATOR PRICING
// ============================================================================

export interface ActuatorBasePricing {
  actuatorType: string;
  torqueRange: string;
  basePrice: number;
  description: string;
}

export const ACTUATOR_BASE_PRICES: ActuatorBasePricing[] = [
  {
    actuatorType: "pneumatic_da",
    torqueRange: "0-50 Nm",
    basePrice: 3500,
    description: "Pneumatic double acting",
  },
  {
    actuatorType: "pneumatic_da",
    torqueRange: "50-150 Nm",
    basePrice: 5500,
    description: "Pneumatic double acting",
  },
  {
    actuatorType: "pneumatic_da",
    torqueRange: "150-500 Nm",
    basePrice: 9000,
    description: "Pneumatic double acting",
  },
  {
    actuatorType: "pneumatic_da",
    torqueRange: "500-1500 Nm",
    basePrice: 15000,
    description: "Pneumatic double acting",
  },
  {
    actuatorType: "pneumatic_da",
    torqueRange: "1500-5000 Nm",
    basePrice: 28000,
    description: "Pneumatic double acting",
  },
  {
    actuatorType: "pneumatic_sr",
    torqueRange: "0-50 Nm",
    basePrice: 5000,
    description: "Pneumatic spring return",
  },
  {
    actuatorType: "pneumatic_sr",
    torqueRange: "50-150 Nm",
    basePrice: 8000,
    description: "Pneumatic spring return",
  },
  {
    actuatorType: "pneumatic_sr",
    torqueRange: "150-500 Nm",
    basePrice: 14000,
    description: "Pneumatic spring return",
  },
  {
    actuatorType: "pneumatic_sr",
    torqueRange: "500-1500 Nm",
    basePrice: 25000,
    description: "Pneumatic spring return",
  },
  {
    actuatorType: "electric_on_off",
    torqueRange: "0-50 Nm",
    basePrice: 6000,
    description: "Electric on/off",
  },
  {
    actuatorType: "electric_on_off",
    torqueRange: "50-150 Nm",
    basePrice: 10000,
    description: "Electric on/off",
  },
  {
    actuatorType: "electric_on_off",
    torqueRange: "150-500 Nm",
    basePrice: 18000,
    description: "Electric on/off",
  },
  {
    actuatorType: "electric_on_off",
    torqueRange: "500-1500 Nm",
    basePrice: 35000,
    description: "Electric on/off",
  },
  {
    actuatorType: "electric_modulating",
    torqueRange: "0-50 Nm",
    basePrice: 12000,
    description: "Electric modulating",
  },
  {
    actuatorType: "electric_modulating",
    torqueRange: "50-150 Nm",
    basePrice: 18000,
    description: "Electric modulating",
  },
  {
    actuatorType: "electric_modulating",
    torqueRange: "150-500 Nm",
    basePrice: 30000,
    description: "Electric modulating",
  },
  {
    actuatorType: "electric_modulating",
    torqueRange: "500-1500 Nm",
    basePrice: 55000,
    description: "Electric modulating",
  },
];

export const findActuatorPrice = (
  actuatorType: string,
  requiredTorque: number,
): ActuatorBasePricing | null => {
  const actuators = ACTUATOR_BASE_PRICES.filter((a) => a.actuatorType === actuatorType);

  for (const actuator of actuators) {
    const [min, max] = actuator.torqueRange.split("-").map((s) => parseInt(s, 10));
    if (requiredTorque >= min && requiredTorque <= max) {
      return actuator;
    }
  }

  return actuators[actuators.length - 1] ?? null;
};

// ============================================================================
// ACCESSORY PRICING
// ============================================================================

export interface AccessoryPricing {
  accessory: string;
  price: number;
  description: string;
}

export const VALVE_ACCESSORY_PRICES: AccessoryPricing[] = [
  { accessory: "limit_switch_box", price: 2500, description: "Limit switch box (2 switches)" },
  { accessory: "limit_switch_box_ex", price: 4500, description: "Ex-proof limit switch box" },
  { accessory: "solenoid_valve", price: 1500, description: "5/2 solenoid valve (24V DC)" },
  { accessory: "solenoid_valve_ex", price: 3500, description: "Ex-proof solenoid valve" },
  { accessory: "positioner_pneumatic", price: 4000, description: "Pneumatic positioner" },
  { accessory: "positioner_electropneumatic", price: 8000, description: "I/P positioner (4-20mA)" },
  { accessory: "positioner_smart", price: 15000, description: "Smart positioner (HART)" },
  {
    accessory: "positioner_fieldbus",
    price: 22000,
    description: "Fieldbus positioner (FF/Profibus)",
  },
  { accessory: "filter_regulator", price: 1200, description: "Air filter regulator" },
  { accessory: "quick_exhaust", price: 800, description: "Quick exhaust valve" },
  { accessory: "volume_booster", price: 3500, description: "Volume booster relay" },
  { accessory: "lockout_valve", price: 1500, description: "Lockout/tagout valve" },
  { accessory: "handwheel_override", price: 2500, description: "Manual handwheel override" },
  {
    accessory: "mounting_kit",
    price: 1800,
    description: "Actuator mounting kit (bracket + coupling)",
  },
  { accessory: "namur_interface", price: 600, description: "NAMUR solenoid interface" },
];

export const calculateAccessoriesTotal = (accessories: string[]): number => {
  return accessories.reduce((total, acc) => {
    const pricing = VALVE_ACCESSORY_PRICES.find((p) => p.accessory === acc);
    return total + (pricing?.price ?? 0);
  }, 0);
};

// ============================================================================
// INSTRUMENT PRICING STRUCTURE
// ============================================================================

export interface InstrumentBasePricing {
  instrumentType: string;
  basePrice: number;
  description: string;
}

export const INSTRUMENT_BASE_PRICES: InstrumentBasePricing[] = [
  // Flow Instruments
  {
    instrumentType: "mag_flowmeter",
    basePrice: 25000,
    description: "Electromagnetic flowmeter (DN50)",
  },
  {
    instrumentType: "ultrasonic_flowmeter",
    basePrice: 35000,
    description: "Ultrasonic flowmeter (DN50)",
  },
  {
    instrumentType: "ultrasonic_clamp_on",
    basePrice: 45000,
    description: "Clamp-on ultrasonic flowmeter",
  },
  {
    instrumentType: "coriolis_flowmeter",
    basePrice: 85000,
    description: "Coriolis mass flowmeter (DN25)",
  },
  { instrumentType: "vortex_flowmeter", basePrice: 20000, description: "Vortex flowmeter (DN50)" },
  {
    instrumentType: "turbine_flowmeter",
    basePrice: 15000,
    description: "Turbine flowmeter (DN50)",
  },
  { instrumentType: "orifice_assembly", basePrice: 8000, description: "Orifice plate with holder" },
  { instrumentType: "variable_area", basePrice: 3500, description: "Rotameter (glass tube)" },
  { instrumentType: "variable_area_metal", basePrice: 12000, description: "Metal tube rotameter" },

  // Pressure Instruments
  { instrumentType: "pressure_gauge", basePrice: 800, description: "Bourdon pressure gauge" },
  { instrumentType: "pressure_gauge_ss", basePrice: 1500, description: "SS case pressure gauge" },
  {
    instrumentType: "pressure_transmitter",
    basePrice: 8000,
    description: "Pressure transmitter (4-20mA)",
  },
  {
    instrumentType: "pressure_transmitter_smart",
    basePrice: 15000,
    description: "Smart pressure transmitter (HART)",
  },
  {
    instrumentType: "dp_transmitter",
    basePrice: 18000,
    description: "Differential pressure transmitter",
  },
  {
    instrumentType: "dp_transmitter_smart",
    basePrice: 28000,
    description: "Smart DP transmitter (HART)",
  },
  { instrumentType: "pressure_switch", basePrice: 2500, description: "Pressure switch" },
  { instrumentType: "diaphragm_seal", basePrice: 6000, description: "Diaphragm seal assembly" },

  // Level Instruments
  { instrumentType: "radar_level", basePrice: 35000, description: "Radar level transmitter" },
  { instrumentType: "guided_wave_radar", basePrice: 25000, description: "Guided wave radar" },
  {
    instrumentType: "ultrasonic_level",
    basePrice: 12000,
    description: "Ultrasonic level transmitter",
  },
  {
    instrumentType: "hydrostatic_level",
    basePrice: 8000,
    description: "Hydrostatic level transmitter",
  },
  { instrumentType: "float_switch", basePrice: 1500, description: "Float level switch" },
  {
    instrumentType: "magnetic_level_gauge",
    basePrice: 15000,
    description: "Magnetic level gauge (1m)",
  },
  { instrumentType: "sight_glass", basePrice: 4000, description: "Sight glass / level gauge" },

  // Temperature Instruments
  { instrumentType: "rtd_assembly", basePrice: 3500, description: "RTD with head" },
  {
    instrumentType: "thermocouple_assembly",
    basePrice: 2500,
    description: "Thermocouple with head",
  },
  {
    instrumentType: "temp_transmitter",
    basePrice: 5000,
    description: "Temperature transmitter (4-20mA)",
  },
  {
    instrumentType: "temp_transmitter_smart",
    basePrice: 10000,
    description: "Smart temp transmitter (HART)",
  },
  { instrumentType: "thermowell", basePrice: 2000, description: "Thermowell (flanged)" },
  { instrumentType: "bimetal_thermometer", basePrice: 1200, description: "Bimetal thermometer" },
  { instrumentType: "temp_switch", basePrice: 2000, description: "Temperature switch" },

  // Analytical Instruments
  { instrumentType: "ph_analyzer", basePrice: 25000, description: "pH analyzer with sensor" },
  {
    instrumentType: "conductivity_analyzer",
    basePrice: 20000,
    description: "Conductivity analyzer",
  },
  {
    instrumentType: "dissolved_oxygen",
    basePrice: 35000,
    description: "Dissolved oxygen analyzer",
  },
  { instrumentType: "turbidity_analyzer", basePrice: 30000, description: "Turbidity analyzer" },
];

// Instrument size multipliers (relative to DN50 for flow meters)
export const INSTRUMENT_SIZE_MULTIPLIERS: Record<string, number> = {
  "15": 0.8,
  "25": 0.9,
  "40": 0.95,
  "50": 1.0,
  "80": 1.2,
  "100": 1.4,
  "150": 1.8,
  "200": 2.3,
  "250": 3.0,
  "300": 3.8,
  "400": 5.0,
  "500": 6.5,
  "600": 8.0,
};

// Material/liner multipliers for flowmeters
export const FLOWMETER_LINER_MULTIPLIERS: Record<string, number> = {
  ptfe: 1.0,
  rubber: 0.9,
  ceramic: 1.4,
  pfa: 1.2,
  polyurethane: 1.1,
};

// Output/protocol multipliers
export const INSTRUMENT_PROTOCOL_MULTIPLIERS: Record<string, number> = {
  "4_20ma": 1.0,
  hart: 1.2,
  profibus_pa: 1.4,
  foundation_fieldbus: 1.5,
  modbus: 1.1,
  profinet: 1.5,
  ethernet_ip: 1.5,
};

export interface InstrumentPriceCalculationInput {
  instrumentType: string;
  sizeDN?: string;
  linerMaterial?: string;
  protocol?: string;
  hazardousArea?: boolean;
}

export interface InstrumentPriceCalculationResult {
  basePrice: number;
  sizeAdjusted: number;
  protocolAdjusted: number;
  hazardousAreaAdjusted: number;
  subtotal: number;
  notes: string[];
}

export const calculateInstrumentPrice = (
  input: InstrumentPriceCalculationInput,
): InstrumentPriceCalculationResult | null => {
  const baseInstrument = INSTRUMENT_BASE_PRICES.find(
    (i) => i.instrumentType === input.instrumentType,
  );
  if (!baseInstrument) return null;

  const sizeMultiplier = input.sizeDN ? (INSTRUMENT_SIZE_MULTIPLIERS[input.sizeDN] ?? 1.0) : 1.0;
  const linerMultiplier = input.linerMaterial
    ? (FLOWMETER_LINER_MULTIPLIERS[input.linerMaterial] ?? 1.0)
    : 1.0;
  const protocolMultiplier = input.protocol
    ? (INSTRUMENT_PROTOCOL_MULTIPLIERS[input.protocol] ?? 1.0)
    : 1.0;
  const hazardousMultiplier = input.hazardousArea ? 1.5 : 1.0;

  const notes: string[] = [];

  const sizeAdjusted = baseInstrument.basePrice * sizeMultiplier * linerMultiplier;
  const protocolAdjusted = sizeAdjusted * protocolMultiplier;
  const hazardousAreaAdjusted = protocolAdjusted * hazardousMultiplier;

  if (input.sizeDN) {
    notes.push(`Size multiplier (DN${input.sizeDN}): ${sizeMultiplier}x`);
  }
  if (input.linerMaterial) {
    notes.push(`Liner multiplier: ${linerMultiplier}x`);
  }
  if (input.protocol) {
    notes.push(`Protocol multiplier: ${protocolMultiplier}x`);
  }
  if (input.hazardousArea) {
    notes.push("Hazardous area (Ex): 1.5x");
  }
  notes.push("Prices are estimates - confirm with supplier");

  return {
    basePrice: baseInstrument.basePrice,
    sizeAdjusted: Math.round(sizeAdjusted),
    protocolAdjusted: Math.round(protocolAdjusted),
    hazardousAreaAdjusted: Math.round(hazardousAreaAdjusted),
    subtotal: Math.round(hazardousAreaAdjusted),
    notes,
  };
};
