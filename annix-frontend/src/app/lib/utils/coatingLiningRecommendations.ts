export interface MaterialProperties {
  particleSize: 'Fine' | 'Medium' | 'Coarse' | 'VeryCoarse';
  particleShape: 'Rounded' | 'SubAngular' | 'Angular';
  specificGravity: 'Light' | 'Medium' | 'Heavy';
  hardnessClass: 'Low' | 'Medium' | 'High';
  silicaContent: 'Low' | 'Moderate' | 'High';
}

export interface ChemicalProperties {
  phRange: 'Acidic' | 'Neutral' | 'Alkaline';
  chlorides: 'Low' | 'Moderate' | 'High';
  temperatureRange: 'Ambient' | 'Elevated' | 'High';
}

export interface FlowProperties {
  solidsPercent: 'Low' | 'Medium' | 'High' | 'VeryHigh';
  velocity: 'Low' | 'Medium' | 'High';
  flowRegime: 'Laminar' | 'Turbulent';
  impactAngle: 'Low' | 'Mixed' | 'High';
}

export interface EquipmentProperties {
  equipmentType: 'Pipe' | 'Tank' | 'Chute' | 'Hopper' | 'Launder';
  impactZones: boolean;
  operatingPressure: 'Low' | 'Medium' | 'High';
}

export interface MaterialTransferProfile {
  material: Partial<MaterialProperties>;
  chemistry: Partial<ChemicalProperties>;
  flow: Partial<FlowProperties>;
  equipment: Partial<EquipmentProperties>;
}

export interface DamageMechanisms {
  abrasion: 'Low' | 'Moderate' | 'Severe';
  impact: 'Low' | 'Moderate' | 'Severe';
  corrosion: 'Low' | 'Moderate' | 'High';
  dominantMechanism:
    | 'Impact Abrasion'
    | 'Sliding Abrasion'
    | 'Corrosion'
    | 'Mixed';
}

export interface LiningRecommendation {
  lining: string;
  liningType: string;
  thicknessRange: string;
  standardsBasis: string[];
  rationale: string;
  engineeringNotes: string[];
}

export interface ExternalEnvironmentProfile {
  installation: {
    type?: 'AboveGround' | 'Buried' | 'Submerged' | 'Splash';
    uvExposure?: 'None' | 'Moderate' | 'High';
    mechanicalRisk?: 'Low' | 'Medium' | 'High';
  };
  atmosphere: {
    iso12944Category?: 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'CX';
    marineInfluence?: 'None' | 'Coastal' | 'Offshore';
    industrialPollution?: 'None' | 'Moderate' | 'Heavy';
  };
  soil: {
    soilType?: 'Sandy' | 'Clay' | 'Rocky' | 'Marshy';
    resistivity?: 'VeryLow' | 'Low' | 'Medium' | 'High';
    moisture?: 'Dry' | 'Normal' | 'Wet' | 'Saturated';
  };
  operating: {
    temperature?: 'Ambient' | 'Elevated' | 'High' | 'Cyclic';
    cathodicProtection?: boolean;
    serviceLife?: 'Short' | 'Medium' | 'Long' | 'Extended';
  };
}

export interface ExternalCoatingRecommendation {
  coating: string;
  coatingType: string;
  system: string;
  thicknessRange: string;
  standardsBasis: string[];
  rationale: string;
  engineeringNotes: string[];
}

export interface ExternalDamageMechanisms {
  atmosphericCorrosion: 'Low' | 'Moderate' | 'High' | 'Severe';
  soilCorrosion: 'Low' | 'Moderate' | 'High' | 'Severe';
  mechanicalDamage: 'Low' | 'Moderate' | 'High';
  dominantMechanism:
    | 'Atmospheric'
    | 'Soil/Buried'
    | 'Marine'
    | 'Mechanical'
    | 'Mixed';
}

