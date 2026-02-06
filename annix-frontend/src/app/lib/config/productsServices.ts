// Shared Products & Services Configuration
// Used by both RFQ form (page 1) and Supplier Onboarding

export interface ProductService {
  value: string;
  label: string;
  description: string;
  icon: string;
  category: 'product' | 'service';
  hidden?: boolean;
}

// Master list of all products and services
// Adding new items here will automatically appear in:
// 1. RFQ form (page 1) - Products/Services selection
// 2. Supplier onboarding - Capabilities selection
export const PRODUCTS_AND_SERVICES: ProductService[] = [
  {
    value: 'fabricated_steel',
    label: 'Steel Pipes',
    description: 'Fabricated steel pipes, bends, flanges, and fittings',
    icon: '🔩',
    category: 'product',
  },
  {
    value: 'fasteners_gaskets',
    label: 'Nuts, Bolts, Washers & Gaskets',
    description: 'Fasteners, bolts, nuts, washers, gaskets, and sealing materials',
    icon: '⚙️',
    category: 'product',
  },
  {
    value: 'surface_protection',
    label: 'Surface Protection',
    description: 'Coating, painting, galvanizing, and surface treatment services',
    icon: '🛡️',
    category: 'service',
  },
  {
    value: 'hdpe',
    label: 'HDPE Pipes',
    description: 'High-density polyethylene pipes and fittings',
    icon: '🔵',
    category: 'product',
  },
  {
    value: 'pvc',
    label: 'PVC Pipes',
    description: 'PVC pipes, fittings, and accessories',
    icon: '⚪',
    category: 'product',
  },
  {
    value: 'structural_steel',
    label: 'Structural Steel',
    description: 'Structural steel fabrication and supply',
    icon: '🏗️',
    category: 'product',
    hidden: true,
  },
  {
    value: 'pumps',
    label: 'Pumps & Pump Parts',
    description: 'Industrial pumps, spare parts, seals, impellers, and pump accessories',
    icon: '🔄',
    category: 'product',
  },
  {
    value: 'valves_meters_instruments',
    label: 'Valves, Meters & Instruments',
    description: 'Industrial valves, flow meters, pressure gauges, and instrumentation',
    icon: '🎛️',
    category: 'product',
  },
  {
    value: 'transport_install',
    label: 'Transport/Install',
    description: 'Transportation, delivery, and installation services',
    icon: '🚚',
    category: 'service',
  },
  {
    value: 'pipe_steel_work',
    label: 'Pipe Brackets & Steel Work',
    description: 'Pipe supports, brackets, compensation plates, and reinforcement pads',
    icon: '🔧',
    category: 'product',
  },
];

// Helper to get visible products only
export const getProducts = (): ProductService[] =>
  PRODUCTS_AND_SERVICES.filter(item => item.category === 'product' && !item.hidden);

// Helper to get visible services only
export const getServices = (): ProductService[] =>
  PRODUCTS_AND_SERVICES.filter(item => item.category === 'service' && !item.hidden);

// Helper to get all visible items
export const getVisibleProductsAndServices = (): ProductService[] =>
  PRODUCTS_AND_SERVICES.filter(item => !item.hidden);

// Helper to get item by value
export const getProductServiceByValue = (value: string): ProductService | undefined =>
  PRODUCTS_AND_SERVICES.find(item => item.value === value);

// Helper to get labels for an array of values
export const getProductServiceLabels = (values: string[]): string[] =>
  values.map(v => getProductServiceByValue(v)?.label || v);

// Unregistered customer restrictions
// Products/services available to unregistered customers (guests)
export const UNREGISTERED_ALLOWED_PRODUCTS = [
  'fabricated_steel',      // Steel Pipes
  'fasteners_gaskets',     // Nuts, Bolts, Washers & Gaskets
  'surface_protection',    // Surface Protection
];

// RFQ types available to unregistered customers
export const UNREGISTERED_ALLOWED_PROJECT_TYPES = ['standard'];

// Check if a product/service is available to unregistered customers
export const isProductAvailableForUnregistered = (value: string): boolean =>
  UNREGISTERED_ALLOWED_PRODUCTS.includes(value);

// Check if a project type is available to unregistered customers
export const isProjectTypeAvailableForUnregistered = (value: string): boolean =>
  UNREGISTERED_ALLOWED_PROJECT_TYPES.includes(value);
