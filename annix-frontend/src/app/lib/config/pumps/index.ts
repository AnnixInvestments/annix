// Pumps & Pump Parts Module - Main Export
// Standalone module for pump RFQ specifications and pricing

export * from './pumpTypes';
export * from './pumpSpecifications';
export * from './pumpSpareParts';
export * from './references';
export * from './pricing';
export * from './calculations';

// Module metadata
export const PUMPS_MODULE = {
  name: 'Pumps & Pump Parts',
  value: 'pumps',
  version: '1.0.0',
  description: 'Industrial pumps, spare parts, seals, impellers, and pump accessories',
  icon: '🔄',
  categories: [
    { value: 'new_pump', label: 'New Pump Supply', description: 'Complete pump units' },
    { value: 'spare_parts', label: 'Spare Parts', description: 'Replacement components' },
    { value: 'repair_service', label: 'Repair Service', description: 'Pump repair and overhaul' },
    { value: 'rental', label: 'Pump Rental', description: 'Temporary pump hire' },
  ],
};
