// API 610 Pump Type Classification
// Standard classification for centrifugal pumps per API 610 (12th Edition)

export type Api610PumpCategory = 'OH' | 'BB' | 'VS';

export interface Api610PumpType {
  code: string;
  category: Api610PumpCategory;
  name: string;
  description: string;
  configuration: string;
  bearingArrangement: string;
  sealChamber: string;
  impellerType: string;
  typicalApplications: string[];
  advantages: string[];
  limitations: string[];
  operatingLimits: {
    maxTemperatureC: number;
    maxPressureBar: number;
    maxPowerKw: number;
    maxSpeedRpm: number;
  };
  nozzleConfiguration: string;
  baseplateMounting: string;
}

export const API_610_PUMP_TYPES: Api610PumpType[] = [
  // OH - Overhung (Single Stage)
  {
    code: 'OH1',
    category: 'OH',
    name: 'Horizontal Foot-Mounted',
    description: 'Overhung impeller, foot-mounted, flexible coupling to driver',
    configuration: 'Horizontal, single stage, overhung impeller',
    bearingArrangement: 'Bearings in separate housing, flexible coupling to driver',
    sealChamber: 'Standard bore seal chamber',
    impellerType: 'Enclosed, semi-open, or open',
    typicalApplications: [
      'General refinery services',
      'Light hydrocarbon transfer',
      'Cooling water',
      'Low to medium temperature services',
    ],
    advantages: [
      'Simple construction',
      'Easy maintenance',
      'Lower cost',
      'Flexible coupling allows for some misalignment',
      'Motor can be serviced without disturbing pump',
    ],
    limitations: [
      'Shaft deflection higher than BB types',
      'More seal wear due to shaft movement',
      'Lower pressure capability',
      'Baseplate must support pump and driver separately',
    ],
    operatingLimits: {
      maxTemperatureC: 260,
      maxPressureBar: 25,
      maxPowerKw: 300,
      maxSpeedRpm: 3600,
    },
    nozzleConfiguration: 'Top discharge, end suction',
    baseplateMounting: 'Separate foot mounting for pump and driver',
  },
  {
    code: 'OH2',
    category: 'OH',
    name: 'Horizontal Centerline-Mounted',
    description: 'Overhung impeller, centerline-mounted casing, flexible coupling',
    configuration: 'Horizontal, single stage, overhung impeller, centerline support',
    bearingArrangement: 'Bearings in separate housing, flexible coupling to driver',
    sealChamber: 'Standard or enlarged bore seal chamber',
    impellerType: 'Enclosed or semi-open',
    typicalApplications: [
      'High temperature services',
      'Hot oil circulation',
      'Thermal fluid systems',
      'Services with thermal expansion concerns',
    ],
    advantages: [
      'Centerline mounting reduces thermal distortion',
      'Better alignment retention at temperature',
      'Suitable for higher temperatures than OH1',
      'Reduced nozzle loads from thermal growth',
    ],
    limitations: [
      'Higher cost than OH1',
      'More complex installation',
      'Still has shaft overhang limitations',
    ],
    operatingLimits: {
      maxTemperatureC: 400,
      maxPressureBar: 40,
      maxPowerKw: 500,
      maxSpeedRpm: 3600,
    },
    nozzleConfiguration: 'Top discharge, end suction',
    baseplateMounting: 'Centerline supported casing with foot-mounted bearing housing',
  },
  {
    code: 'OH3',
    category: 'OH',
    name: 'Vertical In-Line',
    description: 'Vertical, in-line, separately coupled',
    configuration: 'Vertical shaft, inline suction/discharge, flexible coupling',
    bearingArrangement: 'Pump bearings support hydraulic loads, motor bearings support rotor',
    sealChamber: 'Standard bore seal chamber',
    impellerType: 'Enclosed',
    typicalApplications: [
      'Space-constrained installations',
      'Booster services',
      'In-line pipeline installations',
      'Retrofit applications',
    ],
    advantages: [
      'Minimal floor space',
      'No baseplate required',
      'Self-venting',
      'Easy motor replacement',
      'No alignment required',
    ],
    limitations: [
      'Limited power range',
      'Mechanical seal access can be difficult',
      'Motor must support pump weight',
      'Limited to lower powers',
    ],
    operatingLimits: {
      maxTemperatureC: 260,
      maxPressureBar: 25,
      maxPowerKw: 150,
      maxSpeedRpm: 3600,
    },
    nozzleConfiguration: 'In-line suction and discharge',
    baseplateMounting: 'Pipe-supported or floor-mounted pedestal',
  },
  {
    code: 'OH4',
    category: 'OH',
    name: 'Rigid Coupled Vertical In-Line',
    description: 'Vertical, in-line, rigidly coupled (flex element in coupling)',
    configuration: 'Vertical shaft, inline, rigid coupling with flex element',
    bearingArrangement: 'Driver bearings support entire rotor assembly',
    sealChamber: 'Standard bore seal chamber',
    impellerType: 'Enclosed',
    typicalApplications: [
      'Light duty refinery services',
      'Chemical process',
      'Water treatment',
      'Cooling water',
    ],
    advantages: [
      'Very compact',
      'Simple construction',
      'No pump bearings to maintain',
      'Lower maintenance cost',
    ],
    limitations: [
      'Motor bearings take all loads',
      'Limited to lower specific gravity fluids',
      'Cannot handle high axial thrust',
      'Special motors required',
    ],
    operatingLimits: {
      maxTemperatureC: 175,
      maxPressureBar: 20,
      maxPowerKw: 75,
      maxSpeedRpm: 3600,
    },
    nozzleConfiguration: 'In-line suction and discharge',
    baseplateMounting: 'Pipe-supported',
  },
  {
    code: 'OH5',
    category: 'OH',
    name: 'Close-Coupled (API Compliant)',
    description: 'Horizontal, close-coupled to NEMA C-face motor',
    configuration: 'Horizontal, single stage, impeller mounted on extended motor shaft',
    bearingArrangement: 'Motor bearings support all loads',
    sealChamber: 'Standard bore seal chamber',
    impellerType: 'Enclosed or semi-open',
    typicalApplications: [
      'Light hydrocarbon services',
      'Low-criticality applications',
      'Auxiliary services',
      'Lube oil systems',
    ],
    advantages: [
      'Very compact',
      'Low cost',
      'No pump bearings',
      'No coupling alignment',
      'Minimal maintenance',
    ],
    limitations: [
      'Motor shaft exposed to pumped fluid',
      'Limited to clean, non-corrosive fluids',
      'Motor replacement requires pump disassembly',
      'Limited power and pressure',
    ],
    operatingLimits: {
      maxTemperatureC: 150,
      maxPressureBar: 15,
      maxPowerKw: 45,
      maxSpeedRpm: 3600,
    },
    nozzleConfiguration: 'Top discharge, end suction',
    baseplateMounting: 'Foot-mounted or frame-mounted',
  },
  {
    code: 'OH6',
    category: 'OH',
    name: 'High-Speed Integrally Geared',
    description: 'Overhung, high-speed integrally geared',
    configuration: 'Horizontal, integral speed-increasing gearbox',
    bearingArrangement: 'Integral gearbox bearings',
    sealChamber: 'High-speed seal chamber (cartridge seal)',
    impellerType: 'Enclosed, high-speed design',
    typicalApplications: [
      'High-head low-flow services',
      'Boiler feed water',
      'Process injection',
      'High-pressure applications',
    ],
    advantages: [
      'Very high head from single stage',
      'Compact for high pressure',
      'Efficient at high speeds',
      'Standard motor can be used',
    ],
    limitations: [
      'Complex gearbox maintenance',
      'High-speed seals critical',
      'Noise from high speed',
      'Limited flow range',
      'Higher NPSH required',
    ],
    operatingLimits: {
      maxTemperatureC: 200,
      maxPressureBar: 150,
      maxPowerKw: 500,
      maxSpeedRpm: 25000,
    },
    nozzleConfiguration: 'Top discharge, end suction',
    baseplateMounting: 'Integrated baseplate with gearbox',
  },

  // BB - Between Bearings (Multi-Stage and Single Stage)
  {
    code: 'BB1',
    category: 'BB',
    name: 'Axially Split Single Stage',
    description: 'Single stage, axially split casing, between bearings',
    configuration: 'Horizontal, double suction impeller, axially split',
    bearingArrangement: 'Bearings on both sides of impeller, thrust bearing on coupling end',
    sealChamber: 'Two seal chambers, standard bore',
    impellerType: 'Double suction, enclosed',
    typicalApplications: [
      'Large cooling water systems',
      'Pipeline transfer',
      'High flow services',
      'Crude oil transfer',
    ],
    advantages: [
      'Balanced axial thrust',
      'High flow capacity',
      'Very high efficiency',
      'Easy inspection (upper case removal)',
      'Low NPSH required',
    ],
    limitations: [
      'Large footprint',
      'Higher capital cost',
      'Limited head per stage',
      'Requires proper foundation',
    ],
    operatingLimits: {
      maxTemperatureC: 200,
      maxPressureBar: 25,
      maxPowerKw: 2000,
      maxSpeedRpm: 3600,
    },
    nozzleConfiguration: 'Double suction, side discharge',
    baseplateMounting: 'Rigid baseplate with sole plates',
  },
  {
    code: 'BB2',
    category: 'BB',
    name: 'Radially Split Single/Two Stage',
    description: 'Single or two stage, radially split, between bearings',
    configuration: 'Horizontal, radially split barrel casing',
    bearingArrangement: 'Bearings on both sides of impeller(s)',
    sealChamber: 'Two seal chambers, may be different sizes',
    impellerType: 'Single or double suction, enclosed',
    typicalApplications: [
      'High pressure services',
      'Hydrocarbon transfer',
      'Boiler feed',
      'Pipeline injection',
    ],
    advantages: [
      'High pressure capability',
      'Can use double suction first stage',
      'Good efficiency',
      'Manageable NPSH',
    ],
    limitations: [
      'Internal inspection requires full disassembly',
      'Higher cost than BB1',
      'Limited to two stages',
    ],
    operatingLimits: {
      maxTemperatureC: 260,
      maxPressureBar: 100,
      maxPowerKw: 1500,
      maxSpeedRpm: 3600,
    },
    nozzleConfiguration: 'End suction, top or end discharge',
    baseplateMounting: 'Rigid baseplate with sole plates',
  },
  {
    code: 'BB3',
    category: 'BB',
    name: 'Axially Split Multistage',
    description: 'Multistage, axially split casing, between bearings',
    configuration: 'Horizontal, multiple impellers in series, axially split',
    bearingArrangement: 'Bearings on both ends, thrust bearing handles residual thrust',
    sealChamber: 'Two seal chambers (high and low pressure)',
    impellerType: 'Single suction, opposed or in-line',
    typicalApplications: [
      'Boiler feed water',
      'High pressure water injection',
      'Pipeline services',
      'Descaling',
    ],
    advantages: [
      'High head capability',
      'Easy upper case removal for inspection',
      'Good efficiency',
      'Balanced axial thrust (opposed impellers)',
    ],
    limitations: [
      'Large footprint',
      'Heavy casing',
      'Gasket integrity critical',
      'Not for high-pressure light hydrocarbons',
    ],
    operatingLimits: {
      maxTemperatureC: 200,
      maxPressureBar: 100,
      maxPowerKw: 5000,
      maxSpeedRpm: 3600,
    },
    nozzleConfiguration: 'Side suction, top discharge',
    baseplateMounting: 'Rigid baseplate with sole plates',
  },
  {
    code: 'BB4',
    category: 'BB',
    name: 'Radially Split Single Casing Multistage',
    description: 'Multistage, radially split single casing (ring section)',
    configuration: 'Horizontal, stacked ring sections',
    bearingArrangement: 'Bearings on both ends of rotor',
    sealChamber: 'Two seal chambers (high and low pressure)',
    impellerType: 'Single suction, in-line',
    typicalApplications: [
      'Boiler feed water',
      'Process water',
      'Medium pressure services',
      'General high head applications',
    ],
    advantages: [
      'Modular construction',
      'Stages can be added/removed',
      'Lower cost than BB5',
      'Easier assembly',
    ],
    limitations: [
      'Multiple internal joints',
      'Lower pressure rating than BB5',
      'More parts to handle',
    ],
    operatingLimits: {
      maxTemperatureC: 200,
      maxPressureBar: 75,
      maxPowerKw: 2000,
      maxSpeedRpm: 3600,
    },
    nozzleConfiguration: 'End suction, top or end discharge',
    baseplateMounting: 'Rigid baseplate',
  },
  {
    code: 'BB5',
    category: 'BB',
    name: 'Radially Split Double Casing Multistage',
    description: 'Multistage, radially split double casing (barrel)',
    configuration: 'Horizontal, inner element in barrel casing',
    bearingArrangement: 'Bearings on both ends, full cartridge removal',
    sealChamber: 'Two seal chambers, high pressure design',
    impellerType: 'Single suction, opposed or in-line arrangement',
    typicalApplications: [
      'High pressure boiler feed',
      'Hydrocarbon injection',
      'High pressure pipeline',
      'Critical refinery services',
    ],
    advantages: [
      'Highest pressure capability',
      'Cartridge design for easy maintenance',
      'No case gaskets to high pressure',
      'Suitable for hazardous fluids',
    ],
    limitations: [
      'Highest cost',
      'Complex assembly',
      'Heavy components',
      'Requires crane for maintenance',
    ],
    operatingLimits: {
      maxTemperatureC: 260,
      maxPressureBar: 400,
      maxPowerKw: 15000,
      maxSpeedRpm: 6000,
    },
    nozzleConfiguration: 'End or side suction, top discharge',
    baseplateMounting: 'Rigid baseplate with sole plates and anchor bolts',
  },

  // VS - Vertically Suspended
  {
    code: 'VS1',
    category: 'VS',
    name: 'Wet Pit Diffuser',
    description: 'Vertical, wet pit, diffuser type',
    configuration: 'Vertical shaft, submerged bowl assembly with diffusers',
    bearingArrangement: 'Submerged product-lubricated bearings, thrust bearing at top',
    sealChamber: 'Shaft seal above liquid level',
    impellerType: 'Mixed flow or radial, enclosed',
    typicalApplications: [
      'Large water intake',
      'Cooling tower circulation',
      'Flood control',
      'Irrigation',
    ],
    advantages: [
      'No priming required',
      'Handles varying water levels',
      'High flow capacity',
      'Small footprint above ground',
    ],
    limitations: [
      'Deep pit required',
      'Long shaft assemblies',
      'Submerged bearing maintenance',
      'Limited temperature range',
    ],
    operatingLimits: {
      maxTemperatureC: 80,
      maxPressureBar: 25,
      maxPowerKw: 5000,
      maxSpeedRpm: 1800,
    },
    nozzleConfiguration: 'Suction at bowl, discharge at top',
    baseplateMounting: 'Floor plate above pit',
  },
  {
    code: 'VS2',
    category: 'VS',
    name: 'Wet Pit Volute',
    description: 'Vertical, wet pit, single or double volute',
    configuration: 'Vertical shaft, submerged volute casing',
    bearingArrangement: 'Product-lubricated line bearings, thrust bearing at top',
    sealChamber: 'Shaft seal above liquid level',
    impellerType: 'Radial, enclosed or semi-open',
    typicalApplications: [
      'Sewage pumping',
      'Storm water',
      'Industrial waste',
      'Services with solids',
    ],
    advantages: [
      'Good solids handling',
      'No priming required',
      'Handles abrasive fluids',
      'Easy impeller access',
    ],
    limitations: [
      'Lower efficiency than VS1',
      'Requires deep pit',
      'Limited temperature',
    ],
    operatingLimits: {
      maxTemperatureC: 60,
      maxPressureBar: 15,
      maxPowerKw: 1000,
      maxSpeedRpm: 1800,
    },
    nozzleConfiguration: 'Suction through casing, discharge at top',
    baseplateMounting: 'Floor plate above pit',
  },
  {
    code: 'VS3',
    category: 'VS',
    name: 'Wet Pit Axial Flow',
    description: 'Vertical, wet pit, axial flow (propeller)',
    configuration: 'Vertical shaft, propeller in bowl',
    bearingArrangement: 'Product-lubricated bearings, thrust bearing at top',
    sealChamber: 'Shaft seal above liquid level',
    impellerType: 'Axial flow propeller',
    typicalApplications: [
      'Very high flow, low head',
      'Cooling water circulation',
      'Flood control',
      'Drainage',
    ],
    advantages: [
      'Highest flow capacity',
      'Simple construction',
      'Low NPSH required',
      'Can handle some debris',
    ],
    limitations: [
      'Very low head only',
      'Thrust loads can be high',
      'Cavitation sensitive',
      'Limited to clean water',
    ],
    operatingLimits: {
      maxTemperatureC: 60,
      maxPressureBar: 5,
      maxPowerKw: 3000,
      maxSpeedRpm: 1200,
    },
    nozzleConfiguration: 'Axial suction and discharge',
    baseplateMounting: 'Floor plate or can mounting',
  },
  {
    code: 'VS4',
    category: 'VS',
    name: 'Dry Pit Vertically Suspended',
    description: 'Vertical, dry pit installation',
    configuration: 'Vertical shaft, pump below floor level in dry pit',
    bearingArrangement: 'External bearings, may be oil or grease lubricated',
    sealChamber: 'Standard mechanical seal',
    impellerType: 'Radial, enclosed',
    typicalApplications: [
      'Sewage and wastewater',
      'Process applications',
      'Where motor must be above flood level',
    ],
    advantages: [
      'Motor protected from flooding',
      'Standard mechanical seals',
      'Easier maintenance than wet pit',
      'No product-lubricated bearings',
    ],
    limitations: [
      'Requires dry pit construction',
      'Long shaft lengths',
      'Higher cost than submersible',
    ],
    operatingLimits: {
      maxTemperatureC: 120,
      maxPressureBar: 25,
      maxPowerKw: 1000,
      maxSpeedRpm: 1800,
    },
    nozzleConfiguration: 'End suction, vertical discharge',
    baseplateMounting: 'Floor plate with shaft through floor',
  },
  {
    code: 'VS5',
    category: 'VS',
    name: 'Cantilever Sump',
    description: 'Vertical, cantilever shaft, no submerged bearings',
    configuration: 'Vertical shaft supported from above only',
    bearingArrangement: 'Bearings above liquid, no submerged bearings',
    sealChamber: 'Above liquid level',
    impellerType: 'Semi-open or enclosed',
    typicalApplications: [
      'Tank drainage',
      'Process sumps',
      'Corrosive fluids',
      'Slurries',
    ],
    advantages: [
      'No submerged bearings',
      'Good for corrosive/abrasive fluids',
      'Simple maintenance',
      'No seal below liquid',
    ],
    limitations: [
      'Limited immersion depth',
      'Shaft deflection at long lengths',
      'Lower efficiency',
      'Limited to low heads',
    ],
    operatingLimits: {
      maxTemperatureC: 150,
      maxPressureBar: 10,
      maxPowerKw: 150,
      maxSpeedRpm: 1800,
    },
    nozzleConfiguration: 'Suction at bottom, discharge above floor',
    baseplateMounting: 'Flange-mounted to tank/sump',
  },
  {
    code: 'VS6',
    category: 'VS',
    name: 'Double Casing Diffuser',
    description: 'Vertical, double casing, diffuser type (can pump)',
    configuration: 'Vertical, bowl assembly in outer can/barrel',
    bearingArrangement: 'Product-lubricated bowl bearings, thrust bearing at top',
    sealChamber: 'Seal chamber above can',
    impellerType: 'Mixed flow or radial, enclosed',
    typicalApplications: [
      'Booster stations',
      'Condensate extraction',
      'Cryogenic services',
      'High pressure services',
    ],
    advantages: [
      'No pit required',
      'Cartridge removal possible',
      'Contained installation',
      'Suitable for hazardous fluids',
    ],
    limitations: [
      'Higher cost',
      'Complex installation',
      'Limited flow range',
      'NPSH considerations',
    ],
    operatingLimits: {
      maxTemperatureC: 200,
      maxPressureBar: 100,
      maxPowerKw: 3000,
      maxSpeedRpm: 3600,
    },
    nozzleConfiguration: 'Side suction to can, top discharge',
    baseplateMounting: 'Can mounted to foundation',
  },
  {
    code: 'VS7',
    category: 'VS',
    name: 'Double Casing Volute',
    description: 'Vertical, double casing, volute type',
    configuration: 'Vertical, volute casing in outer barrel',
    bearingArrangement: 'Product-lubricated bearings in can',
    sealChamber: 'Seal chamber above can',
    impellerType: 'Radial, enclosed or semi-open',
    typicalApplications: [
      'Heater drain',
      'Condensate',
      'High temperature verticals',
      'Refinery services',
    ],
    advantages: [
      'Higher head per stage than VS6',
      'Handles some solids',
      'Contained installation',
      'Full cartridge pull-out',
    ],
    limitations: [
      'More complex than VS6',
      'Higher cost',
      'Limited applications',
    ],
    operatingLimits: {
      maxTemperatureC: 260,
      maxPressureBar: 100,
      maxPowerKw: 2000,
      maxSpeedRpm: 3600,
    },
    nozzleConfiguration: 'Side suction to can, top discharge',
    baseplateMounting: 'Can mounted to foundation',
  },
];

