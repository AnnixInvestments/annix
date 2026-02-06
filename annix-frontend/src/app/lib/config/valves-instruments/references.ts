// Valves, Meters & Instruments Module - Industry References
// Compiled from industry research for RFQ specifications and pricing guidance

export interface IndustryReference {
  name: string;
  url: string;
  category: 'manufacturer' | 'supplier' | 'standard' | 'resource' | 'local_sa';
  description: string;
  productsOffered?: string[];
}

// Major Global Valve Manufacturers
export const VALVE_MANUFACTURERS: IndustryReference[] = [
  {
    name: 'Emerson (Fisher)',
    url: 'https://www.emerson.com/en-us/automation/fisher',
    category: 'manufacturer',
    description: 'World leader in control valves, regulators, and instrumentation',
    productsOffered: ['Control valves', 'Regulators', 'Actuators', 'Positioners'],
  },
  {
    name: 'Flowserve Valves',
    url: 'https://www.flowserve.com/en/products/valves',
    category: 'manufacturer',
    description: 'Comprehensive valve portfolio for all industries',
    productsOffered: ['Gate valves', 'Globe valves', 'Check valves', 'Ball valves'],
  },
  {
    name: 'Cameron (SLB)',
    url: 'https://www.slb.com/products/cameron',
    category: 'manufacturer',
    description: 'High-performance valves for oil & gas, API certified',
    productsOffered: ['Ball valves', 'Gate valves', 'Check valves', 'Choke valves'],
  },
  {
    name: 'Velan',
    url: 'https://www.velan.com',
    category: 'manufacturer',
    description: 'Canadian manufacturer, nuclear and severe service valves',
    productsOffered: ['Gate valves', 'Globe valves', 'Check valves', 'Ball valves'],
  },
  {
    name: 'Neles (Valmet)',
    url: 'https://www.valmet.com/flow-control',
    category: 'manufacturer',
    description: 'Finnish manufacturer, process control valves',
    productsOffered: ['Ball valves', 'Butterfly valves', 'Control valves', 'Positioners'],
  },
  {
    name: 'Bray International',
    url: 'https://www.bray.com',
    category: 'manufacturer',
    description: 'Butterfly and ball valves, actuators',
    productsOffered: ['Butterfly valves', 'Ball valves', 'Actuators', 'Control valves'],
  },
  {
    name: 'Crane Co.',
    url: 'https://www.craneco.com',
    category: 'manufacturer',
    description: 'Industrial valves and fittings manufacturer',
    productsOffered: ['Gate valves', 'Globe valves', 'Check valves', 'Ball valves'],
  },
  {
    name: 'Pentair Valves & Controls',
    url: 'https://www.pentair.com/en-us/products/industrial-commercial',
    category: 'manufacturer',
    description: 'Industrial valves including Vanessa and Keystone brands',
    productsOffered: ['Triple offset valves', 'Butterfly valves', 'Ball valves'],
  },
  {
    name: 'KITZ Corporation',
    url: 'https://www.kitz.com',
    category: 'manufacturer',
    description: 'Japanese manufacturer, wide valve range',
    productsOffered: ['Ball valves', 'Gate valves', 'Check valves', 'Butterfly valves'],
  },
  {
    name: 'AVK Valves',
    url: 'https://www.avkvalves.com',
    category: 'manufacturer',
    description: 'Danish manufacturer, water and wastewater valves',
    productsOffered: ['Gate valves', 'Butterfly valves', 'Check valves', 'Air valves'],
  },
];

