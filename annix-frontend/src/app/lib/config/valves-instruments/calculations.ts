// Valves, Meters & Instruments Module - Calculations & Helpers
// Engineering calculations for valve and instrument sizing

// ============================================================================
// UNIT CONVERSIONS
// ============================================================================

export const FLOW_CONVERSIONS = {
  m3h_to_gpm: (m3h: number): number => m3h * 4.40287,
  gpm_to_m3h: (gpm: number): number => gpm / 4.40287,
  m3h_to_lpm: (m3h: number): number => m3h * 16.6667,
  lpm_to_m3h: (lpm: number): number => lpm / 16.6667,
  m3h_to_m3s: (m3h: number): number => m3h / 3600,
  m3s_to_m3h: (m3s: number): number => m3s * 3600,
  gpm_to_lpm: (gpm: number): number => gpm * 3.78541,
  lpm_to_gpm: (lpm: number): number => lpm / 3.78541,
  bbl_day_to_m3h: (bblDay: number): number => bblDay * 0.00662447,
  m3h_to_bbl_day: (m3h: number): number => m3h / 0.00662447,
};

export const PRESSURE_CONVERSIONS = {
  bar_to_psi: (bar: number): number => bar * 14.5038,
  psi_to_bar: (psi: number): number => psi / 14.5038,
  bar_to_kpa: (bar: number): number => bar * 100,
  kpa_to_bar: (kpa: number): number => kpa / 100,
  bar_to_mpa: (bar: number): number => bar / 10,
  mpa_to_bar: (mpa: number): number => mpa * 10,
  psi_to_kpa: (psi: number): number => psi * 6.89476,
  kpa_to_psi: (kpa: number): number => kpa / 6.89476,
  bar_to_mh2o: (bar: number): number => bar * 10.1972,
  mh2o_to_bar: (mh2o: number): number => mh2o / 10.1972,
  bar_to_mmhg: (bar: number): number => bar * 750.062,
  mmhg_to_bar: (mmhg: number): number => mmhg / 750.062,
  atm_to_bar: (atm: number): number => atm * 1.01325,
  bar_to_atm: (bar: number): number => bar / 1.01325,
};

export const TEMPERATURE_CONVERSIONS = {
  celsius_to_fahrenheit: (c: number): number => (c * 9/5) + 32,
  fahrenheit_to_celsius: (f: number): number => (f - 32) * 5/9,
  celsius_to_kelvin: (c: number): number => c + 273.15,
  kelvin_to_celsius: (k: number): number => k - 273.15,
  fahrenheit_to_kelvin: (f: number): number => (f - 32) * 5/9 + 273.15,
  kelvin_to_fahrenheit: (k: number): number => (k - 273.15) * 9/5 + 32,
  celsius_to_rankine: (c: number): number => (c + 273.15) * 9/5,
  rankine_to_celsius: (r: number): number => (r * 5/9) - 273.15,
};

// ============================================================================
// VALVE Cv/Kv CALCULATIONS
// ============================================================================

export interface CvCalculationInput {
  flowRate: number; // m³/h for liquids, Nm³/h for gas
  specificGravity: number; // relative to water (1.0 for water)
  deltaP: number; // bar
  fluidType: 'liquid' | 'gas' | 'steam';
  inletPressure?: number; // bar absolute (for gas/steam)
  temperature?: number; // °C (for gas)
  molecularWeight?: number; // for gas
  inletDensity?: number; // kg/m³ (for steam)
}

export interface CvCalculationResult {
  cv: number;
  kv: number;
  formula: string;
  notes: string[];
}

