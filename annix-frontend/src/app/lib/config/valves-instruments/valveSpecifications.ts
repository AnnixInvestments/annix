// Valves, Meters & Instruments Module - Valve Specifications
// Used for RFQ forms and pricing calculations

export interface SpecificationField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'boolean';
  unit?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  helpText?: string;
  category: 'sizing' | 'construction' | 'actuation' | 'environment' | 'certification';
}

// Valve Sizes
export const VALVE_SIZE_OPTIONS = [
  { value: '15', label: 'DN15 (½")' },
  { value: '20', label: 'DN20 (¾")' },
  { value: '25', label: 'DN25 (1")' },
  { value: '32', label: 'DN32 (1¼")' },
  { value: '40', label: 'DN40 (1½")' },
  { value: '50', label: 'DN50 (2")' },
  { value: '65', label: 'DN65 (2½")' },
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
  { value: '750', label: 'DN750 (30")' },
  { value: '900', label: 'DN900 (36")' },
  { value: '1000', label: 'DN1000 (40")' },
  { value: '1200', label: 'DN1200 (48")' },
];

// Pressure Classes
export const PRESSURE_CLASS_OPTIONS = [
  { value: 'pn6', label: 'PN6' },
  { value: 'pn10', label: 'PN10' },
  { value: 'pn16', label: 'PN16' },
  { value: 'pn25', label: 'PN25' },
  { value: 'pn40', label: 'PN40' },
  { value: 'pn64', label: 'PN64' },
  { value: 'pn100', label: 'PN100' },
  { value: 'class_150', label: 'Class 150 (ANSI)' },
  { value: 'class_300', label: 'Class 300 (ANSI)' },
  { value: 'class_600', label: 'Class 600 (ANSI)' },
  { value: 'class_900', label: 'Class 900 (ANSI)' },
  { value: 'class_1500', label: 'Class 1500 (ANSI)' },
  { value: 'class_2500', label: 'Class 2500 (ANSI)' },
];

// End Connection Types
export const CONNECTION_OPTIONS = [
  { value: 'flanged_rf', label: 'Flanged - Raised Face' },
  { value: 'flanged_ff', label: 'Flanged - Flat Face' },
  { value: 'flanged_rtj', label: 'Flanged - RTJ (Ring Type Joint)' },
  { value: 'threaded_bsp', label: 'Threaded BSP' },
  { value: 'threaded_npt', label: 'Threaded NPT' },
  { value: 'socket_weld', label: 'Socket Weld' },
  { value: 'butt_weld', label: 'Butt Weld' },
  { value: 'wafer', label: 'Wafer (Lug holes)' },
  { value: 'lug', label: 'Lug (Tapped holes)' },
  { value: 'grooved', label: 'Grooved (Victaulic)' },
  { value: 'tri_clamp', label: 'Tri-Clamp (Sanitary)' },
  { value: 'compression', label: 'Compression Fitting' },
];

// Body Materials
export const BODY_MATERIAL_OPTIONS = [
  { value: 'wcb', label: 'Carbon Steel (WCB/A216)' },
  { value: 'lcb', label: 'Low Temp Carbon Steel (LCB)' },
  { value: 'wc6', label: 'Chrome Moly (WC6/A217)' },
  { value: 'cf8', label: 'Stainless Steel 304 (CF8)' },
  { value: 'cf8m', label: 'Stainless Steel 316 (CF8M)' },
  { value: 'cf3', label: 'Stainless Steel 304L (CF3)' },
  { value: 'cf3m', label: 'Stainless Steel 316L (CF3M)' },
  { value: 'duplex', label: 'Duplex Stainless (CD4MCu)' },
  { value: 'super_duplex', label: 'Super Duplex (CD3MN)' },
  { value: 'cast_iron', label: 'Cast Iron (A126)' },
  { value: 'ductile_iron', label: 'Ductile Iron (A536)' },
  { value: 'bronze', label: 'Bronze (B62)' },
  { value: 'monel', label: 'Monel (M35-1)' },
  { value: 'hastelloy_c', label: 'Hastelloy C (CW-12MW)' },
  { value: 'titanium', label: 'Titanium' },
  { value: 'pvc', label: 'PVC' },
  { value: 'cpvc', label: 'CPVC' },
  { value: 'pvdf', label: 'PVDF' },
  { value: 'pp', label: 'Polypropylene' },
];

