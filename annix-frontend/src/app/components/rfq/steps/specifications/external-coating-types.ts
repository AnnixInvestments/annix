import { type ISO12944SystemsByDurabilityResult } from "@/app/lib/api/client";
import type { FeatureType } from "./types";

export interface CoatingGlobalSpecs {
  ecpCathodicProtection?: boolean;
  ecpServiceLife?: string | null;
  ecpSoilMoisture?: string | null;
  ecpSoilResistivity?: string | null;
  ecpSoilType?: string | null;
  externalCoatingActionLog?: unknown[] | null;
  recBand1Input?: string | null;
  recBand2Input?: string | null;
  recCustomColourInput?: string | null;
  recExternalBand1Colour?: string | null;
  recExternalBand2Colour?: string | null;
  recExternalTopcoatColour?: string | null;
  showRecBand1Input?: boolean;
  showRecBand2Input?: boolean;
  showRecCustomColourInput?: boolean;
}

export interface ExternalCoatingAssistantProps {
  globalSpecs: CoatingGlobalSpecs;
  onUpdateGlobalSpecs: (specs: Record<string, unknown>) => void;
  isUnregisteredCustomer: boolean;
  showFeatureRestrictionPopup: (feature: FeatureType) => (e: React.MouseEvent) => void;
  gsShowExternalCoatingProfile: boolean;
  gsWorkingTemperatureC: number | null;
  effectiveEcpTemperature: string | null;
  effectiveIndustrialPollution: string | null;
  effectiveInstallationType: string | null;
  effectiveIso12944: string | null;
  effectiveMarineInfluence: string | null;
  effectiveMechanicalRisk: string | null;
  effectiveUvExposure: string | null;
  isEcpTemperatureAutoFilled: boolean;
  isIndustrialPollutionAutoFilled: boolean;
  isInstallationTypeAutoFilled: boolean;
  isIso12944AutoFilled: boolean;
  isMarineInfluenceAutoFilled: boolean;
  isMechanicalRiskAutoFilled: boolean;
  isUvExposureAutoFilled: boolean;
  iso12944Systems: ISO12944SystemsByDurabilityResult | null;
  iso12944Loading: boolean;
  selectedIso12944System: ISO12944SystemsByDurabilityResult["recommended"] | undefined;
  selectedIso12944SystemCode: string | null;
  setSelectedIso12944SystemCode: (code: string | null) => void;
  rawEcpServiceLife: string | null;
  rawEcpSoilMoisture: string | null;
  rawEcpSoilResistivity: string | null;
  rawEcpSoilType: string | null;
}