// Major Instrumentation Manufacturers
export const INSTRUMENT_MANUFACTURERS: IndustryReference[] = [
  {
    name: 'Endress+Hauser',
    url: 'https://www.endress.com',
    category: 'manufacturer',
    description: 'Swiss company, process automation and instrumentation',
    productsOffered: ['Flow meters', 'Level', 'Pressure', 'Temperature', 'Analytical'],
  },
  {
    name: 'Emerson (Rosemount)',
    url: 'https://www.emerson.com/en-us/automation/rosemount',
    category: 'manufacturer',
    description: 'Industry leader in process measurement',
    productsOffered: ['Pressure transmitters', 'Flow meters', 'Level', 'Temperature'],
  },
  {
    name: 'Yokogawa',
    url: 'https://www.yokogawa.com',
    category: 'manufacturer',
    description: 'Japanese manufacturer, industrial automation',
    productsOffered: ['Flow meters', 'Pressure', 'Temperature', 'Analyzers', 'DCS'],
  },
  {
    name: 'Siemens Process Instrumentation',
    url: 'https://www.siemens.com/process-instrumentation',
    category: 'manufacturer',
    description: 'German multinational, full instrumentation range',
    productsOffered: ['Flow', 'Level', 'Pressure', 'Temperature', 'Positioners'],
  },
  {
    name: 'ABB Measurement',
    url: 'https://new.abb.com/products/measurement-products',
    category: 'manufacturer',
    description: 'Swiss-Swedish company, measurement and analytics',
    productsOffered: ['Flow meters', 'Level', 'Pressure', 'Temperature', 'Analytical'],
  },
  {
    name: 'Honeywell Process',
    url: 'https://process.honeywell.com',
    category: 'manufacturer',
    description: 'American multinational, process solutions',
    productsOffered: ['Transmitters', 'Analyzers', 'Control systems', 'Sensors'],
  },
  {
    name: 'KROHNE',
    url: 'https://www.krohne.com',
    category: 'manufacturer',
    description: 'German manufacturer specializing in flow measurement',
    productsOffered: ['Electromagnetic flowmeters', 'Ultrasonic', 'Coriolis', 'Level'],
  },
  {
    name: 'WIKA',
    url: 'https://www.wika.com',
    category: 'manufacturer',
    description: 'German manufacturer, pressure and temperature',
    productsOffered: ['Pressure gauges', 'Transmitters', 'Thermometers', 'Diaphragm seals'],
  },
  {
    name: 'Vega',
    url: 'https://www.vega.com',
    category: 'manufacturer',
    description: 'German specialist in level and pressure measurement',
    productsOffered: ['Radar level', 'Ultrasonic level', 'Pressure transmitters'],
  },
  {
    name: 'Badger Meter',
    url: 'https://www.badgermeter.com',
    category: 'manufacturer',
    description: 'American company, flow measurement solutions',
    productsOffered: ['Electromagnetic flowmeters', 'Turbine meters', 'Coriolis'],
  },
];

// South African Suppliers & Distributors
export const SA_VALVE_INSTRUMENT_SUPPLIERS: IndustryReference[] = [
  {
    name: 'Valve & Automation',
    url: 'https://www.valve.co.za',
    category: 'local_sa',
    description: 'Leading SA valve supplier, multiple brands',
    productsOffered: ['Valves', 'Actuators', 'Instrumentation', 'Service'],
  },
  {
    name: 'Invincible Valves',
    url: 'https://www.invinciblevalves.com',
    category: 'local_sa',
    description: 'SA valve manufacturer and supplier, ISO 9001 certified',
    productsOffered: ['Gate valves', 'Globe valves', 'Check valves', 'Ball valves'],
  },
  {
    name: 'Macsteel Fluid Control',
    url: 'https://www.macsteel.co.za/fluid-control',
    category: 'local_sa',
    description: 'Part of Macsteel group, valves and fittings',
    productsOffered: ['Valves', 'Flanges', 'Fittings', 'Piping'],
  },
  {
    name: 'Afrox Gas Equipment',
    url: 'https://www.afrox.co.za',
    category: 'local_sa',
    description: 'Gas control valves and regulators',
    productsOffered: ['Gas valves', 'Regulators', 'Flow controllers'],
  },
  {
    name: 'Endress+Hauser South Africa',
    url: 'https://www.za.endress.com',
    category: 'local_sa',
    description: 'Official E+H operation in South Africa',
    productsOffered: ['Flow', 'Level', 'Pressure', 'Temperature', 'Analytical'],
  },
  {
    name: 'Yokogawa South Africa',
    url: 'https://www.yokogawa.com/za',
    category: 'local_sa',
    description: 'Yokogawa distribution and service in SA',
    productsOffered: ['Instrumentation', 'DCS', 'Analyzers'],
  },
  {
    name: 'Instrotech',
    url: 'https://www.instrotech.co.za',
    category: 'local_sa',
    description: 'SA instrumentation and control distributor',
    productsOffered: ['Level', 'Flow', 'Pressure', 'Temperature', 'Analytical'],
  },
  {
    name: 'WIKA Instruments SA',
    url: 'https://www.wika.co.za',
    category: 'local_sa',
    description: 'WIKA subsidiary in South Africa',
    productsOffered: ['Pressure gauges', 'Thermometers', 'Transmitters'],
  },
  {
    name: 'Actom Electrical Products',
    url: 'https://www.actom.co.za',
    category: 'local_sa',
    description: 'SA manufacturer, industrial controls and switchgear',
    productsOffered: ['Motor control', 'Actuators', 'Switchgear'],
  },
  {
    name: 'SMC Pneumatics South Africa',
    url: 'https://www.smc.eu/en-za',
    category: 'local_sa',
    description: 'Pneumatic automation components',
    productsOffered: ['Solenoid valves', 'Actuators', 'Air preparation', 'Fittings'],
  },
];