export const calculateValveCv = (input: CvCalculationInput): CvCalculationResult => {
  const notes: string[] = [];
  let cv: number;
  let formula: string;

  if (input.fluidType === 'liquid') {
    // Cv = Q * sqrt(SG / ΔP)
    // Where Q is in US GPM, SG is specific gravity, ΔP is in psi
    const qGpm = FLOW_CONVERSIONS.m3h_to_gpm(input.flowRate);
    const deltaPPsi = PRESSURE_CONVERSIONS.bar_to_psi(input.deltaP);

    cv = qGpm * Math.sqrt(input.specificGravity / deltaPPsi);
    formula = 'Cv = Q × √(SG / ΔP) [ISA/IEC liquid formula]';
    notes.push(`Flow: ${qGpm.toFixed(2)} GPM`);
    notes.push(`ΔP: ${deltaPPsi.toFixed(2)} psi`);
  } else if (input.fluidType === 'gas') {
    // For gases: Cv = Q × √(T × SG / (ΔP × P1))
    // Simplified formula for subsonic flow
    const p1 = input.inletPressure ?? 1.01325; // bar abs
    const t = (input.temperature ?? 20) + 273.15; // Kelvin
    const sg = input.molecularWeight ? input.molecularWeight / 28.97 : input.specificGravity; // relative to air

    // Using the ISA formula for gases
    // Cv = Q / (1360 × P1 × N) where N = √(1/SG×T)
    const n = Math.sqrt(1 / (sg * t / 293.15));
    cv = input.flowRate / (1360 * p1 * n) * Math.sqrt(sg * t / input.deltaP);

    formula = 'Cv = Q / (1360 × P1 × √(1/SG×T)) [ISA gas formula, subsonic]';
    notes.push(`Inlet pressure: ${p1.toFixed(2)} bar abs`);
    notes.push(`Temperature: ${(t - 273.15).toFixed(1)}°C`);
    notes.push('Note: Verify flow is subsonic (P2 > 0.5 × P1)');
  } else {
    // Steam calculation
    const p1 = input.inletPressure ?? 10; // bar abs
    const density = input.inletDensity ?? 5; // kg/m³ approximate

    // Simplified steam formula
    cv = input.flowRate * Math.sqrt(density / (input.deltaP * 1000));
    formula = 'Cv = Q × √(ρ / ΔP) [Simplified steam formula]';
    notes.push(`Inlet pressure: ${p1.toFixed(2)} bar abs`);
    notes.push('Note: Use steam tables for accurate density');
  }

  // Kv = Cv × 0.865 (conversion factor)
  const kv = cv * 0.865;

  notes.push(`Kv (metric) = ${kv.toFixed(2)}`);
  notes.push('Add 20-30% safety factor for final valve selection');

  return {
    cv: Math.round(cv * 100) / 100,
    kv: Math.round(kv * 100) / 100,
    formula,
    notes,
  };
};

// Cv to Kv conversion and vice versa
export const cvToKv = (cv: number): number => cv * 0.865;
export const kvToCv = (kv: number): number => kv / 0.865;

// ============================================================================
// CONTROL VALVE SIZING (ISA/IEC)
// ============================================================================

export interface ControlValveSizingInput {
  requiredCv: number;
  valveType: 'globe' | 'ball' | 'butterfly' | 'eccentric_plug';
  characteristic: 'linear' | 'equal_percentage' | 'quick_opening';
}

export interface ControlValveSizingResult {
  recommendedSize: string;
  cvRange: string;
  rangeability: string;
  notes: string[];
}

// Standard Cv values by valve size (typical globe valve)
const STANDARD_CV_BY_SIZE: { size: string; cvMax: number }[] = [
  { size: 'DN15 (½")', cvMax: 4 },
  { size: 'DN20 (¾")', cvMax: 8 },
  { size: 'DN25 (1")', cvMax: 14 },
  { size: 'DN32 (1¼")', cvMax: 22 },
  { size: 'DN40 (1½")', cvMax: 35 },
  { size: 'DN50 (2")', cvMax: 55 },
  { size: 'DN65 (2½")', cvMax: 90 },
  { size: 'DN80 (3")', cvMax: 140 },
  { size: 'DN100 (4")', cvMax: 230 },
  { size: 'DN150 (6")', cvMax: 550 },
  { size: 'DN200 (8")', cvMax: 1000 },
  { size: 'DN250 (10")', cvMax: 1700 },
  { size: 'DN300 (12")', cvMax: 2500 },
];