export function classifyDamageMechanisms(
  profile: MaterialTransferProfile
): DamageMechanisms {
  const { material, chemistry, flow, equipment } = profile;

  const abrasionSeverity = (): 'Low' | 'Moderate' | 'Severe' => {
    if (
      material.hardnessClass === 'High' &&
      (flow.velocity === 'High' || material.silicaContent === 'High')
    ) {
      return 'Severe';
    }
    if (
      material.hardnessClass === 'Medium' ||
      flow.velocity === 'Medium' ||
      material.particleShape === 'Angular'
    ) {
      return 'Moderate';
    }
    return 'Low';
  };

  const impactSeverity = (): 'Low' | 'Moderate' | 'Severe' => {
    if (flow.impactAngle === 'High' && equipment.impactZones) {
      return 'Severe';
    }
    if (
      flow.impactAngle === 'Mixed' ||
      material.particleSize === 'Coarse' ||
      material.particleSize === 'VeryCoarse'
    ) {
      return 'Moderate';
    }
    return 'Low';
  };

  const corrosionSeverity = (): 'Low' | 'Moderate' | 'High' => {
    if (chemistry.phRange === 'Acidic' || chemistry.chlorides === 'High') {
      return 'High';
    }
    if (
      chemistry.chlorides === 'Moderate' ||
      chemistry.temperatureRange === 'High'
    ) {
      return 'Moderate';
    }
    return 'Low';
  };

  const abrasion = abrasionSeverity();
  const impact = impactSeverity();
  const corrosion = corrosionSeverity();

  const dominantMechanism = ():
    | 'Impact Abrasion'
    | 'Sliding Abrasion'
    | 'Corrosion'
    | 'Mixed' => {
    if (impact === 'Severe') return 'Impact Abrasion';
    if (abrasion === 'Severe') return 'Sliding Abrasion';
    if (corrosion === 'High') return 'Corrosion';
    return 'Mixed';
  };

  return {
    abrasion,
    impact,
    corrosion,
    dominantMechanism: dominantMechanism(),
  };
}

