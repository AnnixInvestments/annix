// Pumps & Pump Parts Module - Pump Types Configuration
// Reference: API 610, ISO 5199, ISO 13709

export type PumpCategory = 'centrifugal' | 'positive_displacement' | 'specialty';

export interface PumpType {
  value: string;
  label: string;
  description: string;
  category: PumpCategory;
  subcategory?: string;
  icon: string;
  apiStandard?: string;
  typicalApplications: string[];
}

export const PUMP_TYPES: PumpType[] = [
  // Centrifugal Pumps
  {
    value: 'centrifugal_end_suction',
    label: 'End Suction Centrifugal',
    description: 'Single stage, horizontal mount, most common industrial pump type',
    category: 'centrifugal',
    subcategory: 'horizontal',
    icon: '🔄',
    apiStandard: 'API 610 OH1/OH2',
    typicalApplications: ['Water transfer', 'General process', 'HVAC', 'Irrigation'],
  },
  {
    value: 'centrifugal_split_case',
    label: 'Split Case Centrifugal',
    description: 'Horizontally split casing, high flow rates, easy maintenance',
    category: 'centrifugal',
    subcategory: 'horizontal',
    icon: '🔄',
    apiStandard: 'API 610 BB1/BB2',
    typicalApplications: ['Water supply', 'Fire protection', 'Cooling water', 'Municipal'],
  },
  {
    value: 'centrifugal_multistage',
    label: 'Multistage Centrifugal',
    description: 'Multiple impellers for high pressure applications',
    category: 'centrifugal',
    subcategory: 'horizontal',
    icon: '🔄',
    apiStandard: 'API 610 BB3/BB4/BB5',
    typicalApplications: ['Boiler feed', 'High pressure wash', 'Reverse osmosis', 'Pipeline'],
  },
  {
    value: 'centrifugal_vertical_inline',
    label: 'Vertical Inline Centrifugal',
    description: 'Vertical mount, inline with piping, space-saving design',
    category: 'centrifugal',
    subcategory: 'vertical',
    icon: '🔄',
    apiStandard: 'API 610 OH3/OH4',
    typicalApplications: ['HVAC', 'Building services', 'Pressure boosting'],
  },
  {
    value: 'centrifugal_vertical_turbine',
    label: 'Vertical Turbine',
    description: 'Deep well and sump applications, submerged bowl assembly',
    category: 'centrifugal',
    subcategory: 'vertical',
    icon: '🔄',
    apiStandard: 'API 610 VS1/VS6',
    typicalApplications: ['Deep wells', 'Cooling towers', 'Sumps', 'Irrigation'],
  },
  {
    value: 'submersible',
    label: 'Submersible Pump',
    description: 'Motor and pump submerged, sealed unit for underwater operation',
    category: 'centrifugal',
    subcategory: 'submersible',
    icon: '🔄',
    typicalApplications: ['Boreholes', 'Sewage', 'Drainage', 'Mine dewatering'],
  },
  {
    value: 'slurry',
    label: 'Slurry Pump',
    description: 'Heavy-duty for abrasive solids handling, wear-resistant materials',
    category: 'centrifugal',
    subcategory: 'specialty',
    icon: '🔄',
    typicalApplications: ['Mining', 'Dredging', 'Sand/gravel', 'Tailings'],
  },
  {
    value: 'self_priming',
    label: 'Self-Priming Centrifugal',
    description: 'Can evacuate air and prime automatically',
    category: 'centrifugal',
    subcategory: 'specialty',
    icon: '🔄',
    typicalApplications: ['Dewatering', 'Construction', 'Fuel transfer', 'Wash-down'],
  },

  // Positive Displacement Pumps
  {
    value: 'progressive_cavity',
    label: 'Progressive Cavity (PC)',
    description: 'Helical rotor in stator, excellent for viscous and solids-laden fluids',
    category: 'positive_displacement',
    subcategory: 'rotary',
    icon: '⚙️',
    apiStandard: 'API 676',
    typicalApplications: ['Sludge', 'Food processing', 'Chemicals', 'Oil field'],
  },
  {
    value: 'gear_pump',
    label: 'Gear Pump',
    description: 'External or internal gears, precise flow for lubricating fluids',
    category: 'positive_displacement',
    subcategory: 'rotary',
    icon: '⚙️',
    apiStandard: 'API 676',
    typicalApplications: ['Hydraulics', 'Lubrication', 'Fuel transfer', 'Chemical dosing'],
  },
  {
    value: 'screw_pump',
    label: 'Screw Pump',
    description: 'Two or three screw design, smooth pulsation-free flow',
    category: 'positive_displacement',
    subcategory: 'rotary',
    icon: '⚙️',
    apiStandard: 'API 676',
    typicalApplications: ['Fuel oil', 'Lube oil', 'Hydraulic systems', 'Marine'],
  },
  {
    value: 'lobe_pump',
    label: 'Lobe Pump',
    description: 'Rotary lobes, gentle pumping for shear-sensitive fluids',
    category: 'positive_displacement',
    subcategory: 'rotary',
    icon: '⚙️',
    typicalApplications: ['Food/beverage', 'Pharmaceutical', 'Cosmetics', 'Dairy'],
  },
  {
    value: 'diaphragm_pump',
    label: 'Diaphragm Pump',
    description: 'Air-operated double diaphragm (AODD), leak-free and self-priming',
    category: 'positive_displacement',
    subcategory: 'reciprocating',
    icon: '⚙️',
    typicalApplications: ['Chemical transfer', 'Paint', 'Waste', 'Hazardous fluids'],
  },
  {
    value: 'metering_pump',
    label: 'Metering/Dosing Pump',
    description: 'Precise volumetric dosing, diaphragm or plunger type',
    category: 'positive_displacement',
    subcategory: 'reciprocating',
    icon: '⚙️',
    apiStandard: 'API 675',
    typicalApplications: ['Chemical injection', 'Water treatment', 'Process control'],
  },
  {
    value: 'piston_pump',
    label: 'Piston/Plunger Pump',
    description: 'High pressure reciprocating, multiple cylinders available',
    category: 'positive_displacement',
    subcategory: 'reciprocating',
    icon: '⚙️',
    apiStandard: 'API 674',
    typicalApplications: ['High pressure wash', 'Descaling', 'Oil field injection', 'Hydraulics'],
  },
  {
    value: 'peristaltic_pump',
    label: 'Peristaltic (Hose) Pump',
    description: 'Fluid contained in hose, no contact with pump parts',
    category: 'positive_displacement',
    subcategory: 'rotary',
    icon: '⚙️',
    typicalApplications: ['Mining', 'Abrasives', 'Corrosives', 'Sterile applications'],
  },

  // Specialty Pumps
  {
    value: 'vacuum_pump',
    label: 'Vacuum Pump',
    description: 'Creates vacuum for gas/vapor removal or suction lift',
    category: 'specialty',
    icon: '🌀',
    typicalApplications: ['Degassing', 'Vacuum packaging', 'Evaporation', 'Priming'],
  },
  {
    value: 'sump_pump',
    label: 'Sump Pump',
    description: 'Removes accumulated water from sumps or pits',
    category: 'specialty',
    icon: '🌀',
    typicalApplications: ['Basements', 'Construction sites', 'Industrial sumps'],
  },
  {
    value: 'fire_pump',
    label: 'Fire Pump',
    description: 'UL/FM listed, dedicated fire protection service',
    category: 'specialty',
    icon: '🚒',
    typicalApplications: ['Fire sprinkler systems', 'Standpipe systems', 'Foam systems'],
  },
];

export const getPumpsByCategory = (category: PumpCategory): PumpType[] =>
  PUMP_TYPES.filter(pump => pump.category === category);

export const getPumpByValue = (value: string): PumpType | undefined =>
  PUMP_TYPES.find(pump => pump.value === value);

export const getCentrifugalPumps = (): PumpType[] => getPumpsByCategory('centrifugal');
export const getPositiveDisplacementPumps = (): PumpType[] => getPumpsByCategory('positive_displacement');
export const getSpecialtyPumps = (): PumpType[] => getPumpsByCategory('specialty');