export const sizeControlValve = (input: ControlValveSizingInput): ControlValveSizingResult => {
  const notes: string[] = [];

  // Find smallest valve that can handle required Cv at ~70% open
  const targetCvMax = input.requiredCv / 0.7;

  const selectedSize = STANDARD_CV_BY_SIZE.find(s => s.cvMax >= targetCvMax)
    ?? STANDARD_CV_BY_SIZE[STANDARD_CV_BY_SIZE.length - 1];

  const cvMin = selectedSize.cvMax * 0.02; // 50:1 rangeability typical
  const openingPercent = (input.requiredCv / selectedSize.cvMax) * 100;

  notes.push(`Required Cv: ${input.requiredCv.toFixed(2)}`);
  notes.push(`Valve operates at approximately ${openingPercent.toFixed(0)}% open`);

  if (openingPercent < 30) {
    notes.push('Warning: Valve may be oversized. Consider smaller size.');
  } else if (openingPercent > 90) {
    notes.push('Warning: Limited control range. Consider larger size.');
  } else {
    notes.push('Good control range (30-90% open)');
  }

  if (input.characteristic === 'equal_percentage') {
    notes.push('Equal percentage: Best for pressure control, large ΔP variation');
  } else if (input.characteristic === 'linear') {
    notes.push('Linear: Best for level control, constant ΔP');
  }

  return {
    recommendedSize: selectedSize.size,
    cvRange: `${cvMin.toFixed(2)} - ${selectedSize.cvMax}`,
    rangeability: '50:1 typical',
    notes,
  };
};

// ============================================================================
// ACTUATOR SIZING
// ============================================================================

export interface ActuatorSizingInput {
  valveType: string;
  sizeDN: number;
  pressureClass: string;
  differentialPressure: number; // bar
  actuatorType: 'pneumatic' | 'electric';
  airSupplyPressure?: number; // bar (for pneumatic)
  failPosition: 'open' | 'close' | 'last';
  safetyFactor?: number;
}

export interface ActuatorSizingResult {
  requiredTorque: number; // Nm
  recommendedActuatorTorque: number; // Nm
  springReturn: boolean;
  notes: string[];
}

export const sizeActuator = (input: ActuatorSizingInput): ActuatorSizingResult => {
  const notes: string[] = [];
  const safetyFactor = input.safetyFactor ?? 1.5;

  // Estimate torque based on valve type and size
  // These are simplified estimates - actual values vary by manufacturer
  let baseTorque: number;

  if (input.valveType === 'ball_valve') {
    // Ball valve torque estimate: T = 0.07 × DN² × ΔP (simplified)
    baseTorque = 0.07 * Math.pow(input.sizeDN, 2) * (input.differentialPressure / 10);
  } else if (input.valveType === 'butterfly_valve') {
    // Butterfly valve torque estimate: T = 0.03 × DN² × ΔP
    baseTorque = 0.03 * Math.pow(input.sizeDN, 2) * (input.differentialPressure / 10);
  } else if (input.valveType === 'plug_valve') {
    // Plug valve torque estimate
    baseTorque = 0.1 * Math.pow(input.sizeDN, 2) * (input.differentialPressure / 10);
  } else {
    // Default estimate for other quarter-turn valves
    baseTorque = 0.05 * Math.pow(input.sizeDN, 2) * (input.differentialPressure / 10);
  }

  // Add breakaway torque factor (typically 1.5x running torque)
  const breakawayTorque = baseTorque * 1.5;

  // Apply safety factor
  const requiredTorque = Math.ceil(breakawayTorque);
  const recommendedActuatorTorque = Math.ceil(breakawayTorque * safetyFactor);

  notes.push(`Estimated breakaway torque: ${requiredTorque} Nm`);
  notes.push(`Safety factor applied: ${safetyFactor}`);
  notes.push(`Recommended actuator output: ≥${recommendedActuatorTorque} Nm`);

  if (input.actuatorType === 'pneumatic' && input.airSupplyPressure) {
    notes.push(`Air supply: ${input.airSupplyPressure} bar`);
    notes.push('Ensure actuator sized for minimum air supply pressure');
  }

  const springReturn = input.failPosition !== 'last';
  if (springReturn) {
    notes.push(`Spring return for fail-${input.failPosition} action`);
    notes.push('Spring must overcome full torque in fail direction');
  }

  return {
    requiredTorque,
    recommendedActuatorTorque,
    springReturn,
    notes,
  };
};

