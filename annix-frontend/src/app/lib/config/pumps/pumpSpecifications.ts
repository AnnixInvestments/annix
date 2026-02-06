// Pumps & Pump Parts Module - Specification Fields
// Used for RFQ forms and pricing calculations

export interface SpecificationField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'boolean';
  unit?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  helpText?: string;
  category: 'performance' | 'construction' | 'motor' | 'environment' | 'certification';
}

// Performance Specifications
export const PERFORMANCE_SPECS: SpecificationField[] = [
  {
    name: 'flowRate',
    label: 'Flow Rate',
    type: 'number',
    unit: 'm³/h',
    required: true,
    helpText: 'Required volumetric flow rate at operating point',
    category: 'performance',
  },
  {
    name: 'totalHead',
    label: 'Total Head (TDH)',
    type: 'number',
    unit: 'm',
    required: true,
    helpText: 'Total dynamic head required',
    category: 'performance',
  },
  {
    name: 'suctionHead',
    label: 'Suction Head / Lift',
    type: 'number',
    unit: 'm',
    helpText: 'Positive for flooded suction, negative for suction lift',
    category: 'performance',
  },
  {
    name: 'npshAvailable',
    label: 'NPSHa (Available)',
    type: 'number',
    unit: 'm',
    helpText: 'Net Positive Suction Head available at pump inlet',
    category: 'performance',
  },
  {
    name: 'dischargePressure',
    label: 'Discharge Pressure',
    type: 'number',
    unit: 'bar',
    helpText: 'Required discharge pressure',
    category: 'performance',
  },
  {
    name: 'operatingTemperature',
    label: 'Operating Temperature',
    type: 'number',
    unit: '°C',
    required: true,
    helpText: 'Normal operating temperature of pumped fluid',
    category: 'performance',
  },
];

// Fluid Properties
export const FLUID_SPECS: SpecificationField[] = [
  {
    name: 'fluidType',
    label: 'Fluid Type',
    type: 'select',
    required: true,
    options: [
      { value: 'water', label: 'Clean Water' },
      { value: 'wastewater', label: 'Wastewater/Effluent' },
      { value: 'seawater', label: 'Seawater/Brackish' },
      { value: 'chemical', label: 'Chemical Solution' },
      { value: 'oil', label: 'Oil/Petroleum' },
      { value: 'slurry', label: 'Slurry/Solids' },
      { value: 'food', label: 'Food Grade' },
      { value: 'other', label: 'Other (Specify)' },
    ],
    category: 'environment',
  },
  {
    name: 'specificGravity',
    label: 'Specific Gravity',
    type: 'number',
    helpText: 'Relative density (water = 1.0)',
    category: 'environment',
  },
  {
    name: 'viscosity',
    label: 'Viscosity',
    type: 'number',
    unit: 'cP',
    helpText: 'Dynamic viscosity at operating temperature',
    category: 'environment',
  },
  {
    name: 'solidsContent',
    label: 'Solids Content',
    type: 'number',
    unit: '%',
    helpText: 'Percentage of suspended solids by weight',
    category: 'environment',
  },
  {
    name: 'solidsSize',
    label: 'Max Solids Size',
    type: 'number',
    unit: 'mm',
    helpText: 'Maximum particle size in fluid',
    category: 'environment',
  },
  {
    name: 'ph',
    label: 'pH Level',
    type: 'number',
    helpText: 'pH value of the fluid (1-14)',
    category: 'environment',
  },
  {
    name: 'isAbrasive',
    label: 'Abrasive',
    type: 'boolean',
    helpText: 'Does fluid contain abrasive particles?',
    category: 'environment',
  },
  {
    name: 'isCorrosive',
    label: 'Corrosive',
    type: 'boolean',
    helpText: 'Is the fluid corrosive?',
    category: 'environment',
  },
];

