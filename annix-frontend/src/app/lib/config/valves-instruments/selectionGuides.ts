// Valves, Meters & Instruments Module - Selection Guides & Helpers
// Engineering guides for valve and instrument selection

// ============================================================================
// MATERIAL COMPATIBILITY CHECKER
// ============================================================================

export type CompatibilityRating = 'excellent' | 'good' | 'fair' | 'poor' | 'not_recommended';

export interface MaterialCompatibility {
  material: string;
  rating: CompatibilityRating;
  maxTemp?: number; // °C
  notes?: string;
}

export interface FluidCompatibilityData {
  fluid: string;
  category: 'acid' | 'alkali' | 'solvent' | 'hydrocarbon' | 'water' | 'gas' | 'slurry' | 'food' | 'other';
  materials: MaterialCompatibility[];
}

export const FLUID_MATERIAL_COMPATIBILITY: FluidCompatibilityData[] = [
  {
    fluid: 'Water (Clean)',
    category: 'water',
    materials: [
      { material: 'ss_316', rating: 'excellent', maxTemp: 200 },
      { material: 'ss_304', rating: 'excellent', maxTemp: 200 },
      { material: 'carbon_steel', rating: 'good', maxTemp: 150, notes: 'May corrode over time' },
      { material: 'bronze', rating: 'excellent', maxTemp: 120 },
      { material: 'cast_iron', rating: 'good', maxTemp: 120 },
      { material: 'pvc', rating: 'excellent', maxTemp: 60 },
      { material: 'ptfe', rating: 'excellent', maxTemp: 200 },
    ],
  },
  {
    fluid: 'Seawater',
    category: 'water',
    materials: [
      { material: 'ss_316', rating: 'good', maxTemp: 80, notes: 'Risk of pitting above 50°C' },
      { material: 'super_duplex', rating: 'excellent', maxTemp: 150 },
      { material: 'monel', rating: 'excellent', maxTemp: 200 },
      { material: 'titanium', rating: 'excellent', maxTemp: 150 },
      { material: 'bronze', rating: 'good', maxTemp: 80 },
      { material: 'carbon_steel', rating: 'poor', notes: 'Rapid corrosion' },
    ],
  },
  {
    fluid: 'Sulfuric Acid (<70%)',
    category: 'acid',
    materials: [
      { material: 'ss_316', rating: 'fair', maxTemp: 40, notes: 'Concentration dependent' },
      { material: 'hastelloy_c', rating: 'excellent', maxTemp: 100 },
      { material: 'ptfe', rating: 'excellent', maxTemp: 200 },
      { material: 'pvdf', rating: 'excellent', maxTemp: 100 },
      { material: 'carbon_steel', rating: 'not_recommended' },
      { material: 'cast_iron', rating: 'fair', maxTemp: 40, notes: 'Only for concentrated (>70%)' },
    ],
  },
  {
    fluid: 'Hydrochloric Acid',
    category: 'acid',
    materials: [
      { material: 'hastelloy_c', rating: 'excellent', maxTemp: 80 },
      { material: 'tantalum', rating: 'excellent', maxTemp: 150 },
      { material: 'ptfe', rating: 'excellent', maxTemp: 200 },
      { material: 'pvdf', rating: 'good', maxTemp: 80 },
      { material: 'ss_316', rating: 'not_recommended', notes: 'Rapid attack' },
      { material: 'carbon_steel', rating: 'not_recommended' },
    ],
  },
  {
    fluid: 'Sodium Hydroxide (Caustic)',
    category: 'alkali',
    materials: [
      { material: 'ss_316', rating: 'excellent', maxTemp: 80 },
      { material: 'ss_304', rating: 'good', maxTemp: 60 },
      { material: 'carbon_steel', rating: 'good', maxTemp: 80, notes: 'Below 50% concentration' },
      { material: 'monel', rating: 'excellent', maxTemp: 100 },
      { material: 'ptfe', rating: 'excellent', maxTemp: 200 },
      { material: 'pvc', rating: 'good', maxTemp: 50 },
    ],
  },
  {
    fluid: 'Crude Oil',
    category: 'hydrocarbon',
    materials: [
      { material: 'carbon_steel', rating: 'good', maxTemp: 150, notes: 'Check H2S content' },
      { material: 'ss_316', rating: 'excellent', maxTemp: 200 },
      { material: 'duplex', rating: 'excellent', maxTemp: 200, notes: 'For sour service' },
      { material: 'buna_n', rating: 'excellent', maxTemp: 80, notes: 'Seals' },
      { material: 'viton', rating: 'excellent', maxTemp: 150, notes: 'Seals' },
    ],
  },
  {
    fluid: 'Natural Gas',
    category: 'gas',
    materials: [
      { material: 'carbon_steel', rating: 'excellent', maxTemp: 200 },
      { material: 'ss_316', rating: 'excellent', maxTemp: 200 },
      { material: 'duplex', rating: 'excellent', maxTemp: 200, notes: 'For sour gas' },
      { material: 'buna_n', rating: 'good', maxTemp: 80, notes: 'Seals' },
      { material: 'viton', rating: 'excellent', maxTemp: 150, notes: 'Seals' },
    ],
  },
  {
    fluid: 'Steam',
    category: 'water',
    materials: [
      { material: 'carbon_steel', rating: 'excellent', maxTemp: 400 },
      { material: 'ss_316', rating: 'excellent', maxTemp: 500 },
      { material: 'cast_iron', rating: 'good', maxTemp: 200, notes: 'Low pressure only' },
      { material: 'graphite', rating: 'excellent', maxTemp: 450, notes: 'Packing/gaskets' },
      { material: 'ptfe', rating: 'not_recommended', notes: 'Temperature limit' },
    ],
  },
  {
    fluid: 'Ammonia',
    category: 'gas',
    materials: [
      { material: 'carbon_steel', rating: 'excellent', maxTemp: 100 },
      { material: 'ss_316', rating: 'excellent', maxTemp: 150 },
      { material: 'ptfe', rating: 'excellent', maxTemp: 150 },
      { material: 'viton', rating: 'not_recommended', notes: 'Chemical attack' },
      { material: 'buna_n', rating: 'fair', maxTemp: 50 },
      { material: 'epdm', rating: 'good', maxTemp: 100 },
    ],
  },
  {
    fluid: 'Chlorine Gas',
    category: 'gas',
    materials: [
      { material: 'hastelloy_c', rating: 'excellent', maxTemp: 150 },
      { material: 'titanium', rating: 'excellent', maxTemp: 150, notes: 'Dry chlorine only' },
      { material: 'ptfe', rating: 'excellent', maxTemp: 150 },
      { material: 'pvc', rating: 'good', maxTemp: 50 },
      { material: 'carbon_steel', rating: 'good', maxTemp: 100, notes: 'Dry chlorine only' },
      { material: 'ss_316', rating: 'not_recommended', notes: 'Pitting corrosion' },
    ],
  },
  {
    fluid: 'Slurry (Abrasive)',
    category: 'slurry',
    materials: [
      { material: 'rubber_lined', rating: 'excellent', maxTemp: 80 },
      { material: 'ceramic', rating: 'excellent', maxTemp: 150 },
      { material: 'tungsten_carbide', rating: 'excellent', maxTemp: 200 },
      { material: 'ni_hard', rating: 'good', maxTemp: 150 },
      { material: 'ss_316', rating: 'fair', notes: 'Erosion wear' },
    ],
  },
  {
    fluid: 'Food Products (Dairy/Beverage)',
    category: 'food',
    materials: [
      { material: 'ss_316l', rating: 'excellent', maxTemp: 150, notes: 'Electropolished preferred' },
      { material: 'ptfe', rating: 'excellent', maxTemp: 150 },
      { material: 'epdm', rating: 'excellent', maxTemp: 100, notes: 'FDA approved' },
      { material: 'silicone', rating: 'excellent', maxTemp: 150, notes: 'FDA approved' },
    ],
  },
];

