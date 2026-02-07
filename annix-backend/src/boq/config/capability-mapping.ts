/**
 * Capability Mapping Configuration
 *
 * Maps BOQ section types to supplier capability keys.
 * These capability keys match the PRODUCTS_AND_SERVICES values
 * used in supplier onboarding.
 */

// BOQ Section Type -> Capability Key mapping
// Determines which capability a supplier needs to see this section
export const BOQ_SECTION_TO_CAPABILITY: Record<string, string> = {
  // Fabricated Steel (steel pipes, bends, flanges, fittings)
  straight_pipes: "fabricated_steel",
  bends: "fabricated_steel",
  tees: "fabricated_steel",
  reducers: "fabricated_steel",
  flanges: "fabricated_steel",
  blank_flanges: "fabricated_steel",
  fittings: "fabricated_steel",

  // Fasteners & Gaskets (nuts, bolts, washers, gaskets)
  bnw_sets: "fasteners_gaskets",
  gaskets: "fasteners_gaskets",
  fasteners: "fasteners_gaskets",

  // Surface Protection (coating, painting, galvanizing)
  surface_protection: "surface_protection",
  coating: "surface_protection",

  // HDPE Pipes
  hdpe_pipes: "hdpe",
  hdpe_fittings: "hdpe",

  // PVC Pipes
  pvc_pipes: "pvc",
  pvc_fittings: "pvc",

  // Structural Steel
  structural_steel: "structural_steel",
  steel_structures: "structural_steel",

  // Valves & Instruments
  valves: "valves_instruments",
  instruments: "valves_instruments",
  actuators: "valves_instruments",
  flow_meters: "valves_instruments",
  pressure_instruments: "valves_instruments",
  level_instruments: "valves_instruments",
  temperature_instruments: "valves_instruments",

  // Pumps & Pump Parts
  pumps: "pumps",
  pump_parts: "pumps",
  pump_spares: "pumps",
  pump_repairs: "pumps",
  pump_rental: "pumps",
};

// Reverse mapping: Capability Key -> BOQ Section Types
// Used to determine which sections a supplier with a given capability can access
export const CAPABILITY_TO_SECTIONS: Record<string, string[]> = {
  fabricated_steel: [
    "straight_pipes",
    "bends",
    "tees",
    "reducers",
    "flanges",
    "blank_flanges",
    "fittings",
  ],
  fasteners_gaskets: ["bnw_sets", "gaskets", "fasteners"],
  surface_protection: ["surface_protection", "coating"],
  hdpe: ["hdpe_pipes", "hdpe_fittings"],
  pvc: ["pvc_pipes", "pvc_fittings"],
  structural_steel: ["structural_steel", "steel_structures"],
  valves_instruments: [
    "valves",
    "instruments",
    "actuators",
    "flow_meters",
    "pressure_instruments",
    "level_instruments",
    "temperature_instruments",
  ],
  pumps: ["pumps", "pump_parts", "pump_spares", "pump_repairs", "pump_rental"],
  // transport_install doesn't have BOQ sections - it's a service
};

// Section display titles for BOQ sections
export const SECTION_TITLES: Record<string, string> = {
  straight_pipes: "Straight Pipes",
  bends: "Bends",
  tees: "Tees",
  reducers: "Reducers",
  flanges: "Flanges",
  blank_flanges: "Blank Flanges",
  fittings: "Fittings",
  bnw_sets: "Bolt, Nut & Washer Sets",
  gaskets: "Gaskets",
  fasteners: "Fasteners",
  surface_protection: "Surface Protection",
  coating: "Coating",
  hdpe_pipes: "HDPE Pipes",
  hdpe_fittings: "HDPE Fittings",
  pvc_pipes: "PVC Pipes",
  pvc_fittings: "PVC Fittings",
  structural_steel: "Structural Steel",
  steel_structures: "Steel Structures",
  valves: "Valves",
  instruments: "Instruments",
  actuators: "Actuators",
  flow_meters: "Flow Meters",
  pressure_instruments: "Pressure Instruments",
  level_instruments: "Level Instruments",
  temperature_instruments: "Temperature Instruments",
  pumps: "Pumps",
  pump_parts: "Pump Parts",
  pump_spares: "Pump Spare Parts",
  pump_repairs: "Pump Repair Services",
  pump_rental: "Pump Rental",
};

// All valid capability keys (matches PRODUCTS_AND_SERVICES values)
export const VALID_CAPABILITIES = [
  "fabricated_steel",
  "fasteners_gaskets",
  "surface_protection",
  "hdpe",
  "pvc",
  "structural_steel",
  "transport_install",
  "valves_instruments",
  "pumps",
] as const;

export type CapabilityKey = (typeof VALID_CAPABILITIES)[number];

/**
 * Get the capability key for a given BOQ section type
 */
export function getCapabilityForSection(sectionType: string): string | undefined {
  return BOQ_SECTION_TO_CAPABILITY[sectionType];
}

/**
 * Get all sections a supplier can access based on their capabilities
 */
export function getSectionsForCapabilities(capabilities: string[]): string[] {
  const sections: Set<string> = new Set();
  for (const capability of capabilities) {
    const capabilitySections = CAPABILITY_TO_SECTIONS[capability];
    if (capabilitySections) {
      capabilitySections.forEach((section) => sections.add(section));
    }
  }
  return Array.from(sections);
}

/**
 * Get the display title for a section type
 */
export function getSectionTitle(sectionType: string): string {
  return SECTION_TITLES[sectionType] || sectionType;
}

/**
 * Check if a supplier with given capabilities can access a section
 */
export function canAccessSection(capabilities: string[], sectionType: string): boolean {
  const sectionCapability = BOQ_SECTION_TO_CAPABILITY[sectionType];
  if (!sectionCapability) return false;
  return capabilities.includes(sectionCapability);
}