// Construction Materials
export const MATERIAL_OPTIONS = {
  casing: [
    { value: 'cast_iron', label: 'Cast Iron (GG25/A48)' },
    { value: 'ductile_iron', label: 'Ductile Iron (GGG40/A536)' },
    { value: 'carbon_steel', label: 'Carbon Steel (A216 WCB)' },
    { value: 'ss_304', label: 'Stainless Steel 304 (CF8)' },
    { value: 'ss_316', label: 'Stainless Steel 316 (CF8M)' },
    { value: 'duplex', label: 'Duplex Stainless (CD4MCu)' },
    { value: 'super_duplex', label: 'Super Duplex (CD3MN)' },
    { value: 'bronze', label: 'Bronze' },
    { value: 'ni_alloy', label: 'Nickel Alloy (Monel/Hastelloy)' },
    { value: 'titanium', label: 'Titanium' },
    { value: 'lined', label: 'Rubber/PTFE Lined' },
  ],
  impeller: [
    { value: 'cast_iron', label: 'Cast Iron' },
    { value: 'bronze', label: 'Bronze' },
    { value: 'ss_304', label: 'Stainless Steel 304' },
    { value: 'ss_316', label: 'Stainless Steel 316' },
    { value: 'duplex', label: 'Duplex Stainless' },
    { value: 'high_chrome', label: 'High Chrome (A532)' },
    { value: 'ni_hard', label: 'Ni-Hard' },
    { value: 'rubber', label: 'Rubber Lined' },
    { value: 'polyurethane', label: 'Polyurethane' },
  ],
  shaft: [
    { value: 'carbon_steel', label: 'Carbon Steel' },
    { value: 'ss_410', label: 'Stainless Steel 410' },
    { value: 'ss_420', label: 'Stainless Steel 420' },
    { value: 'ss_316', label: 'Stainless Steel 316' },
    { value: 'duplex', label: 'Duplex Stainless' },
    { value: 'monel', label: 'Monel' },
  ],
  seal: [
    { value: 'gland_packing', label: 'Gland Packing' },
    { value: 'mechanical_single', label: 'Mechanical Seal - Single' },
    { value: 'mechanical_double', label: 'Mechanical Seal - Double' },
    { value: 'cartridge', label: 'Cartridge Seal' },
    { value: 'dry_running', label: 'Dry Running Seal' },
    { value: 'magnetic_drive', label: 'Magnetic Drive (Sealless)' },
  ],
};

export const CONSTRUCTION_SPECS: SpecificationField[] = [
  {
    name: 'casingMaterial',
    label: 'Casing Material',
    type: 'select',
    options: MATERIAL_OPTIONS.casing,
    required: true,
    category: 'construction',
  },
  {
    name: 'impellerMaterial',
    label: 'Impeller Material',
    type: 'select',
    options: MATERIAL_OPTIONS.impeller,
    required: true,
    category: 'construction',
  },
  {
    name: 'shaftMaterial',
    label: 'Shaft Material',
    type: 'select',
    options: MATERIAL_OPTIONS.shaft,
    category: 'construction',
  },
  {
    name: 'sealType',
    label: 'Seal Type',
    type: 'select',
    options: MATERIAL_OPTIONS.seal,
    required: true,
    category: 'construction',
  },
  {
    name: 'sealPlan',
    label: 'Seal Flush Plan',
    type: 'select',
    options: [
      { value: 'plan_11', label: 'Plan 11 - Recirculation from discharge' },
      { value: 'plan_13', label: 'Plan 13 - Recirculation from seal chamber' },
      { value: 'plan_21', label: 'Plan 21 - Cooled recirculation' },
      { value: 'plan_32', label: 'Plan 32 - External flush' },
      { value: 'plan_52', label: 'Plan 52 - Unpressurized buffer' },
      { value: 'plan_53a', label: 'Plan 53A - Pressurized barrier' },
      { value: 'plan_54', label: 'Plan 54 - External pressurized barrier' },
    ],
    helpText: 'API 682 seal flush plan',
    category: 'construction',
  },
];