// ============================================================================
// FLOWMETER SIZING
// ============================================================================

export interface FlowmeterSizingInput {
  flowRateMin: number; // m³/h
  flowRateNormal: number; // m³/h
  flowRateMax: number; // m³/h
  pipeDiameter: number; // mm
  fluidType: 'liquid' | 'gas';
  viscosity?: number; // cP (for liquids)
  density: number; // kg/m³
  meterType: 'electromagnetic' | 'ultrasonic' | 'coriolis' | 'vortex' | 'orifice' | 'turbine';
}

export interface FlowmeterSizingResult {
  recommendedSize: string;
  velocityMin: number; // m/s
  velocityNormal: number; // m/s
  velocityMax: number; // m/s
  reynoldsNumber: number;
  turndownRatio: number;
  suitable: boolean;
  notes: string[];
}

export const sizeFlowmeter = (input: FlowmeterSizingInput): FlowmeterSizingResult => {
  const notes: string[] = [];

  // Calculate velocities
  const pipeAreaM2 = Math.PI * Math.pow(input.pipeDiameter / 1000 / 2, 2);
  const velocityMin = (input.flowRateMin / 3600) / pipeAreaM2;
  const velocityNormal = (input.flowRateNormal / 3600) / pipeAreaM2;
  const velocityMax = (input.flowRateMax / 3600) / pipeAreaM2;

  // Calculate Reynolds number at normal flow
  const viscosityPaS = (input.viscosity ?? 1) / 1000; // Convert cP to Pa·s
  const reynoldsNumber = (input.density * velocityNormal * (input.pipeDiameter / 1000)) / viscosityPaS;

  // Calculate turndown ratio
  const turndownRatio = input.flowRateMax / input.flowRateMin;

  let suitable = true;
  let recommendedSize = `DN${input.pipeDiameter}`;

  // Check velocity ranges and suitability by meter type
  if (input.meterType === 'electromagnetic') {
    if (velocityMin < 0.3) {
      notes.push('Warning: Minimum velocity below 0.3 m/s - accuracy may degrade');
      suitable = velocityMin >= 0.1;
    }
    if (velocityMax > 10) {
      notes.push('Warning: Maximum velocity above 10 m/s - consider reducing size');
    }
    notes.push('Magnetic flowmeters require conductive fluid (>5 µS/cm)');
  } else if (input.meterType === 'ultrasonic') {
    if (velocityMin < 0.5) {
      notes.push('Warning: Low velocity may affect signal quality');
    }
    notes.push('Ensure adequate straight run upstream/downstream');
  } else if (input.meterType === 'coriolis') {
    notes.push('Coriolis meters measure mass flow directly');
    notes.push('Less sensitive to velocity, but check pressure drop');
  } else if (input.meterType === 'vortex') {
    if (reynoldsNumber < 20000) {
      notes.push('Warning: Reynolds number below 20,000 - vortex formation unreliable');
      suitable = false;
    }
    if (velocityMin < 0.5) {
      notes.push('Warning: Minimum velocity may be below vortex shedding threshold');
    }
  } else if (input.meterType === 'turbine') {
    if (reynoldsNumber < 4000) {
      notes.push('Warning: Laminar flow region - turbine meter inaccurate');
      suitable = false;
    }
  } else if (input.meterType === 'orifice') {
    notes.push('Orifice plate sizing requires separate calculation');
    notes.push('Beta ratio typically 0.3 to 0.7');
  }

  notes.push(`Reynolds number: ${reynoldsNumber.toFixed(0)}`);
  notes.push(`Turndown ratio: ${turndownRatio.toFixed(1)}:1`);

  if (turndownRatio > 100) {
    notes.push('Warning: High turndown ratio - consider multiple meters or different technology');
  }

  // Size reduction recommendation for high velocity
  if (velocityMax > 6 && input.meterType !== 'coriolis') {
    const suggestedDiameter = Math.ceil(input.pipeDiameter * Math.sqrt(velocityMax / 5));
    notes.push(`Consider upsizing to DN${suggestedDiameter} to reduce velocity`);
  }

  return {
    recommendedSize,
    velocityMin: Math.round(velocityMin * 100) / 100,
    velocityNormal: Math.round(velocityNormal * 100) / 100,
    velocityMax: Math.round(velocityMax * 100) / 100,
    reynoldsNumber: Math.round(reynoldsNumber),
    turndownRatio: Math.round(turndownRatio * 10) / 10,
    suitable,
    notes,
  };
};