export const checkMaterialCompatibility = (
  fluid: string,
  material: string
): MaterialCompatibility | null => {
  const fluidData = FLUID_MATERIAL_COMPATIBILITY.find(
    f => f.fluid.toLowerCase() === fluid.toLowerCase()
  );
  if (!fluidData) return null;

  return fluidData.materials.find(m => m.material === material) ?? null;
};

export const getMaterialsForFluid = (fluid: string): MaterialCompatibility[] => {
  const fluidData = FLUID_MATERIAL_COMPATIBILITY.find(
    f => f.fluid.toLowerCase() === fluid.toLowerCase()
  );
  return fluidData?.materials ?? [];
};

export const getRecommendedMaterials = (fluid: string): MaterialCompatibility[] => {
  const materials = getMaterialsForFluid(fluid);
  return materials.filter(m => m.rating === 'excellent' || m.rating === 'good');
};

// ============================================================================
// ISA TAG NUMBER GENERATOR
// ============================================================================

export interface ISATagComponents {
  firstLetter: string; // Measured/initiating variable
  subsequentLetters: string; // Modifier, readout, output
  loopNumber: string; // Loop identifier
  suffix?: string; // Additional identifier
}

export const ISA_FIRST_LETTERS: Record<string, { letter: string; description: string }> = {
  A: { letter: 'A', description: 'Analysis (composition)' },
  B: { letter: 'B', description: 'Burner/Combustion' },
  C: { letter: 'C', description: 'User Choice (typically Conductivity)' },
  D: { letter: 'D', description: 'User Choice (typically Density)' },
  E: { letter: 'E', description: 'Voltage' },
  F: { letter: 'F', description: 'Flow Rate' },
  G: { letter: 'G', description: 'User Choice (typically Gauging/Position)' },
  H: { letter: 'H', description: 'Hand (manual)' },
  I: { letter: 'I', description: 'Current (electrical)' },
  J: { letter: 'J', description: 'Power' },
  K: { letter: 'K', description: 'Time/Schedule' },
  L: { letter: 'L', description: 'Level' },
  M: { letter: 'M', description: 'User Choice (typically Moisture)' },
  N: { letter: 'N', description: 'User Choice' },
  O: { letter: 'O', description: 'User Choice' },
  P: { letter: 'P', description: 'Pressure/Vacuum' },
  Q: { letter: 'Q', description: 'Quantity/Event' },
  R: { letter: 'R', description: 'Radiation' },
  S: { letter: 'S', description: 'Speed/Frequency' },
  T: { letter: 'T', description: 'Temperature' },
  U: { letter: 'U', description: 'Multivariable' },
  V: { letter: 'V', description: 'Vibration' },
  W: { letter: 'W', description: 'Weight/Force' },
  X: { letter: 'X', description: 'Unclassified' },
  Y: { letter: 'Y', description: 'Event/State/Presence' },
  Z: { letter: 'Z', description: 'Position/Dimension' },
};

