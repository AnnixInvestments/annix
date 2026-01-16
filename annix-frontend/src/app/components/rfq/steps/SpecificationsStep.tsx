'use client';

import React, { useState, useEffect, useRef } from 'react';
import { type MaterialLimits, materialLimits as getMaterialLimits, checkMaterialSuitability } from '@/app/lib/config/rfq';
import { materialValidationApi, coatingSpecificationApi, type ISO12944System, type ISO12944SystemsByDurabilityResult } from '@/app/lib/api/client';
import { getFlangeMaterialGroup } from '@/app/components/rfq/utils';
import { log } from '@/app/lib/logger';
import { nowISO } from '@/app/lib/datetime';

interface MaterialProperties {
  particleSize: "Fine" | "Medium" | "Coarse" | "VeryCoarse";
  particleShape: "Rounded" | "SubAngular" | "Angular";
  specificGravity: "Light" | "Medium" | "Heavy";
  hardnessClass: "Low" | "Medium" | "High";
  silicaContent: "Low" | "Moderate" | "High";
}

interface ChemicalProperties {
  phRange: "Acidic" | "Neutral" | "Alkaline";
  chlorides: "Low" | "Moderate" | "High";
  temperatureRange: "Ambient" | "Elevated" | "High";
}

interface FlowProperties {
  solidsPercent: "Low" | "Medium" | "High" | "VeryHigh";
  velocity: "Low" | "Medium" | "High";
  flowRegime: "Laminar" | "Turbulent";
  impactAngle: "Low" | "Mixed" | "High";
}

interface EquipmentProperties {
  equipmentType: "Pipe" | "Tank" | "Chute" | "Hopper" | "Launder";
  impactZones: boolean;
  operatingPressure: "Low" | "Medium" | "High";
}

interface MaterialTransferProfile {
  material: Partial<MaterialProperties>;
  chemistry: Partial<ChemicalProperties>;
  flow: Partial<FlowProperties>;
  equipment: Partial<EquipmentProperties>;
}

interface DamageMechanisms {
  abrasion: "Low" | "Moderate" | "Severe";
  impact: "Low" | "Moderate" | "Severe";
  corrosion: "Low" | "Moderate" | "High";
  dominantMechanism: "Impact Abrasion" | "Sliding Abrasion" | "Corrosion" | "Mixed";
}

interface LiningRecommendation {
  lining: string;
  liningType: string;
  thicknessRange: string;
  standardsBasis: string[];
  rationale: string;
  engineeringNotes: string[];
}

// Fallback pipe schedule data (ASTM A106 Gr B) for when backend is unavailable
// Defined at module level so it can be used by both ItemUploadStep and main component
function classifyDamageMechanisms(profile: MaterialTransferProfile): DamageMechanisms {
  const { material, chemistry, flow, equipment } = profile;

  const abrasionSeverity = (): "Low" | "Moderate" | "Severe" => {
    if (material.hardnessClass === "High" && (flow.velocity === "High" || material.silicaContent === "High")) {
      return "Severe";
    }
    if (material.hardnessClass === "Medium" || flow.velocity === "Medium" || material.particleShape === "Angular") {
      return "Moderate";
    }
    return "Low";
  };

  const impactSeverity = (): "Low" | "Moderate" | "Severe" => {
    if (flow.impactAngle === "High" && equipment.impactZones) {
      return "Severe";
    }
    if (flow.impactAngle === "Mixed" || (material.particleSize === "Coarse" || material.particleSize === "VeryCoarse")) {
      return "Moderate";
    }
    return "Low";
  };

  const corrosionSeverity = (): "Low" | "Moderate" | "High" => {
    if (chemistry.phRange === "Acidic" || chemistry.chlorides === "High") {
      return "High";
    }
    if (chemistry.chlorides === "Moderate" || chemistry.temperatureRange === "High") {
      return "Moderate";
    }
    return "Low";
  };

  const abrasion = abrasionSeverity();
  const impact = impactSeverity();
  const corrosion = corrosionSeverity();

  const dominantMechanism = (): "Impact Abrasion" | "Sliding Abrasion" | "Corrosion" | "Mixed" => {
    if (impact === "Severe") return "Impact Abrasion";
    if (abrasion === "Severe") return "Sliding Abrasion";
    if (corrosion === "High") return "Corrosion";
    return "Mixed";
  };

  return {
    abrasion,
    impact,
    corrosion,
    dominantMechanism: dominantMechanism()
  };
}

function recommendLining(profile: MaterialTransferProfile, damage: DamageMechanisms): LiningRecommendation {
  if (damage.impact === "Severe") {
    return {
      lining: "Rubber-Ceramic Composite",
      liningType: "Ceramic Lined",
      thicknessRange: "15–30 mm",
      standardsBasis: ["ASTM C1327", "SANS 1198:2013", "ISO 4649"],
      rationale: "High impact combined with abrasion requires composite protection",
      engineeringNotes: [
        "SANS 1198 Type 1 rubber backing absorbs impact energy",
        "Ceramic face provides wear resistance",
        "Consider 92% or 95% alumina tiles for severe applications",
        "Rubber backing: 40-50 IRHD for maximum impact absorption"
      ]
    };
  }

  if (damage.abrasion === "Severe") {
    return {
      lining: "Alumina Ceramic Tile",
      liningType: "Ceramic Lined",
      thicknessRange: "10–20 mm",
      standardsBasis: ["ASTM C1327", "ISO 14705", "ASTM C773"],
      rationale: "Severe sliding abrasion with moderate impact",
      engineeringNotes: [
        "96% or 99% alumina recommended for high silica content",
        "Hexagonal tiles provide better coverage in curved sections",
        "Ensure proper adhesive selection for operating temperature"
      ]
    };
  }

  if (damage.corrosion === "High") {
    const isHighTemp = profile.chemistry.temperatureRange === "High";
    const isAcidic = profile.chemistry.phRange === "Acidic";
    return {
      lining: isHighTemp ? "Type 2 Butyl (IIR)" : isAcidic ? "Type 5 CSM (Hypalon)" : "Type 1 Natural Rubber",
      liningType: "Rubber Lined",
      thicknessRange: "6–15 mm",
      standardsBasis: ["SANS 1198:2013", "SANS 1201:2005", "ASTM D412"],
      rationale: "Acidic or high chloride environment requires chemical-resistant lining per SANS 1198",
      engineeringNotes: [
        "SANS 1198 Type 2 (Butyl) for chemical resistance up to 120°C",
        "SANS 1198 Type 5 (CSM/Hypalon) for acid and ozone resistance",
        "Grade A (18+ MPa) recommended for high-stress applications",
        "50-60 IRHD hardness class for abrasion resistance"
      ]
    };
  }

  if (damage.abrasion === "Moderate" && profile.material.particleSize === "Fine") {
    return {
      lining: "Cast Polyurethane",
      liningType: "PU Lined",
      thicknessRange: "5–10 mm",
      standardsBasis: ["ASTM D412", "ASTM D2240", "ISO 4649"],
      rationale: "Fine particle abrasion with moderate severity",
      engineeringNotes: [
        "Excellent for fine particle slurries",
        "Low friction coefficient reduces buildup",
        "Shore hardness 70-85A typical for slurry applications"
      ]
    };
  }

  if (profile.chemistry.phRange === "Neutral" && damage.abrasion === "Low") {
    return {
      lining: "HDPE Lining",
      liningType: "HDPE Lined",
      thicknessRange: "3–8 mm",
      standardsBasis: ["ASTM D3350", "ISO 4427"],
      rationale: "Low wear, neutral chemistry - cost-effective protection",
      engineeringNotes: [
        "PE100 grade for improved pressure resistance",
        "Consider PE100-RC for stress crack resistance",
        "Suitable for non-abrasive slurries"
      ]
    };
  }

  return {
    lining: "Type 1 Natural Rubber (NR/SBR)",
    liningType: "Rubber Lined",
    thicknessRange: "6–12 mm",
    standardsBasis: ["SANS 1198:2013", "SANS 1201:2005", "ASTM D412"],
    rationale: "General-purpose protection per SANS 1198 Type 1 specification",
    engineeringNotes: [
      "SANS 1198 Type 1 (NR/SBR) for general industrial applications",
      "Grade B (14+ MPa) suitable for standard applications",
      "40-50 IRHD hardness class for impact absorption",
      "Autoclave vulcanization preferred per SANS 1201"
    ]
  };
}

