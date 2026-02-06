// Pumps & Pump Parts Module - Spare Parts Configuration

export interface SparePartCategory {
  value: string;
  label: string;
  description: string;
  icon: string;
  parts: SparePart[];
}

export interface SparePart {
  value: string;
  label: string;
  description: string;
  specificationFields?: string[];
}

export const PUMP_SPARE_PARTS: SparePartCategory[] = [
  {
    value: 'rotating',
    label: 'Rotating Components',
    description: 'Impellers, shafts, and rotating assemblies',
    icon: '🔄',
    parts: [
      {
        value: 'impeller',
        label: 'Impeller',
        description: 'Rotating component that imparts energy to the fluid',
        specificationFields: ['diameter', 'material', 'numberOfVanes', 'type'],
      },
      {
        value: 'shaft',
        label: 'Pump Shaft',
        description: 'Connects motor to impeller, transmits torque',
        specificationFields: ['diameter', 'length', 'material', 'keyway'],
      },
      {
        value: 'shaft_sleeve',
        label: 'Shaft Sleeve',
        description: 'Protects shaft in seal/packing area',
        specificationFields: ['od', 'id', 'length', 'material'],
      },
      {
        value: 'wear_ring',
        label: 'Wear Ring',
        description: 'Replaceable clearance ring between impeller and casing',
        specificationFields: ['type', 'od', 'id', 'material'],
      },
      {
        value: 'inducer',
        label: 'Inducer',
        description: 'Pre-rotation device for low NPSH applications',
        specificationFields: ['diameter', 'material'],
      },
    ],
  },
  {
    value: 'sealing',
    label: 'Sealing Components',
    description: 'Mechanical seals, packing, and gaskets',
    icon: '🔒',
    parts: [
      {
        value: 'mechanical_seal',
        label: 'Mechanical Seal',
        description: 'Complete mechanical seal assembly',
        specificationFields: ['shaftSize', 'sealType', 'materials', 'apiPlan'],
      },
      {
        value: 'seal_faces',
        label: 'Seal Faces',
        description: 'Rotating and stationary seal face pair',
        specificationFields: ['size', 'rotatingMaterial', 'stationaryMaterial'],
      },
      {
        value: 'seal_elastomers',
        label: 'Seal O-Rings/Elastomers',
        description: 'Secondary sealing elements',
        specificationFields: ['material', 'size'],
      },
      {
        value: 'seal_springs',
        label: 'Seal Springs',
        description: 'Springs for mechanical seal compression',
        specificationFields: ['type', 'material', 'quantity'],
      },
      {
        value: 'gland_packing',
        label: 'Gland Packing',
        description: 'Compression packing for stuffing box',
        specificationFields: ['size', 'material', 'quantity'],
      },
      {
        value: 'lantern_ring',
        label: 'Lantern Ring',
        description: 'Spacer ring for flush water injection',
        specificationFields: ['size', 'material'],
      },
      {
        value: 'gasket_set',
        label: 'Gasket Set',
        description: 'Complete set of pump gaskets',
        specificationFields: ['material', 'pumpModel'],
      },
    ],
  },
  {
    value: 'bearings',
    label: 'Bearings & Supports',
    description: 'Bearings, bearing housings, and support components',
    icon: '⚙️',
    parts: [
      {
        value: 'radial_bearing',
        label: 'Radial Bearing',
        description: 'Supports radial loads on shaft',
        specificationFields: ['type', 'size', 'manufacturer'],
      },
      {
        value: 'thrust_bearing',
        label: 'Thrust Bearing',
        description: 'Supports axial loads on shaft',
        specificationFields: ['type', 'size', 'manufacturer'],
      },
      {
        value: 'bearing_housing',
        label: 'Bearing Housing',
        description: 'Enclosure for bearing assembly',
        specificationFields: ['type', 'material'],
      },
      {
        value: 'bearing_isolator',
        label: 'Bearing Isolator',
        description: 'Protects bearings from contamination',
        specificationFields: ['shaftSize', 'type'],
      },
      {
        value: 'oil_seal',
        label: 'Oil Seal / Lip Seal',
        description: 'Seals bearing oil/grease',
        specificationFields: ['size', 'material'],
      },
    ],
  },
  {
    value: 'casing',
    label: 'Casing & Wear Parts',
    description: 'Casing components and wear parts',
    icon: '🛡️',
    parts: [
      {
        value: 'volute_casing',
        label: 'Volute/Casing',
        description: 'Main pump body',
        specificationFields: ['material', 'size'],
      },
      {
        value: 'back_plate',
        label: 'Back Plate / Cover',
        description: 'Rear casing component',
        specificationFields: ['material'],
      },
      {
        value: 'suction_cover',
        label: 'Suction Cover',
        description: 'Front casing component with suction nozzle',
        specificationFields: ['material'],
      },
      {
        value: 'liner',
        label: 'Casing Liner',
        description: 'Replaceable wear liner for slurry pumps',
        specificationFields: ['material', 'type'],
      },
      {
        value: 'throatbush',
        label: 'Throatbush',
        description: 'Wear component at impeller inlet',
        specificationFields: ['material'],
      },
      {
        value: 'expeller',
        label: 'Expeller / Repeller',
        description: 'Back vanes to reduce seal pressure',
        specificationFields: ['diameter', 'material'],
      },
    ],
  },
  {
    value: 'coupling',
    label: 'Coupling & Drive',
    description: 'Couplings and drive components',
    icon: '🔗',
    parts: [
      {
        value: 'coupling_complete',
        label: 'Coupling Assembly',
        description: 'Complete coupling unit',
        specificationFields: ['type', 'size', 'manufacturer'],
      },
      {
        value: 'coupling_element',
        label: 'Coupling Element',
        description: 'Flexible element for coupling',
        specificationFields: ['type', 'size'],
      },
      {
        value: 'coupling_hub',
        label: 'Coupling Hub',
        description: 'Hub portion of coupling',
        specificationFields: ['boreSize', 'type'],
      },
      {
        value: 'coupling_spacer',
        label: 'Coupling Spacer',
        description: 'Spacer for seal removal',
        specificationFields: ['length', 'type'],
      },
      {
        value: 'coupling_guard',
        label: 'Coupling Guard',
        description: 'Safety guard over coupling',
        specificationFields: ['type', 'material'],
      },
    ],
  },
  {
    value: 'auxiliary',
    label: 'Auxiliary Components',
    description: 'Supporting equipment and accessories',
    icon: '🔧',
    parts: [
      {
        value: 'baseplate',
        label: 'Baseplate',
        description: 'Mounting frame for pump and motor',
        specificationFields: ['type', 'material', 'size'],
      },
      {
        value: 'strainer',
        label: 'Suction Strainer',
        description: 'Inlet strainer to protect pump',
        specificationFields: ['size', 'meshSize', 'material'],
      },
      {
        value: 'seal_pot',
        label: 'Seal Support System',
        description: 'Reservoir for seal flush system',
        specificationFields: ['type', 'capacity'],
      },
      {
        value: 'pressure_gauge',
        label: 'Pressure Gauge',
        description: 'Suction/discharge pressure indication',
        specificationFields: ['range', 'connection'],
      },
      {
        value: 'relief_valve',
        label: 'Relief Valve',
        description: 'Overpressure protection',
        specificationFields: ['setPoint', 'size'],
      },
    ],
  },
];