// Motor Frame Sizes - IEC Standard
export const IEC_FRAME_SIZES = [
  { value: 'iec_56', label: 'IEC 56' },
  { value: 'iec_63', label: 'IEC 63' },
  { value: 'iec_71', label: 'IEC 71' },
  { value: 'iec_80', label: 'IEC 80' },
  { value: 'iec_90s', label: 'IEC 90S' },
  { value: 'iec_90l', label: 'IEC 90L' },
  { value: 'iec_100l', label: 'IEC 100L' },
  { value: 'iec_112m', label: 'IEC 112M' },
  { value: 'iec_132s', label: 'IEC 132S' },
  { value: 'iec_132m', label: 'IEC 132M' },
  { value: 'iec_160m', label: 'IEC 160M' },
  { value: 'iec_160l', label: 'IEC 160L' },
  { value: 'iec_180m', label: 'IEC 180M' },
  { value: 'iec_180l', label: 'IEC 180L' },
  { value: 'iec_200l', label: 'IEC 200L' },
  { value: 'iec_225s', label: 'IEC 225S' },
  { value: 'iec_225m', label: 'IEC 225M' },
  { value: 'iec_250m', label: 'IEC 250M' },
  { value: 'iec_280s', label: 'IEC 280S' },
  { value: 'iec_280m', label: 'IEC 280M' },
  { value: 'iec_315s', label: 'IEC 315S' },
  { value: 'iec_315m', label: 'IEC 315M' },
  { value: 'iec_315l', label: 'IEC 315L' },
  { value: 'iec_355m', label: 'IEC 355M' },
  { value: 'iec_355l', label: 'IEC 355L' },
];

// Motor Frame Sizes - NEMA Standard
export const NEMA_FRAME_SIZES = [
  { value: 'nema_42', label: 'NEMA 42' },
  { value: 'nema_48', label: 'NEMA 48' },
  { value: 'nema_56', label: 'NEMA 56' },
  { value: 'nema_56h', label: 'NEMA 56H' },
  { value: 'nema_143t', label: 'NEMA 143T' },
  { value: 'nema_145t', label: 'NEMA 145T' },
  { value: 'nema_182t', label: 'NEMA 182T' },
  { value: 'nema_184t', label: 'NEMA 184T' },
  { value: 'nema_213t', label: 'NEMA 213T' },
  { value: 'nema_215t', label: 'NEMA 215T' },
  { value: 'nema_254t', label: 'NEMA 254T' },
  { value: 'nema_256t', label: 'NEMA 256T' },
  { value: 'nema_284t', label: 'NEMA 284T' },
  { value: 'nema_286t', label: 'NEMA 286T' },
  { value: 'nema_324t', label: 'NEMA 324T' },
  { value: 'nema_326t', label: 'NEMA 326T' },
  { value: 'nema_364t', label: 'NEMA 364T' },
  { value: 'nema_365t', label: 'NEMA 365T' },
  { value: 'nema_404t', label: 'NEMA 404T' },
  { value: 'nema_405t', label: 'NEMA 405T' },
  { value: 'nema_444t', label: 'NEMA 444T' },
  { value: 'nema_445t', label: 'NEMA 445T' },
];

