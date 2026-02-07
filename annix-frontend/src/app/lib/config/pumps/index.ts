// Pumps & Pump Parts Module - Main Export
// Standalone module for pump RFQ specifications and pricing

export * from "./api610Classification";
export * from "./calculations";
export * from "./formValidation";
export * from "./pricing";
export * from "./pumpComparison";
export * from "./pumpSelectionGuide";
export * from "./pumpSpareParts";
export * from "./pumpSpecifications";
export * from "./pumpTypes";
export * from "./references";

// Compatibility exports for admin pages
import {
  NEW_PUMP_PRICING,
  RENTAL_PRICING,
  REPAIR_SERVICE_PRICING,
  SPARE_PARTS_PRICING,
} from "./pricing";
import {
  CONSTRUCTION_SPECS,
  FLUID_SPECS,
  MATERIAL_OPTIONS,
  MOTOR_SPECS,
  PERFORMANCE_SPECS,
} from "./pumpSpecifications";

export const PUMP_PRICING_TIERS = {
  newPumps: NEW_PUMP_PRICING,
  spareParts: SPARE_PARTS_PRICING,
  repairService: REPAIR_SERVICE_PRICING,
  rental: RENTAL_PRICING,
};

export const PUMP_SPECIFICATIONS = {
  performance: PERFORMANCE_SPECS,
  fluid: FLUID_SPECS,
  construction: CONSTRUCTION_SPECS,
  motor: MOTOR_SPECS,
  materials: MATERIAL_OPTIONS,
};

// Module metadata
export const PUMPS_MODULE = {
  name: "Pumps & Pump Parts",
  value: "pumps",
  version: "1.0.0",
  description: "Industrial pumps, spare parts, seals, impellers, and pump accessories",
  icon: "🔄",
  categories: [
    { value: "new_pump", label: "New Pump Supply", description: "Complete pump units" },
    { value: "spare_parts", label: "Spare Parts", description: "Replacement components" },
    { value: "repair_service", label: "Repair Service", description: "Pump repair and overhaul" },
    { value: "rental", label: "Pump Rental", description: "Temporary pump hire" },
  ],
};