export const ISA_SUBSEQUENT_LETTERS: Record<string, { letter: string; description: string; type: string }> = {
  A: { letter: 'A', description: 'Alarm', type: 'output' },
  C: { letter: 'C', description: 'Control', type: 'output' },
  D: { letter: 'D', description: 'Differential', type: 'modifier' },
  E: { letter: 'E', description: 'Sensor/Element', type: 'readout' },
  F: { letter: 'F', description: 'Ratio', type: 'modifier' },
  G: { letter: 'G', description: 'Glass/Gauge', type: 'readout' },
  H: { letter: 'H', description: 'High', type: 'modifier' },
  I: { letter: 'I', description: 'Indicate', type: 'readout' },
  K: { letter: 'K', description: 'Control Station', type: 'output' },
  L: { letter: 'L', description: 'Low', type: 'modifier' },
  Q: { letter: 'Q', description: 'Integrate/Totalize', type: 'modifier' },
  R: { letter: 'R', description: 'Record', type: 'readout' },
  S: { letter: 'S', description: 'Switch', type: 'output' },
  T: { letter: 'T', description: 'Transmit', type: 'readout' },
  V: { letter: 'V', description: 'Valve/Damper', type: 'output' },
  W: { letter: 'W', description: 'Well/Probe', type: 'readout' },
  Y: { letter: 'Y', description: 'Relay/Compute', type: 'output' },
  Z: { letter: 'Z', description: 'Final Element/Actuator', type: 'output' },
};