// Motor Specifications
export const MOTOR_SPECS: SpecificationField[] = [
  {
    name: 'motorType',
    label: 'Motor Type',
    type: 'select',
    options: [
      { value: 'electric_ac', label: 'Electric AC (Induction)' },
      { value: 'electric_vfd', label: 'Electric with VFD' },
      { value: 'diesel', label: 'Diesel Engine' },
      { value: 'hydraulic', label: 'Hydraulic' },
      { value: 'air', label: 'Air/Pneumatic' },
      { value: 'none', label: 'No Motor (Bare Shaft)' },
    ],
    required: true,
    category: 'motor',
  },
  {
    name: 'voltage',
    label: 'Voltage',
    type: 'select',
    options: [
      { value: '220_1ph', label: '220V Single Phase' },
      { value: '380_3ph', label: '380V Three Phase' },
      { value: '400_3ph', label: '400V Three Phase' },
      { value: '525_3ph', label: '525V Three Phase' },
      { value: '660_3ph', label: '660V Three Phase' },
      { value: '3300_3ph', label: '3.3kV Three Phase' },
      { value: '6600_3ph', label: '6.6kV Three Phase' },
      { value: '11000_3ph', label: '11kV Three Phase' },
    ],
    category: 'motor',
  },
  {
    name: 'frequency',
    label: 'Frequency',
    type: 'select',
    options: [
      { value: '50', label: '50 Hz' },
      { value: '60', label: '60 Hz' },
    ],
    category: 'motor',
  },
  {
    name: 'motorEfficiency',
    label: 'Motor Efficiency Class',
    type: 'select',
    options: [
      { value: 'ie1', label: 'IE1 - Standard' },
      { value: 'ie2', label: 'IE2 - High Efficiency' },
      { value: 'ie3', label: 'IE3 - Premium Efficiency' },
      { value: 'ie4', label: 'IE4 - Super Premium' },
    ],
    category: 'motor',
  },
  {
    name: 'enclosure',
    label: 'Motor Enclosure',
    type: 'select',
    options: [
      { value: 'tefc', label: 'TEFC - Totally Enclosed Fan Cooled' },
      { value: 'tefv', label: 'TEFV - Totally Enclosed Force Ventilated' },
      { value: 'teao', label: 'TEAO - Totally Enclosed Air Over' },
      { value: 'odp', label: 'ODP - Open Drip Proof' },
      { value: 'explosion_proof', label: 'Explosion Proof (Ex d/Ex e)' },
    ],
    category: 'motor',
  },
  {
    name: 'hazardousArea',
    label: 'Hazardous Area Classification',
    type: 'select',
    options: [
      { value: 'none', label: 'Non-Hazardous' },
      { value: 'zone_1', label: 'Zone 1 (Gas)' },
      { value: 'zone_2', label: 'Zone 2 (Gas)' },
      { value: 'zone_21', label: 'Zone 21 (Dust)' },
      { value: 'zone_22', label: 'Zone 22 (Dust)' },
    ],
    category: 'motor',
  },
  {
    name: 'frameStandard',
    label: 'Frame Standard',
    type: 'select',
    options: [
      { value: 'iec', label: 'IEC (International)' },
      { value: 'nema', label: 'NEMA (North America)' },
    ],
    helpText: 'Motor frame dimension standard',
    category: 'motor',
  },
  {
    name: 'frameSize',
    label: 'Frame Size',
    type: 'select',
    options: [...IEC_FRAME_SIZES, ...NEMA_FRAME_SIZES],
    helpText: 'Motor frame size designation',
    category: 'motor',
  },
];

// Coupling Options
export const COUPLING_OPTIONS = [
  { value: 'flexible_jaw', label: 'Flexible Jaw Coupling' },
  { value: 'flexible_disc', label: 'Flexible Disc Coupling' },
  { value: 'flexible_gear', label: 'Flexible Gear Coupling' },
  { value: 'flexible_grid', label: 'Flexible Grid Coupling' },
  { value: 'flexible_elastomeric', label: 'Flexible Elastomeric' },
  { value: 'rigid', label: 'Rigid Coupling' },
  { value: 'spacer_flexible', label: 'Spacer Coupling - Flexible' },
  { value: 'spacer_disc', label: 'Spacer Coupling - Disc' },
  { value: 'spacer_gear', label: 'Spacer Coupling - Gear' },
  { value: 'magnetic', label: 'Magnetic Coupling' },
  { value: 'belt_drive', label: 'Belt Drive' },
  { value: 'direct_coupled', label: 'Direct Coupled (Close Coupled)' },
];

export const COUPLING_SPECS: SpecificationField[] = [
  {
    name: 'couplingType',
    label: 'Coupling Type',
    type: 'select',
    options: COUPLING_OPTIONS,
    helpText: 'Power transmission coupling between pump and driver',
    category: 'construction',
  },
  {
    name: 'couplingGuard',
    label: 'Coupling Guard',
    type: 'select',
    options: [
      { value: 'none', label: 'None' },
      { value: 'standard', label: 'Standard Guard' },
      { value: 'full_enclosure', label: 'Full Enclosure' },
      { value: 'mesh', label: 'Mesh Guard' },
    ],
    category: 'construction',
  },
];