export interface Api610SelectionCriteria {
  category?: Api610PumpCategory;
  flowRateM3h: number;
  headM: number;
  temperatureC: number;
  pressureBar: number;
  powerKw: number;
  fluidType?: 'hydrocarbon' | 'water' | 'chemical' | 'slurry';
  installationType?: 'horizontal' | 'vertical' | 'inline';
  spaceConstrained?: boolean;
  maintenanceAccess?: 'easy' | 'moderate' | 'difficult';
}

export interface Api610SelectionResult {
  suitableTypes: {
    type: Api610PumpType;
    score: number;
    reasons: string[];
    warnings: string[];
  }[];
  categoryRecommendation: Api610PumpCategory;
  designNotes: string[];
}

export const selectApi610PumpType = (criteria: Api610SelectionCriteria): Api610SelectionResult => {
  const results = API_610_PUMP_TYPES.map((pumpType) => {
    let score = 100;
    const reasons: string[] = [];
    const warnings: string[] = [];

    if (criteria.category && pumpType.category !== criteria.category) {
      score -= 50;
    }

    if (criteria.temperatureC > pumpType.operatingLimits.maxTemperatureC) {
      score -= 40;
      warnings.push(`Temperature ${criteria.temperatureC}°C exceeds limit of ${pumpType.operatingLimits.maxTemperatureC}°C`);
    } else if (criteria.temperatureC > pumpType.operatingLimits.maxTemperatureC * 0.8) {
      warnings.push('Operating near maximum temperature limit');
    }

    if (criteria.pressureBar > pumpType.operatingLimits.maxPressureBar) {
      score -= 50;
      warnings.push(`Pressure ${criteria.pressureBar} bar exceeds limit of ${pumpType.operatingLimits.maxPressureBar} bar`);
    }

    if (criteria.powerKw > pumpType.operatingLimits.maxPowerKw) {
      score -= 40;
      warnings.push(`Power ${criteria.powerKw} kW exceeds limit of ${pumpType.operatingLimits.maxPowerKw} kW`);
    }

    if (criteria.installationType === 'horizontal' && pumpType.category === 'VS') {
      score -= 30;
    } else if (criteria.installationType === 'vertical' && pumpType.category !== 'VS') {
      score -= 30;
    } else if (criteria.installationType === 'inline' && !pumpType.code.startsWith('OH3') && !pumpType.code.startsWith('OH4')) {
      score -= 30;
    }

    if (criteria.spaceConstrained) {
      if (pumpType.code === 'OH3' || pumpType.code === 'OH4' || pumpType.code === 'OH5') {
        score += 15;
        reasons.push('Compact design suitable for space constraints');
      } else if (pumpType.category === 'BB') {
        score -= 15;
        warnings.push('BB types require larger footprint');
      }
    }

    if (criteria.maintenanceAccess === 'easy') {
      if (pumpType.code === 'BB1' || pumpType.code === 'BB3') {
        score += 10;
        reasons.push('Axially split design allows easy inspection');
      } else if (pumpType.code === 'BB5') {
        score -= 10;
        warnings.push('Cartridge design may require crane access');
      }
    }

    if (criteria.fluidType === 'hydrocarbon') {
      if (pumpType.category === 'BB' || pumpType.code.startsWith('OH1') || pumpType.code.startsWith('OH2')) {
        score += 10;
        reasons.push('Standard choice for hydrocarbon services');
      }
    }

    if (criteria.headM > 150 && pumpType.category === 'OH' && pumpType.code !== 'OH6') {
      score -= 20;
      warnings.push('Consider multistage (BB) design for high head');
    }

    if (criteria.flowRateM3h > 1000 && pumpType.code === 'BB1') {
      score += 15;
      reasons.push('Excellent for high flow applications');
    }

    if (criteria.pressureBar > 50) {
      if (pumpType.code === 'BB5') {
        score += 20;
        reasons.push('Barrel design ideal for high pressure');
      } else if (pumpType.code === 'BB2') {
        score += 10;
        reasons.push('Good high pressure capability');
      }
    }

    return {
      type: pumpType,
      score: Math.max(0, Math.min(100, score)),
      reasons,
      warnings,
    };
  });

  results.sort((a, b) => b.score - a.score);

  let categoryRecommendation: Api610PumpCategory;
  if (criteria.installationType === 'vertical') {
    categoryRecommendation = 'VS';
  } else if (criteria.pressureBar > 50 || criteria.headM > 200) {
    categoryRecommendation = 'BB';
  } else {
    categoryRecommendation = 'OH';
  }

  const designNotes: string[] = [];

  if (criteria.temperatureC > 150) {
    designNotes.push('Consider centerline mounting (OH2) for thermal stability');
  }

  if (criteria.pressureBar > 100) {
    designNotes.push('Double casing (BB5) recommended for pressure containment');
  }

  if (criteria.fluidType === 'hydrocarbon') {
    designNotes.push('API 682 mechanical seal specification required');
    designNotes.push('Explosion-proof motor classification needed');
  }

  return {
    suitableTypes: results.slice(0, 5),
    categoryRecommendation,
    designNotes,
  };
};

export const api610CategoryDescription = (category: Api610PumpCategory): string => {
  const descriptions: Record<Api610PumpCategory, string> = {
    OH: 'Overhung - Single stage pumps with impeller mounted on cantilevered shaft',
    BB: 'Between Bearings - Shaft supported by bearings on both sides of impeller(s)',
    VS: 'Vertically Suspended - Vertical shaft with submerged pump element',
  };
  return descriptions[category];
};

export const api610TypeLabel = (code: string): string => {
  const type = API_610_PUMP_TYPES.find((t) => t.code === code);
  return type ? `${type.code} - ${type.name}` : code;
};