// Trim Materials
export const TRIM_MATERIAL_OPTIONS = [
  { value: 'ss_304', label: 'Stainless Steel 304' },
  { value: 'ss_316', label: 'Stainless Steel 316' },
  { value: 'ss_410', label: 'Stainless Steel 410' },
  { value: 'ss_17_4ph', label: 'Stainless Steel 17-4PH' },
  { value: 'stellite', label: 'Stellite Faced' },
  { value: 'inconel', label: 'Inconel' },
  { value: 'monel', label: 'Monel' },
  { value: 'titanium', label: 'Titanium' },
  { value: 'chrome_plated', label: 'Chrome Plated' },
];

// Seat/Seal Materials
export const SEAT_MATERIAL_OPTIONS = [
  { value: 'metal', label: 'Metal-to-Metal' },
  { value: 'ptfe', label: 'PTFE' },
  { value: 'rtfe', label: 'Reinforced PTFE' },
  { value: 'peek', label: 'PEEK' },
  { value: 'nylon', label: 'Nylon' },
  { value: 'buna_n', label: 'Buna-N (NBR)' },
  { value: 'viton', label: 'Viton (FKM)' },
  { value: 'epdm', label: 'EPDM' },
  { value: 'silicone', label: 'Silicone' },
  { value: 'graphite', label: 'Flexible Graphite' },
  { value: 'stellite', label: 'Stellite Overlay' },
];

// Actuator Types
export const ACTUATOR_TYPE_OPTIONS = [
  { value: 'manual_lever', label: 'Manual Lever' },
  { value: 'manual_gear', label: 'Manual Gear Operator' },
  { value: 'manual_handwheel', label: 'Manual Handwheel' },
  { value: 'pneumatic_da', label: 'Pneumatic Double Acting' },
  { value: 'pneumatic_sr_fo', label: 'Pneumatic Spring Return - Fail Open' },
  { value: 'pneumatic_sr_fc', label: 'Pneumatic Spring Return - Fail Close' },
  { value: 'electric_on_off', label: 'Electric On/Off' },
  { value: 'electric_modulating', label: 'Electric Modulating' },
  { value: 'hydraulic', label: 'Hydraulic' },
  { value: 'electro_hydraulic', label: 'Electro-Hydraulic' },
  { value: 'solenoid', label: 'Direct Solenoid' },
  { value: 'self_actuated', label: 'Self-Actuated (Pressure/Temp)' },
];

// Valve Specifications
export const VALVE_SIZING_SPECS: SpecificationField[] = [
  {
    name: 'size',
    label: 'Valve Size',
    type: 'select',
    options: VALVE_SIZE_OPTIONS,
    required: true,
    category: 'sizing',
  },
  {
    name: 'pressureClass',
    label: 'Pressure Class',
    type: 'select',
    options: PRESSURE_CLASS_OPTIONS,
    required: true,
    category: 'sizing',
  },
  {
    name: 'cv',
    label: 'Flow Coefficient (Cv)',
    type: 'number',
    helpText: 'Required Cv for control valves',
    category: 'sizing',
  },
  {
    name: 'flowRate',
    label: 'Flow Rate',
    type: 'number',
    unit: 'm³/h',
    category: 'sizing',
  },
  {
    name: 'differentialPressure',
    label: 'Differential Pressure',
    type: 'number',
    unit: 'bar',
    helpText: 'Pressure drop across valve',
    category: 'sizing',
  },
];

export const VALVE_CONSTRUCTION_SPECS: SpecificationField[] = [
  {
    name: 'bodyMaterial',
    label: 'Body Material',
    type: 'select',
    options: BODY_MATERIAL_OPTIONS,
    required: true,
    category: 'construction',
  },
  {
    name: 'trimMaterial',
    label: 'Trim Material',
    type: 'select',
    options: TRIM_MATERIAL_OPTIONS,
    category: 'construction',
  },
  {
    name: 'seatMaterial',
    label: 'Seat/Seal Material',
    type: 'select',
    options: SEAT_MATERIAL_OPTIONS,
    required: true,
    category: 'construction',
  },
  {
    name: 'connectionType',
    label: 'End Connection',
    type: 'select',
    options: CONNECTION_OPTIONS,
    required: true,
    category: 'construction',
  },
  {
    name: 'portType',
    label: 'Port Type',
    type: 'select',
    options: [
      { value: 'full_port', label: 'Full Port/Full Bore' },
      { value: 'reduced_port', label: 'Reduced Port/Standard Bore' },
      { value: 'v_port', label: 'V-Port (Control)' },
    ],
    category: 'construction',
  },
];