// ============================================================================
// REYNOLDS NUMBER CALCULATOR
// ============================================================================

export interface ReynoldsInput {
  velocity: number; // m/s
  diameter: number; // mm
  density: number; // kg/m³
  viscosity: number; // cP (centipoise)
}

export const calculateReynoldsNumber = (input: ReynoldsInput): number => {
  // Re = ρ × v × D / μ
  const viscosityPaS = input.viscosity / 1000; // Convert cP to Pa·s
  const diameterM = input.diameter / 1000; // Convert mm to m
  return (input.density * input.velocity * diameterM) / viscosityPaS;
};

export const getFlowRegime = (reynolds: number): string => {
  if (reynolds < 2300) {
    return 'Laminar';
  } else if (reynolds < 4000) {
    return 'Transitional';
  } else {
    return 'Turbulent';
  }
};

// ============================================================================
// ORIFICE PLATE SIZING (ISO 5167)
// ============================================================================

export interface OrificeCalculationInput {
  flowRate: number; // m³/h
  pipeDiameter: number; // mm
  density: number; // kg/m³
  differentialPressure: number; // mbar (millibars)
  fluidType: 'liquid' | 'gas';
}

export interface OrificeCalculationResult {
  boreDiameter: number; // mm
  betaRatio: number;
  dischargeCoefficient: number;
  permanentPressureLoss: number; // % of DP
  notes: string[];
}

export const calculateOrificeBore = (input: OrificeCalculationInput): OrificeCalculationResult => {
  const notes: string[] = [];

  // Simplified orifice calculation
  // Q = Cd × A × √(2 × ΔP / ρ)
  // Where A is orifice area

  const flowRateM3s = input.flowRate / 3600;
  const deltaPPa = input.differentialPressure * 100; // mbar to Pa

  // Iterative calculation to find bore diameter
  // Start with initial estimate of beta = 0.5
  let beta = 0.5;
  let iterations = 0;
  const maxIterations = 20;

  while (iterations < maxIterations) {
    // Discharge coefficient approximation (Reader-Harris/Gallagher equation simplified)
    const cd = 0.5959 + 0.0312 * Math.pow(beta, 2.1) - 0.184 * Math.pow(beta, 8);

    // Calculate required orifice area
    const requiredArea = flowRateM3s / (cd * Math.sqrt(2 * deltaPPa / input.density));

    // Calculate bore diameter
    const boreDiameter = Math.sqrt(4 * requiredArea / Math.PI) * 1000; // Convert to mm

    // Calculate new beta
    const newBeta = boreDiameter / input.pipeDiameter;

    if (Math.abs(newBeta - beta) < 0.001) {
      beta = newBeta;
      break;
    }

    beta = newBeta;
    iterations++;
  }

  const boreDiameter = beta * input.pipeDiameter;
  const cd = 0.5959 + 0.0312 * Math.pow(beta, 2.1) - 0.184 * Math.pow(beta, 8);

  // Permanent pressure loss (approximately)
  const permanentPressureLoss = (1 - Math.pow(beta, 2)) * 100;

  // Validation
  if (beta < 0.2) {
    notes.push('Warning: Beta ratio below 0.2 - consider smaller DP');
  } else if (beta > 0.75) {
    notes.push('Warning: Beta ratio above 0.75 - consider higher DP or larger pipe');
  } else {
    notes.push('Beta ratio within recommended range (0.2-0.75)');
  }

  notes.push('Calculation per ISO 5167 (simplified)');
  notes.push('Verify with full ISO 5167 calculation for final sizing');

  return {
    boreDiameter: Math.round(boreDiameter * 10) / 10,
    betaRatio: Math.round(beta * 1000) / 1000,
    dischargeCoefficient: Math.round(cd * 10000) / 10000,
    permanentPressureLoss: Math.round(permanentPressureLoss),
    notes,
  };
};
