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
