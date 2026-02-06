// Pumps & Pump Parts Module - Pricing Configuration
// Used for RFQ quotations and cost estimations

export interface PricingTier {
  minQty: number;
  maxQty: number;
  discountPercent: number;
}

export interface PumpPricingCategory {
  value: string;
  label: string;
  description: string;
  basePriceRange: { min: number; max: number };
  unit: string;
  factors: string[];
}

export const NEW_PUMP_PRICING: PumpPricingCategory[] = [
  {
    value: 'centrifugal_standard',
    label: 'Standard Centrifugal Pumps',
    description: 'End suction, inline, and split case centrifugal pumps',
    basePriceRange: { min: 15000, max: 500000 },
    unit: 'per unit',
    factors: ['Size (DN)', 'Material', 'Motor power', 'API/ISO compliance'],
  },
  {
    value: 'centrifugal_multistage',
    label: 'Multistage Centrifugal Pumps',
    description: 'High pressure multistage pumps',
    basePriceRange: { min: 50000, max: 2000000 },
    unit: 'per unit',
    factors: ['Number of stages', 'Material', 'Motor power', 'Pressure rating'],
  },
  {
    value: 'submersible',
    label: 'Submersible Pumps',
    description: 'Borehole and dewatering submersible pumps',
    basePriceRange: { min: 20000, max: 800000 },
    unit: 'per unit',
    factors: ['Depth rating', 'Flow rate', 'Material', 'Motor type'],
  },
  {
    value: 'positive_displacement',
    label: 'Positive Displacement Pumps',
    description: 'Progressive cavity, gear, diaphragm, and metering pumps',
    basePriceRange: { min: 25000, max: 600000 },
    unit: 'per unit',
    factors: ['Pump type', 'Material', 'Flow rate', 'Viscosity rating'],
  },
  {
    value: 'slurry',
    label: 'Slurry Pumps',
    description: 'Heavy-duty pumps for abrasive slurries',
    basePriceRange: { min: 80000, max: 3000000 },
    unit: 'per unit',
    factors: ['Size', 'Material (rubber/metal)', 'Solids handling', 'Wear parts'],
  },
];

export const SPARE_PARTS_PRICING: PumpPricingCategory[] = [
  {
    value: 'impeller',
    label: 'Impellers',
    description: 'Replacement impellers',
    basePriceRange: { min: 2000, max: 150000 },
    unit: 'per item',
    factors: ['Size', 'Material', 'Pump model compatibility'],
  },
  {
    value: 'mechanical_seal',
    label: 'Mechanical Seals',
    description: 'Complete mechanical seal assemblies',
    basePriceRange: { min: 3000, max: 80000 },
    unit: 'per item',
    factors: ['Shaft size', 'Seal type', 'Face materials', 'API plan'],
  },
  {
    value: 'seal_kit',
    label: 'Seal Repair Kits',
    description: 'Seal faces, o-rings, and springs',
    basePriceRange: { min: 1500, max: 25000 },
    unit: 'per kit',
    factors: ['Seal model', 'Materials'],
  },
  {
    value: 'bearing_kit',
    label: 'Bearing Kits',
    description: 'Radial and thrust bearings with isolators',
    basePriceRange: { min: 2000, max: 40000 },
    unit: 'per kit',
    factors: ['Shaft size', 'Bearing type', 'Brand'],
  },
  {
    value: 'wear_ring',
    label: 'Wear Rings',
    description: 'Casing and impeller wear rings',
    basePriceRange: { min: 500, max: 15000 },
    unit: 'per set',
    factors: ['Size', 'Material', 'Clearance type'],
  },
  {
    value: 'shaft_sleeve',
    label: 'Shaft Sleeves',
    description: 'Protective shaft sleeves',
    basePriceRange: { min: 800, max: 20000 },
    unit: 'per item',
    factors: ['Size', 'Material', 'Length'],
  },
  {
    value: 'coupling',
    label: 'Couplings',
    description: 'Flexible couplings and elements',
    basePriceRange: { min: 1000, max: 30000 },
    unit: 'per assembly',
    factors: ['Size', 'Type', 'Rating'],
  },
  {
    value: 'overhaul_kit',
    label: 'Major Overhaul Kits',
    description: 'Complete rebuild kit with all wear parts',
    basePriceRange: { min: 15000, max: 200000 },
    unit: 'per kit',
    factors: ['Pump model', 'Materials', 'Scope'],
  },
];