export function recommendLining(
  profile: MaterialTransferProfile,
  damage: DamageMechanisms
): LiningRecommendation {
  if (damage.impact === 'Severe') {
    return {
      lining: 'Rubber-Ceramic Composite',
      liningType: 'Ceramic Lined',
      thicknessRange: '15–30 mm',
      standardsBasis: ['ASTM C1327', 'SANS 1198:2013', 'ISO 4649'],
      rationale:
        'High impact combined with abrasion requires composite protection',
      engineeringNotes: [
        'SANS 1198 Type 1 rubber backing absorbs impact energy',
        'Ceramic face provides wear resistance',
        'Consider 92% or 95% alumina tiles for severe applications',
        'Rubber backing: 40-50 IRHD for maximum impact absorption',
      ],
    };
  }

  if (damage.abrasion === 'Severe') {
    return {
      lining: 'Alumina Ceramic Tile',
      liningType: 'Ceramic Lined',
      thicknessRange: '10–20 mm',
      standardsBasis: ['ASTM C1327', 'ISO 14705', 'ASTM C773'],
      rationale: 'Severe sliding abrasion with moderate impact',
      engineeringNotes: [
        '96% or 99% alumina recommended for high silica content',
        'Hexagonal tiles provide better coverage in curved sections',
        'Ensure proper adhesive selection for operating temperature',
      ],
    };
  }

  if (damage.corrosion === 'High') {
    const isHighTemp = profile.chemistry.temperatureRange === 'High';
    const isAcidic = profile.chemistry.phRange === 'Acidic';
    return {
      lining: isHighTemp
        ? 'Type 2 Butyl (IIR)'
        : isAcidic
          ? 'Type 5 CSM (Hypalon)'
          : 'Type 1 Natural Rubber',
      liningType: 'Rubber Lined',
      thicknessRange: '6–15 mm',
      standardsBasis: ['SANS 1198:2013', 'SANS 1201:2005', 'ASTM D412'],
      rationale:
        'Acidic or high chloride environment requires chemical-resistant lining per SANS 1198',
      engineeringNotes: [
        'SANS 1198 Type 2 (Butyl) for chemical resistance up to 120°C',
        'SANS 1198 Type 5 (CSM/Hypalon) for acid and ozone resistance',
        'Grade A (18+ MPa) recommended for high-stress applications',
        '50-60 IRHD hardness class for abrasion resistance',
      ],
    };
  }

  if (
    damage.abrasion === 'Moderate' &&
    profile.material.particleSize === 'Fine'
  ) {
    return {
      lining: 'Cast Polyurethane',
      liningType: 'PU Lined',
      thicknessRange: '5–10 mm',
      standardsBasis: ['ASTM D412', 'ASTM D2240', 'ISO 4649'],
      rationale: 'Fine particle abrasion with moderate severity',
      engineeringNotes: [
        'Excellent for fine particle slurries',
        'Low friction coefficient reduces buildup',
        'Shore hardness 70-85A typical for slurry applications',
      ],
    };
  }

  if (profile.chemistry.phRange === 'Neutral' && damage.abrasion === 'Low') {
    return {
      lining: 'HDPE Lining',
      liningType: 'HDPE Lined',
      thicknessRange: '3–8 mm',
      standardsBasis: ['ASTM D3350', 'ISO 4427'],
      rationale: 'Low wear, neutral chemistry - cost-effective protection',
      engineeringNotes: [
        'PE100 grade for improved pressure resistance',
        'Consider PE100-RC for stress crack resistance',
        'Suitable for non-abrasive slurries',
      ],
    };
  }

  return {
    lining: 'Type 1 Natural Rubber (NR/SBR)',
    liningType: 'Rubber Lined',
    thicknessRange: '6–12 mm',
    standardsBasis: ['SANS 1198:2013', 'SANS 1201:2005', 'ASTM D412'],
    rationale:
      'General-purpose protection per SANS 1198 Type 1 specification',
    engineeringNotes: [
      'SANS 1198 Type 1 (NR/SBR) for general industrial applications',
      'Grade B (14+ MPa) suitable for standard applications',
      '40-50 IRHD hardness class for impact absorption',
      'Autoclave vulcanization preferred per SANS 1201',
    ],
  };
}

export function hasCompleteProfile(profile: MaterialTransferProfile): boolean {
  const { material, chemistry, flow, equipment } = profile;
  return !!(
    material.particleSize &&
    material.particleShape &&
    material.hardnessClass &&
    chemistry.phRange &&
    flow.velocity &&
    flow.impactAngle &&
    equipment.equipmentType
  );
}

export function classifyExternalDamageMechanisms(
  profile: ExternalEnvironmentProfile
): ExternalDamageMechanisms {
  const { installation, atmosphere, soil } = profile;

  const atmosphericSeverity = (): 'Low' | 'Moderate' | 'High' | 'Severe' => {
    if (
      atmosphere.iso12944Category === 'CX' ||
      atmosphere.marineInfluence === 'Offshore'
    ) {
      return 'Severe';
    }
    if (
      atmosphere.iso12944Category === 'C5' ||
      atmosphere.marineInfluence === 'Coastal' ||
      atmosphere.industrialPollution === 'Heavy'
    ) {
      return 'High';
    }
    if (
      atmosphere.iso12944Category === 'C3' ||
      atmosphere.iso12944Category === 'C4' ||
      atmosphere.industrialPollution === 'Moderate'
    ) {
      return 'Moderate';
    }
    return 'Low';
  };

  const soilSeverity = (): 'Low' | 'Moderate' | 'High' | 'Severe' => {
    if (installation.type !== 'Buried') return 'Low';
    if (soil.resistivity === 'VeryLow' && soil.moisture === 'Saturated') {
      return 'Severe';
    }
    if (
      soil.resistivity === 'VeryLow' ||
      soil.resistivity === 'Low' ||
      soil.moisture === 'Wet' ||
      soil.moisture === 'Saturated'
    ) {
      return 'High';
    }
    if (soil.resistivity === 'Medium' || soil.soilType === 'Clay') {
      return 'Moderate';
    }
    return 'Low';
  };

  const mechanicalSeverity = (): 'Low' | 'Moderate' | 'High' => {
    if (installation.mechanicalRisk === 'High') return 'High';
    if (
      installation.mechanicalRisk === 'Medium' ||
      installation.type === 'Buried'
    )
      return 'Moderate';
    return 'Low';
  };

  const atmospheric = atmosphericSeverity();
  const soilCorrosion = soilSeverity();
  const mechanical = mechanicalSeverity();

  const dominantMechanism = ():
    | 'Atmospheric'
    | 'Soil/Buried'
    | 'Marine'
    | 'Mechanical'
    | 'Mixed' => {
    if (
      atmosphere.marineInfluence === 'Offshore' ||
      atmosphere.marineInfluence === 'Coastal'
    )
      return 'Marine';
    if (
      installation.type === 'Buried' &&
      (soilCorrosion === 'Severe' || soilCorrosion === 'High')
    )
      return 'Soil/Buried';
    if (atmospheric === 'Severe' || atmospheric === 'High') return 'Atmospheric';
    if (mechanical === 'High') return 'Mechanical';
    return 'Mixed';
  };

  return {
    atmosphericCorrosion: atmospheric,
    soilCorrosion,
    mechanicalDamage: mechanical,
    dominantMechanism: dominantMechanism(),
  };
}