export interface ISATagGeneratorInput {
  measuredVariable: keyof typeof ISA_FIRST_LETTERS;
  modifiers?: ('D' | 'F' | 'H' | 'L' | 'Q')[];
  readout?: ('E' | 'G' | 'I' | 'R' | 'T' | 'W')[];
  output?: ('A' | 'C' | 'K' | 'S' | 'V' | 'Y' | 'Z')[];
  loopNumber: string;
  suffix?: string;
}

export const generateISATag = (input: ISATagGeneratorInput): string => {
  let tag = input.measuredVariable;

  if (input.modifiers) {
    tag += input.modifiers.join('');
  }
  if (input.readout) {
    tag += input.readout.join('');
  }
  if (input.output) {
    tag += input.output.join('');
  }

  tag += '-' + input.loopNumber;

  if (input.suffix) {
    tag += input.suffix;
  }

  return tag;
};

export const parseISATag = (tag: string): ISATagComponents | null => {
  const match = tag.match(/^([A-Z]+)-(\d+)([A-Z]*)$/);
  if (!match) return null;

  const letters = match[1];
  return {
    firstLetter: letters[0],
    subsequentLetters: letters.slice(1),
    loopNumber: match[2],
    suffix: match[3] || undefined,
  };
};

export const describeISATag = (tag: string): string[] => {
  const parsed = parseISATag(tag);
  if (!parsed) return ['Invalid tag format'];

  const descriptions: string[] = [];

  const firstLetter = ISA_FIRST_LETTERS[parsed.firstLetter];
  if (firstLetter) {
    descriptions.push(`Measured Variable: ${firstLetter.description}`);
  }

  for (const letter of parsed.subsequentLetters) {
    const subsequent = ISA_SUBSEQUENT_LETTERS[letter];
    if (subsequent) {
      descriptions.push(`${subsequent.type}: ${subsequent.description}`);
    }
  }

  descriptions.push(`Loop Number: ${parsed.loopNumber}`);

  if (parsed.suffix) {
    descriptions.push(`Suffix: ${parsed.suffix}`);
  }

  return descriptions;
};

// Common ISA tag examples
export const COMMON_ISA_TAGS = [
  { tag: 'FT-101', description: 'Flow Transmitter, Loop 101' },
  { tag: 'FIC-101', description: 'Flow Indicating Controller, Loop 101' },
  { tag: 'FCV-101', description: 'Flow Control Valve, Loop 101' },
  { tag: 'PT-201', description: 'Pressure Transmitter, Loop 201' },
  { tag: 'PIC-201', description: 'Pressure Indicating Controller, Loop 201' },
  { tag: 'PSV-201', description: 'Pressure Safety Valve, Loop 201' },
  { tag: 'LT-301', description: 'Level Transmitter, Loop 301' },
  { tag: 'LIC-301', description: 'Level Indicating Controller, Loop 301' },
  { tag: 'LSHH-301', description: 'Level Switch High-High, Loop 301' },
  { tag: 'TT-401', description: 'Temperature Transmitter, Loop 401' },
  { tag: 'TIC-401', description: 'Temperature Indicating Controller, Loop 401' },
  { tag: 'TE-401', description: 'Temperature Element, Loop 401' },
  { tag: 'TW-401', description: 'Temperature Well (Thermowell), Loop 401' },
  { tag: 'PDT-501', description: 'Differential Pressure Transmitter, Loop 501' },
  { tag: 'AIT-601', description: 'Analytical Indicating Transmitter, Loop 601' },
  { tag: 'HV-701', description: 'Hand Valve (Manual), Loop 701' },
  { tag: 'XV-801', description: 'On/Off Valve (Solenoid/Actuated), Loop 801' },
];