// Industry Standards
export const VALVE_INSTRUMENT_STANDARDS: IndustryReference[] = [
  {
    name: 'API 6D',
    url: 'https://www.api.org',
    category: 'standard',
    description: 'Pipeline and piping valves',
  },
  {
    name: 'API 600',
    url: 'https://www.api.org',
    category: 'standard',
    description: 'Bolted bonnet steel gate valves for petroleum and natural gas industries',
  },
  {
    name: 'API 608',
    url: 'https://www.api.org',
    category: 'standard',
    description: 'Metal ball valves - flanged, threaded, welding ends',
  },
  {
    name: 'API 609',
    url: 'https://www.api.org',
    category: 'standard',
    description: 'Butterfly valves: double-flanged, lug, and wafer-type',
  },
  {
    name: 'API 526',
    url: 'https://www.api.org',
    category: 'standard',
    description: 'Flanged steel pressure relief valves',
  },
  {
    name: 'API 594',
    url: 'https://www.api.org',
    category: 'standard',
    description: 'Check valves: flanged, lug, wafer, and butt-welding',
  },
  {
    name: 'ASME B16.34',
    url: 'https://www.asme.org',
    category: 'standard',
    description: 'Valves - flanged, threaded and welding end',
  },
  {
    name: 'ISA-75 Series',
    url: 'https://www.isa.org',
    category: 'standard',
    description: 'Control valve standards (sizing, testing, terminology)',
  },
  {
    name: 'IEC 61511',
    url: 'https://www.iec.ch',
    category: 'standard',
    description: 'Functional safety - Safety instrumented systems',
  },
  {
    name: 'IEC 61508',
    url: 'https://www.iec.ch',
    category: 'standard',
    description: 'Functional safety of electrical/electronic systems',
  },
  {
    name: 'ISO 5167',
    url: 'https://www.iso.org',
    category: 'standard',
    description: 'Measurement of fluid flow - Differential pressure devices',
  },
  {
    name: 'API 2530 (AGA 3)',
    url: 'https://www.api.org',
    category: 'standard',
    description: 'Orifice metering of natural gas',
  },
];

// Educational & Technical Resources
export const VALVE_INSTRUMENT_RESOURCES: IndustryReference[] = [
  {
    name: 'Control Global',
    url: 'https://www.controlglobal.com',
    category: 'resource',
    description: 'Process automation news and technical articles',
  },
  {
    name: 'ISA (International Society of Automation)',
    url: 'https://www.isa.org',
    category: 'resource',
    description: 'Automation standards and certification body',
  },
  {
    name: 'Valve Magazine',
    url: 'https://www.valvemagazine.com',
    category: 'resource',
    description: 'Publication of the Valve Manufacturers Association',
  },
  {
    name: 'Flow Control Network',
    url: 'https://www.flowcontrolnetwork.com',
    category: 'resource',
    description: 'Technical articles on flow measurement and control',
  },
  {
    name: 'Engineering Toolbox - Valves',
    url: 'https://www.engineeringtoolbox.com',
    category: 'resource',
    description: 'Valve technical calculations and reference data',
  },
  {
    name: 'Process Industry Forum',
    url: 'https://www.processindustryforum.com',
    category: 'resource',
    description: 'UK-based process industry news and articles',
  },
  {
    name: 'Instrumentation Tools',
    url: 'https://instrumentationtools.com',
    category: 'resource',
    description: 'Free instrumentation tutorials and training',
  },
];

// All references combined
export const ALL_VALVE_INSTRUMENT_REFERENCES: IndustryReference[] = [
  ...VALVE_MANUFACTURERS,
  ...INSTRUMENT_MANUFACTURERS,
  ...SA_VALVE_INSTRUMENT_SUPPLIERS,
  ...VALVE_INSTRUMENT_STANDARDS,
  ...VALVE_INSTRUMENT_RESOURCES,
];

export const getReferencesByCategory = (category: IndustryReference['category']): IndustryReference[] =>
  ALL_VALVE_INSTRUMENT_REFERENCES.filter(ref => ref.category === category);