export function recommendExternalCoating(
  profile: ExternalEnvironmentProfile,
  damage: ExternalDamageMechanisms
): ExternalCoatingRecommendation {
  const { installation, operating } = profile;
  const isHighUV = installation.uvExposure === 'High';

  const addUVTopcoatNote = (
    recommendation: ExternalCoatingRecommendation
  ): ExternalCoatingRecommendation => {
    if (!isHighUV) return recommendation;

    const hasPolyurethane =
      recommendation.system.toLowerCase().includes('polyurethane') ||
      recommendation.system.toLowerCase().includes('pu ') ||
      recommendation.coating.toLowerCase().includes('polyurethane');

    if (!hasPolyurethane) {
      return {
        ...recommendation,
        system:
          recommendation.system +
          ' + Aliphatic Polyurethane UV topcoat (50-80μm)',
        engineeringNotes: [
          ...recommendation.engineeringNotes,
          'High UV exposure: Aliphatic polyurethane topcoat required for UV resistance and color/gloss retention',
        ],
      };
    }
    return recommendation;
  };

  if (installation.type === 'Buried') {
    if (damage.soilCorrosion === 'Severe' || damage.soilCorrosion === 'High') {
      return {
        coating: 'Fusion Bonded Epoxy (FBE) or 3-Layer Polyethylene (3LPE)',
        coatingType: 'Paint',
        system:
          'SA 2.5 blast (ISO 8501-1) → FBE: 350-500μm or 3LPE: 1.8-3.0mm total',
        thicknessRange: '350–3000 μm',
        standardsBasis: [
          'ISO 8501-1',
          'ISO 21809-1',
          'ISO 21809-2',
          'NACE SP0169',
          'AS/NZS 4822',
        ],
        rationale:
          'Severe soil corrosivity requires heavy-duty pipeline coating with CP compatibility',
        engineeringNotes: [
          'Surface prep: SA 2.5 (ISO 8501-1) minimum - very thorough blast cleaning',
          'FBE provides excellent adhesion and CP compatibility',
          '3LPE recommended for rocky terrain or high mechanical stress',
          'Ensure holiday detection testing per NACE SP0188',
          'Field joint coating critical - use compatible shrink sleeves',
        ],
      };
    }
    return {
      coating: 'Coal Tar Epoxy or Polyurethane Coating',
      coatingType: 'Paint',
      system:
        'SA 2.5 blast (ISO 8501-1) → Primer + 2 coats, 400-600μm DFT',
      thicknessRange: '400–600 μm',
      standardsBasis: [
        'ISO 8501-1',
        'ISO 21809-3',
        'AWWA C222',
        'NACE SP0169',
      ],
      rationale: 'Moderate soil conditions with cathodic protection compatibility',
      engineeringNotes: [
        'Surface prep: SA 2.5 (ISO 8501-1) minimum - very thorough blast cleaning',
        'Coal tar epoxy for proven long-term performance',
        'Consider wrap coating for additional mechanical protection',
      ],
    };
  }

  if (
    damage.dominantMechanism === 'Marine' ||
    damage.atmosphericCorrosion === 'Severe'
  ) {
    return addUVTopcoatNote({
      coating: 'High-Build Epoxy System',
      coatingType: 'Paint',
      system:
        'SA 2.5 blast (ISO 8501-1) → Zinc-rich primer + Epoxy MIO intermediate + Polyurethane topcoat',
      thicknessRange: '320–450 μm total DFT',
      standardsBasis: [
        'ISO 8501-1',
        'ISO 12944-5',
        'ISO 12944-6',
        'NORSOK M-501',
        'SSPC-PA 2',
      ],
      rationale:
        'Marine/offshore environment requires maximum corrosion protection',
      engineeringNotes: [
        'Surface prep: SA 2.5 (ISO 8501-1) minimum - very thorough blast cleaning',
        'Zinc-rich primer (60-80μm) for cathodic protection',
        'Epoxy MIO intermediate (150-200μm) for barrier protection',
        'Polyurethane topcoat (60-80μm) for UV and gloss retention',
        'Consider thermal spray aluminium (TSA) for splash zones',
      ],
    });
  }

  if (damage.atmosphericCorrosion === 'High') {
    return addUVTopcoatNote({
      coating: 'Epoxy-Polyurethane System',
      coatingType: 'Paint',
      system:
        'SA 2.5 blast (ISO 8501-1) → Zinc phosphate primer + Epoxy intermediate + Polyurethane topcoat',
      thicknessRange: '250–350 μm total DFT',
      standardsBasis: [
        'ISO 8501-1',
        'ISO 12944-5',
        'AS/NZS 2312.1',
        'SSPC-PA 2',
      ],
      rationale:
        'Industrial or coastal atmosphere with high corrosion risk',
      engineeringNotes: [
        'Surface prep: SA 2.5 (ISO 8501-1) minimum - very thorough blast cleaning',
        'Zinc phosphate primer (50-75μm) for steel adhesion',
        'High-build epoxy intermediate (125-175μm)',
        'Aliphatic polyurethane topcoat for UV stability',
        'Recoat intervals per ISO 12944-9',
      ],
    });
  }

  if (
    installation.mechanicalRisk === 'High' ||
    installation.type === 'Splash'
  ) {
    return addUVTopcoatNote({
      coating: 'Rubber Coating or Polyurea',
      coatingType: 'Rubber Lined',
      system:
        'SA 2.5 blast (ISO 8501-1) → Chloroprene rubber 3-6mm or Polyurea 1.5-3mm',
      thicknessRange: '1500–6000 μm',
      standardsBasis: ['ISO 8501-1', 'ASTM D4541', 'ASTM D2000', 'ISO 4649'],
      rationale:
        'High mechanical stress or splash zone requires impact-resistant coating',
      engineeringNotes: [
        'Surface prep: SA 2.5 (ISO 8501-1) minimum - very thorough blast cleaning',
        'Chloroprene (Neoprene) rubber for abrasion and weathering',
        'Polyurea for rapid application and seamless coverage',
        'Shore A hardness 50-70 for impact absorption',
        'Consider armoring at support points',
      ],
    });
  }

  if (damage.atmosphericCorrosion === 'Moderate') {
    return addUVTopcoatNote({
      coating: 'Alkyd or Acrylic System',
      coatingType: 'Paint',
      system:
        'SA 2.5 blast (ISO 8501-1) → Alkyd primer + Alkyd/Acrylic topcoat',
      thicknessRange: '150–250 μm total DFT',
      standardsBasis: ['ISO 8501-1', 'ISO 12944-5', 'AS/NZS 2312.1'],
      rationale: 'Moderate atmospheric exposure - cost-effective protection',
      engineeringNotes: [
        'Surface prep: SA 2.5 (ISO 8501-1) minimum - very thorough blast cleaning',
        'Suitable for C2-C3 environments',
        'Alkyd primer (50-75μm) on prepared steel',
        'Acrylic topcoat for better UV resistance than alkyd',
        'Regular maintenance inspection recommended',
      ],
    });
  }

  if (
    operating.temperature === 'Elevated' ||
    operating.temperature === 'High'
  ) {
    return addUVTopcoatNote({
      coating: 'Silicone or Epoxy Phenolic',
      coatingType: 'Paint',
      system:
        'SA 2.5 blast (ISO 8501-1) → Heat-resistant primer + Silicone topcoat',
      thicknessRange: '75–150 μm total DFT',
      standardsBasis: ['ISO 8501-1', 'ISO 12944-5', 'ASTM D6695'],
      rationale: 'Elevated temperature service requires heat-resistant coating',
      engineeringNotes: [
        'Surface prep: SA 2.5 (ISO 8501-1) minimum - very thorough blast cleaning',
        'Silicone coatings for temperatures up to 540°C',
        'Epoxy phenolic for temperatures up to 200°C with chemical resistance',
        'Inorganic zinc silicate primer for high-temp applications',
        'Cure requirements critical for performance',
      ],
    });
  }

  if (
    installation.uvExposure === 'None' &&
    damage.atmosphericCorrosion === 'Low'
  ) {
    return {
      coating: 'Hot-Dip Galvanizing',
      coatingType: 'Galvanized',
      system: 'HDG per ISO 1461 (no blasting required - pickling process)',
      thicknessRange: '45–85 μm (depends on steel thickness)',
      standardsBasis: ['ISO 1461', 'ASTM A123', 'AS/NZS 4680'],
      rationale:
        'Indoor or sheltered environment with low corrosion risk',
      engineeringNotes: [
        'Surface prep: Chemical cleaning & pickling (no blast cleaning required)',
        'Minimum 45μm for steel <1.5mm, 85μm for steel >6mm',
        'Self-healing zinc protection',
        'Can be duplex coated (galvanized + paint) for extended life',
        'Ensure proper drainage design to avoid wet storage stain',
      ],
    };
  }

  return addUVTopcoatNote({
    coating: 'Standard Epoxy System',
    coatingType: 'Paint',
    system: 'SA 2.5 blast (ISO 8501-1) → Epoxy primer + Epoxy topcoat',
    thicknessRange: '200–300 μm total DFT',
    standardsBasis: ['ISO 8501-1', 'ISO 12944-5', 'SSPC-PA 2'],
    rationale: 'General-purpose protection for mild environments',
    engineeringNotes: [
      'Surface prep: SA 2.5 (ISO 8501-1) minimum - very thorough blast cleaning',
      'Epoxy primer (75-100μm) for adhesion',
      'High-build epoxy topcoat (125-200μm)',
      'Good chemical and abrasion resistance',
      'Note: Epoxy may chalk under UV - consider PU topcoat for exposed areas',
    ],
  });
}

export function hasCompleteExternalProfile(
  profile: ExternalEnvironmentProfile
): boolean {
  const { installation, atmosphere, operating } = profile;
  return !!(
    installation.type &&
    atmosphere.iso12944Category &&
    operating.serviceLife
  );
}

export function deriveTemperatureCategory(
  tempC: number | undefined | null
): string | undefined {
  if (tempC === undefined || tempC === null) return undefined;
  if (tempC < -20 || tempC > 60) {
    if (tempC >= 60 && tempC <= 120) return 'Elevated';
    if (tempC > 120 && tempC <= 200) return 'High';
    if (tempC > 200) return 'High';
    return 'Ambient';
  }
  return 'Ambient';
}