// ============================================================================
// VALVE SELECTION GUIDE BY APPLICATION
// ============================================================================

export interface ValveSelectionGuide {
  application: string;
  description: string;
  recommendedValveTypes: string[];
  considerations: string[];
  notRecommended?: string[];
}

export const VALVE_SELECTION_GUIDES: ValveSelectionGuide[] = [
  {
    application: 'On/Off Isolation',
    description: 'General purpose isolation service with infrequent operation',
    recommendedValveTypes: ['ball_valve', 'gate_valve', 'butterfly_valve', 'plug_valve'],
    considerations: [
      'Ball valve: Best for quick shutoff, bubble-tight seal',
      'Gate valve: Full bore, low pressure drop, slow operation',
      'Butterfly valve: Compact, economical for large sizes',
      'Plug valve: Quick operation, good for frequent cycling',
    ],
    notRecommended: ['globe_valve', 'control_globe'],
  },
  {
    application: 'Flow Control/Throttling',
    description: 'Modulating flow control with variable position operation',
    recommendedValveTypes: ['control_globe', 'control_ball', 'control_butterfly'],
    considerations: [
      'Globe valve: Best throttling characteristics, wide rangeability',
      'V-port ball: High capacity, good for severe service',
      'Butterfly: Economical for large sizes, limited rangeability',
      'Consider actuator type and positioner requirements',
    ],
    notRecommended: ['gate_valve', 'check_valve'],
  },
  {
    application: 'Backflow Prevention',
    description: 'Prevent reverse flow in piping systems',
    recommendedValveTypes: ['swing_check', 'dual_plate_check', 'lift_check', 'tilting_disc_check'],
    considerations: [
      'Swing check: General service, horizontal/vertical down flow',
      'Dual plate: Compact, low pressure drop, fast closing',
      'Lift check: High pressure, steam, compressible fluids',
      'Tilting disc: Reduced water hammer, high velocity',
    ],
  },
  {
    application: 'Pressure Relief/Safety',
    description: 'Overpressure protection for vessels and systems',
    recommendedValveTypes: ['safety_relief', 'pilot_operated_prv', 'rupture_disc'],
    considerations: [
      'PSV: Spring-loaded, general overpressure protection',
      'Pilot operated: Higher pressure, tight shutoff',
      'Rupture disc: Fast opening, non-reclosing, corrosive service',
      'Must be sized per API 520/521, certified per API 526',
    ],
  },
  {
    application: 'Slurry/Abrasive Service',
    description: 'Handling fluids with suspended solids or abrasive particles',
    recommendedValveTypes: ['knife_gate', 'pinch_valve', 'diaphragm_valve', 'plug_valve'],
    considerations: [
      'Knife gate: Full port, shearing action for fibrous materials',
      'Pinch valve: Rubber sleeve, excellent for abrasives',
      'Diaphragm: Weir or straight-through, no dead zones',
      'Avoid ball valves (seat damage) and butterfly (erosion)',
    ],
    notRecommended: ['ball_valve', 'butterfly_valve', 'globe_valve'],
  },
  {
    application: 'Corrosive Chemical Service',
    description: 'Handling aggressive chemicals and acids',
    recommendedValveTypes: ['diaphragm_valve', 'ball_valve', 'butterfly_valve'],
    considerations: [
      'Diaphragm: Isolates mechanism from process',
      'Lined ball/butterfly: PTFE or PFA lined for corrosion resistance',
      'Consider exotic alloys (Hastelloy, Titanium) for metallic parts',
      'Verify all wetted materials compatibility',
    ],
  },
  {
    application: 'High Temperature Service (>400°C)',
    description: 'Steam, thermal oil, and high temperature process fluids',
    recommendedValveTypes: ['gate_valve', 'globe_valve', 'ball_valve'],
    considerations: [
      'Metal-to-metal seating required',
      'Extended bonnet for packing protection',
      'High temperature packing (graphite)',
      'Consider thermal expansion and cycling',
    ],
    notRecommended: ['butterfly_valve', 'diaphragm_valve', 'pinch_valve'],
  },
  {
    application: 'Cryogenic Service (<-50°C)',
    description: 'LNG, liquid nitrogen, and cryogenic processes',
    recommendedValveTypes: ['ball_valve', 'gate_valve', 'globe_valve', 'butterfly_valve'],
    considerations: [
      'Extended bonnet to protect packing',
      'Cryogenic tested per BS 6364',
      'Impact tested materials (Charpy)',
      'Consider thermal contraction',
    ],
  },
  {
    application: 'Sanitary/Hygienic',
    description: 'Food, beverage, pharmaceutical, and biotech applications',
    recommendedValveTypes: ['diaphragm_valve', 'ball_valve', 'butterfly_valve'],
    considerations: [
      'Electropolished surfaces (Ra < 0.8 µm)',
      'Tri-clamp or DIN 11851 connections',
      'FDA/3-A compliant materials',
      'CIP/SIP cleanable design',
    ],
  },
  {
    application: 'Emergency Shutdown (ESD)',
    description: 'Safety critical isolation requiring fast, reliable closure',
    recommendedValveTypes: ['ball_valve', 'butterfly_valve'],
    considerations: [
      'Quarter-turn for fast operation',
      'SIL rated actuator and accessories',
      'Fire-safe design (API 607)',
      'Fail-safe spring return actuator',
      'Limit switches for position feedback',
    ],
  },
];