// Baseplate & Mounting Options
export const BASEPLATE_OPTIONS = [
  { value: 'none', label: 'No Baseplate (Pump Only)' },
  { value: 'cast_iron', label: 'Cast Iron Baseplate' },
  { value: 'fabricated_steel', label: 'Fabricated Steel Baseplate' },
  { value: 'stainless_steel', label: 'Stainless Steel Baseplate' },
  { value: 'concrete_filled', label: 'Concrete Filled Baseplate' },
  { value: 'skid_steel', label: 'Steel Skid Mounted' },
  { value: 'skid_portable', label: 'Portable Skid with Lifting Points' },
  { value: 'skid_trailer', label: 'Trailer Mounted' },
  { value: 'vertical_inline', label: 'Vertical Inline (No Baseplate)' },
];

export const BASEPLATE_SPECS: SpecificationField[] = [
  {
    name: 'baseplateType',
    label: 'Baseplate / Mounting',
    type: 'select',
    options: BASEPLATE_OPTIONS,
    helpText: 'Pump and motor mounting arrangement',
    category: 'construction',
  },
  {
    name: 'drainConnection',
    label: 'Baseplate Drain',
    type: 'select',
    options: [
      { value: 'none', label: 'No Drain' },
      { value: 'open_drain', label: 'Open Drain' },
      { value: 'plugged_drain', label: 'Plugged Drain Connection' },
      { value: 'piped_drain', label: 'Piped to Collection' },
    ],
    category: 'construction',
  },
  {
    name: 'groutType',
    label: 'Grouting',
    type: 'select',
    options: [
      { value: 'none', label: 'No Grout' },
      { value: 'cement', label: 'Cement Grout' },
      { value: 'epoxy', label: 'Epoxy Grout' },
      { value: 'non_shrink', label: 'Non-Shrink Grout' },
    ],
    category: 'construction',
  },
];

// Instrumentation Options
export const INSTRUMENTATION_OPTIONS = {
  pressure: [
    { value: 'pg_suction', label: 'Pressure Gauge - Suction' },
    { value: 'pg_discharge', label: 'Pressure Gauge - Discharge' },
    { value: 'pg_seal', label: 'Pressure Gauge - Seal Chamber' },
    { value: 'pt_suction', label: 'Pressure Transmitter - Suction' },
    { value: 'pt_discharge', label: 'Pressure Transmitter - Discharge' },
    { value: 'ps_low', label: 'Pressure Switch - Low Pressure' },
    { value: 'ps_high', label: 'Pressure Switch - High Pressure' },
  ],
  flow: [
    { value: 'flow_indicator', label: 'Flow Indicator' },
    { value: 'flow_transmitter', label: 'Flow Transmitter' },
    { value: 'flow_switch', label: 'Flow Switch' },
    { value: 'flow_meter_mag', label: 'Magnetic Flow Meter' },
    { value: 'flow_meter_ultrasonic', label: 'Ultrasonic Flow Meter' },
  ],
  temperature: [
    { value: 'tg_bearing', label: 'Temperature Gauge - Bearing' },
    { value: 'tg_motor', label: 'Temperature Gauge - Motor' },
    { value: 'tt_bearing', label: 'Temperature Transmitter - Bearing' },
    { value: 'tt_motor', label: 'Temperature Transmitter - Motor Winding' },
    { value: 'ts_high', label: 'Temperature Switch - High Temp' },
    { value: 'rtd_bearing', label: 'RTD - Bearing' },
    { value: 'rtd_motor', label: 'RTD - Motor Winding' },
  ],
  level: [
    { value: 'ls_seal_pot', label: 'Level Switch - Seal Pot' },
    { value: 'lg_seal_pot', label: 'Level Gauge - Seal Pot' },
    { value: 'ls_sump', label: 'Level Switch - Sump' },
  ],
  vibration: [
    { value: 'vib_switch', label: 'Vibration Switch' },
    { value: 'vib_transmitter', label: 'Vibration Transmitter' },
    { value: 'vib_probe', label: 'Proximity Probe (API 670)' },
  ],
};

