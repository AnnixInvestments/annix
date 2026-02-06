// Pumps & Pump Parts Module - Industry References
// Compiled from industry research for RFQ specifications and pricing guidance

export interface IndustryReference {
  name: string;
  url: string;
  category: 'manufacturer' | 'supplier' | 'standard' | 'resource' | 'local_sa';
  description: string;
  productsOffered?: string[];
}

// Major Global Pump Manufacturers
export const PUMP_MANUFACTURERS: IndustryReference[] = [
  {
    name: 'KSB',
    url: 'https://www.ksb.com',
    category: 'manufacturer',
    description: 'German manufacturer of pumps and valves, established 1871',
    productsOffered: ['Centrifugal pumps', 'Submersible pumps', 'Process pumps', 'Valves'],
  },
  {
    name: 'Grundfos',
    url: 'https://www.grundfos.com',
    category: 'manufacturer',
    description: 'Danish pump manufacturer, world leader in circulator and centrifugal pumps',
    productsOffered: ['Circulator pumps', 'Submersible pumps', 'Booster systems', 'Dosing pumps'],
  },
  {
    name: 'Sulzer',
    url: 'https://www.sulzer.com',
    category: 'manufacturer',
    description: 'Swiss company specializing in pumps for oil & gas, power, and water',
    productsOffered: ['Process pumps', 'Submersible pumps', 'Multistage pumps', 'Agitators'],
  },
  {
    name: 'Flowserve',
    url: 'https://www.flowserve.com',
    category: 'manufacturer',
    description: 'American multinational, pumps, valves, and seals',
    productsOffered: ['API process pumps', 'Vertical pumps', 'Slurry pumps', 'Seals'],
  },
  {
    name: 'Xylem (Flygt)',
    url: 'https://www.xylem.com',
    category: 'manufacturer',
    description: 'Water technology company, owns Flygt, Lowara, Goulds',
    productsOffered: ['Submersible pumps', 'Mixers', 'Dewatering pumps', 'Wastewater pumps'],
  },
  {
    name: 'Weir Minerals',
    url: 'https://www.global.weir',
    category: 'manufacturer',
    description: 'Specialist in mining and minerals processing pumps',
    productsOffered: ['Slurry pumps', 'Cyclones', 'Dewatering', 'Valves'],
  },
  {
    name: 'NETZSCH Pumps',
    url: 'https://pumps-systems.netzsch.com',
    category: 'manufacturer',
    description: 'German manufacturer of progressive cavity pumps',
    productsOffered: ['Progressive cavity pumps', 'Rotary lobe pumps', 'Screw pumps'],
  },
  {
    name: 'Milton Roy',
    url: 'https://www.miltonroy.com',
    category: 'manufacturer',
    description: 'Specialist in metering and dosing pumps',
    productsOffered: ['Metering pumps', 'Diaphragm pumps', 'Mixing equipment'],
  },
  {
    name: 'Watson-Marlow',
    url: 'https://www.wmfts.com',
    category: 'manufacturer',
    description: 'Peristaltic pump specialists',
    productsOffered: ['Peristaltic pumps', 'Sinusoidal pumps', 'Hose pumps'],
  },
  {
    name: 'EDDY Pump',
    url: 'https://eddypump.com',
    category: 'manufacturer',
    description: 'Industrial pump manufacturer specializing in slurry handling',
    productsOffered: ['Slurry pumps', 'Dredge pumps', 'Self-priming pumps'],
  },
];

// South African Suppliers & Distributors
export const SA_PUMP_SUPPLIERS: IndustryReference[] = [
  {
    name: 'KSB Pumps South Africa',
    url: 'https://www.ksb.com/en-za',
    category: 'local_sa',
    description: 'Official KSB operation in South Africa, B-BBEE Level 1',
    productsOffered: ['KSB pumps', 'Valves', 'Service'],
  },
  {
    name: 'Grundfos South Africa',
    url: 'https://www.grundfos.com/za',
    category: 'local_sa',
    description: 'Grundfos distribution and service in South Africa',
    productsOffered: ['Grundfos pumps', 'Booster systems', 'Controllers'],
  },
  {
    name: 'Sulzer South Africa',
    url: 'https://sapma.co.za/sulzer-south-africa-pty-ltd/',
    category: 'local_sa',
    description: 'Sulzer Pumps SA, established 1922, pump design manufacturer',
    productsOffered: ['Process pumps', 'Service', 'Repair'],
  },
  {
    name: 'Efficient Pumps',
    url: 'https://efficientpumps.co.za',
    category: 'local_sa',
    description: 'Distributor for Grundfos, KSB, DAB, Franklin, Wilo',
    productsOffered: ['Multiple brands', 'Valves', 'Control panels'],
  },
  {
    name: 'M Bond Pumps',
    url: 'https://mbondpumps.co.za',
    category: 'local_sa',
    description: 'Certified KSB distributor',
    productsOffered: ['KSB pumps', 'Parts', 'Service'],
  },
  {
    name: 'The Pumpsmith',
    url: 'https://thepumpsmith.co.za',
    category: 'local_sa',
    description: 'KSB Super Dealer in KwaZulu Natal, also Donnlee/Weir agent',
    productsOffered: ['Pumps', 'Parts', 'Repairs', 'Hire'],
  },
  {
    name: 'Stewarts & Lloyds Pumps',
    url: 'https://stewartsandlloydspumps.co.za',
    category: 'local_sa',
    description: '32 branches across South Africa',
    productsOffered: ['KSB pumps', 'Multiple brands', 'Nationwide service'],
  },
];