export const getValveRecommendation = (application: string): ValveSelectionGuide | undefined => {
  return VALVE_SELECTION_GUIDES.find(
    g => g.application.toLowerCase() === application.toLowerCase()
  );
};

// ============================================================================
// FLOWMETER SELECTION GUIDE BY FLUID TYPE
// ============================================================================

export interface FlowmeterSelectionGuide {
  fluidType: string;
  characteristics: string[];
  recommendedMeters: string[];
  considerations: string[];
  notRecommended?: string[];
}

export const FLOWMETER_SELECTION_GUIDES: FlowmeterSelectionGuide[] = [
  {
    fluidType: 'Clean Water',
    characteristics: ['Conductive', 'Low viscosity', 'No solids'],
    recommendedMeters: ['mag_flowmeter', 'ultrasonic_flowmeter', 'turbine_flowmeter', 'vortex_flowmeter'],
    considerations: [
      'Electromagnetic: Best accuracy, no pressure drop',
      'Ultrasonic: Clamp-on available, no intrusion',
      'Turbine: High accuracy for custody transfer',
      'Vortex: Good for steam condensate return',
    ],
  },
  {
    fluidType: 'Wastewater/Slurry',
    characteristics: ['Conductive', 'Contains solids', 'Variable composition'],
    recommendedMeters: ['mag_flowmeter', 'ultrasonic_flowmeter'],
    considerations: [
      'Electromagnetic: Handles solids, no obstruction',
      'Use ceramic or rubber liner for abrasion',
      'Empty pipe detection recommended',
      'Consider insertion type for large pipes',
    ],
    notRecommended: ['turbine_flowmeter', 'orifice_plate', 'vortex_flowmeter'],
  },
  {
    fluidType: 'Non-Conductive Liquids (Hydrocarbons)',
    characteristics: ['Non-conductive', 'Clean', 'Low viscosity'],
    recommendedMeters: ['ultrasonic_flowmeter', 'coriolis_flowmeter', 'turbine_flowmeter', 'vortex_flowmeter'],
    considerations: [
      'Ultrasonic: Transit-time type, good accuracy',
      'Coriolis: Direct mass flow, density measurement',
      'Turbine: Custody transfer standard',
      'Mag flowmeter NOT suitable (non-conductive)',
    ],
    notRecommended: ['mag_flowmeter'],
  },
  {
    fluidType: 'Viscous Liquids (>100 cP)',
    characteristics: ['High viscosity', 'May be heated', 'Shear sensitive'],
    recommendedMeters: ['coriolis_flowmeter', 'variable_area', 'orifice_plate'],
    considerations: [
      'Coriolis: Unaffected by viscosity',
      'Consider pressure drop and heating',
      'Turbine and vortex not suitable',
      'May need heat tracing',
    ],
    notRecommended: ['turbine_flowmeter', 'vortex_flowmeter', 'ultrasonic_flowmeter'],
  },
  {
    fluidType: 'Natural Gas',
    characteristics: ['Compressible', 'Clean', 'Variable pressure'],
    recommendedMeters: ['ultrasonic_flowmeter', 'turbine_flowmeter', 'orifice_plate', 'coriolis_flowmeter'],
    considerations: [
      'Ultrasonic: Multipath for custody transfer',
      'Turbine: AGA 7 compliant',
      'Orifice: AGA 3 / ISO 5167 standard',
      'Coriolis: Direct mass flow, expensive',
      'Pressure and temperature compensation required',
    ],
  },
  {
    fluidType: 'Steam',
    characteristics: ['Compressible', 'High temperature', 'Two-phase possible'],
    recommendedMeters: ['vortex_flowmeter', 'orifice_plate', 'variable_area'],
    considerations: [
      'Vortex: Preferred for saturated steam',
      'Orifice: Traditional, well understood',
      'Pressure/temperature compensation essential',
      'Consider wet steam effects',
      'High temperature materials required',
    ],
    notRecommended: ['mag_flowmeter', 'turbine_flowmeter'],
  },
  {
    fluidType: 'Compressed Air',
    characteristics: ['Compressible', 'Clean', 'Dry or wet'],
    recommendedMeters: ['vortex_flowmeter', 'ultrasonic_flowmeter', 'orifice_plate'],
    considerations: [
      'Vortex: Good for plant air distribution',
      'Thermal mass: Direct mass flow for air',
      'Consider moisture content',
      'Temperature compensation may be needed',
    ],
  },
  {
    fluidType: 'Cryogenic Liquids',
    characteristics: ['Very cold', 'May flash', 'Sensitive to heat ingress'],
    recommendedMeters: ['coriolis_flowmeter', 'turbine_flowmeter', 'orifice_plate'],
    considerations: [
      'Cryogenic rated materials required',
      'Minimize heat ingress',
      'Coriolis: Good for custody transfer',
      'Turbine: Proven technology for LNG',
      'Pressure drop can cause flashing',
    ],
  },
  {
    fluidType: 'Food/Beverage',
    characteristics: ['Hygienic', 'May contain pulp', 'CIP cleaning'],
    recommendedMeters: ['mag_flowmeter', 'coriolis_flowmeter'],
    considerations: [
      'Electromagnetic: No obstructions, CIP compatible',
      'Coriolis: Mass flow for batching accuracy',
      '3-A or EHEDG certification required',
      'Electropolished wetted surfaces',
      'Sanitary connections (tri-clamp)',
    ],
  },
  {
    fluidType: 'Chemicals/Acids',
    characteristics: ['Corrosive', 'Various viscosities', 'May be hazardous'],
    recommendedMeters: ['mag_flowmeter', 'coriolis_flowmeter', 'variable_area'],
    considerations: [
      'Verify material compatibility',
      'PTFE/PFA liners for mag flowmeters',
      'Hastelloy or Tantalum for severe service',
      'Containment considerations',
    ],
  },
];