export const REPAIR_SERVICE_PRICING: PumpPricingCategory[] = [
  {
    value: 'inspection',
    label: 'Inspection & Assessment',
    description: 'Strip-down inspection and condition report',
    basePriceRange: { min: 2500, max: 15000 },
    unit: 'per pump',
    factors: ['Pump size', 'Location (workshop/site)'],
  },
  {
    value: 'seal_replacement',
    label: 'Seal Replacement',
    description: 'Mechanical seal replacement service',
    basePriceRange: { min: 3000, max: 25000 },
    unit: 'per pump',
    factors: ['Seal type', 'Pump accessibility', 'Site/workshop'],
  },
  {
    value: 'bearing_replacement',
    label: 'Bearing Replacement',
    description: 'Bearing replacement with alignment',
    basePriceRange: { min: 4000, max: 30000 },
    unit: 'per pump',
    factors: ['Pump size', 'Bearing type', 'Alignment required'],
  },
  {
    value: 'impeller_replacement',
    label: 'Impeller Replacement',
    description: 'Impeller change with balancing',
    basePriceRange: { min: 5000, max: 40000 },
    unit: 'per pump',
    factors: ['Pump size', 'Impeller type', 'Balancing required'],
  },
  {
    value: 'minor_overhaul',
    label: 'Minor Overhaul',
    description: 'Seals, bearings, and wear parts replacement',
    basePriceRange: { min: 15000, max: 80000 },
    unit: 'per pump',
    factors: ['Pump size', 'Parts required', 'Testing'],
  },
  {
    value: 'major_overhaul',
    label: 'Major Overhaul',
    description: 'Complete strip and rebuild with all new internals',
    basePriceRange: { min: 40000, max: 300000 },
    unit: 'per pump',
    factors: ['Pump size', 'Material upgrades', 'Performance testing'],
  },
  {
    value: 'rewind_motor',
    label: 'Motor Rewind',
    description: 'Electric motor rewind service',
    basePriceRange: { min: 8000, max: 100000 },
    unit: 'per motor',
    factors: ['Motor size (kW)', 'Voltage', 'Enclosure type'],
  },
];

export const RENTAL_PRICING: PumpPricingCategory[] = [
  {
    value: 'dewatering_small',
    label: 'Small Dewatering Pump',
    description: '50-100mm submersible dewatering',
    basePriceRange: { min: 500, max: 1500 },
    unit: 'per day',
    factors: ['Duration', 'Delivery distance', 'Accessories'],
  },
  {
    value: 'dewatering_medium',
    label: 'Medium Dewatering Pump',
    description: '100-200mm dewatering pump',
    basePriceRange: { min: 1000, max: 3500 },
    unit: 'per day',
    factors: ['Duration', 'Delivery distance', 'Accessories'],
  },
  {
    value: 'dewatering_large',
    label: 'Large Dewatering Pump',
    description: '200mm+ high-flow dewatering',
    basePriceRange: { min: 2500, max: 8000 },
    unit: 'per day',
    factors: ['Duration', 'Flow rate', 'Diesel/electric'],
  },
  {
    value: 'slurry_rental',
    label: 'Slurry Pump Rental',
    description: 'Portable slurry pumps for construction/mining',
    basePriceRange: { min: 3000, max: 15000 },
    unit: 'per day',
    factors: ['Size', 'Duration', 'Wear parts consumption'],
  },
  {
    value: 'high_pressure',
    label: 'High Pressure Pump',
    description: 'High pressure wash/jetting pump',
    basePriceRange: { min: 1500, max: 5000 },
    unit: 'per day',
    factors: ['Pressure rating', 'Flow rate', 'Duration'],
  },
];

export const VOLUME_DISCOUNT_TIERS: PricingTier[] = [
  { minQty: 1, maxQty: 1, discountPercent: 0 },
  { minQty: 2, maxQty: 4, discountPercent: 5 },
  { minQty: 5, maxQty: 9, discountPercent: 10 },
  { minQty: 10, maxQty: 19, discountPercent: 15 },
  { minQty: 20, maxQty: Infinity, discountPercent: 20 },
];