export const getSparePartCategory = (categoryValue: string): SparePartCategory | undefined =>
  PUMP_SPARE_PARTS.find(cat => cat.value === categoryValue);

export const getAllSpareParts = (): SparePart[] =>
  PUMP_SPARE_PARTS.flatMap(cat => cat.parts);

export const getSparePartByValue = (value: string): SparePart | undefined =>
  getAllSpareParts().find(part => part.value === value);

// Common Spare Parts Kits
export const SPARE_PARTS_KITS = [
  {
    value: 'wear_and_tear',
    label: 'Wear & Tear Kit',
    description: 'Basic wear parts for routine maintenance',
    typicalParts: ['mechanical_seal', 'gasket_set', 'wear_ring', 'bearing_isolator'],
  },
  {
    value: 'major_overhaul',
    label: 'Major Overhaul Kit',
    description: 'Complete rebuild kit',
    typicalParts: ['impeller', 'shaft_sleeve', 'mechanical_seal', 'wear_ring', 'radial_bearing', 'thrust_bearing', 'gasket_set'],
  },
  {
    value: 'seal_kit',
    label: 'Seal Repair Kit',
    description: 'Mechanical seal components',
    typicalParts: ['seal_faces', 'seal_elastomers', 'seal_springs'],
  },
  {
    value: 'bearing_kit',
    label: 'Bearing Kit',
    description: 'Complete bearing replacement set',
    typicalParts: ['radial_bearing', 'thrust_bearing', 'bearing_isolator', 'oil_seal'],
  },
];