// Industry Standards
export const PUMP_STANDARDS: IndustryReference[] = [
  {
    name: 'API 610',
    url: 'https://www.api.org',
    category: 'standard',
    description: 'Centrifugal pumps for petroleum, petrochemical and natural gas industries',
  },
  {
    name: 'API 674',
    url: 'https://www.api.org',
    category: 'standard',
    description: 'Positive displacement pumps - reciprocating',
  },
  {
    name: 'API 675',
    url: 'https://www.api.org',
    category: 'standard',
    description: 'Positive displacement pumps - controlled volume (metering)',
  },
  {
    name: 'API 676',
    url: 'https://www.api.org',
    category: 'standard',
    description: 'Positive displacement pumps - rotary',
  },
  {
    name: 'API 682',
    url: 'https://www.api.org',
    category: 'standard',
    description: 'Pumps - shaft sealing systems',
  },
  {
    name: 'ISO 5199',
    url: 'https://www.iso.org',
    category: 'standard',
    description: 'Technical specifications for centrifugal pumps',
  },
  {
    name: 'ISO 2858',
    url: 'https://www.iso.org',
    category: 'standard',
    description: 'End suction centrifugal pumps - dimensions',
  },
  {
    name: 'ISO 13709',
    url: 'https://www.iso.org',
    category: 'standard',
    description: 'Centrifugal pumps for petroleum (identical to API 610)',
  },
];

// Spare Parts & Seal Suppliers
export const PARTS_SUPPLIERS: IndustryReference[] = [
  {
    name: 'Springer Parts',
    url: 'https://www.springerparts.com',
    category: 'supplier',
    description: 'Direct replacement parts for major pump brands',
    productsOffered: ['Impellers', 'Seals', 'Wear parts', 'Kits'],
  },
  {
    name: 'Sealcon',
    url: 'https://www.china-sealcon.com',
    category: 'supplier',
    description: 'Mechanical seals manufacturer conforming to API/DIN/ISO',
    productsOffered: ['Mechanical seals', 'Spare parts', 'Custom seals'],
  },
  {
    name: 'AnsiPro (Pump World)',
    url: 'https://www.pumpworld.com',
    category: 'supplier',
    description: 'ANSI compliant pump parts',
    productsOffered: ['Casings', 'Impellers', 'Shafts', 'Seals'],
  },
  {
    name: 'Industrial Pump Parts',
    url: 'https://www.industrialpumpparts.com',
    category: 'supplier',
    description: 'Mechanical seals and pump components',
    productsOffered: ['Flygt seals', 'Mechanical seals', 'Various sizes'],
  },
];

// Educational & Technical Resources
export const PUMP_RESOURCES: IndustryReference[] = [
  {
    name: 'Pumps & Systems Magazine',
    url: 'https://www.pumpsandsystems.com',
    category: 'resource',
    description: 'Industry publication with technical articles and guides',
  },
  {
    name: 'Hydraulic Institute',
    url: 'https://www.pumps.org',
    category: 'resource',
    description: 'North American pump manufacturer association, standards development',
  },
  {
    name: 'SAPMA (SA Pump Manufacturers Association)',
    url: 'https://sapma.co.za',
    category: 'resource',
    description: 'South African pump industry association',
  },
  {
    name: 'Engineering Toolbox - Pumps',
    url: 'https://www.engineeringtoolbox.com',
    category: 'resource',
    description: 'Technical calculations and reference data',
  },
  {
    name: 'Pump Selection Wiki (SPS)',
    url: 'https://www.sps-pumps.com/wiki-for-industrial-pumps/',
    category: 'resource',
    description: 'Technical wiki covering all pump types',
  },
];

// All references combined
export const ALL_PUMP_REFERENCES: IndustryReference[] = [
  ...PUMP_MANUFACTURERS,
  ...SA_PUMP_SUPPLIERS,
  ...PUMP_STANDARDS,
  ...PARTS_SUPPLIERS,
  ...PUMP_RESOURCES,
];

export const getReferencesByCategory = (category: IndustryReference['category']): IndustryReference[] =>
  ALL_PUMP_REFERENCES.filter(ref => ref.category === category);