export const INSTRUMENTATION_SPECS: SpecificationField[] = [
  {
    name: 'pressureInstruments',
    label: 'Pressure Instrumentation',
    type: 'multiselect',
    options: INSTRUMENTATION_OPTIONS.pressure,
    helpText: 'Pressure monitoring devices',
    category: 'construction',
  },
  {
    name: 'flowInstruments',
    label: 'Flow Instrumentation',
    type: 'multiselect',
    options: INSTRUMENTATION_OPTIONS.flow,
    helpText: 'Flow monitoring devices',
    category: 'construction',
  },
  {
    name: 'temperatureInstruments',
    label: 'Temperature Instrumentation',
    type: 'multiselect',
    options: INSTRUMENTATION_OPTIONS.temperature,
    helpText: 'Temperature monitoring devices',
    category: 'construction',
  },
  {
    name: 'levelInstruments',
    label: 'Level Instrumentation',
    type: 'multiselect',
    options: INSTRUMENTATION_OPTIONS.level,
    helpText: 'Level monitoring devices',
    category: 'construction',
  },
  {
    name: 'vibrationInstruments',
    label: 'Vibration Monitoring',
    type: 'multiselect',
    options: INSTRUMENTATION_OPTIONS.vibration,
    helpText: 'Vibration monitoring devices',
    category: 'construction',
  },
];

// Certifications
export const CERTIFICATION_OPTIONS = [
  { value: 'api_610', label: 'API 610' },
  { value: 'iso_5199', label: 'ISO 5199' },
  { value: 'iso_2858', label: 'ISO 2858' },
  { value: 'asme', label: 'ASME' },
  { value: 'atex', label: 'ATEX' },
  { value: 'ul_fm', label: 'UL/FM Listed (Fire)' },
  { value: 'fda', label: 'FDA Compliant' },
  { value: 'ehedg', label: 'EHEDG (Hygienic)' },
  { value: '3a', label: '3-A Sanitary' },
  { value: 'sabs', label: 'SABS' },
];

// Connection Types
export const CONNECTION_OPTIONS = [
  { value: 'flanged_ansi_150', label: 'Flanged ANSI 150#' },
  { value: 'flanged_ansi_300', label: 'Flanged ANSI 300#' },
  { value: 'flanged_pn10', label: 'Flanged PN10' },
  { value: 'flanged_pn16', label: 'Flanged PN16' },
  { value: 'flanged_pn25', label: 'Flanged PN25' },
  { value: 'flanged_pn40', label: 'Flanged PN40' },
  { value: 'threaded_bsp', label: 'Threaded BSP' },
  { value: 'threaded_npt', label: 'Threaded NPT' },
  { value: 'grooved', label: 'Grooved (Victaulic)' },
  { value: 'triclamp', label: 'Tri-Clamp (Sanitary)' },
];

// Pump Sizes (DN)
export const PUMP_SIZE_OPTIONS = [
  { value: '25', label: 'DN25 (1")' },
  { value: '32', label: 'DN32 (1.25")' },
  { value: '40', label: 'DN40 (1.5")' },
  { value: '50', label: 'DN50 (2")' },
  { value: '65', label: 'DN65 (2.5")' },
  { value: '80', label: 'DN80 (3")' },
  { value: '100', label: 'DN100 (4")' },
  { value: '125', label: 'DN125 (5")' },
  { value: '150', label: 'DN150 (6")' },
  { value: '200', label: 'DN200 (8")' },
  { value: '250', label: 'DN250 (10")' },
  { value: '300', label: 'DN300 (12")' },
  { value: '350', label: 'DN350 (14")' },
  { value: '400', label: 'DN400 (16")' },
  { value: '450', label: 'DN450 (18")' },
  { value: '500', label: 'DN500 (20")' },
  { value: '600', label: 'DN600 (24")' },
];