export const MATERIAL_PRICE_MULTIPLIERS: Record<string, number> = {
  cast_iron: 1.0,
  ductile_iron: 1.15,
  carbon_steel: 1.2,
  ss_304: 1.8,
  ss_316: 2.2,
  duplex: 3.5,
  super_duplex: 5.0,
  bronze: 1.6,
  ni_alloy: 6.0,
  titanium: 8.0,
  high_chrome: 2.5,
  ni_hard: 2.8,
  rubber_lined: 1.5,
  polyurethane: 1.4,
};

export const MOTOR_POWER_BANDS: { min: number; max: number; factor: number }[] = [
  { min: 0, max: 7.5, factor: 1.0 },
  { min: 7.5, max: 22, factor: 1.15 },
  { min: 22, max: 55, factor: 1.3 },
  { min: 55, max: 110, factor: 1.5 },
  { min: 110, max: 250, factor: 1.8 },
  { min: 250, max: 500, factor: 2.2 },
  { min: 500, max: Infinity, factor: 2.8 },
];

export const volumeDiscount = (quantity: number): number => {
  const tier = VOLUME_DISCOUNT_TIERS.find(t => quantity >= t.minQty && quantity <= t.maxQty);
  return tier?.discountPercent ?? 0;
};

export const materialMultiplier = (material: string): number =>
  MATERIAL_PRICE_MULTIPLIERS[material] ?? 1.0;

export const motorPowerFactor = (powerKw: number): number => {
  const band = MOTOR_POWER_BANDS.find(b => powerKw >= b.min && powerKw < b.max);
  return band?.factor ?? 1.0;
};

export const calculatePumpEstimate = (params: {
  basePrice: number;
  material: string;
  motorPowerKw: number;
  quantity: number;
  markupPercent: number;
}): {
  unitPrice: number;
  totalBeforeDiscount: number;
  discountPercent: number;
  discountAmount: number;
  totalPrice: number;
} => {
  const materialFactor = materialMultiplier(params.material);
  const powerFactor = motorPowerFactor(params.motorPowerKw);
  const discount = volumeDiscount(params.quantity);

  const adjustedBase = params.basePrice * materialFactor * powerFactor;
  const withMarkup = adjustedBase * (1 + params.markupPercent / 100);
  const unitPrice = Math.round(withMarkup * 100) / 100;

  const totalBeforeDiscount = unitPrice * params.quantity;
  const discountAmount = totalBeforeDiscount * (discount / 100);
  const totalPrice = totalBeforeDiscount - discountAmount;

  return {
    unitPrice,
    totalBeforeDiscount: Math.round(totalBeforeDiscount * 100) / 100,
    discountPercent: discount,
    discountAmount: Math.round(discountAmount * 100) / 100,
    totalPrice: Math.round(totalPrice * 100) / 100,
  };
};

export const calculateRentalCost = (params: {
  dailyRate: number;
  durationDays: number;
  deliveryDistance: number;
  includesOperator: boolean;
}): {
  rentalCost: number;
  deliveryCost: number;
  operatorCost: number;
  totalCost: number;
} => {
  const weeklyDiscount = params.durationDays >= 7 ? 0.15 : 0;
  const monthlyDiscount = params.durationDays >= 30 ? 0.25 : weeklyDiscount;

  const baseRental = params.dailyRate * params.durationDays;
  const rentalCost = baseRental * (1 - monthlyDiscount);

  const deliveryRatePerKm = 25;
  const deliveryCost = params.deliveryDistance * deliveryRatePerKm * 2;

  const operatorDailyRate = 2500;
  const operatorCost = params.includesOperator ? operatorDailyRate * params.durationDays : 0;

  return {
    rentalCost: Math.round(rentalCost * 100) / 100,
    deliveryCost: Math.round(deliveryCost * 100) / 100,
    operatorCost: Math.round(operatorCost * 100) / 100,
    totalCost: Math.round((rentalCost + deliveryCost + operatorCost) * 100) / 100,
  };
};