export const VALVE_ACTUATION_SPECS: SpecificationField[] = [
  {
    name: 'actuatorType',
    label: 'Actuator Type',
    type: 'select',
    options: ACTUATOR_TYPE_OPTIONS,
    required: true,
    category: 'actuation',
  },
  {
    name: 'airSupply',
    label: 'Air Supply Pressure',
    type: 'number',
    unit: 'bar',
    helpText: 'For pneumatic actuators',
    category: 'actuation',
  },
  {
    name: 'voltage',
    label: 'Voltage',
    type: 'select',
    options: [
      { value: '24vdc', label: '24V DC' },
      { value: '110vac', label: '110V AC' },
      { value: '220vac', label: '220V AC' },
      { value: '380vac', label: '380V AC' },
    ],
    helpText: 'For electric actuators',
    category: 'actuation',
  },
  {
    name: 'failPosition',
    label: 'Fail Position',
    type: 'select',
    options: [
      { value: 'fail_open', label: 'Fail Open' },
      { value: 'fail_close', label: 'Fail Close' },
      { value: 'fail_last', label: 'Fail Last Position' },
    ],
    category: 'actuation',
  },
  {
    name: 'positioner',
    label: 'Positioner',
    type: 'select',
    options: [
      { value: 'none', label: 'None' },
      { value: 'pneumatic', label: 'Pneumatic (3-15 psi)' },
      { value: 'electro_pneumatic', label: 'Electro-Pneumatic (4-20mA)' },
      { value: 'smart', label: 'Smart Positioner (HART)' },
      { value: 'foundation', label: 'Foundation Fieldbus' },
    ],
    category: 'actuation',
  },
  {
    name: 'limitSwitches',
    label: 'Limit Switches',
    type: 'boolean',
    helpText: 'Open/Close position feedback',
    category: 'actuation',
  },
  {
    name: 'solenoidValve',
    label: 'Solenoid Valve',
    type: 'boolean',
    helpText: 'For remote air control',
    category: 'actuation',
  },
];

export const VALVE_ENVIRONMENT_SPECS: SpecificationField[] = [
  {
    name: 'media',
    label: 'Process Media',
    type: 'text',
    required: true,
    helpText: 'Fluid/gas being controlled',
    category: 'environment',
  },
  {
    name: 'operatingPressure',
    label: 'Operating Pressure',
    type: 'number',
    unit: 'bar',
    required: true,
    category: 'environment',
  },
  {
    name: 'operatingTemp',
    label: 'Operating Temperature',
    type: 'number',
    unit: '°C',
    required: true,
    category: 'environment',
  },
  {
    name: 'hazardousArea',
    label: 'Hazardous Area',
    type: 'select',
    options: [
      { value: 'none', label: 'Non-Hazardous' },
      { value: 'zone_1', label: 'Zone 1 (Gas)' },
      { value: 'zone_2', label: 'Zone 2 (Gas)' },
      { value: 'zone_21', label: 'Zone 21 (Dust)' },
      { value: 'zone_22', label: 'Zone 22 (Dust)' },
    ],
    category: 'environment',
  },
];

// Certification Options
export const VALVE_CERTIFICATIONS = [
  { value: 'api_6d', label: 'API 6D' },
  { value: 'api_600', label: 'API 600' },
  { value: 'api_608', label: 'API 608' },
  { value: 'api_609', label: 'API 609' },
  { value: 'api_526', label: 'API 526 (PSV)' },
  { value: 'asme_b16_34', label: 'ASME B16.34' },
  { value: 'en_12516', label: 'EN 12516' },
  { value: 'atex', label: 'ATEX' },
  { value: 'sil', label: 'SIL Rated' },
  { value: 'fire_safe', label: 'Fire Safe (API 607)' },
  { value: 'ta_luft', label: 'TA-Luft (Fugitive Emissions)' },
  { value: 'nace', label: 'NACE MR0175 (Sour Service)' },
  { value: 'cryogenic', label: 'Cryogenic Service' },
  { value: 'fda', label: 'FDA Compliant' },
  { value: '3a', label: '3-A Sanitary' },
];