export const getFlowmeterRecommendation = (fluidType: string): FlowmeterSelectionGuide | undefined => {
  return FLOWMETER_SELECTION_GUIDES.find(
    g => g.fluidType.toLowerCase() === fluidType.toLowerCase()
  );
};

// ============================================================================
// P&ID SYMBOL REFERENCES
// ============================================================================

export interface PIDSymbol {
  type: string;
  name: string;
  description: string;
  symbol: string; // Unicode/ASCII representation
  isaTag: string; // Typical ISA tag prefix
}

export const VALVE_PID_SYMBOLS: PIDSymbol[] = [
  { type: 'gate_valve', name: 'Gate Valve', description: 'Linear isolation valve', symbol: '><', isaTag: 'HV/XV' },
  { type: 'globe_valve', name: 'Globe Valve', description: 'Linear throttling valve', symbol: '>O<', isaTag: 'FV/TV/PV' },
  { type: 'ball_valve', name: 'Ball Valve', description: 'Quarter-turn isolation', symbol: '>●<', isaTag: 'HV/XV' },
  { type: 'butterfly_valve', name: 'Butterfly Valve', description: 'Quarter-turn, disc', symbol: '>|<', isaTag: 'HV/XV/FV' },
  { type: 'plug_valve', name: 'Plug Valve', description: 'Quarter-turn, plug', symbol: '>▮<', isaTag: 'HV/XV' },
  { type: 'check_valve', name: 'Check Valve', description: 'Backflow prevention', symbol: '>⊳', isaTag: '-' },
  { type: 'safety_relief', name: 'Safety/Relief Valve', description: 'Overpressure protection', symbol: '>⊢', isaTag: 'PSV' },
  { type: 'control_valve', name: 'Control Valve', description: 'Modulating control', symbol: '>◊<', isaTag: 'FCV/TCV/PCV/LCV' },
  { type: 'three_way_valve', name: 'Three-Way Valve', description: 'Mixing/diverting', symbol: '>⋔<', isaTag: 'FV/TV' },
  { type: 'needle_valve', name: 'Needle Valve', description: 'Fine adjustment', symbol: '>∧<', isaTag: 'HV' },
  { type: 'diaphragm_valve', name: 'Diaphragm Valve', description: 'Weir type', symbol: '>⌒<', isaTag: 'HV/XV' },
  { type: 'solenoid_valve', name: 'Solenoid Valve', description: 'Electrically operated', symbol: '>⚡<', isaTag: 'SV/XV' },
];

