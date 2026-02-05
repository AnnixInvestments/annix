export const COMPANY_SIZE_OPTIONS = [
  { value: 'micro', label: 'Micro (1-9 employees)' },
  { value: 'small', label: 'Small (10-49 employees)' },
  { value: 'medium', label: 'Medium (50-249 employees)' },
  { value: 'large', label: 'Large (250-999 employees)' },
  { value: 'enterprise', label: 'Enterprise (1000+ employees)' },
] as const;

export const SOUTH_AFRICAN_PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'Northern Cape',
  'North West',
  'Western Cape',
] as const;

export const CUSTOMER_INDUSTRY_OPTIONS = [
  'Mining',
  'Oil & Gas',
  'Power Generation',
  'Water Treatment',
  'Chemical Processing',
  'Manufacturing',
  'Construction',
  'Agriculture',
  'Other',
] as const;

export const SUPPLIER_INDUSTRY_OPTIONS = [
  'Piping & Valves',
  'Steel Manufacturing',
  'Industrial Equipment',
  'Fabrication',
  'Coating & Surface Treatment',
  'Inspection Services',
  'Logistics & Transport',
  'Mining Supplies',
  'Oil & Gas',
  'Water Treatment',
  'Other',
] as const;

export const BEE_LEVELS = [
  { value: 1, label: 'Level 1 (135% recognition)' },
  { value: 2, label: 'Level 2 (125% recognition)' },
  { value: 3, label: 'Level 3 (110% recognition)' },
  { value: 4, label: 'Level 4 (100% recognition)' },
  { value: 5, label: 'Level 5 (80% recognition)' },
  { value: 6, label: 'Level 6 (60% recognition)' },
  { value: 7, label: 'Level 7 (50% recognition)' },
  { value: 8, label: 'Level 8 (10% recognition)' },
] as const;

export const DOCUMENT_VALID_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
];

export const DOCUMENT_MAX_SIZE_BYTES = 10 * 1024 * 1024;

export type CompanySize = (typeof COMPANY_SIZE_OPTIONS)[number]['value'];
export type Province = (typeof SOUTH_AFRICAN_PROVINCES)[number];
export type BeeLevel = (typeof BEE_LEVELS)[number]['value'];