function hasCompleteProfile(profile: MaterialTransferProfile): boolean {
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

interface ExternalEnvironmentProfile {
  installation: {
    type?: "AboveGround" | "Buried" | "Submerged" | "Splash";
    uvExposure?: "None" | "Moderate" | "High";
    mechanicalRisk?: "Low" | "Medium" | "High";
  };
  atmosphere: {
    iso12944Category?: "C1" | "C2" | "C3" | "C4" | "C5" | "CX";
    marineInfluence?: "None" | "Coastal" | "Offshore";
    industrialPollution?: "None" | "Moderate" | "Heavy";
  };
  soil: {
    soilType?: "Sandy" | "Clay" | "Rocky" | "Marshy";
    resistivity?: "VeryLow" | "Low" | "Medium" | "High";
    moisture?: "Dry" | "Normal" | "Wet" | "Saturated";
  };
  operating: {
    temperature?: "Ambient" | "Elevated" | "High" | "Cyclic";
    cathodicProtection?: boolean;
    serviceLife?: "Short" | "Medium" | "Long" | "Extended";
  };
}

interface ExternalCoatingRecommendation {
  coating: string;
  coatingType: string;
  system: string;
  thicknessRange: string;
  standardsBasis: string[];
  rationale: string;
  engineeringNotes: string[];
}

interface ExternalDamageMechanisms {
  atmosphericCorrosion: "Low" | "Moderate" | "High" | "Severe";
  soilCorrosion: "Low" | "Moderate" | "High" | "Severe";
  mechanicalDamage: "Low" | "Moderate" | "High";
  dominantMechanism: "Atmospheric" | "Soil/Buried" | "Marine" | "Mechanical" | "Mixed";
}

function classifyExternalDamageMechanisms(profile: ExternalEnvironmentProfile): ExternalDamageMechanisms {
  const { installation, atmosphere, soil } = profile;

  const atmosphericSeverity = (): "Low" | "Moderate" | "High" | "Severe" => {
    if (atmosphere.iso12944Category === "CX" || atmosphere.marineInfluence === "Offshore") {
      return "Severe";
    }
    if (atmosphere.iso12944Category === "C5" || atmosphere.marineInfluence === "Coastal" || atmosphere.industrialPollution === "Heavy") {
      return "High";
    }
    if (atmosphere.iso12944Category === "C3" || atmosphere.iso12944Category === "C4" || atmosphere.industrialPollution === "Moderate") {
      return "Moderate";
    }
    return "Low";
  };

  const soilSeverity = (): "Low" | "Moderate" | "High" | "Severe" => {
    if (installation.type !== "Buried") return "Low";
    if (soil.resistivity === "VeryLow" && soil.moisture === "Saturated") {
      return "Severe";
    }
    if (soil.resistivity === "VeryLow" || soil.resistivity === "Low" || soil.moisture === "Wet" || soil.moisture === "Saturated") {
      return "High";
    }
    if (soil.resistivity === "Medium" || soil.soilType === "Clay") {
      return "Moderate";
    }
    return "Low";
  };

  const mechanicalSeverity = (): "Low" | "Moderate" | "High" => {
    if (installation.mechanicalRisk === "High") return "High";
    if (installation.mechanicalRisk === "Medium" || installation.type === "Buried") return "Moderate";
    return "Low";
  };

  const atmospheric = atmosphericSeverity();
  const soilCorrosion = soilSeverity();
  const mechanical = mechanicalSeverity();

  const dominantMechanism = (): "Atmospheric" | "Soil/Buried" | "Marine" | "Mechanical" | "Mixed" => {
    if (atmosphere.marineInfluence === "Offshore" || atmosphere.marineInfluence === "Coastal") return "Marine";
    if (installation.type === "Buried" && (soilCorrosion === "Severe" || soilCorrosion === "High")) return "Soil/Buried";
    if (atmospheric === "Severe" || atmospheric === "High") return "Atmospheric";
    if (mechanical === "High") return "Mechanical";
    return "Mixed";
  };

  return {
    atmosphericCorrosion: atmospheric,
    soilCorrosion,
    mechanicalDamage: mechanical,
    dominantMechanism: dominantMechanism()
  };
}

function recommendExternalCoating(profile: ExternalEnvironmentProfile, damage: ExternalDamageMechanisms): ExternalCoatingRecommendation {
  const { installation, operating } = profile;
  const isHighUV = installation.uvExposure === "High";

  // Helper to ensure polyurethane topcoat is included for high UV exposure
  const addUVTopcoatNote = (recommendation: ExternalCoatingRecommendation): ExternalCoatingRecommendation => {
    if (!isHighUV) return recommendation;

    // Check if polyurethane is already included in the system
    const hasPolyurethane = recommendation.system.toLowerCase().includes('polyurethane') ||
                           recommendation.system.toLowerCase().includes('pu ') ||
                           recommendation.coating.toLowerCase().includes('polyurethane');

    if (!hasPolyurethane) {
      return {
        ...recommendation,
        system: recommendation.system + " + Aliphatic Polyurethane UV topcoat (50-80μm)",
        engineeringNotes: [
          ...recommendation.engineeringNotes,
          "High UV exposure: Aliphatic polyurethane topcoat required for UV resistance and color/gloss retention"
        ]
      };
    }
    return recommendation;
  };

  if (installation.type === "Buried") {
    if (damage.soilCorrosion === "Severe" || damage.soilCorrosion === "High") {
      return {
        coating: "Fusion Bonded Epoxy (FBE) or 3-Layer Polyethylene (3LPE)",
        coatingType: "Paint",
        system: "SA 2.5 blast (ISO 8501-1) → FBE: 350-500μm or 3LPE: 1.8-3.0mm total",
        thicknessRange: "350–3000 μm",
        standardsBasis: ["ISO 8501-1", "ISO 21809-1", "ISO 21809-2", "NACE SP0169", "AS/NZS 4822"],
        rationale: "Severe soil corrosivity requires heavy-duty pipeline coating with CP compatibility",
        engineeringNotes: [
          "Surface prep: SA 2.5 (ISO 8501-1) minimum - very thorough blast cleaning",
          "FBE provides excellent adhesion and CP compatibility",
          "3LPE recommended for rocky terrain or high mechanical stress",
          "Ensure holiday detection testing per NACE SP0188",
          "Field joint coating critical - use compatible shrink sleeves"
        ]
      };
    }
    return {
      coating: "Coal Tar Epoxy or Polyurethane Coating",
      coatingType: "Paint",
      system: "SA 2.5 blast (ISO 8501-1) → Primer + 2 coats, 400-600μm DFT",
      thicknessRange: "400–600 μm",
      standardsBasis: ["ISO 8501-1", "ISO 21809-3", "AWWA C222", "NACE SP0169"],
      rationale: "Moderate soil conditions with cathodic protection compatibility",
      engineeringNotes: [
        "Surface prep: SA 2.5 (ISO 8501-1) minimum - very thorough blast cleaning",
        "Coal tar epoxy for proven long-term performance",
        "Consider wrap coating for additional mechanical protection"
      ]
    };
  }

  if (damage.dominantMechanism === "Marine" || damage.atmosphericCorrosion === "Severe") {
    return addUVTopcoatNote({
      coating: "High-Build Epoxy System",
      coatingType: "Paint",
      system: "SA 2.5 blast (ISO 8501-1) → Zinc-rich primer + Epoxy MIO intermediate + Polyurethane topcoat",
      thicknessRange: "320–450 μm total DFT",
      standardsBasis: ["ISO 8501-1", "ISO 12944-5", "ISO 12944-6", "NORSOK M-501", "SSPC-PA 2"],
      rationale: "Marine/offshore environment requires maximum corrosion protection",
      engineeringNotes: [
        "Surface prep: SA 2.5 (ISO 8501-1) minimum - very thorough blast cleaning",
        "Zinc-rich primer (60-80μm) for cathodic protection",
        "Epoxy MIO intermediate (150-200μm) for barrier protection",
        "Polyurethane topcoat (60-80μm) for UV and gloss retention",
        "Consider thermal spray aluminium (TSA) for splash zones"
      ]
    });
  }

  if (damage.atmosphericCorrosion === "High") {
    return addUVTopcoatNote({
      coating: "Epoxy-Polyurethane System",
      coatingType: "Paint",
      system: "SA 2.5 blast (ISO 8501-1) → Zinc phosphate primer + Epoxy intermediate + Polyurethane topcoat",
      thicknessRange: "250–350 μm total DFT",
      standardsBasis: ["ISO 8501-1", "ISO 12944-5", "AS/NZS 2312.1", "SSPC-PA 2"],
      rationale: "Industrial or coastal atmosphere with high corrosion risk",
      engineeringNotes: [
        "Surface prep: SA 2.5 (ISO 8501-1) minimum - very thorough blast cleaning",
        "Zinc phosphate primer (50-75μm) for steel adhesion",
        "High-build epoxy intermediate (125-175μm)",
        "Aliphatic polyurethane topcoat for UV stability",
        "Recoat intervals per ISO 12944-9"
      ]
    });
  }

  if (installation.mechanicalRisk === "High" || installation.type === "Splash") {
    return addUVTopcoatNote({
      coating: "Rubber Coating or Polyurea",
      coatingType: "Rubber Lined",
      system: "SA 2.5 blast (ISO 8501-1) → Chloroprene rubber 3-6mm or Polyurea 1.5-3mm",
      thicknessRange: "1500–6000 μm",
      standardsBasis: ["ISO 8501-1", "ASTM D4541", "ASTM D2000", "ISO 4649"],
      rationale: "High mechanical stress or splash zone requires impact-resistant coating",
      engineeringNotes: [
        "Surface prep: SA 2.5 (ISO 8501-1) minimum - very thorough blast cleaning",
        "Chloroprene (Neoprene) rubber for abrasion and weathering",
        "Polyurea for rapid application and seamless coverage",
        "Shore A hardness 50-70 for impact absorption",
        "Consider armoring at support points"
      ]
    });
  }

  if (damage.atmosphericCorrosion === "Moderate") {
    return addUVTopcoatNote({
      coating: "Alkyd or Acrylic System",
      coatingType: "Paint",
      system: "SA 2.5 blast (ISO 8501-1) → Alkyd primer + Alkyd/Acrylic topcoat",
      thicknessRange: "150–250 μm total DFT",
      standardsBasis: ["ISO 8501-1", "ISO 12944-5", "AS/NZS 2312.1"],
      rationale: "Moderate atmospheric exposure - cost-effective protection",
      engineeringNotes: [
        "Surface prep: SA 2.5 (ISO 8501-1) minimum - very thorough blast cleaning",
        "Suitable for C2-C3 environments",
        "Alkyd primer (50-75μm) on prepared steel",
        "Acrylic topcoat for better UV resistance than alkyd",
        "Regular maintenance inspection recommended"
      ]
    });
  }

  if (operating.temperature === "Elevated" || operating.temperature === "High") {
    return addUVTopcoatNote({
      coating: "Silicone or Epoxy Phenolic",
      coatingType: "Paint",
      system: "SA 2.5 blast (ISO 8501-1) → Heat-resistant primer + Silicone topcoat",
      thicknessRange: "75–150 μm total DFT",
      standardsBasis: ["ISO 8501-1", "ISO 12944-5", "ASTM D6695"],
      rationale: "Elevated temperature service requires heat-resistant coating",
      engineeringNotes: [
        "Surface prep: SA 2.5 (ISO 8501-1) minimum - very thorough blast cleaning",
        "Silicone coatings for temperatures up to 540°C",
        "Epoxy phenolic for temperatures up to 200°C with chemical resistance",
        "Inorganic zinc silicate primer for high-temp applications",
        "Cure requirements critical for performance"
      ]
    });
  }

  if (installation.uvExposure === "None" && damage.atmosphericCorrosion === "Low") {
    return {
      coating: "Hot-Dip Galvanizing",
      coatingType: "Galvanized",
      system: "HDG per ISO 1461 (no blasting required - pickling process)",
      thicknessRange: "45–85 μm (depends on steel thickness)",
      standardsBasis: ["ISO 1461", "ASTM A123", "AS/NZS 4680"],
      rationale: "Indoor or sheltered environment with low corrosion risk",
      engineeringNotes: [
        "Surface prep: Chemical cleaning & pickling (no blast cleaning required)",
        "Minimum 45μm for steel <1.5mm, 85μm for steel >6mm",
        "Self-healing zinc protection",
        "Can be duplex coated (galvanized + paint) for extended life",
        "Ensure proper drainage design to avoid wet storage stain"
      ]
    };
  }

  return addUVTopcoatNote({
    coating: "Standard Epoxy System",
    coatingType: "Paint",
    system: "SA 2.5 blast (ISO 8501-1) → Epoxy primer + Epoxy topcoat",
    thicknessRange: "200–300 μm total DFT",
    standardsBasis: ["ISO 8501-1", "ISO 12944-5", "SSPC-PA 2"],
    rationale: "General-purpose protection for mild environments",
    engineeringNotes: [
      "Surface prep: SA 2.5 (ISO 8501-1) minimum - very thorough blast cleaning",
      "Epoxy primer (75-100μm) for adhesion",
      "High-build epoxy topcoat (125-200μm)",
      "Good chemical and abrasion resistance",
      "Note: Epoxy may chalk under UV - consider PU topcoat for exposed areas"
    ]
  });
}

function hasCompleteExternalProfile(profile: ExternalEnvironmentProfile): boolean {
  const { installation, atmosphere, operating } = profile;
  return !!(
    installation.type &&
    atmosphere.iso12944Category &&
    operating.serviceLife
  );
}


export default function SpecificationsStep({ globalSpecs, onUpdateGlobalSpecs, masterData, errors, fetchAndSelectPressureClass, availablePressureClasses, requiredProducts = [], rfqData }: any) {
  // Check which product types are selected
  const showSteelPipes = requiredProducts.includes('fabricated_steel');
  const showFastenersGaskets = requiredProducts.includes('fasteners_gaskets');
  const showHdpePipes = requiredProducts.includes('hdpe');
  const showPvcPipes = requiredProducts.includes('pvc');
  const showStructuralSteel = requiredProducts.includes('structural_steel');
  const showSurfaceProtection = requiredProducts.includes('surface_protection');
  const showTransportInstall = requiredProducts.includes('transport_install');
  const workingPressures = [6, 10, 16, 25, 40, 63, 100, 160, 250, 320, 400, 630]; // Bar values
  const workingTemperatures = [-29, -20, 0, 20, 50, 80, 120, 150, 200, 250, 300, 350, 400, 450, 500]; // Celsius values

  // Material suitability warning modal state
  const [materialWarning, setMaterialWarning] = useState<{
    show: boolean;
    specName: string;
    specId: number | undefined;
    warnings: string[];
    recommendation?: string;
    limits?: MaterialLimits;
  }>({ show: false, specName: '', specId: undefined, warnings: [] });

  // ISO 12944-5 paint system state
  const [iso12944Systems, setIso12944Systems] = useState<ISO12944SystemsByDurabilityResult | null>(null);
  const [iso12944Loading, setIso12944Loading] = useState(false);
  const [selectedIso12944SystemCode, setSelectedIso12944SystemCode] = useState<string | null>(null);

  // Steel Specification custom dropdown state
  const [steelSpecDropdownOpen, setSteelSpecDropdownOpen] = useState(false);
  const steelSpecDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (steelSpecDropdownRef.current && !steelSpecDropdownRef.current.contains(event.target as Node)) {
        setSteelSpecDropdownOpen(false);
      }
    };
    if (steelSpecDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [steelSpecDropdownOpen]);

  const hasErrors = errors && (errors.workingPressure || errors.workingTemperature || errors.steelPipesConfirmation || errors.fastenersConfirmation);

  // Derive temperature category from working temperature if not manually set
  const derivedTempCategory = deriveTemperatureCategory(globalSpecs?.workingTemperatureC);
  const effectiveEcpTemperature = globalSpecs?.ecpTemperature || derivedTempCategory;
  const isEcpTemperatureAutoFilled = !globalSpecs?.ecpTemperature && !!derivedTempCategory;

  // Derive atmospheric fields from Page 1 Environmental Intelligence data
  // Check multiple sources: user override (ecp prefix), rfqData, and globalSpecs (from mine selection)
  const derivedIso12944 = rfqData?.iso12944Category || globalSpecs?.iso12944Category;
  const effectiveIso12944 = globalSpecs?.ecpIso12944Category || derivedIso12944;
  const isIso12944AutoFilled = !globalSpecs?.ecpIso12944Category && !!derivedIso12944;

  const derivedMarineInfluence = rfqData?.marineInfluence || globalSpecs?.detailedMarineInfluence || globalSpecs?.marineInfluence;
  const effectiveMarineInfluence = globalSpecs?.ecpMarineInfluence || derivedMarineInfluence;
  const isMarineInfluenceAutoFilled = !globalSpecs?.ecpMarineInfluence && !!derivedMarineInfluence;

  const derivedIndustrialPollution = rfqData?.industrialPollution || globalSpecs?.industrialPollution;
  const effectiveIndustrialPollution = globalSpecs?.ecpIndustrialPollution || derivedIndustrialPollution;
  const isIndustrialPollutionAutoFilled = !globalSpecs?.ecpIndustrialPollution && !!derivedIndustrialPollution;

  // Derive Installation Conditions from Page 1 data
  // Installation Type: Default to AboveGround for mining applications
  const derivedInstallationType = globalSpecs?.mineSelected ? 'AboveGround' : undefined;
  const effectiveInstallationType = globalSpecs?.ecpInstallationType || derivedInstallationType;
  const isInstallationTypeAutoFilled = !globalSpecs?.ecpInstallationType && !!derivedInstallationType;

  // UV Exposure: Derive from ISO 12944 category or mining environment
  const deriveUvExposure = (): string | undefined => {
    // If mine is selected, mining environments typically have high UV exposure (outdoor operations)
    if (globalSpecs?.mineSelected) {
      // If we have ISO 12944, use it to refine
      const iso = effectiveIso12944;
      if (iso === 'C5' || iso === 'CX') return 'High';
      if (iso === 'C3' || iso === 'C4') return 'Moderate';
      if (iso === 'C1' || iso === 'C2') return 'Moderate';
      return 'High'; // Default for mining is High (outdoor)
    }
    return undefined;
  };
  const derivedUvExposure = deriveUvExposure();
  const effectiveUvExposure = globalSpecs?.ecpUvExposure || derivedUvExposure;
  const isUvExposureAutoFilled = !globalSpecs?.ecpUvExposure && !!derivedUvExposure;

  // Mechanical Risk: Mining environments are typically high mechanical risk
  const derivedMechanicalRisk = globalSpecs?.mineSelected ? 'High' : undefined;
  const effectiveMechanicalRisk = globalSpecs?.ecpMechanicalRisk || derivedMechanicalRisk;
  const isMechanicalRiskAutoFilled = !globalSpecs?.ecpMechanicalRisk && !!derivedMechanicalRisk;

  // Helper for auto-filled field styling
  const autoFilledClass = (isAutoFilled: boolean) =>
    isAutoFilled
      ? 'border-2 border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold'
      : 'border border-gray-300 text-gray-900';

  // Map Service Life to ISO 12944-5 durability codes
  const serviceLifeToDurability = (serviceLife: string | undefined): 'L' | 'M' | 'H' | 'VH' | null => {
    switch (serviceLife) {
      case 'Short': return 'L';
      case 'Medium': return 'M';
      case 'Long': return 'H';
      case 'Extended': return 'VH';
      default: return null;
    }
  };

  const effectiveDurability = serviceLifeToDurability(globalSpecs?.ecpServiceLife);

  // Fetch ISO 12944-5 paint systems when category and durability are selected
  useEffect(() => {
    const fetchIso12944Systems = async () => {
      if (!effectiveIso12944 || !effectiveDurability) {
        setIso12944Systems(null);
        setSelectedIso12944SystemCode(null);
        return;
      }

      // Only fetch for C1-C5 categories
      if (!['C1', 'C2', 'C3', 'C4', 'C5'].includes(effectiveIso12944)) {
        setIso12944Systems(null);
        setSelectedIso12944SystemCode(null);
        return;
      }

      setIso12944Loading(true);
      try {
        const result = await coatingSpecificationApi.systemsByDurability(effectiveIso12944, effectiveDurability);
        setIso12944Systems(result);
        // Auto-select the recommended system
        if (result.recommended?.systemCode) {
          setSelectedIso12944SystemCode(result.recommended.systemCode);
        }
      } catch (error) {
        log.error('Failed to fetch ISO 12944-5 systems', { error });
        setIso12944Systems(null);
      } finally {
        setIso12944Loading(false);
      }
    };

    fetchIso12944Systems();
  }, [effectiveIso12944, effectiveDurability]);

  // Get the currently selected ISO 12944 system
  const selectedIso12944System = selectedIso12944SystemCode
    ? (iso12944Systems?.recommended?.systemCode === selectedIso12944SystemCode
        ? iso12944Systems.recommended
        : iso12944Systems?.alternatives.find(s => s.systemCode === selectedIso12944SystemCode))
    : iso12944Systems?.recommended;

  return (
    <div>
      <h2 className="text-md font-bold text-gray-900 mb-1">Specifications</h2>
      <p className="text-gray-600 text-xs mb-2">
        Define working conditions and material specifications.
      </p>

      {/* Validation Error Banner */}
      {hasErrors && (
        <div className="mb-2 bg-red-50 border-l-4 border-red-500 rounded p-2">
          <div className="flex items-start gap-2">
            <svg className="h-4 w-4 text-red-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-xs font-semibold text-red-800">Action required before proceeding</h3>
              <ul className="mt-1 text-xs text-red-700 list-disc list-inside">
                {errors.workingPressure && <li>{errors.workingPressure}</li>}
                {errors.workingTemperature && <li>{errors.workingTemperature}</li>}
                {errors.steelPipesConfirmation && <li>{errors.steelPipesConfirmation}</li>}
                {errors.fastenersConfirmation && <li>{errors.fastenersConfirmation}</li>}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {/* Fabricated Steel Pipes & Fittings Section */}
        {showSteelPipes && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 pb-1 border-b border-gray-200">
              <span className="text-sm">🔩</span>
              <h3 className="text-sm font-bold text-gray-900">Fabricated Steel Pipes & Fittings</h3>
            </div>

            {/* Confirmed Summary - show when specs are confirmed */}
            {globalSpecs?.steelPipesSpecsConfirmed && (
              <div className="bg-green-100 border border-green-400 rounded-md p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-green-800">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Steel Pipe Specifications Confirmed</span>
                    <span className="mx-2">•</span>
                    <span>{globalSpecs?.workingPressureBar} bar @ {globalSpecs?.workingTemperatureC}°C</span>
                    {globalSpecs?.steelSpecificationId && masterData?.steelSpecs && (
                      <>
                        <span className="mx-2">•</span>
                        <span>{masterData.steelSpecs.find((s: any) => s.id === globalSpecs.steelSpecificationId)?.steelSpecName || 'Steel Spec'}</span>
                      </>
                    )}
                    {globalSpecs?.flangeStandardId && masterData?.flangeStandards && (
                      <>
                        <span className="mx-2">•</span>
                        <span>{masterData.flangeStandards.find((s: any) => s.id === globalSpecs.flangeStandardId)?.code || 'Flange'}</span>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      steelPipesSpecsConfirmed: false
                    })}
                    className="px-2 py-1 bg-gray-500 text-white font-medium rounded text-xs hover:bg-gray-600"
                  >
                    Edit
                  </button>
                </div>
              </div>
            )}

            {/* Detail Forms - show when not confirmed */}
            {!globalSpecs?.steelPipesSpecsConfirmed && (
            <>
            {/* Working Conditions */}
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <h3 className="text-xs font-semibold text-gray-800 mb-2">
                Working Conditions
                <span className="ml-2 text-xs font-normal text-gray-500">(Optional)</span>
              </h3>

          <div className="grid grid-cols-2 gap-3">
            {/* Working Pressure */}
            <div data-field="workingPressure">
              <label className={`block text-xs font-semibold mb-1 ${errors.workingPressure ? 'text-red-700' : 'text-gray-900'}`}>
                Working Pressure (bar) <span className="text-red-600">*</span>
              </label>
              <select
                value={globalSpecs?.workingPressureBar || ''}
                onChange={async (e) => {
                  const newPressure = e.target.value ? Number(e.target.value) : undefined;
                  let recommendedPressureClassId = globalSpecs?.flangePressureClassId;
                  if (newPressure && globalSpecs?.flangeStandardId) {
                    // Get material group from selected steel spec
                    const steelSpec = masterData.steelSpecs?.find((s: any) => s.id === globalSpecs?.steelSpecificationId);
                    const materialGroup = getFlangeMaterialGroup(steelSpec?.steelSpecName);
                    recommendedPressureClassId = await fetchAndSelectPressureClass(globalSpecs.flangeStandardId, newPressure, globalSpecs?.workingTemperatureC, materialGroup);
                  }
                  onUpdateGlobalSpecs({
                    ...globalSpecs,
                    workingPressureBar: newPressure,
                    flangePressureClassId: recommendedPressureClassId || globalSpecs?.flangePressureClassId
                  });
                }}
                className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 text-gray-900 ${
                  errors.workingPressure
                    ? 'border-red-500 focus:ring-red-500 bg-red-50'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
              >
                <option value="">Select pressure...</option>
                {workingPressures.map((pressure) => (
                  <option key={pressure} value={pressure}>{pressure} bar</option>
                ))}
              </select>
              {errors.workingPressure && <p className="mt-0.5 text-xs text-red-600">{errors.workingPressure}</p>}
            </div>

            {/* Working Temperature */}
            <div data-field="workingTemperature">
              <label className={`block text-xs font-semibold mb-1 ${errors.workingTemperature ? 'text-red-700' : 'text-gray-900'}`}>
                Working Temperature (°C) <span className="text-red-600">*</span>
              </label>
              <select
                value={globalSpecs?.workingTemperatureC || ''}
                onChange={async (e) => {
                  const newTemp = e.target.value ? Number(e.target.value) : undefined;
                  let recommendedPressureClassId = globalSpecs?.flangePressureClassId;
                  if (newTemp !== undefined && globalSpecs?.workingPressureBar && globalSpecs?.flangeStandardId) {
                    // Get material group from selected steel spec
                    const steelSpec = masterData.steelSpecs?.find((s: any) => s.id === globalSpecs?.steelSpecificationId);
                    const materialGroup = getFlangeMaterialGroup(steelSpec?.steelSpecName);
                    recommendedPressureClassId = await fetchAndSelectPressureClass(
                      globalSpecs.flangeStandardId, globalSpecs.workingPressureBar, newTemp, materialGroup
                    );
                  }
                  onUpdateGlobalSpecs({
                    ...globalSpecs,
                    workingTemperatureC: newTemp,
                    flangePressureClassId: recommendedPressureClassId || globalSpecs?.flangePressureClassId
                  });
                }}
                className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 text-gray-900 ${
                  errors.workingTemperature
                    ? 'border-red-500 focus:ring-red-500 bg-red-50'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
              >
                <option value="">Select temperature...</option>
                {workingTemperatures.map((temp) => (
                  <option key={temp} value={temp}>{temp}°C</option>
                ))}
              </select>
              {errors.workingTemperature && <p className="mt-0.5 text-xs text-red-600">{errors.workingTemperature}</p>}
            </div>
          </div>
        </div>

        {/* Material Specifications */}
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <h3 className="text-xs font-semibold text-gray-800 mb-2">Material Specifications</h3>

          <div className="grid grid-cols-3 gap-3">
            {/* Steel Specification - with grouped options and suitability validation */}
            <div ref={steelSpecDropdownRef} className="relative">
              <label className="block text-xs font-semibold text-gray-900 mb-1">Steel Specification <span className="text-red-500">*</span></label>
              <button
                type="button"
                onClick={() => setSteelSpecDropdownOpen(!steelSpecDropdownOpen)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-white text-left flex items-center justify-between"
              >
                <span className={globalSpecs?.steelSpecificationId ? 'text-gray-900' : 'text-gray-400'}>
                  {globalSpecs?.steelSpecificationId
                    ? masterData.steelSpecs?.find((s: any) => s.id === globalSpecs.steelSpecificationId)?.steelSpecName || 'Select steel specification...'
                    : 'Select steel specification...'}
                </span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${steelSpecDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {steelSpecDropdownOpen && (
                <div className="absolute z-[10000] mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {(() => {
                    const isSpecSuitable = (specName: string): boolean => {
                      if (!globalSpecs?.workingPressureBar && !globalSpecs?.workingTemperatureC) return true;
                      const suitability = checkMaterialSuitability(specName, globalSpecs?.workingTemperatureC, globalSpecs?.workingPressureBar);
                      return suitability.isSuitable;
                    };

                    const getLimitsText = (specName: string): string => {
                      const limits = getMaterialLimits(specName);
                      if (!limits) return '';
                      return ` [Max ${limits.maxTempC}°C]`;
                    };

                    const handleSpecSelect = async (specId: number) => {
                      let recommendedPressureClassId = globalSpecs?.flangePressureClassId;
                      const newSteelSpec = masterData.steelSpecs?.find((s: any) => s.id === specId);
                      const specName = newSteelSpec?.steelSpecName || '';

                      if (specName && (globalSpecs?.workingPressureBar || globalSpecs?.workingTemperatureC)) {
                        const suitability = await materialValidationApi.checkMaterialSuitability(
                          specName,
                          globalSpecs?.workingTemperatureC,
                          globalSpecs?.workingPressureBar
                        );

                        if (!suitability.isSuitable) {
                          const mappedLimits = suitability.limits ? {
                            minTempC: suitability.limits.minTempC,
                            maxTempC: suitability.limits.maxTempC,
                            maxPressureBar: suitability.limits.maxPressureBar,
                            type: suitability.limits.materialType,
                            notes: suitability.limits.notes
                          } : undefined;

                          setMaterialWarning({
                            show: true,
                            specName,
                            specId,
                            warnings: suitability.warnings,
                            recommendation: suitability.recommendation,
                            limits: mappedLimits
                          });
                          setSteelSpecDropdownOpen(false);
                          return;
                        }
                      }

                      if (specId && globalSpecs?.flangeStandardId && globalSpecs?.workingPressureBar) {
                        const materialGroup = getFlangeMaterialGroup(newSteelSpec?.steelSpecName);
                        recommendedPressureClassId = await fetchAndSelectPressureClass(
                          globalSpecs.flangeStandardId, globalSpecs.workingPressureBar, globalSpecs.workingTemperatureC, materialGroup
                        );
                      }

                      onUpdateGlobalSpecs({
                        ...globalSpecs,
                        steelSpecificationId: specId,
                        flangePressureClassId: recommendedPressureClassId || globalSpecs?.flangePressureClassId
                      });
                      setSteelSpecDropdownOpen(false);
                    };

                    const groups = [
                      { label: 'South African Standards (SABS)', filter: (name: string) => name.startsWith('SABS') },
                      { label: 'Carbon Steel - ASTM A106 (High-Temp Seamless) - up to 427°C', filter: (name: string) => name.startsWith('ASTM A106') },
                      { label: 'Carbon Steel - ASTM A53 (General Purpose) - up to 400°C', filter: (name: string) => name.startsWith('ASTM A53') },
                      { label: 'Line Pipe - API 5L (Oil/Gas Pipelines) - up to 400°C', filter: (name: string) => name.startsWith('API 5L') },
                      { label: 'Low Temperature - ASTM A333 - down to -100°C', filter: (name: string) => name.startsWith('ASTM A333') },
                      { label: 'Heat Exchangers/Boilers - ASTM A179/A192', filter: (name: string) => /^ASTM A1(79|92)/.test(name) },
                      { label: 'Structural Tubing - ASTM A500 - up to 200°C', filter: (name: string) => name.startsWith('ASTM A500') },
                      { label: 'Alloy Steel - ASTM A335 (Chrome-Moly) - up to 593°C', filter: (name: string) => name.startsWith('ASTM A335') },
                      { label: 'Stainless Steel - ASTM A312 - up to 816°C', filter: (name: string) => name.startsWith('ASTM A312') },
                    ];

                    return groups.map((group, groupIdx) => {
                      const specs = masterData.steelSpecs.filter((spec: any) => group.filter(spec.steelSpecName || ''));
                      const suitableSpecs = specs.filter((spec: any) => isSpecSuitable(spec.steelSpecName || ''));
                      const unsuitableSpecs = specs.filter((spec: any) => !isSpecSuitable(spec.steelSpecName || ''));

                      if (specs.length === 0) return null;

                      return (
                        <div key={groupIdx}>
                          <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50 sticky top-0">
                            {suitableSpecs.length > 0 ? group.label : `${group.label} (Not Suitable)`}
                          </div>
                          {suitableSpecs.map((spec: any) => (
                            <button
                              key={spec.id}
                              type="button"
                              onClick={() => handleSpecSelect(spec.id)}
                              className={`w-full px-3 py-1.5 text-sm text-left hover:bg-blue-50 ${
                                globalSpecs?.steelSpecificationId === spec.id ? 'bg-blue-100 text-blue-800' : 'text-gray-900'
                              }`}
                            >
                              {spec.steelSpecName}
                            </button>
                          ))}
                          {unsuitableSpecs.map((spec: any) => (
                            <div
                              key={spec.id}
                              className="w-full px-3 py-1.5 text-sm text-left text-gray-400 cursor-not-allowed"
                            >
                              {spec.steelSpecName}{getLimitsText(spec.steelSpecName)} - NOT SUITABLE
                            </div>
                          ))}
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
              {/* Show current suitability status */}
              {globalSpecs?.steelSpecificationId && (globalSpecs?.workingPressureBar || globalSpecs?.workingTemperatureC) && (() => {
                const currentSpec = masterData.steelSpecs?.find((s: any) => s.id === globalSpecs.steelSpecificationId);
                if (!currentSpec) return null;
                const suitability = checkMaterialSuitability(currentSpec.steelSpecName, globalSpecs?.workingTemperatureC, globalSpecs?.workingPressureBar);
                if (suitability.isSuitable) {
                  return (
                    <p className="mt-1 text-xs text-green-600 flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Suitable for {globalSpecs.workingTemperatureC}°C / {globalSpecs.workingPressureBar} bar
                    </p>
                  );
                } else {
                  return (
                    <p className="mt-1 text-xs text-red-600 flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Not recommended for current conditions
                    </p>
                  );
                }
              })()}
            </div>

            {/* Flange Standard */}
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-1">Flange Standard <span className="text-red-500">*</span></label>
              <select
                value={globalSpecs?.flangeStandardId || ''}
                onChange={async (e) => {
                  const rawValue = e.target.value;

                  // Handle Plain Ended (PE) option - no flanges
                  if (rawValue === 'PE') {
                    onUpdateGlobalSpecs({
                      ...globalSpecs,
                      flangeStandardId: 'PE',
                      flangePressureClassId: undefined // No pressure class needed for plain ended
                    });
                    return;
                  }

                  const standardId = rawValue ? Number(rawValue) : undefined;
                  let recommendedPressureClassId: number | undefined = undefined;

                  // Clear pressure class when switching standards (must pick new one for the new standard)
                  const standardChanged = standardId !== globalSpecs?.flangeStandardId;

                  // Get material group from selected steel spec
                  const steelSpec = masterData.steelSpecs?.find((s: any) => s.id === globalSpecs?.steelSpecificationId);
                  const materialGroup = getFlangeMaterialGroup(steelSpec?.steelSpecName);

                  if (standardId && globalSpecs?.workingPressureBar) {
                    recommendedPressureClassId = await fetchAndSelectPressureClass(standardId, globalSpecs.workingPressureBar, globalSpecs.workingTemperatureC, materialGroup) || undefined;
                  } else if (standardId) {
                    await fetchAndSelectPressureClass(standardId);
                  }

                  // If standard changed, only use new recommendation (don't keep old class from different standard)
                  const newPressureClassId = standardChanged
                    ? recommendedPressureClassId  // Only use new recommendation when switching standards
                    : (recommendedPressureClassId || globalSpecs?.flangePressureClassId);

                  log.debug(`Flange standard changed to ${standardId}, recommended class: ${recommendedPressureClassId}, final: ${newPressureClassId}`);

                  onUpdateGlobalSpecs({
                    ...globalSpecs,
                    flangeStandardId: standardId,
                    flangePressureClassId: newPressureClassId
                  });
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                required
              >
                <option value="">Select flange standard...</option>
                <option value="PE">Plain Ended (No Flanges)</option>
                {masterData.flangeStandards.map((standard: any) => (
                  <option key={standard.id} value={standard.id}>{standard.code}</option>
                ))}
              </select>
            </div>

            {/* Flange Pressure Class */}
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-1">
                Pressure Class <span className="text-red-500">*</span>
                {globalSpecs?.workingPressureBar && globalSpecs?.flangeStandardId !== 'PE' && <span className="ml-1 text-xs text-blue-600 font-normal">(auto)</span>}
              </label>
              {globalSpecs?.flangeStandardId === 'PE' ? (
                <div className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-gray-100 text-gray-700">
                  P/E (Plain Ended)
                </div>
              ) : (
              <select
                value={globalSpecs?.flangePressureClassId || ''}
                onChange={(e) => onUpdateGlobalSpecs({
                  ...globalSpecs,
                  flangePressureClassId: e.target.value ? Number(e.target.value) : undefined
                })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                disabled={!globalSpecs?.flangeStandardId}
                required
              >
                <option value="">Select class...</option>
                {availablePressureClasses.map((pc: any) => (
                  <option key={pc.id} value={pc.id}>{pc.designation}</option>
                ))}
              </select>
              )}
            </div>
          </div>
        </div>

            </>
            )}
          </div>
        )}

        {/* Confirm Button for Steel Pipe Specifications */}
        {showSteelPipes && !globalSpecs?.steelPipesSpecsConfirmed && (
          <div className="mt-4 flex justify-end" data-field="steelPipesConfirmation">
            <button
              type="button"
              onClick={() => onUpdateGlobalSpecs({
                ...globalSpecs,
                steelPipesSpecsConfirmed: true
              })}
              disabled={!globalSpecs?.workingPressureBar || !globalSpecs?.workingTemperatureC}
              className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm Steel Pipe Specifications
            </button>
          </div>
        )}

        {/* Surface Protection - Only show if Surface Protection is selected */}
        {showSurfaceProtection && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
              <span className="text-2xl">🛡️</span>
              <h3 className="text-xl font-bold text-gray-900">Surface Protection</h3>
            </div>

            {/* Confirmed Surface Protection Summary - Show when ANY surface protection is confirmed */}
            {(globalSpecs?.surfaceProtectionConfirmed || globalSpecs?.externalCoatingConfirmed || globalSpecs?.internalLiningConfirmed) &&
             (globalSpecs?.externalCoatingRecommendation || globalSpecs?.externalCoatingType || globalSpecs?.internalLiningType) && (
              <div className="bg-green-100 border border-green-400 rounded-md p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-green-800">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-semibold">Surface Protection Confirmed</span>
                    {(globalSpecs?.externalCoatingConfirmed || globalSpecs?.externalCoatingType || globalSpecs?.externalCoatingRecommendation) && (
                      <>
                        <span className="mx-2">•</span>
                        <span className="font-medium">External:</span> {globalSpecs.externalCoatingRecommendation?.coating || globalSpecs.externalCoatingType || 'N/A'}
                      </>
                    )}
                    {(globalSpecs?.internalLiningConfirmed || globalSpecs?.internalLiningType) && (
                      <>
                        <span className="mx-2">•</span>
                        <span className="font-medium">Internal:</span> {globalSpecs.internalLiningType || 'N/A'}
                        {globalSpecs?.internalRubberType && <span className="ml-1">({globalSpecs.internalRubberType})</span>}
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      externalCoatingConfirmed: false,
                      internalLiningConfirmed: false,
                      surfaceProtectionConfirmed: false
                    })}
                    className="px-2 py-1 bg-gray-500 text-white font-medium rounded text-xs hover:bg-gray-600"
                  >
                    Edit
                  </button>
                </div>
              </div>
            )}

        {/* External Coating */}
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <h3 className="text-xs font-semibold text-gray-800 mb-2">External Coating</h3>

          {/* External Environment Profile - Coating Recommendation Assistant */}
          {!globalSpecs?.externalCoatingConfirmed && (
            <div className="mb-2">
              <button
                type="button"
                onClick={() => onUpdateGlobalSpecs({
                  ...globalSpecs,
                  showExternalCoatingProfile: !globalSpecs?.showExternalCoatingProfile
                })}
                className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-medium text-xs mb-2"
              >
                <svg className={`w-3 h-3 transition-transform ${globalSpecs?.showExternalCoatingProfile ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                {globalSpecs?.showExternalCoatingProfile ? 'Hide' : 'Show'} Coating Assistant (ISO 12944/21809)
              </button>

              {globalSpecs?.showExternalCoatingProfile && (
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <h4 className="text-sm font-semibold text-orange-900">External Environment Profile</h4>
                  </div>

                  {/* Installation Conditions */}
                  <div className="bg-white rounded-md p-2 mb-2 border border-gray-200">
                    <h5 className="text-xs font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
                      <span className="w-4 h-4 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-[10px] font-bold">1</span>
                      Installation Conditions
                      {(isInstallationTypeAutoFilled || isUvExposureAutoFilled || isMechanicalRiskAutoFilled) && (
                        <span className="ml-2 text-xs font-medium text-emerald-600">✓ Auto-filled from Mine Selection</span>
                      )}
                    </h5>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                          Installation Type *
                          {isInstallationTypeAutoFilled && <span className="ml-1 text-emerald-600">(Auto)</span>}
                        </label>
                        <select
                          value={effectiveInstallationType || ""}
                          onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, ecpInstallationType: e.target.value || undefined })}
                          className={`w-full px-2 py-1.5 text-xs rounded focus:ring-1 focus:ring-orange-500 ${autoFilledClass(isInstallationTypeAutoFilled)}`}
                        >
                          <option value="">Select...</option>
                          <option value="AboveGround">Above Ground</option>
                          <option value="Buried">Buried</option>
                          <option value="Submerged">Submerged</option>
                          <option value="Splash">Splash Zone</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                          UV Exposure
                          {isUvExposureAutoFilled && <span className="ml-1 text-emerald-600">(Auto)</span>}
                        </label>
                        <select
                          value={effectiveUvExposure || ""}
                          onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, ecpUvExposure: e.target.value || undefined })}
                          className={`w-full px-2 py-1.5 text-xs rounded focus:ring-1 focus:ring-orange-500 ${autoFilledClass(isUvExposureAutoFilled)}`}
                        >
                          <option value="">Select...</option>
                          <option value="None">None</option>
                          <option value="Moderate">Moderate</option>
                          <option value="High">High</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                          Mechanical Risk
                          {isMechanicalRiskAutoFilled && <span className="ml-1 text-emerald-600">(Auto)</span>}
                        </label>
                        <select
                          value={effectiveMechanicalRisk || ""}
                          onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, ecpMechanicalRisk: e.target.value || undefined })}
                          className={`w-full px-2 py-1.5 text-xs rounded focus:ring-1 focus:ring-orange-500 ${autoFilledClass(isMechanicalRiskAutoFilled)}`}
                        >
                          <option value="">Select...</option>
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High (Rocky/Abrasive)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Atmospheric Environment */}
                  <div className="bg-white rounded-md p-2 mb-2 border border-gray-200">
                    <h5 className="text-xs font-semibold text-gray-800 mb-1.5 flex items-center gap-1.5">
                      <span className="w-4 h-4 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-[10px] font-bold">2</span>
                      Atmospheric Environment
                      {(isIso12944AutoFilled || isMarineInfluenceAutoFilled || isIndustrialPollutionAutoFilled) && (
                        <span className="ml-1 text-[10px] font-medium text-emerald-600">✓ Auto</span>
                      )}
                    </h5>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                          ISO 12944 *
                          {isIso12944AutoFilled && <span className="ml-1 text-emerald-600">(Auto)</span>}
                        </label>
                        <select
                          value={effectiveIso12944 || ""}
                          onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, ecpIso12944Category: e.target.value || undefined })}
                          className={`w-full px-2 py-1.5 text-xs rounded focus:ring-1 focus:ring-orange-500 ${autoFilledClass(isIso12944AutoFilled)}`}
                        >
                          <option value="">Select...</option>
                          <option value="C1">C1 - Very Low</option>
                          <option value="C2">C2 - Low</option>
                          <option value="C3">C3 - Medium</option>
                          <option value="C4">C4 - High</option>
                          <option value="C5">C5 - Very High</option>
                          <option value="CX">CX - Extreme</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                          Marine
                          {isMarineInfluenceAutoFilled && <span className="ml-1 text-emerald-600">(Auto)</span>}
                        </label>
                        <select
                          value={effectiveMarineInfluence || ""}
                          onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, ecpMarineInfluence: e.target.value || undefined })}
                          className={`w-full px-2 py-1.5 text-xs rounded focus:ring-1 focus:ring-orange-500 ${autoFilledClass(isMarineInfluenceAutoFilled)}`}
                        >
                          <option value="">Select...</option>
                          <option value="None">None (Inland)</option>
                          <option value="Coastal">Coastal</option>
                          <option value="Offshore">Offshore</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                          Industrial
                          {isIndustrialPollutionAutoFilled && <span className="ml-1 text-emerald-600">(Auto)</span>}
                        </label>
                        <select
                          value={effectiveIndustrialPollution || ""}
                          onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, ecpIndustrialPollution: e.target.value || undefined })}
                          className={`w-full px-2 py-1.5 text-xs rounded focus:ring-1 focus:ring-orange-500 ${autoFilledClass(isIndustrialPollutionAutoFilled)}`}
                        >
                          <option value="">Select...</option>
                          <option value="None">None / Rural</option>
                          <option value="Moderate">Moderate</option>
                          <option value="Heavy">Heavy</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Soil Conditions (for buried) */}
                  {effectiveInstallationType === "Buried" && (
                    <div className="bg-white rounded-md p-2 mb-2 border border-gray-200">
                      <h5 className="text-xs font-semibold text-gray-800 mb-1.5 flex items-center gap-1.5">
                        <span className="w-4 h-4 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-[10px] font-bold">3</span>
                        Soil Conditions
                      </h5>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Soil Type</label>
                          <select
                            value={globalSpecs?.ecpSoilType || ""}
                            onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, ecpSoilType: e.target.value || undefined })}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 text-gray-900"
                          >
                            <option value="">Select...</option>
                            <option value="Sandy">Sandy</option>
                            <option value="Clay">Clay</option>
                            <option value="Rocky">Rocky</option>
                            <option value="Marshy">Marshy</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Resistivity</label>
                          <select
                            value={globalSpecs?.ecpSoilResistivity || ""}
                            onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, ecpSoilResistivity: e.target.value || undefined })}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 text-gray-900"
                          >
                            <option value="">Select...</option>
                            <option value="VeryLow">&lt;500 Ω·cm</option>
                            <option value="Low">500–2k Ω·cm</option>
                            <option value="Medium">2k–10k Ω·cm</option>
                            <option value="High">&gt;10k Ω·cm</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Moisture</label>
                          <select
                            value={globalSpecs?.ecpSoilMoisture || ""}
                            onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, ecpSoilMoisture: e.target.value || undefined })}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 text-gray-900"
                          >
                            <option value="">Select...</option>
                            <option value="Dry">Dry</option>
                            <option value="Normal">Normal</option>
                            <option value="Wet">Wet</option>
                            <option value="Saturated">Saturated</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Operating Conditions */}
                  <div className="bg-white rounded-md p-2 mb-2 border border-gray-200">
                    <h5 className="text-xs font-semibold text-gray-800 mb-1.5 flex items-center gap-1.5">
                      <span className="w-4 h-4 bg-red-100 text-red-700 rounded-full flex items-center justify-center text-[10px] font-bold">{effectiveInstallationType === "Buried" ? "4" : "3"}</span>
                      Operating Conditions
                      {isEcpTemperatureAutoFilled && <span className="ml-1 text-[10px] font-medium text-emerald-600">✓ Temp Auto</span>}
                    </h5>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                          Temperature
                        </label>
                        <select
                          value={effectiveEcpTemperature || ""}
                          onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, ecpTemperature: e.target.value || undefined })}
                          className={`w-full px-2 py-1.5 text-xs rounded focus:ring-1 focus:ring-orange-500 ${
                            isEcpTemperatureAutoFilled
                              ? 'border-2 border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold'
                              : 'border border-gray-300 text-gray-900'
                          }`}
                        >
                          <option value="">Select...</option>
                          <option value="Ambient">Ambient</option>
                          <option value="Elevated">Elevated (60–120°C)</option>
                          <option value="High">High (120–200°C)</option>
                          <option value="Cyclic">Cyclic</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Service Life *</label>
                        <select
                          value={globalSpecs?.ecpServiceLife || ""}
                          onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, ecpServiceLife: e.target.value || undefined })}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 text-gray-900"
                        >
                          <option value="">Select...</option>
                          <option value="Short">&lt;7 years</option>
                          <option value="Medium">7–15 years</option>
                          <option value="Long">15–25 years</option>
                          <option value="Extended">&gt;25 years</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Cathodic Prot?</label>
                        <select
                          value={globalSpecs?.ecpCathodicProtection === true ? "true" : globalSpecs?.ecpCathodicProtection === false ? "false" : ""}
                          onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, ecpCathodicProtection: e.target.value === "true" ? true : e.target.value === "false" ? false : undefined })}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 text-gray-900"
                        >
                          <option value="">Select...</option>
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Recommendation Display */}
                  {(() => {
                    const profile: ExternalEnvironmentProfile = {
                      installation: {
                        type: effectiveInstallationType as any,
                        uvExposure: effectiveUvExposure as any,
                        mechanicalRisk: effectiveMechanicalRisk as any
                      },
                      atmosphere: {
                        iso12944Category: effectiveIso12944 as any,
                        marineInfluence: effectiveMarineInfluence as any,
                        industrialPollution: effectiveIndustrialPollution as any
                      },
                      soil: {
                        soilType: globalSpecs?.ecpSoilType as any,
                        resistivity: globalSpecs?.ecpSoilResistivity as any,
                        moisture: globalSpecs?.ecpSoilMoisture as any
                      },
                      operating: {
                        temperature: effectiveEcpTemperature as any,
                        cathodicProtection: globalSpecs?.ecpCathodicProtection,
                        serviceLife: globalSpecs?.ecpServiceLife as any
                      }
                    };

                    if (!hasCompleteExternalProfile(profile)) {
                      return (
                        <div className="bg-gray-100 rounded-lg p-4 border border-gray-200">
                          <p className="text-sm text-gray-600 text-center">
                            Complete the required fields (marked *) to receive a coating recommendation.
                          </p>
                        </div>
                      );
                    }

                    const damage = classifyExternalDamageMechanisms(profile);
                    const recommendation = recommendExternalCoating(profile, damage);

                    return (
                      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-md p-2 border-2 border-emerald-300">
                        <div className="flex items-center justify-between gap-1 mb-2">
                          <div className="flex items-center gap-1.5">
                            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <h5 className="text-xs font-bold text-emerald-900">Recommended Coating</h5>
                          </div>
                          {isEcpTemperatureAutoFilled && (
                            <span className="text-[10px] bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded-full font-medium">
                              Temp: {globalSpecs?.workingTemperatureC}°C
                            </span>
                          )}
                        </div>

                        {/* Compact 4-column grid for main info */}
                        <div className="grid grid-cols-4 gap-2 mb-2">
                          <div className="bg-white rounded p-1.5 border border-emerald-200">
                            <div className="text-[10px] font-medium text-gray-500">Coating</div>
                            <div className="text-xs font-bold text-emerald-800">{recommendation.coating}</div>
                          </div>
                          <div className="bg-white rounded p-1.5 border border-emerald-200">
                            <div className="text-[10px] font-medium text-gray-500">System</div>
                            <div className="text-[10px] text-gray-700">{recommendation.system}</div>
                          </div>
                          <div className="bg-white rounded p-1.5 border border-emerald-200">
                            <div className="text-[10px] font-medium text-gray-500">Thickness</div>
                            <div className="text-xs font-semibold text-gray-800">{recommendation.thicknessRange}</div>
                          </div>
                          <div className="bg-white rounded p-1.5 border border-emerald-200">
                            <div className="text-[10px] font-medium text-gray-500">Exposure</div>
                            <div className="flex flex-wrap gap-0.5">
                              <span className={`text-[9px] px-1 py-0.5 rounded ${damage.atmosphericCorrosion === 'Severe' || damage.atmosphericCorrosion === 'High' ? 'bg-red-100 text-red-700' : damage.atmosphericCorrosion === 'Moderate' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                {damage.atmosphericCorrosion}
                              </span>
                              {effectiveInstallationType === "Buried" && (
                                <span className={`text-[9px] px-1 py-0.5 rounded ${damage.soilCorrosion === 'Severe' || damage.soilCorrosion === 'High' ? 'bg-red-100 text-red-700' : damage.soilCorrosion === 'Moderate' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                  Soil
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Standards and Notes in compact 2-column layout */}
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div className="bg-white rounded p-1.5 border border-emerald-200">
                            <div className="text-[10px] font-medium text-gray-500 mb-1">Standards</div>
                            <div className="flex flex-wrap gap-1">
                              {recommendation.standardsBasis.slice(0, 3).map((std, i) => (
                                <span key={i} className="text-[9px] bg-orange-100 text-orange-800 px-1 py-0.5 rounded font-medium">
                                  {std}
                                </span>
                              ))}
                              {recommendation.standardsBasis.length > 3 && (
                                <span className="text-[9px] text-gray-500">+{recommendation.standardsBasis.length - 3}</span>
                              )}
                            </div>
                          </div>
                          <div className="bg-white rounded p-1.5 border border-emerald-200">
                            <div className="text-[10px] font-medium text-gray-500 mb-1">Rationale</div>
                            <p className="text-[10px] text-gray-700 line-clamp-2">{recommendation.rationale}</p>
                          </div>
                        </div>

                        {/* Engineering Notes - collapsible */}
                        <details className="bg-white rounded p-1.5 border border-emerald-200 mb-2">
                          <summary className="text-[10px] font-medium text-gray-500 cursor-pointer">Engineering Notes ({recommendation.engineeringNotes.length})</summary>
                          <ul className="text-[10px] text-gray-700 mt-1 space-y-0.5 pl-2">
                            {recommendation.engineeringNotes.map((note, i) => (
                              <li key={i}>• {note}</li>
                            ))}
                          </ul>
                        </details>

                        {/* ISO 12944-5 Paint System Selection */}
                        {['C1', 'C2', 'C3', 'C4', 'C5'].includes(effectiveIso12944 || '') && globalSpecs?.ecpServiceLife && (
                          <div className="bg-blue-50 rounded p-2 border border-blue-200 mb-2">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-1.5">
                                <span className="bg-blue-600 text-white w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold">ISO</span>
                                <h6 className="text-[10px] font-bold text-blue-900">ISO 12944-5:2018 Paint System</h6>
                              </div>
                              {iso12944Loading && (
                                <span className="text-[9px] text-blue-600 animate-pulse">Loading...</span>
                              )}
                            </div>

                            {selectedIso12944System && (
                              <>
                                <div className="grid grid-cols-4 gap-1.5 mb-2">
                                  <div className="bg-white rounded p-1.5 border border-blue-200">
                                    <div className="text-[9px] font-medium text-gray-500">System Code</div>
                                    <div className="text-xs font-bold text-blue-800">{selectedIso12944System.systemCode}</div>
                                  </div>
                                  <div className="bg-white rounded p-1.5 border border-blue-200">
                                    <div className="text-[9px] font-medium text-gray-500">Binder</div>
                                    <div className="text-[10px] text-gray-700">{selectedIso12944System.binderType}</div>
                                  </div>
                                  <div className="bg-white rounded p-1.5 border border-blue-200">
                                    <div className="text-[9px] font-medium text-gray-500">Primer</div>
                                    <div className="text-[10px] text-gray-700">{selectedIso12944System.primerType}</div>
                                  </div>
                                  <div className="bg-white rounded p-1.5 border border-blue-200">
                                    <div className="text-[9px] font-medium text-gray-500">Total DFT</div>
                                    <div className="text-xs font-semibold text-blue-800">{selectedIso12944System.totalDftUmRange}μm</div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-1.5 mb-2">
                                  <div className="bg-white rounded p-1.5 border border-blue-200">
                                    <div className="text-[9px] font-medium text-gray-500">System Description</div>
                                    <div className="text-[10px] text-gray-700">{selectedIso12944System.system}</div>
                                  </div>
                                  <div className="bg-white rounded p-1.5 border border-blue-200">
                                    <div className="text-[9px] font-medium text-gray-500">Coats / Primer DFT</div>
                                    <div className="text-[10px] text-gray-700">{selectedIso12944System.coats} coats | Primer: {selectedIso12944System.primerNdftUm}μm</div>
                                  </div>
                                </div>

                                {/* Alternative Systems Selector */}
                                {iso12944Systems && iso12944Systems.alternatives.length > 0 && (
                                  <div className="flex items-center gap-2">
                                    <label className="text-[9px] font-medium text-gray-600 whitespace-nowrap">Alternative Systems:</label>
                                    <select
                                      value={selectedIso12944SystemCode || ''}
                                      onChange={(e) => setSelectedIso12944SystemCode(e.target.value)}
                                      className="flex-1 px-2 py-1 text-[10px] border border-blue-200 rounded focus:ring-1 focus:ring-blue-500 text-gray-900 bg-white"
                                    >
                                      {iso12944Systems.recommended && (
                                        <option value={iso12944Systems.recommended.systemCode || ''}>
                                          {iso12944Systems.recommended.systemCode} - {iso12944Systems.recommended.system} ({iso12944Systems.recommended.totalDftUmRange}μm) [Recommended]
                                        </option>
                                      )}
                                      {iso12944Systems.alternatives.map((sys) => (
                                        <option key={sys.systemCode} value={sys.systemCode || ''}>
                                          {sys.systemCode} - {sys.system} ({sys.totalDftUmRange}μm)
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                              </>
                            )}

                            {!selectedIso12944System && !iso12944Loading && (
                              <p className="text-[10px] text-blue-700">No ISO 12944-5 systems available for this category/durability combination.</p>
                            )}
                          </div>
                        )}

                        {/* Colour Selection - more compact */}
                        <div className="bg-white rounded p-1.5 border border-emerald-200 mb-2">
                          <div className="text-[10px] font-medium text-emerald-700 mb-1.5 flex items-center gap-1">
                            <span className="bg-emerald-600 text-white w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold">4</span>
                            Colours (Optional)
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {/* Topcoat Colour */}
                            <div>
                              <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Topcoat</label>
                              {!globalSpecs?.showRecCustomColourInput ? (
                                <select
                                  value={globalSpecs?.recExternalTopcoatColour || ''}
                                  onChange={(e) => {
                                    if (e.target.value === '__ADD_CUSTOM__') {
                                      onUpdateGlobalSpecs({ ...globalSpecs, showRecCustomColourInput: true });
                                    } else {
                                      onUpdateGlobalSpecs({ ...globalSpecs, recExternalTopcoatColour: e.target.value || undefined });
                                    }
                                  }}
                                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 text-gray-900"
                                >
                                  <option value="">Select...</option>
                                  <option value="__ADD_CUSTOM__">+ Custom...</option>
                                  {(() => {
                                    try {
                                      const customColours = JSON.parse(localStorage.getItem('customTopcoatColours') || '[]');
                                      if (customColours.length > 0) {
                                        return customColours.map((colour: string, idx: number) => (
                                          <option key={idx} value={colour}>{colour}</option>
                                        ));
                                      }
                                    } catch (e) {}
                                    return null;
                                  })()}
                                  <optgroup label="Mining">
                                    <option value="Safety Yellow (RAL 1003)">Yellow RAL 1003</option>
                                    <option value="Safety Orange (RAL 2009)">Orange RAL 2009</option>
                                    <option value="Safety Red (RAL 3001)">Red RAL 3001</option>
                                    <option value="Safety Green (RAL 6024)">Green RAL 6024</option>
                                    <option value="Signal Blue (RAL 5005)">Blue RAL 5005</option>
                                    <option value="White (RAL 9003)">White RAL 9003</option>
                                    <option value="Black (RAL 9005)">Black RAL 9005</option>
                                    <option value="Grey (RAL 7035)">Grey RAL 7035</option>
                                  </optgroup>
                                  <optgroup label="Pipeline">
                                    <option value="Water - Blue (RAL 5015)">Water Blue</option>
                                    <option value="Steam - Silver Grey (RAL 7001)">Steam Grey</option>
                                    <option value="Air - Light Blue (RAL 5012)">Air Blue</option>
                                    <option value="Gas - Yellow Ochre (RAL 1024)">Gas Yellow</option>
                                    <option value="Fire Services - Red (RAL 3000)">Fire Red</option>
                                  </optgroup>
                                </select>
                              ) : (
                                <div className="space-y-1">
                                  <input
                                    type="text"
                                    value={globalSpecs?.recCustomColourInput || ''}
                                    onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, recCustomColourInput: e.target.value })}
                                    placeholder="Colour name"
                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 text-gray-900"
                                  />
                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newColour = globalSpecs?.recCustomColourInput?.trim();
                                        if (newColour) {
                                          try {
                                            const existing = JSON.parse(localStorage.getItem('customTopcoatColours') || '[]');
                                            if (!existing.includes(newColour)) {
                                              existing.push(newColour);
                                              localStorage.setItem('customTopcoatColours', JSON.stringify(existing));
                                            }
                                          } catch (e) {}
                                          onUpdateGlobalSpecs({ ...globalSpecs, recExternalTopcoatColour: newColour, showRecCustomColourInput: false, recCustomColourInput: undefined });
                                        }
                                      }}
                                      disabled={!globalSpecs?.recCustomColourInput?.trim()}
                                      className="flex-1 px-1.5 py-0.5 bg-emerald-600 text-white text-[10px] rounded hover:bg-emerald-700 disabled:opacity-50"
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onUpdateGlobalSpecs({ ...globalSpecs, showRecCustomColourInput: false, recCustomColourInput: undefined })}
                                      className="px-1.5 py-0.5 bg-gray-500 text-white text-[10px] rounded hover:bg-gray-600"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Band 1 Colour */}
                            <div>
                              <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Band 1</label>
                              {!globalSpecs?.showRecBand1Input ? (
                                <select
                                  value={globalSpecs?.recExternalBand1Colour || ''}
                                  onChange={(e) => {
                                    if (e.target.value === '__ADD_CUSTOM__') {
                                      onUpdateGlobalSpecs({ ...globalSpecs, showRecBand1Input: true });
                                    } else {
                                      onUpdateGlobalSpecs({
                                        ...globalSpecs,
                                        recExternalBand1Colour: e.target.value || undefined,
                                        ...(e.target.value ? {} : { recExternalBand2Colour: undefined })
                                      });
                                    }
                                  }}
                                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 text-gray-900"
                                >
                                  <option value="">None</option>
                                  <option value="__ADD_CUSTOM__">+ Custom...</option>
                                  {(() => {
                                    try {
                                      const customColours = JSON.parse(localStorage.getItem('customBandColours') || '[]');
                                      if (customColours.length > 0) {
                                        return customColours.map((colour: string, idx: number) => (
                                          <option key={idx} value={colour}>{colour}</option>
                                        ));
                                      }
                                    } catch (e) {}
                                    return null;
                                  })()}
                                  <option value="White (RAL 9003)">White</option>
                                  <option value="Yellow (RAL 1023)">Yellow</option>
                                  <option value="Orange (RAL 2004)">Orange</option>
                                  <option value="Red (RAL 3020)">Red</option>
                                  <option value="Blue (RAL 5015)">Blue</option>
                                  <option value="Green (RAL 6032)">Green</option>
                                  <option value="Black (RAL 9005)">Black</option>
                                </select>
                              ) : (
                                <div className="space-y-1">
                                  <input
                                    type="text"
                                    value={globalSpecs?.recBand1Input || ''}
                                    onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, recBand1Input: e.target.value })}
                                    placeholder="Band colour"
                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 text-gray-900"
                                  />
                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newColour = globalSpecs?.recBand1Input?.trim();
                                        if (newColour) {
                                          try {
                                            const existing = JSON.parse(localStorage.getItem('customBandColours') || '[]');
                                            if (!existing.includes(newColour)) {
                                              existing.push(newColour);
                                              localStorage.setItem('customBandColours', JSON.stringify(existing));
                                            }
                                          } catch (e) {}
                                          onUpdateGlobalSpecs({ ...globalSpecs, recExternalBand1Colour: newColour, showRecBand1Input: false, recBand1Input: undefined });
                                        }
                                      }}
                                      disabled={!globalSpecs?.recBand1Input?.trim()}
                                      className="flex-1 px-1.5 py-0.5 bg-emerald-600 text-white text-[10px] rounded hover:bg-emerald-700 disabled:opacity-50"
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onUpdateGlobalSpecs({ ...globalSpecs, showRecBand1Input: false, recBand1Input: undefined })}
                                      className="px-1.5 py-0.5 bg-gray-500 text-white text-[10px] rounded hover:bg-gray-600"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Band 2 Colour - Only if Band 1 selected */}
                            {globalSpecs?.recExternalBand1Colour && (
                              <div>
                                <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Band 2</label>
                                {!globalSpecs?.showRecBand2Input ? (
                                  <select
                                    value={globalSpecs?.recExternalBand2Colour || ''}
                                    onChange={(e) => {
                                      if (e.target.value === '__ADD_CUSTOM__') {
                                        onUpdateGlobalSpecs({ ...globalSpecs, showRecBand2Input: true });
                                      } else {
                                        onUpdateGlobalSpecs({ ...globalSpecs, recExternalBand2Colour: e.target.value || undefined });
                                      }
                                    }}
                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 text-gray-900"
                                  >
                                    <option value="">None</option>
                                    <option value="__ADD_CUSTOM__">+ Custom...</option>
                                    {(() => {
                                      try {
                                        const customColours = JSON.parse(localStorage.getItem('customBandColours') || '[]');
                                        if (customColours.length > 0) {
                                          return customColours.map((colour: string, idx: number) => (
                                            <option key={idx} value={colour}>{colour}</option>
                                          ));
                                        }
                                      } catch (e) {}
                                      return null;
                                    })()}
                                    <option value="White (RAL 9003)">White</option>
                                    <option value="Yellow (RAL 1023)">Yellow</option>
                                    <option value="Orange (RAL 2004)">Orange</option>
                                    <option value="Red (RAL 3020)">Red</option>
                                    <option value="Blue (RAL 5015)">Blue</option>
                                    <option value="Green (RAL 6032)">Green</option>
                                    <option value="Black (RAL 9005)">Black</option>
                                  </select>
                                ) : (
                                  <div className="space-y-1">
                                    <input
                                      type="text"
                                      value={globalSpecs?.recBand2Input || ''}
                                      onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, recBand2Input: e.target.value })}
                                      placeholder="Band colour"
                                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 text-gray-900"
                                    />
                                    <div className="flex gap-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newColour = globalSpecs?.recBand2Input?.trim();
                                          if (newColour) {
                                            try {
                                              const existing = JSON.parse(localStorage.getItem('customBandColours') || '[]');
                                              if (!existing.includes(newColour)) {
                                                existing.push(newColour);
                                                localStorage.setItem('customBandColours', JSON.stringify(existing));
                                              }
                                            } catch (e) {}
                                            onUpdateGlobalSpecs({ ...globalSpecs, recExternalBand2Colour: newColour, showRecBand2Input: false, recBand2Input: undefined });
                                          }
                                        }}
                                        disabled={!globalSpecs?.recBand2Input?.trim()}
                                        className="flex-1 px-1.5 py-0.5 bg-emerald-600 text-white text-[10px] rounded hover:bg-emerald-700 disabled:opacity-50"
                                      >
                                        Save
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => onUpdateGlobalSpecs({ ...globalSpecs, showRecBand2Input: false, recBand2Input: undefined })}
                                        className="px-1.5 py-0.5 bg-gray-500 text-white text-[10px] rounded hover:bg-gray-600"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Compact action buttons */}
                        <div className="flex gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => onUpdateGlobalSpecs({
                              ...globalSpecs,
                              externalCoatingType: recommendation.coatingType,
                              externalCoatingConfirmed: true,
                              externalCoatingRecommendationRejected: false,
                              externalBlastingGrade: recommendation.coatingType === 'Galvanized' ? undefined : 'SA 2.5 (ISO 8501-1)',
                              externalTopcoatColour: globalSpecs?.recExternalTopcoatColour,
                              externalBand1Colour: globalSpecs?.recExternalBand1Colour,
                              externalBand2Colour: globalSpecs?.recExternalBand2Colour,
                              externalCoatingRecommendation: {
                                coating: recommendation.coating,
                                system: recommendation.system,
                                thicknessRange: recommendation.thicknessRange,
                                standardsBasis: recommendation.standardsBasis,
                                rationale: recommendation.rationale,
                                engineeringNotes: recommendation.engineeringNotes,
                                environmentProfile: {
                                  installationType: effectiveInstallationType,
                                  iso12944Category: effectiveIso12944,
                                  marineInfluence: effectiveMarineInfluence,
                                  industrialPollution: effectiveIndustrialPollution,
                                  uvExposure: effectiveUvExposure,
                                  mechanicalRisk: effectiveMechanicalRisk,
                                  temperature: effectiveEcpTemperature,
                                  serviceLife: globalSpecs?.ecpServiceLife
                                },
                                damageAssessment: {
                                  atmosphericCorrosion: damage.atmosphericCorrosion,
                                  soilCorrosion: damage.soilCorrosion,
                                  mechanicalDamage: damage.mechanicalDamage,
                                  dominantMechanism: damage.dominantMechanism
                                }
                              },
                              externalCoatingActionLog: [
                                ...(globalSpecs?.externalCoatingActionLog || []),
                                { action: 'ACCEPTED', timestamp: nowISO(), recommendation: recommendation.coating }
                              ]
                            })}
                            className="flex-1 px-2 py-1.5 bg-emerald-600 text-white font-medium rounded text-xs flex items-center justify-center gap-1 hover:bg-emerald-700"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Accept & Lock
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateGlobalSpecs({
                              ...globalSpecs,
                              externalCoatingRecommendationRejected: true,
                              externalCoatingActionLog: [
                                ...(globalSpecs?.externalCoatingActionLog || []),
                                { action: 'REJECTED', timestamp: nowISO(), recommendation: recommendation.coating }
                              ]
                            })}
                            className="px-2 py-1.5 bg-red-600 text-white font-medium rounded text-xs flex items-center justify-center gap-1 hover:bg-red-700"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Reject
                          </button>
                        </div>

                        {/* Compact disclaimer */}
                        <details className="mt-2 text-[10px] text-amber-700">
                          <summary className="cursor-pointer font-medium">Engineering Disclaimer</summary>
                          <p className="mt-1 p-1.5 bg-amber-50 border border-amber-200 rounded">
                            Recommendations based on ISO 12944/21809. Does not replace project-specific assessments or qualified inspector verification.
                          </p>
                        </details>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* LOCKED SUPPLIER SPECIFICATION - Shows when recommendation is confirmed */}
          {globalSpecs?.externalCoatingConfirmed && globalSpecs?.externalCoatingRecommendation && (
            <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <h4 className="text-lg font-bold text-green-800">External Coating Specification (Locked)</h4>
              </div>

              {/* Supplier Specification Summary */}
              <div className="bg-white rounded-lg border border-green-300 p-4 space-y-4">
                <div className="text-center border-b border-green-200 pb-3">
                  <h5 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Coating System</h5>
                  <p className="text-xl font-bold text-green-800 mt-1">{globalSpecs.externalCoatingRecommendation.coating}</p>
                </div>

                {/* Surface Preparation */}
                {globalSpecs?.externalBlastingGrade && (
                  <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                    <span className="font-semibold text-amber-800 text-sm">Surface Preparation:</span>
                    <p className="text-amber-900 font-medium mt-1">{globalSpecs.externalBlastingGrade}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold text-gray-700">System:</span>
                    <p className="text-gray-900 mt-0.5">{globalSpecs.externalCoatingRecommendation.system}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Thickness Range:</span>
                    <p className="text-gray-900 font-medium mt-0.5">{globalSpecs.externalCoatingRecommendation.thicknessRange}</p>
                  </div>
                </div>

                {/* Colour Specifications */}
                {(globalSpecs?.externalTopcoatColour || globalSpecs?.externalBand1Colour) && (
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <span className="font-semibold text-blue-800 text-sm">Colour Specifications:</span>
                    <div className="grid grid-cols-3 gap-3 mt-2 text-sm">
                      {globalSpecs?.externalTopcoatColour && (
                        <div>
                          <span className="text-blue-600 text-xs">Topcoat Colour:</span>
                          <p className="font-medium text-blue-900">{globalSpecs.externalTopcoatColour}</p>
                        </div>
                      )}
                      {globalSpecs?.externalBand1Colour && (
                        <div>
                          <span className="text-blue-600 text-xs">Band 1 Colour:</span>
                          <p className="font-medium text-blue-900">{globalSpecs.externalBand1Colour}</p>
                        </div>
                      )}
                      {globalSpecs?.externalBand2Colour && (
                        <div>
                          <span className="text-blue-600 text-xs">Band 2 Colour:</span>
                          <p className="font-medium text-blue-900">{globalSpecs.externalBand2Colour}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <span className="font-semibold text-gray-700 text-sm">Applicable Standards:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {globalSpecs.externalCoatingRecommendation.standardsBasis.map((std: string, i: number) => (
                      <span key={i} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">
                        {std}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <span className="font-semibold text-gray-700 text-sm">Environment Profile:</span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs">
                    <div><span className="text-gray-500">Installation:</span> <span className="font-medium">{globalSpecs.externalCoatingRecommendation.environmentProfile?.installationType || 'N/A'}</span></div>
                    <div><span className="text-gray-500">ISO 12944:</span> <span className="font-medium">{globalSpecs.externalCoatingRecommendation.environmentProfile?.iso12944Category || 'N/A'}</span></div>
                    <div><span className="text-gray-500">Marine:</span> <span className="font-medium">{globalSpecs.externalCoatingRecommendation.environmentProfile?.marineInfluence || 'None'}</span></div>
                    <div><span className="text-gray-500">UV Exposure:</span> <span className="font-medium">{globalSpecs.externalCoatingRecommendation.environmentProfile?.uvExposure || 'N/A'}</span></div>
                    <div><span className="text-gray-500">Temperature:</span> <span className="font-medium">{globalSpecs.externalCoatingRecommendation.environmentProfile?.temperature || 'N/A'}</span></div>
                    <div><span className="text-gray-500">Service Life:</span> <span className="font-medium">{globalSpecs.externalCoatingRecommendation.environmentProfile?.serviceLife || 'N/A'}</span></div>
                    <div><span className="text-gray-500">Mech. Risk:</span> <span className="font-medium">{globalSpecs.externalCoatingRecommendation.environmentProfile?.mechanicalRisk || 'N/A'}</span></div>
                    <div><span className="text-gray-500">Pollution:</span> <span className="font-medium">{globalSpecs.externalCoatingRecommendation.environmentProfile?.industrialPollution || 'None'}</span></div>
                  </div>
                </div>

                <div className="bg-green-100 rounded-lg p-3">
                  <span className="font-semibold text-green-800 text-sm">Engineering Notes for Suppliers:</span>
                  <ul className="mt-2 text-xs text-green-900 space-y-1">
                    {globalSpecs.externalCoatingRecommendation.engineeringNotes.map((note: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-green-600 mt-0.5">•</span>
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="text-xs text-gray-500 italic border-t border-gray-200 pt-3">
                  <strong>Rationale:</strong> {globalSpecs.externalCoatingRecommendation.rationale}
                </div>
              </div>

              <div className="mt-3 p-2 bg-green-100 rounded text-xs text-green-800 text-center">
                <strong>This specification will be sent to suppliers for quotation.</strong>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => onUpdateGlobalSpecs({
                    ...globalSpecs,
                    externalCoatingConfirmed: false,
                    externalCoatingRecommendation: undefined,
                    externalCoatingActionLog: [
                      ...(globalSpecs?.externalCoatingActionLog || []),
                      { action: 'UNLOCKED_FOR_EDIT', timestamp: nowISO() }
                    ]
                  })}
                  className="px-4 py-2 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                  Unlock & Edit Specification
                </button>
              </div>
            </div>
          )}

          {/* MANUAL COATING FIELDS - Show when:
              1. Recommendation assistant is NOT open (!showExternalCoatingProfile), OR
              2. User has rejected the recommendation (externalCoatingRecommendationRejected)
              AND not already confirmed */}
          {(!globalSpecs?.showExternalCoatingProfile || globalSpecs?.externalCoatingRecommendationRejected) && !globalSpecs?.externalCoatingConfirmed && (
            <>
            {/* Show rejection banner only if user explicitly rejected after viewing recommendation */}
            {globalSpecs?.externalCoatingRecommendationRejected && (
              <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <h4 className="text-md font-bold text-red-800">System Recommendation Rejected</h4>
                </div>
                <p className="text-sm text-red-700 mb-3">
                  You have chosen to specify your own coating requirements instead of using the system recommendation.
                </p>
                <button
                  type="button"
                  onClick={() => onUpdateGlobalSpecs({
                    ...globalSpecs,
                    externalCoatingRecommendationRejected: false,
                    externalCoatingType: undefined,
                    showExternalCoatingProfile: true,
                    externalCoatingActionLog: [
                      ...(globalSpecs?.externalCoatingActionLog || []),
                      { action: 'REVERTED_TO_RECOMMENDATION', timestamp: nowISO() }
                    ]
                  })}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Use System Recommendation Instead
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-1">
                  External Coating Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={globalSpecs?.externalCoatingType || ''}
                  onChange={(e) => onUpdateGlobalSpecs({
                    ...globalSpecs,
                    externalCoatingType: e.target.value || undefined,
                    // Clear related fields when changing coating type
                    externalPrimerType: undefined,
                    externalPrimerMicrons: undefined,
                    externalIntermediateType: undefined,
                    externalIntermediateMicrons: undefined,
                    externalTopcoatType: undefined,
                    externalTopcoatMicrons: undefined,
                    externalPaintConfirmed: undefined,
                    externalRubberType: undefined,
                    externalRubberThickness: undefined,
                    externalRubberColour: undefined,
                    externalRubberHardness: undefined
                  })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  required
                >
                  <option value="">Select coating...</option>
                  <option value="Raw Steel">Raw Steel (No Coating)</option>
                  <option value="Paint">Paint</option>
                  <option value="Galvanized">Galvanized</option>
                  <option value="Rubber Lined">Rubber Lined</option>
                </select>
              </div>
            </div>
          </>
          )}

          {/* Confirmed Non-Paint External Coating - Only for manual selection, not recommendation */}
          {globalSpecs?.externalCoatingConfirmed && globalSpecs?.externalCoatingType && globalSpecs?.externalCoatingType !== 'Paint' && !globalSpecs?.externalCoatingRecommendation && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-green-800 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  External Coating: <span className="ml-1 text-green-700">{globalSpecs.externalCoatingType}</span>
                </h4>
                <button
                  type="button"
                  onClick={() => onUpdateGlobalSpecs({
                    ...globalSpecs,
                    externalCoatingConfirmed: false
                  })}
                  className="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
                >
                  Edit
                </button>
              </div>
            </div>
          )}

          {/* Confirm button for simple selections (not Paint or Rubber Lined) - Only for manual selection */}
          {(!globalSpecs?.showExternalCoatingProfile || globalSpecs?.externalCoatingRecommendationRejected) &&
           !globalSpecs?.externalCoatingConfirmed && globalSpecs?.externalCoatingType &&
           globalSpecs?.externalCoatingType !== 'Paint' && globalSpecs?.externalCoatingType !== 'Rubber Lined' && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => onUpdateGlobalSpecs({
                  ...globalSpecs,
                  externalCoatingConfirmed: true
                })}
                className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              >
                Confirm External Coating
              </button>
            </div>
          )}

          {/* Rubber Lined Options - Only show when selected AND not confirmed AND (assistant closed OR rejected) */}
          {(!globalSpecs?.showExternalCoatingProfile || globalSpecs?.externalCoatingRecommendationRejected) &&
           globalSpecs?.externalCoatingType === 'Rubber Lined' && !globalSpecs?.externalCoatingConfirmed && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <h4 className="text-xs font-semibold text-gray-800 mb-2">External Rubber Lining Specifications</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Rubber Type</label>
                  <select
                    value={globalSpecs?.externalRubberType || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      externalRubberType: e.target.value || undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="Natural Rubber">Natural</option>
                    <option value="Bromobutyl Rubber">Bromobutyl</option>
                    <option value="Nitrile Rubber (NBR)">Nitrile (NBR)</option>
                    <option value="Neoprene (CR)">Neoprene (CR)</option>
                    <option value="EPDM">EPDM</option>
                    <option value="Chlorobutyl">Chlorobutyl</option>
                    <option value="Hypalon (CSM)">Hypalon (CSM)</option>
                    <option value="Viton (FKM)">Viton (FKM)</option>
                    <option value="Silicone Rubber">Silicone</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Thickness (mm)</label>
                  <select
                    value={globalSpecs?.externalRubberThickness || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      externalRubberThickness: e.target.value ? Number(e.target.value) : undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                    <option value="6">6</option>
                    <option value="8">8</option>
                    <option value="10">10</option>
                    <option value="12">12</option>
                    <option value="15">15</option>
                    <option value="20">20</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Colour</label>
                  <select
                    value={globalSpecs?.externalRubberColour || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      externalRubberColour: e.target.value || undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="Black">Black</option>
                    <option value="Red">Red</option>
                    <option value="Natural (Tan)">Natural</option>
                    <option value="Grey">Grey</option>
                    <option value="Green">Green</option>
                    <option value="Blue">Blue</option>
                    <option value="White">White</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Shore Hardness</label>
                  <select
                    value={globalSpecs?.externalRubberHardness || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      externalRubberHardness: e.target.value ? Number(e.target.value) : undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="40">40 Shore A</option>
                    <option value="50">50 Shore A</option>
                    <option value="60">60 Shore A</option>
                    <option value="70">70 Shore A</option>
                  </select>
                </div>
              </div>

              {/* Rubber Lining Summary */}
              {globalSpecs?.externalRubberType && globalSpecs?.externalRubberThickness && globalSpecs?.externalRubberColour && globalSpecs?.externalRubberHardness && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-2 flex items-center justify-between">
                    <div className="text-xs text-amber-800">
                      <span className="font-medium">{globalSpecs.externalRubberType}</span> • {globalSpecs.externalRubberThickness}mm • {globalSpecs.externalRubberColour} • {globalSpecs.externalRubberHardness} Shore A
                    </div>
                    <button
                      type="button"
                      onClick={() => onUpdateGlobalSpecs({
                        ...globalSpecs,
                        externalCoatingConfirmed: true
                      })}
                      className="px-3 py-1.5 bg-green-600 text-white font-medium rounded text-xs hover:bg-green-700"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Confirmed External Rubber Lining */}
          {globalSpecs?.externalCoatingConfirmed && globalSpecs?.externalCoatingType === 'Rubber Lined' && globalSpecs?.externalRubberType && (
            <div className="bg-green-100 border border-green-400 rounded-md p-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-green-800">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">{globalSpecs.externalRubberType}</span> • {globalSpecs.externalRubberThickness}mm • {globalSpecs.externalRubberColour} • {globalSpecs.externalRubberHardness} Shore A
              </div>
              <button
                type="button"
                onClick={() => onUpdateGlobalSpecs({
                  ...globalSpecs,
                  externalCoatingConfirmed: false,
                  externalCoatingType: 'Rubber Lined'
                })}
                className="px-2 py-1 bg-gray-500 text-white font-medium rounded text-xs hover:bg-gray-600"
              >
                Edit
              </button>
            </div>
          )}

          {/* Confirmed External Paint Specification - Always visible when confirmed */}
          {globalSpecs?.externalCoatingConfirmed && globalSpecs?.externalCoatingType === 'Paint' && globalSpecs?.externalPrimerType && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="bg-green-50 border border-green-200 rounded-md p-3">
                <h4 className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  External Paint Specification (Confirmed)
                </h4>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-green-700"><span className="font-medium">Surface Prep:</span> {globalSpecs?.externalBlastingGrade || <span className="text-gray-400 italic">Not specified</span>}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-green-700"><span className="font-medium">Primer:</span> {globalSpecs.externalPrimerType}</span>
                    <span className="font-semibold text-green-800">{globalSpecs.externalPrimerMicrons} μm</span>
                  </div>

                  {globalSpecs?.externalIntermediateType && globalSpecs?.externalIntermediateMicrons && (
                    <div className="flex justify-between items-center">
                      <span className="text-green-700"><span className="font-medium">Intermediate:</span> {globalSpecs.externalIntermediateType}</span>
                      <span className="font-semibold text-green-800">{globalSpecs.externalIntermediateMicrons} μm</span>
                    </div>
                  )}

                  {globalSpecs?.externalTopcoatType && globalSpecs?.externalTopcoatMicrons && (
                    <div className="flex justify-between items-center">
                      <span className="text-green-700"><span className="font-medium">Topcoat:</span> {globalSpecs.externalTopcoatType}</span>
                      <span className="font-semibold text-green-800">{globalSpecs.externalTopcoatMicrons} μm</span>
                    </div>
                  )}

                  {globalSpecs?.externalTopcoatType && (
                    <div className="flex justify-between items-center">
                      <span className="text-green-700"><span className="font-medium">Colour:</span> {globalSpecs?.externalTopcoatColour || <span className="text-gray-400 italic">Not specified</span>}</span>
                    </div>
                  )}

                  <div className="flex gap-6 items-center">
                    <span className="text-green-700"><span className="font-medium">Band 1:</span> {globalSpecs?.externalBand1Colour || <span className="text-gray-400 italic">None</span>}</span>
                    <span className="text-green-700"><span className="font-medium">Band 2:</span> {globalSpecs?.externalBand2Colour || <span className="text-gray-400 italic">None</span>}</span>
                  </div>

                  <div className="flex justify-between items-center pt-1 mt-1 border-t border-green-300">
                    <span className="font-semibold text-green-800">Total DFT</span>
                    <span className="font-bold text-green-900">
                      {(globalSpecs.externalPrimerMicrons || 0) +
                       (globalSpecs.externalIntermediateMicrons || 0) +
                       (globalSpecs.externalTopcoatMicrons || 0)} μm
                    </span>
                  </div>
                </div>

                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      externalCoatingConfirmed: false,
                      externalPaintSpecConfirmed: false,
                      externalCoatingType: 'Paint'
                    })}
                    className="px-3 py-1.5 bg-gray-500 text-white font-semibold rounded hover:bg-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-400 text-xs flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Specification
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Paint Options - Only show when selected AND not confirmed AND (assistant closed OR rejected) */}
          {(!globalSpecs?.showExternalCoatingProfile || globalSpecs?.externalCoatingRecommendationRejected) &&
           globalSpecs?.externalCoatingType === 'Paint' && !globalSpecs?.externalCoatingConfirmed && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <h4 className="text-xs font-semibold text-gray-800 mb-2">External Paint Specifications</h4>

              {/* Surface Preparation + Primer in one row */}
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Blasting Grade</label>
                  <select
                    value={globalSpecs?.externalBlastingGrade || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      externalBlastingGrade: e.target.value || undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="SA 1 (ISO 8501-1)">SA 1 - Light</option>
                    <option value="SA 2 (ISO 8501-1)">SA 2 - Thorough</option>
                    <option value="SA 2.5 (ISO 8501-1)">SA 2.5 - Very Thorough</option>
                    <option value="SA 3 (ISO 8501-1)">SA 3 - Visually Clean</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Primer Type</label>
                  <select
                    value={globalSpecs?.externalPrimerType || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      externalPrimerType: e.target.value || undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="Inorganic Zinc Silicate">Inorganic Zinc</option>
                    <option value="Organic Zinc Epoxy">Organic Zinc Epoxy</option>
                    <option value="Zinc Phosphate Epoxy">Zinc Phosphate</option>
                    <option value="Epoxy Primer">Epoxy</option>
                    <option value="Polyurethane Primer">Polyurethane</option>
                    <option value="Red Oxide Primer">Red Oxide</option>
                    <option value="Alkyd Primer">Alkyd</option>
                    <option value="Shop Primer">Shop Primer</option>
                    <option value="Etch Primer">Etch Primer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Primer (μm)</label>
                  <input
                    type="number"
                    value={globalSpecs?.externalPrimerMicrons || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      externalPrimerMicrons: e.target.value ? Number(e.target.value) : undefined
                    })}
                    placeholder="50-75"
                    min="0"
                    max="500"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  />
                </div>
              </div>

              {/* Optional Intermediate Coat */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Intermediate Coat</label>
                  <select
                    value={globalSpecs?.externalIntermediateType || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      externalIntermediateType: e.target.value || undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">None</option>
                    <option value="MIO Epoxy (Micaceous Iron Oxide)">MIO Epoxy</option>
                    <option value="Glass Flake Epoxy">Glass Flake Epoxy</option>
                    <option value="High Build Epoxy">High Build Epoxy</option>
                    <option value="Epoxy Polyamide">Epoxy Polyamide</option>
                    <option value="Epoxy Phenalkamine">Epoxy Phenalkamine</option>
                  </select>
                </div>

                {globalSpecs?.externalIntermediateType && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-900 mb-1">Intermediate (μm)</label>
                    <input
                      type="number"
                      value={globalSpecs?.externalIntermediateMicrons || ''}
                      onChange={(e) => onUpdateGlobalSpecs({
                        ...globalSpecs,
                        externalIntermediateMicrons: e.target.value ? Number(e.target.value) : undefined
                      })}
                      placeholder="125-200"
                      min="0"
                      max="500"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                    />
                  </div>
                )}
              </div>

              {/* Topcoat / Finish Coat */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Topcoat Type</label>
                  <select
                    value={globalSpecs?.externalTopcoatType || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      externalTopcoatType: e.target.value || undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                      <option value="">None (No topcoat)</option>
                      <option value="Aliphatic Polyurethane">Aliphatic Polyurethane</option>
                      <option value="Acrylic Polyurethane">Acrylic Polyurethane</option>
                      <option value="Polysiloxane">Polysiloxane</option>
                      <option value="Epoxy Topcoat">Epoxy Topcoat</option>
                      <option value="Alkyd Topcoat">Alkyd Topcoat</option>
                      <option value="Acrylic Topcoat">Acrylic Topcoat</option>
                    </select>
                  </div>

                  {globalSpecs?.externalTopcoatType && (
                    <>
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">Topcoat (μm)</label>
                      <input
                        type="number"
                        value={globalSpecs?.externalTopcoatMicrons || ''}
                        onChange={(e) => onUpdateGlobalSpecs({
                          ...globalSpecs,
                          externalTopcoatMicrons: e.target.value ? Number(e.target.value) : undefined
                        })}
                        placeholder="50-75"
                        min="0"
                        max="500"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">Final Coat Colour</label>
                      {!globalSpecs?.showCustomColourInput ? (
                        <select
                          value={globalSpecs?.externalTopcoatColour || ''}
                          onChange={(e) => {
                            if (e.target.value === '__ADD_CUSTOM__') {
                              onUpdateGlobalSpecs({
                                ...globalSpecs,
                                showCustomColourInput: true
                              });
                            } else {
                              onUpdateGlobalSpecs({
                                ...globalSpecs,
                                externalTopcoatColour: e.target.value || undefined
                              });
                            }
                          }}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                        >
                          <option value="">Select colour...</option>
                          <optgroup label="SA Mining Standard Colours">
                            <option value="Safety Yellow (RAL 1003)">Safety Yellow (RAL 1003)</option>
                            <option value="Safety Orange (RAL 2009)">Safety Orange (RAL 2009)</option>
                            <option value="Safety Red (RAL 3001)">Safety Red (RAL 3001)</option>
                            <option value="Safety Green (RAL 6024)">Safety Green (RAL 6024)</option>
                            <option value="Signal Blue (RAL 5005)">Signal Blue (RAL 5005)</option>
                            <option value="White (RAL 9003)">White (RAL 9003)</option>
                            <option value="Black (RAL 9005)">Black (RAL 9005)</option>
                            <option value="Grey (RAL 7035)">Grey (RAL 7035)</option>
                          </optgroup>
                          <optgroup label="Pipeline Identification (SABS 0140)">
                            <option value="Water - Blue (RAL 5015)">Water - Blue (RAL 5015)</option>
                            <option value="Steam - Silver Grey (RAL 7001)">Steam - Silver Grey (RAL 7001)</option>
                            <option value="Air - Light Blue (RAL 5012)">Air - Light Blue (RAL 5012)</option>
                            <option value="Gas - Yellow Ochre (RAL 1024)">Gas - Yellow Ochre (RAL 1024)</option>
                            <option value="Acids - Orange (RAL 2000)">Acids - Orange (RAL 2000)</option>
                            <option value="Alkalis - Violet (RAL 4001)">Alkalis - Violet (RAL 4001)</option>
                            <option value="Oil - Brown (RAL 8001)">Oil - Brown (RAL 8001)</option>
                            <option value="Fire Services - Red (RAL 3000)">Fire Services - Red (RAL 3000)</option>
                            <option value="Slurry - Black (RAL 9005)">Slurry - Black (RAL 9005)</option>
                          </optgroup>
                          <optgroup label="Common Mine Colours">
                            <option value="Anglo American Blue">Anglo American Blue</option>
                            <option value="Sasol Blue">Sasol Blue</option>
                            <option value="Exxaro Green">Exxaro Green</option>
                            <option value="Harmony Gold">Harmony Gold</option>
                            <option value="Sibanye Silver">Sibanye Silver</option>
                            <option value="Impala Platinum Grey">Impala Platinum Grey</option>
                            <option value="Kumba Iron Ore Red">Kumba Iron Ore Red</option>
                          </optgroup>
                          {/* Custom colours from localStorage */}
                          {(() => {
                            try {
                              const customColours = JSON.parse(localStorage.getItem('customTopcoatColours') || '[]');
                              if (customColours.length > 0) {
                                return (
                                  <optgroup label="Custom Colours">
                                    {customColours.map((colour: string, idx: number) => (
                                      <option key={idx} value={colour}>{colour}</option>
                                    ))}
                                  </optgroup>
                                );
                              }
                            } catch (e) {
                              // Ignore localStorage errors
                            }
                            return null;
                          })()}
                          <optgroup label="Other">
                            <option value="__ADD_CUSTOM__">+ Add Custom Colour...</option>
                          </optgroup>
                        </select>
                      ) : (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={globalSpecs?.customColourInput || ''}
                            onChange={(e) => onUpdateGlobalSpecs({
                              ...globalSpecs,
                              customColourInput: e.target.value
                            })}
                            placeholder="Enter colour (e.g., Mine Blue RAL 5010)"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const newColour = globalSpecs?.customColourInput?.trim();
                                if (newColour) {
                                  // Save to localStorage
                                  try {
                                    const existing = JSON.parse(localStorage.getItem('customTopcoatColours') || '[]');
                                    if (!existing.includes(newColour)) {
                                      existing.push(newColour);
                                      localStorage.setItem('customTopcoatColours', JSON.stringify(existing));
                                    }
                                  } catch (e) {
                                    // Ignore localStorage errors
                                  }
                                  onUpdateGlobalSpecs({
                                    ...globalSpecs,
                                    externalTopcoatColour: newColour,
                                    showCustomColourInput: false,
                                    customColourInput: undefined
                                  });
                                }
                              }}
                              disabled={!globalSpecs?.customColourInput?.trim()}
                              className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Save Colour
                            </button>
                            <button
                              type="button"
                              onClick={() => onUpdateGlobalSpecs({
                                ...globalSpecs,
                                showCustomColourInput: false,
                                customColourInput: undefined
                              })}
                              className="px-3 py-2 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    </>
                  )}
                </div>

                {/* Band Colours Row */}
                {globalSpecs?.externalTopcoatType && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    {/* Band 1 Colour */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">Band 1 <span className="text-gray-400 font-normal">(Optional)</span></label>
                      {!globalSpecs?.showCustomBand1Input ? (
                        <select
                          value={globalSpecs?.externalBand1Colour || ''}
                          onChange={(e) => {
                            if (e.target.value === '__ADD_CUSTOM__') {
                              onUpdateGlobalSpecs({
                                ...globalSpecs,
                                showCustomBand1Input: true
                              });
                            } else {
                              onUpdateGlobalSpecs({
                                ...globalSpecs,
                                externalBand1Colour: e.target.value || undefined,
                                ...(e.target.value ? {} : { externalBand2Colour: undefined })
                              });
                            }
                          }}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                        >
                          <option value="">No band required</option>
                          <optgroup label="Add Your Own">
                            <option value="__ADD_CUSTOM__">+ Add Custom Band Colour...</option>
                          </optgroup>
                          {/* Custom band colours from localStorage */}
                          {(() => {
                            try {
                              const customColours = JSON.parse(localStorage.getItem('customBandColours') || '[]');
                              if (customColours.length > 0) {
                                return (
                                  <optgroup label="Saved Custom Colours">
                                    {customColours.map((colour: string, idx: number) => (
                                      <option key={idx} value={colour}>{colour}</option>
                                    ))}
                                  </optgroup>
                                );
                              }
                            } catch (e) {}
                            return null;
                          })()}
                          <optgroup label="Common Band Colours">
                            <option value="White (RAL 9003)">White (RAL 9003)</option>
                            <option value="Yellow (RAL 1023)">Yellow (RAL 1023)</option>
                            <option value="Orange (RAL 2004)">Orange (RAL 2004)</option>
                            <option value="Red (RAL 3020)">Red (RAL 3020)</option>
                            <option value="Blue (RAL 5015)">Blue (RAL 5015)</option>
                            <option value="Green (RAL 6032)">Green (RAL 6032)</option>
                            <option value="Black (RAL 9005)">Black (RAL 9005)</option>
                            <option value="Grey (RAL 7035)">Grey (RAL 7035)</option>
                          </optgroup>
                          <optgroup label="Safety & Warning Bands">
                            <option value="Safety Yellow Band">Safety Yellow Band</option>
                            <option value="Caution Orange Band">Caution Orange Band</option>
                            <option value="Danger Red Band">Danger Red Band</option>
                            <option value="Warning Black/Yellow Stripe">Warning Black/Yellow Stripe</option>
                          </optgroup>
                          <optgroup label="Pipeline Identification Bands">
                            <option value="Water Identification Blue">Water Identification Blue</option>
                            <option value="Steam Grey Band">Steam Grey Band</option>
                            <option value="Gas Yellow Band">Gas Yellow Band</option>
                            <option value="Fire Red Band">Fire Red Band</option>
                            <option value="Slurry Black Band">Slurry Black Band</option>
                          </optgroup>
                        </select>
                      ) : (
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={globalSpecs?.customBand1Input || ''}
                            onChange={(e) => onUpdateGlobalSpecs({
                              ...globalSpecs,
                              customBand1Input: e.target.value
                            })}
                            placeholder="Enter band colour"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                          />
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                const newColour = globalSpecs?.customBand1Input?.trim();
                                if (newColour) {
                                  try {
                                    const existing = JSON.parse(localStorage.getItem('customBandColours') || '[]');
                                    if (!existing.includes(newColour)) {
                                      existing.push(newColour);
                                      localStorage.setItem('customBandColours', JSON.stringify(existing));
                                    }
                                  } catch (e) {}
                                  onUpdateGlobalSpecs({
                                    ...globalSpecs,
                                    externalBand1Colour: newColour,
                                    showCustomBand1Input: false,
                                    customBand1Input: undefined
                                  });
                                }
                              }}
                              disabled={!globalSpecs?.customBand1Input?.trim()}
                              className="flex-1 px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => onUpdateGlobalSpecs({
                                ...globalSpecs,
                                showCustomBand1Input: false,
                                customBand1Input: undefined
                              })}
                              className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Band 2 Colour */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">Band 2 <span className="text-gray-400 font-normal">(Optional)</span></label>
                      {!globalSpecs?.showCustomBand2Input ? (
                        <select
                          value={globalSpecs?.externalBand2Colour || ''}
                          onChange={(e) => {
                            if (e.target.value === '__ADD_CUSTOM__') {
                              onUpdateGlobalSpecs({
                                ...globalSpecs,
                                showCustomBand2Input: true
                              });
                            } else {
                              onUpdateGlobalSpecs({
                                ...globalSpecs,
                                externalBand2Colour: e.target.value || undefined
                              });
                            }
                          }}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                          disabled={!globalSpecs?.externalBand1Colour}
                        >
                            <option value="">No second band required</option>
                            <optgroup label="Add Your Own">
                              <option value="__ADD_CUSTOM__">+ Add Custom Band Colour...</option>
                            </optgroup>
                            {/* Custom band colours from localStorage */}
                            {(() => {
                              try {
                                const customColours = JSON.parse(localStorage.getItem('customBandColours') || '[]');
                                if (customColours.length > 0) {
                                  return (
                                    <optgroup label="Saved Custom Colours">
                                      {customColours.map((colour: string, idx: number) => (
                                        <option key={idx} value={colour}>{colour}</option>
                                      ))}
                                    </optgroup>
                                  );
                                }
                              } catch (e) {}
                              return null;
                            })()}
                            <optgroup label="Common Band Colours">
                              <option value="White (RAL 9003)">White (RAL 9003)</option>
                              <option value="Yellow (RAL 1023)">Yellow (RAL 1023)</option>
                              <option value="Orange (RAL 2004)">Orange (RAL 2004)</option>
                              <option value="Red (RAL 3020)">Red (RAL 3020)</option>
                              <option value="Blue (RAL 5015)">Blue (RAL 5015)</option>
                              <option value="Green (RAL 6032)">Green (RAL 6032)</option>
                              <option value="Black (RAL 9005)">Black (RAL 9005)</option>
                              <option value="Grey (RAL 7035)">Grey (RAL 7035)</option>
                            </optgroup>
                            <optgroup label="Safety & Warning Bands">
                              <option value="Safety Yellow Band">Safety Yellow Band</option>
                              <option value="Caution Orange Band">Caution Orange Band</option>
                              <option value="Danger Red Band">Danger Red Band</option>
                              <option value="Warning Black/Yellow Stripe">Warning Black/Yellow Stripe</option>
                            </optgroup>
                            <optgroup label="Pipeline Identification Bands">
                              <option value="Water Identification Blue">Water Identification Blue</option>
                              <option value="Steam Grey Band">Steam Grey Band</option>
                              <option value="Gas Yellow Band">Gas Yellow Band</option>
                              <option value="Fire Red Band">Fire Red Band</option>
                              <option value="Slurry Black Band">Slurry Black Band</option>
                            </optgroup>
                          </select>
                        ) : (
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={globalSpecs?.customBand2Input || ''}
                              onChange={(e) => onUpdateGlobalSpecs({
                                ...globalSpecs,
                                customBand2Input: e.target.value
                              })}
                              placeholder="Enter band colour"
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                            />
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const newColour = globalSpecs?.customBand2Input?.trim();
                                  if (newColour) {
                                    try {
                                      const existing = JSON.parse(localStorage.getItem('customBandColours') || '[]');
                                      if (!existing.includes(newColour)) {
                                        existing.push(newColour);
                                        localStorage.setItem('customBandColours', JSON.stringify(existing));
                                      }
                                    } catch (e) {}
                                    onUpdateGlobalSpecs({
                                      ...globalSpecs,
                                      externalBand2Colour: newColour,
                                      showCustomBand2Input: false,
                                      customBand2Input: undefined
                                    });
                                  }
                                }}
                                disabled={!globalSpecs?.customBand2Input?.trim()}
                                className="flex-1 px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => onUpdateGlobalSpecs({
                                  ...globalSpecs,
                                  showCustomBand2Input: false,
                                  customBand2Input: undefined
                                })}
                                className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                )}

              {/* Paint Specification Summary - shows when primer is selected */}
              {globalSpecs?.externalPrimerType && globalSpecs?.externalPrimerMicrons && !globalSpecs?.externalPaintSpecConfirmed && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                    <h4 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      External Paint Specification (Review)
                    </h4>

                    <div className="space-y-1 text-xs">
                      {/* Surface Preparation / Blasting - Always show */}
                      <div className="flex justify-between items-center">
                        <span className="text-amber-700">
                          <span className="font-medium">Surface Prep:</span> {globalSpecs?.externalBlastingGrade || <span className="text-gray-400 italic">Not specified</span>}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-amber-700"><span className="font-medium">Primer:</span> {globalSpecs.externalPrimerType}</span>
                        <span className="font-semibold text-amber-800">{globalSpecs.externalPrimerMicrons} μm</span>
                      </div>

                      {globalSpecs?.externalIntermediateType && globalSpecs?.externalIntermediateMicrons && (
                        <div className="flex justify-between items-center">
                          <span className="text-amber-700"><span className="font-medium">Intermediate:</span> {globalSpecs.externalIntermediateType}</span>
                          <span className="font-semibold text-amber-800">{globalSpecs.externalIntermediateMicrons} μm</span>
                        </div>
                      )}

                      {globalSpecs?.externalTopcoatType && globalSpecs?.externalTopcoatMicrons && (
                        <div className="flex justify-between items-center">
                          <span className="text-amber-700"><span className="font-medium">Topcoat:</span> {globalSpecs.externalTopcoatType}</span>
                          <span className="font-semibold text-amber-800">{globalSpecs.externalTopcoatMicrons} μm</span>
                        </div>
                      )}

                      {globalSpecs?.externalTopcoatType && (
                        <div className="flex justify-between items-center">
                          <span className="text-amber-700"><span className="font-medium">Colour:</span> {globalSpecs?.externalTopcoatColour || <span className="text-gray-400 italic">Not specified</span>}</span>
                        </div>
                      )}

                      <div className="flex gap-6 items-center">
                        <span className="text-amber-700"><span className="font-medium">Band 1:</span> {globalSpecs?.externalBand1Colour || <span className="text-gray-400 italic">None</span>}</span>
                        <span className="text-amber-700"><span className="font-medium">Band 2:</span> {globalSpecs?.externalBand2Colour || <span className="text-gray-400 italic">None</span>}</span>
                      </div>

                      <div className="flex justify-between items-center pt-1 mt-1 border-t border-amber-300">
                        <span className="font-semibold text-amber-800">Total DFT</span>
                        <span className="font-bold text-amber-900">
                          {(globalSpecs.externalPrimerMicrons || 0) +
                           (globalSpecs.externalIntermediateMicrons || 0) +
                           (globalSpecs.externalTopcoatMicrons || 0)} μm
                        </span>
                      </div>
                    </div>

                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => onUpdateGlobalSpecs({
                          ...globalSpecs,
                          externalPaintSpecConfirmed: true,
                          externalCoatingConfirmed: true
                        })}
                        className="px-3 py-1.5 bg-green-600 text-white font-semibold rounded hover:bg-green-700 focus:outline-none focus:ring-1 focus:ring-green-500 text-xs flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Confirm & Lock
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* LOCKED Paint Specification - Green box when confirmed */}
              {globalSpecs?.externalPaintSpecConfirmed && globalSpecs?.externalPrimerType && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <h4 className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                      External Paint Specification (Confirmed)
                    </h4>

                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-green-700"><span className="font-medium">Surface Prep:</span> {globalSpecs?.externalBlastingGrade || <span className="text-gray-400 italic">Not specified</span>}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-green-700"><span className="font-medium">Primer:</span> {globalSpecs.externalPrimerType}</span>
                        <span className="font-semibold text-green-800">{globalSpecs.externalPrimerMicrons} μm</span>
                      </div>

                      {globalSpecs?.externalIntermediateType && globalSpecs?.externalIntermediateMicrons && (
                        <div className="flex justify-between items-center">
                          <span className="text-green-700"><span className="font-medium">Intermediate:</span> {globalSpecs.externalIntermediateType}</span>
                          <span className="font-semibold text-green-800">{globalSpecs.externalIntermediateMicrons} μm</span>
                        </div>
                      )}

                      {globalSpecs?.externalTopcoatType && globalSpecs?.externalTopcoatMicrons && (
                        <div className="flex justify-between items-center">
                          <span className="text-green-700"><span className="font-medium">Topcoat:</span> {globalSpecs.externalTopcoatType}</span>
                          <span className="font-semibold text-green-800">{globalSpecs.externalTopcoatMicrons} μm</span>
                        </div>
                      )}

                      {globalSpecs?.externalTopcoatType && (
                        <div className="flex justify-between items-center">
                          <span className="text-green-700"><span className="font-medium">Colour:</span> {globalSpecs?.externalTopcoatColour || <span className="text-gray-400 italic">Not specified</span>}</span>
                        </div>
                      )}

                      <div className="flex gap-6 items-center">
                        <span className="text-green-700"><span className="font-medium">Band 1:</span> {globalSpecs?.externalBand1Colour || <span className="text-gray-400 italic">None</span>}</span>
                        <span className="text-green-700"><span className="font-medium">Band 2:</span> {globalSpecs?.externalBand2Colour || <span className="text-gray-400 italic">None</span>}</span>
                      </div>

                      <div className="flex justify-between items-center pt-1 mt-1 border-t border-green-300">
                        <span className="font-semibold text-green-800">Total DFT</span>
                        <span className="font-bold text-green-900">
                          {(globalSpecs.externalPrimerMicrons || 0) +
                           (globalSpecs.externalIntermediateMicrons || 0) +
                           (globalSpecs.externalTopcoatMicrons || 0)} μm
                        </span>
                      </div>
                    </div>

                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => onUpdateGlobalSpecs({
                          ...globalSpecs,
                          externalPaintSpecConfirmed: false,
                          externalCoatingConfirmed: false
                        })}
                        className="px-3 py-1.5 bg-gray-500 text-white font-semibold rounded hover:bg-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-400 text-xs flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit Specification
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Internal Lining */}
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <h3 className="text-xs font-semibold text-gray-800 mb-2">Internal Lining</h3>

          {/* Auto-set to Galvanized when external is galvanized */}
          {globalSpecs?.externalCoatingType === 'Galvanized' && (
            <div className="bg-green-50 border-2 border-green-500 rounded-lg p-2 mb-2">
              <div className="flex items-center gap-1.5 mb-1">
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <h4 className="text-xs font-bold text-green-800">Internal: Hot-Dip Galvanized (Auto-set)</h4>
              </div>
              <div className="bg-white rounded p-2 border border-green-300">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-green-600 font-medium">Process:</span> <span className="text-green-800">ISO 1461</span></div>
                  <div><span className="text-green-600 font-medium">Thickness:</span> <span className="text-green-800">45-85 μm</span></div>
                </div>
              </div>
            </div>
          )}

          {/* Material Transfer Profile - Lining Recommendation Assistant */}
          {!globalSpecs?.internalLiningConfirmed && globalSpecs?.externalCoatingType !== 'Galvanized' && (
            <div className="mb-2">
              <button
                type="button"
                onClick={() => onUpdateGlobalSpecs({
                  ...globalSpecs,
                  showMaterialTransferProfile: !globalSpecs?.showMaterialTransferProfile
                })}
                className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-medium text-xs mb-2"
              >
                <svg className={`w-3 h-3 transition-transform ${globalSpecs?.showMaterialTransferProfile ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                {globalSpecs?.showMaterialTransferProfile ? 'Hide' : 'Show'} Lining Assistant (ASTM/ISO)
              </button>

              {globalSpecs?.showMaterialTransferProfile && (
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <h4 className="text-sm font-semibold text-indigo-900">Material Transfer Profile</h4>
                  </div>

                  {/* Material Properties */}
                  <div className="bg-white rounded-md p-2 mb-2 border border-gray-200">
                    <h5 className="text-xs font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
                      <span className="w-4 h-4 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-[10px] font-bold">1</span>
                      Material Properties
                    </h5>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Particle Size</label>
                        <select
                          value={globalSpecs?.mtpParticleSize || ""}
                          onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, mtpParticleSize: e.target.value || undefined })}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 text-gray-900"
                        >
                          <option value="">Select...</option>
                          <option value="Fine">Fine (&lt;0.5mm D50)</option>
                          <option value="Medium">Medium (0.5–2mm)</option>
                          <option value="Coarse">Coarse (2–10mm)</option>
                          <option value="VeryCoarse">Very Coarse (&gt;10mm)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Particle Shape</label>
                        <select
                          value={globalSpecs?.mtpParticleShape || ""}
                          onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, mtpParticleShape: e.target.value || undefined })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                        >
                          <option value="">Select...</option>
                          <option value="Rounded">Rounded</option>
                          <option value="SubAngular">Sub-Angular</option>
                          <option value="Angular">Angular</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Material Hardness</label>
                        <select
                          value={globalSpecs?.mtpHardnessClass || ""}
                          onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, mtpHardnessClass: e.target.value || undefined })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                        >
                          <option value="">Select...</option>
                          <option value="Low">Low (Mohs &lt;4)</option>
                          <option value="Medium">Medium (Mohs 4–6)</option>
                          <option value="High">High (Mohs &gt;6)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Silica Content</label>
                        <select
                          value={globalSpecs?.mtpSilicaContent || ""}
                          onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, mtpSilicaContent: e.target.value || undefined })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                        >
                          <option value="">Select...</option>
                          <option value="Low">Low (&lt;20%)</option>
                          <option value="Moderate">Moderate (20–50%)</option>
                          <option value="High">High (&gt;50%)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Specific Gravity</label>
                        <select
                          value={globalSpecs?.mtpSpecificGravity || ""}
                          onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, mtpSpecificGravity: e.target.value || undefined })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                        >
                          <option value="">Select...</option>
                          <option value="Light">Light (&lt;2.0)</option>
                          <option value="Medium">Medium (2.0–3.5)</option>
                          <option value="Heavy">Heavy (&gt;3.5)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Chemical Environment */}
                  <div className="bg-white rounded-md p-2 mb-2 border border-gray-200">
                    <h5 className="text-xs font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
                      <span className="w-4 h-4 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-[10px] font-bold">2</span>
                      Chemical Environment
                    </h5>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">pH Range</label>
                        <select
                          value={globalSpecs?.mtpPhRange || ""}
                          onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, mtpPhRange: e.target.value || undefined })}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 text-gray-900"
                        >
                          <option value="">Select...</option>
                          <option value="Acidic">Acidic (&lt;5)</option>
                          <option value="Neutral">Neutral (5–9)</option>
                          <option value="Alkaline">Alkaline (&gt;9)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Chloride Level</label>
                        <select
                          value={globalSpecs?.mtpChlorides || ""}
                          onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, mtpChlorides: e.target.value || undefined })}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 text-gray-900"
                        >
                          <option value="">Select...</option>
                          <option value="Low">Low (&lt;100ppm)</option>
                          <option value="Moderate">Moderate (100–500)</option>
                          <option value="High">High (&gt;500ppm)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Operating Temp</label>
                        <select
                          value={globalSpecs?.mtpTemperatureRange || ""}
                          onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, mtpTemperatureRange: e.target.value || undefined })}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 text-gray-900"
                        >
                          <option value="">Select...</option>
                          <option value="Ambient">Ambient (&lt;40°C)</option>
                          <option value="Elevated">Elevated (40–80°C)</option>
                          <option value="High">High (&gt;80°C)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Flow & Equipment */}
                  <div className="bg-white rounded-md p-2 mb-2 border border-gray-200">
                    <h5 className="text-xs font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
                      <span className="w-4 h-4 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-[10px] font-bold">3</span>
                      Flow & Equipment
                    </h5>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Flow Velocity</label>
                        <select
                          value={globalSpecs?.mtpVelocity || ""}
                          onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, mtpVelocity: e.target.value || undefined })}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 text-gray-900"
                        >
                          <option value="">Select...</option>
                          <option value="Low">Low (&lt;2 m/s)</option>
                          <option value="Medium">Medium (2–4 m/s)</option>
                          <option value="High">High (&gt;4 m/s)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Impact Angle</label>
                        <select
                          value={globalSpecs?.mtpImpactAngle || ""}
                          onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, mtpImpactAngle: e.target.value || undefined })}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 text-gray-900"
                        >
                          <option value="">Select...</option>
                          <option value="Low">Low (&lt;30°)</option>
                          <option value="Mixed">Mixed (30–60°)</option>
                          <option value="High">High (&gt;60°)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Equipment Type</label>
                        <select
                          value={globalSpecs?.mtpEquipmentType || ""}
                          onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, mtpEquipmentType: e.target.value || undefined })}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 text-gray-900"
                        >
                          <option value="">Select...</option>
                          <option value="Pipe">Pipe</option>
                          <option value="Tank">Tank</option>
                          <option value="Chute">Chute</option>
                          <option value="Hopper">Hopper</option>
                          <option value="Launder">Launder</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Solids Conc.</label>
                        <select
                          value={globalSpecs?.mtpSolidsPercent || ""}
                          onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, mtpSolidsPercent: e.target.value || undefined })}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 text-gray-900"
                        >
                          <option value="">Select...</option>
                          <option value="Low">Low (&lt;20%)</option>
                          <option value="Medium">Medium (20–40%)</option>
                          <option value="High">High (40–60%)</option>
                          <option value="VeryHigh">Very High (&gt;60%)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Impact Zones?</label>
                        <select
                          value={globalSpecs?.mtpImpactZones === true ? "true" : globalSpecs?.mtpImpactZones === false ? "false" : ""}
                          onChange={(e) => onUpdateGlobalSpecs({ ...globalSpecs, mtpImpactZones: e.target.value === "true" ? true : e.target.value === "false" ? false : undefined })}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 text-gray-900"
                        >
                          <option value="">Select...</option>
                          <option value="true">Yes (bends, drops)</option>
                          <option value="false">No (straight only)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Recommendation Display */}
                  {(() => {
                    const profile: MaterialTransferProfile = {
                      material: {
                        particleSize: globalSpecs?.mtpParticleSize as any,
                        particleShape: globalSpecs?.mtpParticleShape as any,
                        specificGravity: globalSpecs?.mtpSpecificGravity as any,
                        hardnessClass: globalSpecs?.mtpHardnessClass as any,
                        silicaContent: globalSpecs?.mtpSilicaContent as any
                      },
                      chemistry: {
                        phRange: globalSpecs?.mtpPhRange as any,
                        chlorides: globalSpecs?.mtpChlorides as any,
                        temperatureRange: globalSpecs?.mtpTemperatureRange as any
                      },
                      flow: {
                        solidsPercent: globalSpecs?.mtpSolidsPercent as any,
                        velocity: globalSpecs?.mtpVelocity as any,
                        impactAngle: globalSpecs?.mtpImpactAngle as any
                      },
                      equipment: {
                        equipmentType: globalSpecs?.mtpEquipmentType as any,
                        impactZones: globalSpecs?.mtpImpactZones
                      }
                    };

                    if (!hasCompleteProfile(profile)) {
                      return (
                        <div className="bg-gray-100 rounded-lg p-4 border border-gray-200">
                          <p className="text-sm text-gray-600 text-center">
                            Complete the required fields above to receive a lining recommendation.
                          </p>
                        </div>
                      );
                    }

                    const damage = classifyDamageMechanisms(profile);
                    const recommendation = recommendLining(profile, damage);

                    return (
                      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-4 border-2 border-emerald-300">
                        <div className="flex items-center gap-2 mb-3">
                          <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <h5 className="text-md font-bold text-emerald-900">Recommended Lining</h5>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="bg-white rounded-lg p-3 border border-emerald-200">
                            <div className="text-xs font-medium text-gray-500 mb-1">Lining Type</div>
                            <div className="text-lg font-bold text-emerald-800">{recommendation.lining}</div>
                            <div className="text-xs text-gray-600 mt-1">{recommendation.thicknessRange}</div>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-emerald-200">
                            <div className="text-xs font-medium text-gray-500 mb-1">Dominant Mechanism</div>
                            <div className="text-md font-semibold text-gray-800">{damage.dominantMechanism}</div>
                            <div className="flex gap-2 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded ${damage.abrasion === 'Severe' ? 'bg-red-100 text-red-700' : damage.abrasion === 'Moderate' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                Abrasion: {damage.abrasion}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded ${damage.impact === 'Severe' ? 'bg-red-100 text-red-700' : damage.impact === 'Moderate' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                Impact: {damage.impact}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white rounded-lg p-3 border border-emerald-200 mb-3">
                          <div className="text-xs font-medium text-gray-500 mb-1">Rationale</div>
                          <p className="text-sm text-gray-700">{recommendation.rationale}</p>
                        </div>

                        <div className="bg-white rounded-lg p-3 border border-emerald-200 mb-3">
                          <div className="text-xs font-medium text-gray-500 mb-2">Applicable Standards</div>
                          <div className="flex flex-wrap gap-2">
                            {recommendation.standardsBasis.map((std, i) => (
                              <span key={i} className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded font-medium">
                                {std}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="bg-white rounded-lg p-3 border border-emerald-200 mb-3">
                          <div className="text-xs font-medium text-gray-500 mb-2">Engineering Notes</div>
                          <ul className="text-xs text-gray-700 space-y-1">
                            {recommendation.engineeringNotes.map((note, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-emerald-500 mt-0.5">•</span>
                                {note}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <button
                          type="button"
                          onClick={() => onUpdateGlobalSpecs({
                            ...globalSpecs,
                            internalLiningType: recommendation.liningType
                          })}
                          className="w-full px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 text-sm flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Apply Recommendation: {recommendation.liningType}
                        </button>

                        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-xs text-amber-800">
                            <strong>Engineering Disclaimer:</strong> Lining recommendations are indicative and based on generalized abrasion, impact, and corrosion models aligned with ASTM and ISO test standards. They do not replace site-specific trials, operational history, or manufacturer design verification.
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Show dropdown only if no lining confirmed AND external is not galvanized */}
          {!globalSpecs?.internalLiningConfirmed && globalSpecs?.externalCoatingType !== 'Galvanized' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-1">
                  Internal Lining Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={globalSpecs?.internalLiningType || ''}
                  onChange={(e) => onUpdateGlobalSpecs({
                    ...globalSpecs,
                    internalLiningType: e.target.value || undefined,
                    // Clear related fields when changing lining type
                    internalPrimerType: undefined,
                    internalPrimerMicrons: undefined,
                    internalIntermediateType: undefined,
                    internalIntermediateMicrons: undefined,
                    internalTopcoatType: undefined,
                    internalTopcoatMicrons: undefined,
                    internalPaintConfirmed: undefined,
                    internalRubberType: undefined,
                    internalRubberThickness: undefined,
                    internalRubberColour: undefined,
                    internalRubberHardness: undefined,
                    internalCeramicType: undefined,
                    internalCeramicShape: undefined,
                    internalCeramicThickness: undefined,
                    internalHdpeMaterialGrade: undefined,
                    internalHdpePressureRating: undefined,
                    internalHdpeSdr: undefined,
                    internalHdpePipeType: undefined,
                    internalPuThickness: undefined,
                    internalPuHardness: undefined
                  })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  required
                >
                  <option value="">Select lining...</option>
                  <option value="Raw Steel">Raw Steel (No Lining)</option>
                  <option value="Paint">Paint</option>
                  <option value="Rubber Lined">Rubber Lined</option>
                  <option value="Ceramic Lined">Ceramic Lined</option>
                  <option value="HDPE Lined">HDPE Lined</option>
                  <option value="PU Lined">PU Lined</option>
                </select>
              </div>
            </div>
          )}

          {/* Confirmed Non-Paint Internal Lining - Only for simple types without specific boxes */}
          {globalSpecs?.internalLiningConfirmed && globalSpecs?.internalLiningType &&
           globalSpecs?.internalLiningType !== 'Paint' &&
           globalSpecs?.internalLiningType !== 'Rubber Lined' &&
           globalSpecs?.internalLiningType !== 'Ceramic Lined' &&
           globalSpecs?.internalLiningType !== 'HDPE Lined' &&
           globalSpecs?.internalLiningType !== 'PU Lined' && (
            <div className="bg-green-100 border border-green-400 rounded-md p-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-green-800">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">{globalSpecs.internalLiningType}</span>
              </div>
              <button
                type="button"
                onClick={() => onUpdateGlobalSpecs({
                  ...globalSpecs,
                  internalLiningConfirmed: false
                })}
                className="px-2 py-1 bg-gray-500 text-white font-medium rounded text-xs hover:bg-gray-600"
              >
                Edit
              </button>
            </div>
          )}

          {/* Confirm button for simple selections (not Paint or Rubber Lined) */}
          {!globalSpecs?.internalLiningConfirmed && globalSpecs?.internalLiningType &&
           globalSpecs?.internalLiningType !== 'Paint' && globalSpecs?.internalLiningType !== 'Rubber Lined' && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => onUpdateGlobalSpecs({
                  ...globalSpecs,
                  internalLiningConfirmed: true
                })}
                className="px-3 py-1.5 bg-green-600 text-white font-medium rounded text-xs hover:bg-green-700"
              >
                Confirm Lining
              </button>
            </div>
          )}

          {/* Rubber Lined Options - Only show when selected AND not confirmed */}
          {globalSpecs?.internalLiningType === 'Rubber Lined' && !globalSpecs?.internalLiningConfirmed && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <h4 className="text-xs font-semibold text-gray-800 mb-2">Internal Rubber Lining Specifications (SANS 1198:2013)</h4>

              {/* Row 1: SANS Type and Grade */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">SANS Type</label>
                  <select
                    value={globalSpecs?.internalRubberSansType || ''}
                    onChange={(e) => {
                      const sansType = e.target.value ? Number(e.target.value) : undefined;
                      const typeMap: Record<number, string> = {
                        1: 'Natural Rubber',
                        2: 'Bromobutyl Rubber',
                        3: 'Nitrile Rubber (NBR)',
                        4: 'Neoprene (CR)',
                        5: 'Hypalon (CSM)'
                      };
                      onUpdateGlobalSpecs({
                        ...globalSpecs,
                        internalRubberSansType: sansType,
                        internalRubberType: sansType ? typeMap[sansType] : undefined
                      });
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="1">Type 1 - NR/SBR (General purpose)</option>
                    <option value="2">Type 2 - IIR/Butyl (Chemical resistant)</option>
                    <option value="3">Type 3 - NBR/Nitrile (Oil resistant)</option>
                    <option value="4">Type 4 - CR/Neoprene (Weather resistant)</option>
                    <option value="5">Type 5 - CSM/Hypalon (Acid/ozone resistant)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Grade (Tensile Strength)</label>
                  <select
                    value={globalSpecs?.internalRubberGrade || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      internalRubberGrade: e.target.value || undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="A">Grade A - High Strength (18+ MPa)</option>
                    <option value="B">Grade B - Standard (14+ MPa)</option>
                    <option value="C">Grade C - Economy (7+ MPa)</option>
                    <option value="D">Grade D - Ebonite (Hard rubber)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Hardness Class (IRHD)</label>
                  <select
                    value={globalSpecs?.internalRubberHardness || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      internalRubberHardness: e.target.value ? Number(e.target.value) : undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="40">40 IRHD - Soft (High flexibility)</option>
                    <option value="50">50 IRHD - Medium-Soft (General)</option>
                    <option value="60">60 IRHD - Medium-Hard (Abrasion)</option>
                    <option value="70">70 IRHD - Hard (High abrasion)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Thickness (mm)</label>
                  <select
                    value={globalSpecs?.internalRubberThickness || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      internalRubberThickness: e.target.value ? Number(e.target.value) : undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="3">3mm (Min 1 ply)</option>
                    <option value="4">4mm (Min 1 ply)</option>
                    <option value="5">5mm (Min 2 plies)</option>
                    <option value="6">6mm (Min 2 plies)</option>
                    <option value="8">8mm (Min 2 plies)</option>
                    <option value="10">10mm (Min 2 plies)</option>
                    <option value="12">12mm (Min 3 plies)</option>
                    <option value="15">15mm (Min 3 plies)</option>
                    <option value="20">20mm (Min 4 plies)</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Vulcanization, Colour */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Vulcanization Method</label>
                  <select
                    value={globalSpecs?.internalRubberVulcanizationMethod || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      internalRubberVulcanizationMethod: e.target.value || undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="autoclave">Autoclave (Preferred)</option>
                    <option value="open">Open Steam</option>
                    <option value="hot_water">Hot Water</option>
                    <option value="chemical">Chemical/Self-cure</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Colour</label>
                  <select
                    value={globalSpecs?.internalRubberColour || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      internalRubberColour: e.target.value || undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="Black">Black</option>
                    <option value="Red">Red</option>
                    <option value="Natural (Tan)">Natural (Tan)</option>
                    <option value="Grey">Grey</option>
                    <option value="Green">Green</option>
                    <option value="Blue">Blue</option>
                    <option value="White">White</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Chemical Exposure</label>
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        const current = globalSpecs?.internalRubberChemicalExposure || [];
                        if (!current.includes(e.target.value)) {
                          onUpdateGlobalSpecs({
                            ...globalSpecs,
                            internalRubberChemicalExposure: [...current, e.target.value]
                          });
                        }
                      }
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Add chemical exposure...</option>
                    <option value="acids_inorganic">Inorganic Acids (H2SO4, HCl)</option>
                    <option value="acids_organic">Organic Acids (Acetic, Citric)</option>
                    <option value="alkalis">Alkalis (NaOH, KOH)</option>
                    <option value="alcohols">Alcohols</option>
                    <option value="hydrocarbons">Hydrocarbons</option>
                    <option value="oils_mineral">Mineral Oils</option>
                    <option value="oils_vegetable">Vegetable Oils</option>
                    <option value="chlorine_compounds">Chlorine Compounds</option>
                    <option value="oxidizing_agents">Oxidizing Agents</option>
                    <option value="solvents">Solvents</option>
                    <option value="water">Water</option>
                    <option value="slurry_abrasive">Abrasive Slurries</option>
                  </select>
                  {globalSpecs?.internalRubberChemicalExposure && globalSpecs.internalRubberChemicalExposure.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {globalSpecs.internalRubberChemicalExposure.map((chem: string) => (
                        <span key={chem} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                          {chem.replace(/_/g, ' ')}
                          <button
                            type="button"
                            onClick={() => onUpdateGlobalSpecs({
                              ...globalSpecs,
                              internalRubberChemicalExposure: globalSpecs.internalRubberChemicalExposure?.filter((c: string) => c !== chem)
                            })}
                            className="ml-1 text-blue-600 hover:text-blue-800"
                          >
                            x
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Row 3: Special Properties (SANS 1198 Table 4) */}
              <div className="mb-3">
                <label className="block text-xs font-semibold text-gray-900 mb-1">Special Properties (SANS 1198 Table 4)</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { value: 1, label: 'I - Heat Resistance', code: 'I' },
                    { value: 2, label: 'II - Ozone Resistance', code: 'II' },
                    { value: 3, label: 'III - Chemical Resistance', code: 'III' },
                    { value: 4, label: 'IV - Abrasion Resistance', code: 'IV' },
                    { value: 5, label: 'V - Contaminant Release', code: 'V' },
                    { value: 6, label: 'VI - Water Resistance', code: 'VI' },
                    { value: 7, label: 'VII - Oil Resistance', code: 'VII' }
                  ].map((prop) => (
                    <label key={prop.value} className="flex items-center space-x-2 text-xs text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={globalSpecs?.internalRubberSpecialProperties?.includes(prop.value) || false}
                        onChange={(e) => {
                          const current = globalSpecs?.internalRubberSpecialProperties || [];
                          const updated = e.target.checked
                            ? [...current, prop.value].sort((a, b) => a - b)
                            : current.filter((p: number) => p !== prop.value);
                          onUpdateGlobalSpecs({
                            ...globalSpecs,
                            internalRubberSpecialProperties: updated.length > 0 ? updated : undefined
                          });
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>{prop.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* SANS 1198 Line Callout Generator */}
              {globalSpecs?.internalRubberSansType && globalSpecs?.internalRubberGrade && globalSpecs?.internalRubberHardness && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-3">
                  <div className="text-xs font-semibold text-blue-900 mb-1">SANS 1198:2013 Line Call-out</div>
                  <div className="font-mono text-sm text-blue-800 bg-white px-2 py-1 rounded border border-blue-300">
                    {globalSpecs.internalRubberSansType} {globalSpecs.internalRubberGrade} {globalSpecs.internalRubberHardness}
                    {globalSpecs.internalRubberSpecialProperties && globalSpecs.internalRubberSpecialProperties.length > 0 && (
                      <span>
                        {' '}
                        {globalSpecs.internalRubberSpecialProperties.map((p: number) => `(${['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][p - 1]})`).join(' ')}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-blue-700 mt-1">
                    Type {globalSpecs.internalRubberSansType}, Grade {globalSpecs.internalRubberGrade} ({globalSpecs.internalRubberGrade === 'A' ? '18+' : globalSpecs.internalRubberGrade === 'B' ? '14+' : globalSpecs.internalRubberGrade === 'C' ? '7+' : 'Ebonite'} MPa), {globalSpecs.internalRubberHardness} IRHD
                    {globalSpecs.internalRubberSpecialProperties && globalSpecs.internalRubberSpecialProperties.length > 0 && (
                      <span> with special properties</span>
                    )}
                  </div>
                </div>
              )}

              {/* Rubber Lining Summary */}
              {globalSpecs?.internalRubberSansType && globalSpecs?.internalRubberGrade && globalSpecs?.internalRubberThickness && globalSpecs?.internalRubberHardness && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-2 flex items-center justify-between">
                    <div className="text-xs text-amber-800">
                      <span className="font-medium">Type {globalSpecs.internalRubberSansType}</span> • Grade {globalSpecs.internalRubberGrade} • {globalSpecs.internalRubberThickness}mm • {globalSpecs.internalRubberHardness} IRHD
                      {globalSpecs.internalRubberColour && <span> • {globalSpecs.internalRubberColour}</span>}
                      {globalSpecs.internalRubberVulcanizationMethod && <span> • {globalSpecs.internalRubberVulcanizationMethod}</span>}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const specialPropsRoman = (globalSpecs.internalRubberSpecialProperties || [])
                          .map((p: number) => `(${['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][p - 1]})`)
                          .join(' ');
                        const lineCallout = `${globalSpecs.internalRubberSansType} ${globalSpecs.internalRubberGrade} ${globalSpecs.internalRubberHardness}${specialPropsRoman ? ' ' + specialPropsRoman : ''}`;
                        onUpdateGlobalSpecs({
                          ...globalSpecs,
                          internalLiningConfirmed: true,
                          internalRubberLineCallout: lineCallout
                        });
                      }}
                      className="px-3 py-1.5 bg-green-600 text-white font-medium rounded text-xs hover:bg-green-700"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Confirmed Internal Rubber Lining */}
          {globalSpecs?.internalLiningConfirmed && globalSpecs?.internalLiningType === 'Rubber Lined' && (globalSpecs?.internalRubberType || globalSpecs?.internalRubberSansType) && (
            <div className="bg-green-100 border border-green-400 rounded-md p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-green-800">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">Rubber Lined (SANS 1198:2013)</span>
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateGlobalSpecs({
                    ...globalSpecs,
                    internalLiningConfirmed: false,
                    internalLiningType: 'Rubber Lined'
                  })}
                  className="px-2 py-1 bg-gray-500 text-white font-medium rounded text-xs hover:bg-gray-600"
                >
                  Edit
                </button>
              </div>
              {globalSpecs?.internalRubberLineCallout && (
                <div className="mt-2 bg-white rounded px-2 py-1 border border-green-300">
                  <div className="text-xs text-green-900">
                    <span className="font-semibold">Line Call-out:</span>{' '}
                    <span className="font-mono">{globalSpecs.internalRubberLineCallout}</span>
                  </div>
                  <div className="text-xs text-green-700 mt-1">
                    {globalSpecs.internalRubberType && <span>{globalSpecs.internalRubberType}</span>}
                    {globalSpecs.internalRubberThickness && <span> • {globalSpecs.internalRubberThickness}mm</span>}
                    {globalSpecs.internalRubberHardness && <span> • {globalSpecs.internalRubberHardness} IRHD</span>}
                    {globalSpecs.internalRubberColour && <span> • {globalSpecs.internalRubberColour}</span>}
                    {globalSpecs.internalRubberVulcanizationMethod && <span> • {globalSpecs.internalRubberVulcanizationMethod}</span>}
                  </div>
                </div>
              )}
              {!globalSpecs?.internalRubberLineCallout && (
                <div className="mt-1 text-xs text-green-700">
                  {globalSpecs.internalRubberType && <span>{globalSpecs.internalRubberType}</span>}
                  {globalSpecs.internalRubberThickness && <span> • {globalSpecs.internalRubberThickness}mm</span>}
                  {globalSpecs.internalRubberHardness && <span> • {globalSpecs.internalRubberHardness} IRHD</span>}
                  {globalSpecs.internalRubberColour && <span> • {globalSpecs.internalRubberColour}</span>}
                </div>
              )}
            </div>
          )}

          {/* Ceramic Lining Options - Only show when selected AND not confirmed */}
          {globalSpecs?.internalLiningType === 'Ceramic Lined' && !globalSpecs?.internalLiningConfirmed && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <h4 className="text-xs font-semibold text-gray-800 mb-2">Internal Ceramic Lining Specifications</h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Ceramic Type</label>
                  <select
                    value={globalSpecs?.internalCeramicType || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      internalCeramicType: e.target.value || undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="92% Alumina Ceramic Tiles">92% Alumina</option>
                    <option value="95% Alumina Ceramic Tiles">95% Alumina</option>
                    <option value="96% Alumina Ceramic Tiles">96% Alumina</option>
                    <option value="99% Alumina Ceramic Tiles">99% Alumina</option>
                    <option value="Silicon Carbide Tiles">Silicon Carbide</option>
                    <option value="Zirconia Tiles">Zirconia</option>
                    <option value="Silicon Nitride Tiles">Silicon Nitride</option>
                    <option value="Rubber Embedded Ceramic Tiles">Rubber Embedded</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Tile Shape</label>
                  <select
                    value={globalSpecs?.internalCeramicShape || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      internalCeramicShape: e.target.value || undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="Square Tile">Square</option>
                    <option value="Hexagon Tiles">Hexagon</option>
                    <option value="Triangular Tiles">Triangular</option>
                    <option value="Flat Liners">Flat Liners</option>
                    <option value="Pipe Sleeves">Pipe Sleeves</option>
                    <option value="Special Moulded Tiles">Special Moulded</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Thickness (mm)</label>
                  <select
                    value={globalSpecs?.internalCeramicThickness || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      internalCeramicThickness: e.target.value ? Number(e.target.value) : undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="6">6</option>
                    <option value="10">10</option>
                    <option value="15">15</option>
                    <option value="20">20</option>
                    <option value="25">25</option>
                    <option value="30">30</option>
                    <option value="40">40</option>
                    <option value="50">50</option>
                  </select>
                </div>
              </div>

              {/* Ceramic Lining Summary */}
              {globalSpecs?.internalCeramicType && globalSpecs?.internalCeramicShape && globalSpecs?.internalCeramicThickness && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-2 flex items-center justify-between">
                    <div className="text-xs text-amber-800">
                      <span className="font-medium">{globalSpecs.internalCeramicType}</span> • {globalSpecs.internalCeramicShape} • {globalSpecs.internalCeramicThickness}mm
                    </div>
                    <button
                      type="button"
                      onClick={() => onUpdateGlobalSpecs({
                        ...globalSpecs,
                        internalLiningConfirmed: true
                      })}
                      className="px-3 py-1.5 bg-green-600 text-white font-medium rounded text-xs hover:bg-green-700"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Confirmed Internal Ceramic Lining */}
          {globalSpecs?.internalLiningConfirmed && globalSpecs?.internalLiningType === 'Ceramic Lined' && globalSpecs?.internalCeramicType && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-green-800">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">{globalSpecs.internalCeramicType}</span> • {globalSpecs.internalCeramicShape} • {globalSpecs.internalCeramicThickness}mm
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateGlobalSpecs({
                    ...globalSpecs,
                    internalLiningConfirmed: false,
                    internalLiningType: 'Ceramic Lined'
                  })}
                  className="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
                >
                  Edit
                </button>
              </div>
            </div>
          )}

          {/* HDPE Lining Options - Only show when selected AND not confirmed */}
          {globalSpecs?.internalLiningType === 'HDPE Lined' && !globalSpecs?.internalLiningConfirmed && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <h4 className="text-xs font-semibold text-gray-800 mb-2">Internal HDPE Lining Specifications</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Material Grade</label>
                  <select
                    value={globalSpecs?.internalHdpeMaterialGrade || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      internalHdpeMaterialGrade: e.target.value || undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="PE63">PE63</option>
                    <option value="PE80">PE80</option>
                    <option value="PE100">PE100</option>
                    <option value="PE100-RC">PE100-RC</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Pressure Rating</label>
                  <select
                    value={globalSpecs?.internalHdpePressureRating || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      internalHdpePressureRating: e.target.value || undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="PN 2.5">PN 2.5</option>
                    <option value="PN 4">PN 4</option>
                    <option value="PN 6">PN 6</option>
                    <option value="PN 8">PN 8</option>
                    <option value="PN 10">PN 10</option>
                    <option value="PN 12.5">PN 12.5</option>
                    <option value="PN 16">PN 16</option>
                    <option value="PN 20">PN 20</option>
                    <option value="PN 25">PN 25</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">SDR</label>
                  <select
                    value={globalSpecs?.internalHdpeSdr || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      internalHdpeSdr: e.target.value || undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="SDR 41">SDR 41</option>
                    <option value="SDR 26">SDR 26</option>
                    <option value="SDR 17">SDR 17</option>
                    <option value="SDR 13.6">SDR 13.6</option>
                    <option value="SDR 11">SDR 11</option>
                    <option value="SDR 9">SDR 9</option>
                    <option value="SDR 7.4">SDR 7.4</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Pipe Type</label>
                  <select
                    value={globalSpecs?.internalHdpePipeType || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      internalHdpePipeType: e.target.value || undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="Solid Wall HDPE Pipe">Solid Wall</option>
                    <option value="Corrugated HDPE Pipe">Corrugated</option>
                    <option value="Slitted HDPE Pipe">Slitted</option>
                    <option value="Sleeve HDPE for Steel Lining">Sleeve for Steel</option>
                  </select>
                </div>
              </div>

              {/* HDPE Lining Summary */}
              {globalSpecs?.internalHdpeMaterialGrade && globalSpecs?.internalHdpePressureRating && globalSpecs?.internalHdpeSdr && globalSpecs?.internalHdpePipeType && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-2 flex items-center justify-between">
                    <div className="text-xs text-amber-800">
                      <span className="font-medium">{globalSpecs.internalHdpeMaterialGrade}</span> • {globalSpecs.internalHdpePressureRating} • {globalSpecs.internalHdpeSdr} • {globalSpecs.internalHdpePipeType}
                    </div>
                    <button
                      type="button"
                      onClick={() => onUpdateGlobalSpecs({
                        ...globalSpecs,
                        internalLiningConfirmed: true
                      })}
                      className="px-3 py-1.5 bg-green-600 text-white font-medium rounded text-xs hover:bg-green-700"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Confirmed Internal HDPE Lining */}
          {globalSpecs?.internalLiningConfirmed && globalSpecs?.internalLiningType === 'HDPE Lined' && globalSpecs?.internalHdpeMaterialGrade && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-green-800">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">{globalSpecs.internalHdpeMaterialGrade}</span> • {globalSpecs.internalHdpePressureRating} • {globalSpecs.internalHdpeSdr} • {globalSpecs.internalHdpePipeType}
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateGlobalSpecs({
                    ...globalSpecs,
                    internalLiningConfirmed: false,
                    internalLiningType: 'HDPE Lined'
                  })}
                  className="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
                >
                  Edit
                </button>
              </div>
            </div>
          )}

          {/* PU Lining Options - Only show when selected AND not confirmed */}
          {globalSpecs?.internalLiningType === 'PU Lined' && !globalSpecs?.internalLiningConfirmed && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <h4 className="text-xs font-semibold text-gray-800 mb-2">Internal PU Lining Specifications</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Thickness (mm)</label>
                  <select
                    value={globalSpecs?.internalPuThickness || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      internalPuThickness: e.target.value ? Number(e.target.value) : undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                    <option value="6">6</option>
                    <option value="8">8</option>
                    <option value="10">10</option>
                    <option value="12">12</option>
                    <option value="15">15</option>
                    <option value="20">20</option>
                    <option value="25">25</option>
                    <option value="30">30</option>
                    <option value="40">40</option>
                    <option value="50">50</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Shore Hardness</label>
                  <select
                    value={globalSpecs?.internalPuHardness || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      internalPuHardness: e.target.value ? Number(e.target.value) : undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="40">40 Shore A</option>
                    <option value="50">50 Shore A</option>
                    <option value="60">60 Shore A</option>
                    <option value="70">70 Shore A</option>
                    <option value="80">80 Shore A</option>
                    <option value="90">90 Shore A</option>
                  </select>
                </div>
              </div>

              {/* PU Lining Summary */}
              {globalSpecs?.internalPuThickness && globalSpecs?.internalPuHardness && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-2 flex items-center justify-between">
                    <div className="text-xs text-amber-800">
                      <span className="font-medium">PU Lining:</span> {globalSpecs.internalPuThickness}mm • {globalSpecs.internalPuHardness} Shore A
                    </div>
                    <button
                      type="button"
                      onClick={() => onUpdateGlobalSpecs({
                        ...globalSpecs,
                        internalLiningConfirmed: true
                      })}
                      className="px-3 py-1.5 bg-green-600 text-white font-medium rounded text-xs hover:bg-green-700"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Confirmed Internal PU Lining */}
          {globalSpecs?.internalLiningConfirmed && globalSpecs?.internalLiningType === 'PU Lined' && globalSpecs?.internalPuThickness && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-green-800">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">PU Lining:</span> {globalSpecs.internalPuThickness}mm • {globalSpecs.internalPuHardness} Shore A
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateGlobalSpecs({
                    ...globalSpecs,
                    internalLiningConfirmed: false,
                    internalLiningType: 'PU Lined'
                  })}
                  className="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
                >
                  Edit
                </button>
              </div>
            </div>
          )}

          {/* Confirmed Internal Paint Specification - Always visible when confirmed */}
          {globalSpecs?.internalLiningConfirmed && globalSpecs?.internalLiningType === 'Paint' && globalSpecs?.internalPrimerType && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <h4 className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Internal Paint Specification (Confirmed)
              </h4>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-green-700"><span className="font-medium">Primer:</span> {globalSpecs.internalPrimerType}</span>
                  <span className="font-semibold text-green-800">{globalSpecs.internalPrimerMicrons} μm</span>
                </div>

                {globalSpecs?.internalIntermediateType && globalSpecs?.internalIntermediateMicrons && (
                  <div className="flex justify-between items-center">
                    <span className="text-green-700"><span className="font-medium">Intermediate:</span> {globalSpecs.internalIntermediateType}</span>
                    <span className="font-semibold text-green-800">{globalSpecs.internalIntermediateMicrons} μm</span>
                  </div>
                )}

                {globalSpecs?.internalTopcoatType && globalSpecs?.internalTopcoatMicrons && (
                  <div className="flex justify-between items-center">
                    <span className="text-green-700"><span className="font-medium">Topcoat:</span> {globalSpecs.internalTopcoatType}</span>
                    <span className="font-semibold text-green-800">{globalSpecs.internalTopcoatMicrons} μm</span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-1 mt-1 border-t border-green-300">
                  <span className="font-semibold text-green-800">Total DFT</span>
                  <span className="font-bold text-green-900">
                    {(globalSpecs.internalPrimerMicrons || 0) +
                     (globalSpecs.internalIntermediateMicrons || 0) +
                     (globalSpecs.internalTopcoatMicrons || 0)} μm
                  </span>
                </div>
              </div>

              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => onUpdateGlobalSpecs({
                    ...globalSpecs,
                    internalLiningConfirmed: false,
                    internalLiningType: 'Paint'
                  })}
                  className="px-3 py-1.5 bg-gray-500 text-white font-semibold rounded hover:bg-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-400 text-xs flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Specification
                </button>
              </div>
            </div>
          )}

          {/* Paint Options - Only show when selected AND not confirmed */}
          {globalSpecs?.internalLiningType === 'Paint' && !globalSpecs?.internalLiningConfirmed && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <h4 className="text-xs font-semibold text-gray-800 mb-2">Internal Paint Specifications</h4>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Primer Type</label>
                  <select
                    value={globalSpecs?.internalPrimerType || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      internalPrimerType: e.target.value || undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="Epoxy Primer">Epoxy Primer</option>
                    <option value="Phenolic Epoxy">Phenolic Epoxy</option>
                    <option value="Novolac Epoxy">Novolac Epoxy</option>
                    <option value="Coal Tar Epoxy">Coal Tar Epoxy</option>
                    <option value="Polyurethane Primer">PU Primer</option>
                    <option value="Zinc Phosphate Epoxy">Zinc Phosphate</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Primer (μm)</label>
                  <input
                    type="number"
                    value={globalSpecs?.internalPrimerMicrons || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      internalPrimerMicrons: e.target.value ? Number(e.target.value) : undefined
                    })}
                    placeholder="50-75"
                    min="0"
                    max="500"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Intermediate</label>
                  <select
                    value={globalSpecs?.internalIntermediateType || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      internalIntermediateType: e.target.value || undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">None</option>
                    <option value="High Build Epoxy">High Build Epoxy</option>
                    <option value="Glass Flake Epoxy">Glass Flake Epoxy</option>
                    <option value="Phenolic Epoxy">Phenolic Epoxy</option>
                    <option value="Novolac Epoxy">Novolac Epoxy</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {globalSpecs?.internalIntermediateType && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-900 mb-1">Intermediate (μm)</label>
                    <input
                      type="number"
                      value={globalSpecs?.internalIntermediateMicrons || ''}
                      onChange={(e) => onUpdateGlobalSpecs({
                        ...globalSpecs,
                        internalIntermediateMicrons: e.target.value ? Number(e.target.value) : undefined
                      })}
                      placeholder="125-200"
                      min="0"
                      max="500"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Topcoat</label>
                  <select
                    value={globalSpecs?.internalTopcoatType || ''}
                    onChange={(e) => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      internalTopcoatType: e.target.value || undefined
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">None</option>
                    <option value="Epoxy Topcoat">Epoxy Topcoat</option>
                    <option value="Phenolic Epoxy">Phenolic Epoxy</option>
                    <option value="Novolac Epoxy">Novolac Epoxy</option>
                    <option value="Polyurethane">Polyurethane</option>
                  </select>
                </div>

                {globalSpecs?.internalTopcoatType && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-900 mb-1">Topcoat (μm)</label>
                    <input
                      type="number"
                      value={globalSpecs?.internalTopcoatMicrons || ''}
                      onChange={(e) => onUpdateGlobalSpecs({
                        ...globalSpecs,
                        internalTopcoatMicrons: e.target.value ? Number(e.target.value) : undefined
                      })}
                      placeholder="50-75"
                      min="0"
                      max="500"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                    />
                  </div>
                )}
              </div>

              {/* Paint Specification Summary - shows when primer is selected */}
              {globalSpecs?.internalPrimerType && globalSpecs?.internalPrimerMicrons && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-amber-800">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium">Review:</span>
                        <span>{globalSpecs.internalPrimerType} ({globalSpecs.internalPrimerMicrons}μm)</span>
                        {globalSpecs?.internalIntermediateType && globalSpecs?.internalIntermediateMicrons && (
                          <span>• {globalSpecs.internalIntermediateType} ({globalSpecs.internalIntermediateMicrons}μm)</span>
                        )}
                        {globalSpecs?.internalTopcoatType && globalSpecs?.internalTopcoatMicrons && (
                          <span>• {globalSpecs.internalTopcoatType} ({globalSpecs.internalTopcoatMicrons}μm)</span>
                        )}
                        <span className="font-semibold ml-1">= {(globalSpecs.internalPrimerMicrons || 0) + (globalSpecs.internalIntermediateMicrons || 0) + (globalSpecs.internalTopcoatMicrons || 0)}μm DFT</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onUpdateGlobalSpecs({
                          ...globalSpecs,
                          internalLiningConfirmed: true
                        })}
                        className="px-3 py-1 bg-green-600 text-white font-medium rounded text-xs hover:bg-green-700"
                      >
                        Confirm
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Fallback Edit Button for Internal Lining - Shows when confirmed but no specific type block is displaying */}
          {globalSpecs?.internalLiningConfirmed && globalSpecs?.internalLiningType &&
           globalSpecs?.externalCoatingType !== 'Galvanized' &&
           !(globalSpecs?.internalLiningType === 'Rubber Lined' && globalSpecs?.internalRubberType) &&
           !(globalSpecs?.internalLiningType === 'Ceramic Lined' && globalSpecs?.internalCeramicType) &&
           !(globalSpecs?.internalLiningType === 'HDPE Lined' && globalSpecs?.internalHdpeMaterialGrade) &&
           !(globalSpecs?.internalLiningType === 'PU Lined' && globalSpecs?.internalPuThickness) &&
           !(globalSpecs?.internalLiningType === 'Paint' && globalSpecs?.internalPrimerType) &&
           !(['None', 'Galvanized', 'Cement Mortar', 'Epoxy Lined', 'FBE Lined'].includes(globalSpecs?.internalLiningType)) && (
            <div className="bg-amber-100 border border-amber-400 rounded-md p-2 flex items-center justify-between mt-2">
              <div className="flex items-center gap-2 text-xs text-amber-800">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">{globalSpecs.internalLiningType} - Incomplete Configuration</span>
              </div>
              <button
                type="button"
                onClick={() => onUpdateGlobalSpecs({
                  ...globalSpecs,
                  internalLiningConfirmed: false
                })}
                className="px-2 py-1 bg-amber-600 text-white font-medium rounded text-xs hover:bg-amber-700"
              >
                Edit
              </button>
            </div>
          )}
        </div>

            {/* Confirm Surface Protection Button - Only show when not all confirmed */}
            {(!globalSpecs?.externalCoatingConfirmed || !globalSpecs?.internalLiningConfirmed) && (globalSpecs?.externalCoatingType || globalSpecs?.internalLiningType) && (
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => onUpdateGlobalSpecs({
                    ...globalSpecs,
                    externalCoatingConfirmed: true,
                    internalLiningConfirmed: true,
                    surfaceProtectionConfirmed: true
                  })}
                  disabled={!globalSpecs?.externalCoatingType}
                  className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm Surface Protection
                </button>
              </div>
            )}
          </div>
        )}


        {/* HDPE Pipes & Fittings Section */}
        {showHdpePipes && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
              <span className="text-2xl">🔵</span>
              <h3 className="text-xl font-bold text-gray-900">HDPE Pipes & Fittings</h3>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h4 className="text-lg font-semibold text-blue-800">Coming Soon</h4>
              </div>
              <p className="text-blue-700 text-sm">
                HDPE pipe specifications and configuration options will be available in a future update.
                This will include PE grades, SDR ratings, fusion joint specifications, and more.
              </p>
            </div>
          </div>
        )}

        {/* PVC Pipes & Fittings Section */}
        {showPvcPipes && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
              <span className="text-2xl">⚪</span>
              <h3 className="text-xl font-bold text-gray-900">PVC Pipes & Fittings</h3>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h4 className="text-lg font-semibold text-gray-800">Coming Soon</h4>
              </div>
              <p className="text-gray-700 text-sm">
                PVC pipe specifications and configuration options will be available in a future update.
                This will include PVC grades, pressure classes, joint types, and more.
              </p>
            </div>
          </div>
        )}

        {/* Nuts, Bolts, Washers & Gaskets Section */}
        {showFastenersGaskets && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
              <span className="text-2xl">⚙️</span>
              <h3 className="text-xl font-bold text-gray-900">Nuts, Bolts, Washers & Gaskets</h3>
            </div>

            {/* Confirmed Fasteners & Gaskets */}
            {globalSpecs?.fastenersConfirmed && globalSpecs?.boltGrade && globalSpecs?.gasketType && (
              <div className="bg-green-100 border border-green-400 rounded-md p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-green-800">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Bolts:</span> {globalSpecs.boltGrade} <span className="mx-2">•</span> <span className="font-medium">Gasket:</span> {globalSpecs.gasketType}
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdateGlobalSpecs({
                      ...globalSpecs,
                      fastenersConfirmed: false
                    })}
                    className="px-2 py-1 bg-gray-500 text-white font-medium rounded text-xs hover:bg-gray-600"
                  >
                    Edit
                  </button>
                </div>
              </div>
            )}

            {/* Selection UI - Only show when not confirmed */}
            {!globalSpecs?.fastenersConfirmed && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Bolt/Nut/Washer Grade Selection */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Bolt, Nut & Washer Grade
                    </label>
                    <select
                      value={globalSpecs?.boltGrade || ''}
                      onChange={(e) => onUpdateGlobalSpecs({
                        ...globalSpecs,
                        boltGrade: e.target.value || undefined
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                    >
                      <option value="">Select bolt grade...</option>
                      <optgroup label="Carbon Steel (Standard Temperature)">
                        <option value="B7/2H">ASTM A193 B7 / A194 2H (Standard, -40°C to 400°C)</option>
                        <option value="B7/2H-HDG">ASTM A193 B7 / A194 2H - Hot Dip Galvanized</option>
                        <option value="B16/4">ASTM A193 B16 / A194 4 (High Temperature, to 540°C)</option>
                      </optgroup>
                      <optgroup label="Low Temperature Service">
                        <option value="B7M/2HM">ASTM A320 B7M / A194 2HM (-100°C to 200°C)</option>
                        <option value="L7/7">ASTM A320 L7 / A194 7 (-100°C to 200°C)</option>
                        <option value="L7M/7M">ASTM A320 L7M / A194 7M (-100°C to 200°C)</option>
                        <option value="L43/7">ASTM A320 L43 / A194 7 (to -100°C)</option>
                      </optgroup>
                      <optgroup label="Stainless Steel">
                        <option value="B8/8">ASTM A193 B8 / A194 8 (304 SS)</option>
                        <option value="B8M/8M">ASTM A193 B8M / A194 8M (316 SS)</option>
                        <option value="B8C/8C">ASTM A193 B8C / A194 8C (347 SS)</option>
                        <option value="B8T/8T">ASTM A193 B8T / A194 8T (321 SS)</option>
                      </optgroup>
                      <optgroup label="High Alloy / Special">
                        <option value="B8S/8S">ASTM A193 B8S / A194 8S (Duplex 2205)</option>
                        <option value="Monel">Monel 400/K-500</option>
                        <option value="Inconel">Inconel 625/718</option>
                      </optgroup>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Grade selection affects temperature range and corrosion resistance
                    </p>
                  </div>

                  {/* Gasket Type Selection */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Gasket Type & Thickness
                    </label>
                    <select
                      value={globalSpecs?.gasketType || ''}
                      onChange={(e) => onUpdateGlobalSpecs({
                        ...globalSpecs,
                        gasketType: e.target.value || undefined
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                    >
                      <option value="">Select gasket type...</option>
                      <optgroup label="Spiral Wound (ASME B16.20)">
                        <option value="SW-CGI-316">Spiral Wound - CGI/316SS - 3.2mm (Standard)</option>
                        <option value="SW-CGI-316-IR">Spiral Wound - CGI/316SS with Inner Ring - 3.2mm</option>
                        <option value="SW-Graphite-316">Spiral Wound - Graphite/316SS - 4.5mm (High Temp)</option>
                        <option value="SW-PTFE-316">Spiral Wound - PTFE/316SS - 3.2mm (Chemical Service)</option>
                      </optgroup>
                      <optgroup label="Ring Joint (RTJ) - ASME B16.20">
                        <option value="RTJ-R-SS">RTJ Ring - Soft Iron/SS 304 (R-Series)</option>
                        <option value="RTJ-RX-SS">RTJ Ring - SS 316 (RX-Series, High Pressure)</option>
                        <option value="RTJ-BX-SS">RTJ Ring - SS 316 (BX-Series, API 6A)</option>
                        <option value="RTJ-R-Inconel">RTJ Ring - Inconel 625 (High Temp/Corrosive)</option>
                      </optgroup>
                      <optgroup label="Non-Metallic">
                        <option value="PTFE-1.5">PTFE Sheet - 1.5mm (Chemical Service)</option>
                        <option value="PTFE-3.0">PTFE Sheet - 3.0mm (Chemical Service)</option>
                        <option value="Graphite-1.5">Flexible Graphite - 1.5mm (High Temp to 450°C)</option>
                        <option value="Graphite-3.0">Flexible Graphite - 3.0mm (High Temp to 450°C)</option>
                        <option value="CAF-1.5">Compressed Asbestos Free (CAF) - 1.5mm</option>
                        <option value="CAF-3.0">Compressed Asbestos Free (CAF) - 3.0mm</option>
                      </optgroup>
                      <optgroup label="Rubber/Elastomer">
                        <option value="EPDM-3.0">EPDM Rubber - 3.0mm (Water/Steam)</option>
                        <option value="NBR-3.0">Nitrile (NBR) - 3.0mm (Oil/Fuel)</option>
                        <option value="Viton-3.0">Viton (FKM) - 3.0mm (Chemical/High Temp)</option>
                        <option value="Neoprene-3.0">Neoprene - 3.0mm (General Purpose)</option>
                      </optgroup>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Select based on pressure class, temperature, and media compatibility
                    </p>
                  </div>
                </div>

                {/* Info note */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-amber-700 text-xs">
                      Bolt quantities and dimensions will be automatically calculated based on your flange selections per ASME B16.5/B16.47 standards.
                    </p>
                  </div>
                </div>

                {/* Confirm Button */}
                {globalSpecs?.boltGrade && globalSpecs?.gasketType && (
                  <div className="flex justify-end" data-field="fastenersConfirmation">
                    <button
                      type="button"
                      onClick={() => onUpdateGlobalSpecs({
                        ...globalSpecs,
                        fastenersConfirmed: true
                      })}
                      className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    >
                      Confirm Fasteners & Gaskets
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Transportation & Installation Section */}
        {showTransportInstall && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
              <span className="text-2xl">🚚</span>
              <h3 className="text-xl font-bold text-gray-900">Transportation & Installation</h3>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h4 className="text-lg font-semibold text-green-800">Coming Soon</h4>
              </div>
              <p className="text-green-700 text-sm">
                Transportation and installation specifications will be available in a future update.
                This will include delivery requirements, site logistics, installation services, and more.
              </p>
            </div>
          </div>
        )}

        {/* No Products Selected Warning */}
        {!showSteelPipes && !showFastenersGaskets && !showHdpePipes && !showPvcPipes && !showStructuralSteel && !showSurfaceProtection && !showTransportInstall && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h4 className="text-lg font-semibold text-yellow-800">No Products Selected</h4>
                <p className="text-yellow-700 text-sm mt-1">
                  Please go back to Stage 1 and select at least one product or service type to configure specifications.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Material Suitability Warning Modal */}
        {materialWarning.show && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 overflow-hidden">
              {/* Header */}
              <div className="bg-red-600 px-6 py-4">
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-white mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h3 className="text-lg font-bold text-white">Material Not Recommended</h3>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-4">
                <p className="text-gray-800 font-medium mb-3">
                  <span className="font-bold">{materialWarning.specName}</span> is not recommended for the selected operating conditions:
                </p>

                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <ul className="list-disc list-inside text-red-800 text-sm space-y-1">
                    {materialWarning.warnings.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </div>

                {materialWarning.limits && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">{materialWarning.specName}</span> limits:
                    </p>
                    <ul className="text-sm text-gray-600 mt-1">
                      <li>Temperature: {materialWarning.limits.minTempC}°C to {materialWarning.limits.maxTempC}°C</li>
                      <li>Max Pressure: {materialWarning.limits.maxPressureBar} bar</li>
                      <li>Type: {materialWarning.limits.type}</li>
                    </ul>
                  </div>
                )}

                {materialWarning.recommendation && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-blue-800">
                      <span className="font-semibold">Recommendation:</span> {materialWarning.recommendation}
                    </p>
                  </div>
                )}

                <p className="text-gray-600 text-sm">
                  Do you want to proceed with this material anyway?
                </p>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                <button
                  onClick={() => setMaterialWarning({ show: false, specName: '', specId: undefined, warnings: [] })}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium text-sm"
                >
                  Cancel - Select Different Material
                </button>
                <button
                  onClick={async () => {
                    // User chose to proceed despite warning
                    const newSpecId = materialWarning.specId;
                    let recommendedPressureClassId = globalSpecs?.flangePressureClassId;

                    if (newSpecId && globalSpecs?.flangeStandardId && globalSpecs?.workingPressureBar) {
                      const newSteelSpec = masterData.steelSpecs?.find((s: any) => s.id === newSpecId);
                      const materialGroup = getFlangeMaterialGroup(newSteelSpec?.steelSpecName);
                      recommendedPressureClassId = await fetchAndSelectPressureClass(
                        globalSpecs.flangeStandardId, globalSpecs.workingPressureBar, globalSpecs.workingTemperatureC, materialGroup
                      );
                    }

                    onUpdateGlobalSpecs({
                      ...globalSpecs,
                      steelSpecificationId: newSpecId,
                      flangePressureClassId: recommendedPressureClassId || globalSpecs?.flangePressureClassId
                    });

                    setMaterialWarning({ show: false, specName: '', specId: undefined, warnings: [] });
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm"
                >
                  Proceed Anyway
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


function deriveTemperatureCategory(tempC: number | undefined | null): string | undefined {
  if (tempC === undefined || tempC === null) return undefined;
  if (tempC < -20 || tempC > 60) {
    if (tempC >= 60 && tempC <= 120) return 'Elevated';
    if (tempC > 120 && tempC <= 200) return 'High';
    if (tempC > 200) return 'High';
    return 'Ambient';
  }
  return 'Ambient';
}