export const INSTRUMENT_PID_SYMBOLS: PIDSymbol[] = [
  { type: 'transmitter', name: 'Transmitter', description: 'Field mounted transmitter', symbol: '○', isaTag: 'FT/PT/LT/TT' },
  { type: 'indicator_local', name: 'Local Indicator', description: 'Field mounted indicator', symbol: '○', isaTag: 'FI/PI/LI/TI' },
  { type: 'indicator_panel', name: 'Panel Indicator', description: 'Control room indicator', symbol: '□', isaTag: 'FI/PI/LI/TI' },
  { type: 'controller', name: 'Controller', description: 'Control function', symbol: '□', isaTag: 'FIC/PIC/LIC/TIC' },
  { type: 'recorder', name: 'Recorder', description: 'Recording function', symbol: '□', isaTag: 'FR/PR/LR/TR' },
  { type: 'switch', name: 'Switch', description: 'On/off switching', symbol: '○', isaTag: 'FSL/PSH/LSH/TSH' },
  { type: 'element', name: 'Primary Element', description: 'Sensor/element', symbol: '○', isaTag: 'FE/TE/PE' },
  { type: 'orifice', name: 'Orifice Plate', description: 'Flow restriction', symbol: '|—|', isaTag: 'FE' },
  { type: 'thermowell', name: 'Thermowell', description: 'Temperature well', symbol: '○', isaTag: 'TW' },
];

export const getValvePIDSymbol = (valveType: string): PIDSymbol | undefined => {
  return VALVE_PID_SYMBOLS.find(s => s.type === valveType);
};

export const getInstrumentPIDSymbol = (instrumentType: string): PIDSymbol | undefined => {
  return INSTRUMENT_PID_SYMBOLS.find(s => s.type === instrumentType);
};
