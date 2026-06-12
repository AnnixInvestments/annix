import { memo } from "react";
import { type ISO12944SystemsByDurabilityResult } from "@/app/lib/api/client";
import { nowISO } from "@/app/lib/datetime";
import { ConfirmedLiningBadge } from "./ConfirmedLiningBadge";
import { ExternalCoatingAssistant } from "./ExternalCoatingAssistant";
import { ExternalCoatingLockedSupplierSpec } from "./ExternalCoatingLockedSupplierSpec";
import { ExternalCoatingNonPaintConfirmed } from "./ExternalCoatingNonPaintConfirmed";
import { ExternalPaintConfirmed } from "./ExternalPaintConfirmed";
import { ExternalPaintOptions } from "./ExternalPaintOptions";
import { ExternalRubberLiningOptions } from "./ExternalRubberLiningOptions";
import { InternalCeramicLiningOptions } from "./InternalCeramicLiningOptions";
import { InternalHdpeLiningOptions } from "./InternalHdpeLiningOptions";
import { InternalLiningAssistant } from "./InternalLiningAssistant";
import { InternalLiningFallbackEditBanner } from "./InternalLiningFallbackEditBanner";
import { InternalLiningGalvanizedAutoNotice } from "./InternalLiningGalvanizedAutoNotice";
import { InternalPaintConfirmed } from "./InternalPaintConfirmed";
import { InternalPaintOptions } from "./InternalPaintOptions";
import { InternalPuLiningOptions } from "./InternalPuLiningOptions";
import { InternalRubberLinedOptions } from "./InternalRubberLinedOptions";
import { InternalRubberLiningConfirmed } from "./InternalRubberLiningConfirmed";
import { SimpleConfirmButton } from "./SimpleConfirmButton";
import { SurfaceProtectionConfirmButton } from "./SurfaceProtectionConfirmButton";
import { SurfaceProtectionConfirmedSummary } from "./SurfaceProtectionConfirmedSummary";
import type { FeatureType } from "./types";

interface CoatingGlobalSpecs {
  externalBand1Colour?: string | null;
  externalBand2Colour?: string | null;
  externalBlastingGrade?: string | null;
  externalCoatingActionLog?: unknown[] | null;
  externalCoatingRecommendation?: Record<string, unknown> | null;
  externalCoatingRecommendationRejected?: boolean | null;
  externalIntermediateMicrons?: number | null;
  externalIntermediateType?: string | null;
  externalPrimerMicrons?: number | null;
  externalPrimerType?: string | null;
  externalRubberColour?: string | null;
  externalRubberHardness?: number | null;
  externalRubberThickness?: number | null;
  externalRubberType?: string | null;
  externalTopcoatMicrons?: number | null;
  externalTopcoatType?: string | null;
  internalCeramicShape?: string | null;
  internalCeramicThickness?: number | null;
  internalCeramicType?: string | null;
  internalHdpeMaterialGrade?: string | null;
  internalHdpePipeType?: string | null;
  internalHdpePressureRating?: string | null;
  internalHdpeSdr?: string | null;
  internalIntermediateMicrons?: number | null;
  internalIntermediateType?: string | null;
  internalLiningType?: string | null;
  internalPrimerMicrons?: number | null;
  internalPrimerType?: string | null;
  internalPuHardness?: number | null;
  internalPuThickness?: number | null;
  internalRubberChemicalExposure?: string[] | null;
  internalRubberColour?: string | null;
  internalRubberHardness?: number | null;
  internalRubberLineCallout?: string | null;
  internalRubberSansType?: number | null;
  internalRubberSpecialProperties?: number[] | null;
  internalRubberThickness?: number | null;
  internalRubberType?: string | null;
  internalRubberVulcanizationMethod?: string | null;
  internalTopcoatMicrons?: number | null;
  internalTopcoatType?: string | null;
}

interface SurfaceProtectionSectionProps {
  globalSpecs: CoatingGlobalSpecs;
  onUpdateGlobalSpecs: (specs: Record<string, unknown>) => void;
  isUnregisteredCustomer: boolean;
  showFeatureRestrictionPopup: (feature: FeatureType) => (e: React.MouseEvent) => void;
  gsExternalCoatingConfirmed: boolean | null;
  gsExternalCoatingType: string | null;
  gsInternalLiningConfirmed: boolean | null;
  gsShowExternalCoatingProfile: boolean;
  gsShowMaterialTransferProfile: boolean;
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
  iso12944Loading: boolean;
  iso12944Systems: ISO12944SystemsByDurabilityResult | null;
  selectedIso12944System: ISO12944SystemsByDurabilityResult["recommended"] | undefined;
  selectedIso12944SystemCode: string | null;
  setSelectedIso12944SystemCode: (code: string | null) => void;
  rawCoating: string | null;
  rawEcpServiceLife: string | null;
  rawEcpSoilMoisture: string | null;
  rawEcpSoilResistivity: string | null;
  rawEcpSoilType: string | null;
  rawExternalBand1Colour: string | null;
  rawExternalBand2Colour: string | null;
  rawExternalBlastingGrade: string | null;
  rawExternalCoatingConfirmed: boolean | null;
  rawExternalCoatingRecommendation: unknown;
  rawExternalCoatingType: string | null;
  rawExternalCoatingType2: string | null;
  rawExternalRubberColour: string | null;
  rawExternalRubberHardness: number | null;
  rawExternalRubberThickness: number | null;
  rawExternalRubberType: string | null;
  rawExternalTopcoatColour: string | null;
  rawExternalTopcoatColour2: string | null;
  rawIndustrialPollution2: string | null;
  rawInstallationType: string | null;
  rawInternalCeramicShape: string | null;
  rawInternalCeramicThickness: number | null;
  rawInternalCeramicType: string | null;
  rawInternalHdpeMaterialGrade: string | null;
  rawInternalHdpePipeType: string | null;
  rawInternalHdpePressureRating: string | null;
  rawInternalHdpeSdr: string | null;
  rawInternalIntermediateMicrons2: number | null;
  rawInternalIntermediateType: string | null;
  rawInternalLiningConfirmed: boolean | null;
  rawInternalLiningType: string | null;
  rawInternalLiningType2: string | null;
  rawInternalPrimerMicrons2: number | null;
  rawInternalPrimerType: string | null;
  rawInternalPuHardness: number | null;
  rawInternalPuThickness: number | null;
  rawInternalRubberColour: string | null;
  rawInternalRubberGrade: string | null;
  rawInternalRubberHardness: number | null;
  rawInternalRubberSansType: number | null;
  rawInternalRubberThickness: number | null;
  rawInternalRubberType: string | null;
  rawInternalRubberVulcanizationMethod: string | null;
  rawInternalTopcoatMicrons2: number | null;
  rawInternalTopcoatType: string | null;
  rawIso12944Category2: string | null;
  rawMarineInfluence2: string | null;
  rawMechanicalRisk: string | null;
  rawServiceLife: string | null;
  rawSurfaceProtectionConfirmed: boolean | null;
  rawTemperature: string | null;
  rawUvExposure: string | null;
}

const SurfaceProtectionSectionInner = (props: SurfaceProtectionSectionProps) => {
  const globalSpecs = props.globalSpecs;
  const onUpdateGlobalSpecs = props.onUpdateGlobalSpecs;
  const isUnregisteredCustomer = props.isUnregisteredCustomer;
  const showFeatureRestrictionPopup = props.showFeatureRestrictionPopup;
  const gsExternalCoatingConfirmed = props.gsExternalCoatingConfirmed;
  const gsExternalCoatingType = props.gsExternalCoatingType;
  const gsInternalLiningConfirmed = props.gsInternalLiningConfirmed;
  const gsShowExternalCoatingProfile = props.gsShowExternalCoatingProfile;
  const gsShowMaterialTransferProfile = props.gsShowMaterialTransferProfile;
  const gsWorkingTemperatureC = props.gsWorkingTemperatureC;
  const effectiveEcpTemperature = props.effectiveEcpTemperature;
  const effectiveIndustrialPollution = props.effectiveIndustrialPollution;
  const effectiveInstallationType = props.effectiveInstallationType;
  const effectiveIso12944 = props.effectiveIso12944;
  const effectiveMarineInfluence = props.effectiveMarineInfluence;
  const effectiveMechanicalRisk = props.effectiveMechanicalRisk;
  const effectiveUvExposure = props.effectiveUvExposure;
  const isEcpTemperatureAutoFilled = props.isEcpTemperatureAutoFilled;
  const isIndustrialPollutionAutoFilled = props.isIndustrialPollutionAutoFilled;
  const isInstallationTypeAutoFilled = props.isInstallationTypeAutoFilled;
  const isIso12944AutoFilled = props.isIso12944AutoFilled;
  const isMarineInfluenceAutoFilled = props.isMarineInfluenceAutoFilled;
  const isMechanicalRiskAutoFilled = props.isMechanicalRiskAutoFilled;
  const isUvExposureAutoFilled = props.isUvExposureAutoFilled;
  const iso12944Loading = props.iso12944Loading;
  const iso12944Systems = props.iso12944Systems;
  const selectedIso12944System = props.selectedIso12944System;
  const selectedIso12944SystemCode = props.selectedIso12944SystemCode;
  const setSelectedIso12944SystemCode = props.setSelectedIso12944SystemCode;
  const rawCoating = props.rawCoating;
  const rawEcpServiceLife = props.rawEcpServiceLife;
  const rawEcpSoilMoisture = props.rawEcpSoilMoisture;
  const rawEcpSoilResistivity = props.rawEcpSoilResistivity;
  const rawEcpSoilType = props.rawEcpSoilType;
  const rawExternalBand1Colour = props.rawExternalBand1Colour;
  const rawExternalBand2Colour = props.rawExternalBand2Colour;
  const rawExternalBlastingGrade = props.rawExternalBlastingGrade;
  const rawExternalCoatingConfirmed = props.rawExternalCoatingConfirmed;
  const rawExternalCoatingRecommendation = props.rawExternalCoatingRecommendation;
  const rawExternalCoatingType = props.rawExternalCoatingType;
  const rawExternalCoatingType2 = props.rawExternalCoatingType2;
  const rawExternalRubberColour = props.rawExternalRubberColour;
  const rawExternalRubberHardness = props.rawExternalRubberHardness;
  const rawExternalRubberThickness = props.rawExternalRubberThickness;
  const rawExternalRubberType = props.rawExternalRubberType;
  const rawExternalTopcoatColour = props.rawExternalTopcoatColour;
  const rawExternalTopcoatColour2 = props.rawExternalTopcoatColour2;
  const rawIndustrialPollution2 = props.rawIndustrialPollution2;
  const rawInstallationType = props.rawInstallationType;
  const rawInternalCeramicShape = props.rawInternalCeramicShape;
  const rawInternalCeramicThickness = props.rawInternalCeramicThickness;
  const rawInternalCeramicType = props.rawInternalCeramicType;
  const rawInternalHdpeMaterialGrade = props.rawInternalHdpeMaterialGrade;
  const rawInternalHdpePipeType = props.rawInternalHdpePipeType;
  const rawInternalHdpePressureRating = props.rawInternalHdpePressureRating;
  const rawInternalHdpeSdr = props.rawInternalHdpeSdr;
  const rawInternalIntermediateMicrons2 = props.rawInternalIntermediateMicrons2;
  const rawInternalIntermediateType = props.rawInternalIntermediateType;
  const rawInternalLiningConfirmed = props.rawInternalLiningConfirmed;
  const rawInternalLiningType = props.rawInternalLiningType;
  const rawInternalLiningType2 = props.rawInternalLiningType2;
  const rawInternalPrimerMicrons2 = props.rawInternalPrimerMicrons2;
  const rawInternalPrimerType = props.rawInternalPrimerType;
  const rawInternalPuHardness = props.rawInternalPuHardness;
  const rawInternalPuThickness = props.rawInternalPuThickness;
  const rawInternalRubberColour = props.rawInternalRubberColour;
  const rawInternalRubberGrade = props.rawInternalRubberGrade;
  const rawInternalRubberHardness = props.rawInternalRubberHardness;
  const rawInternalRubberSansType = props.rawInternalRubberSansType;
  const rawInternalRubberThickness = props.rawInternalRubberThickness;
  const rawInternalRubberType = props.rawInternalRubberType;
  const rawInternalRubberVulcanizationMethod = props.rawInternalRubberVulcanizationMethod;
  const rawInternalTopcoatMicrons2 = props.rawInternalTopcoatMicrons2;
  const rawInternalTopcoatType = props.rawInternalTopcoatType;
  const rawIso12944Category2 = props.rawIso12944Category2;
  const rawMarineInfluence2 = props.rawMarineInfluence2;
  const rawMechanicalRisk = props.rawMechanicalRisk;
  const rawServiceLife = props.rawServiceLife;
  const rawSurfaceProtectionConfirmed = props.rawSurfaceProtectionConfirmed;
  const rawTemperature = props.rawTemperature;
  const rawUvExposure = props.rawUvExposure;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
        <span className="text-2xl">🛡️</span>
        <h3 className="text-xl font-bold text-gray-900">Surface Protection</h3>
      </div>

      {(rawSurfaceProtectionConfirmed || gsExternalCoatingConfirmed || gsInternalLiningConfirmed) &&
        (rawExternalCoatingRecommendation ||
          gsExternalCoatingType ||
          globalSpecs?.internalLiningType) && (
          <SurfaceProtectionConfirmedSummary
            hasExternal={
              !!rawExternalCoatingConfirmed ||
              !!gsExternalCoatingType ||
              !!globalSpecs?.externalCoatingRecommendation
            }
            hasInternal={!!rawInternalLiningConfirmed || !!globalSpecs?.internalLiningType}
            externalCoatingLabel={rawCoating || gsExternalCoatingType || "N/A"}
            internalLiningLabel={rawInternalLiningType || "N/A"}
            internalRubberType={globalSpecs?.internalRubberType}
            onEdit={() =>
              onUpdateGlobalSpecs({
                ...globalSpecs,
                externalCoatingConfirmed: false,
                internalLiningConfirmed: false,
                surfaceProtectionConfirmed: false,
              })
            }
          />
        )}

      {/* External Coating */}
      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <h3 className="text-xs font-semibold text-gray-800 mb-2">External Coating</h3>

        {/* External Environment Profile - Coating Recommendation Assistant */}
        {!gsExternalCoatingConfirmed && (
          <ExternalCoatingAssistant
            globalSpecs={globalSpecs as never}
            onUpdateGlobalSpecs={onUpdateGlobalSpecs}
            isUnregisteredCustomer={isUnregisteredCustomer}
            showFeatureRestrictionPopup={showFeatureRestrictionPopup}
            gsShowExternalCoatingProfile={gsShowExternalCoatingProfile}
            gsWorkingTemperatureC={gsWorkingTemperatureC}
            effectiveEcpTemperature={effectiveEcpTemperature}
            effectiveIndustrialPollution={effectiveIndustrialPollution}
            effectiveInstallationType={effectiveInstallationType}
            effectiveIso12944={effectiveIso12944}
            effectiveMarineInfluence={effectiveMarineInfluence}
            effectiveMechanicalRisk={effectiveMechanicalRisk}
            effectiveUvExposure={effectiveUvExposure}
            isEcpTemperatureAutoFilled={isEcpTemperatureAutoFilled}
            isIndustrialPollutionAutoFilled={isIndustrialPollutionAutoFilled}
            isInstallationTypeAutoFilled={isInstallationTypeAutoFilled}
            isIso12944AutoFilled={isIso12944AutoFilled}
            isMarineInfluenceAutoFilled={isMarineInfluenceAutoFilled}
            isMechanicalRiskAutoFilled={isMechanicalRiskAutoFilled}
            isUvExposureAutoFilled={isUvExposureAutoFilled}
            iso12944Systems={iso12944Systems}
            iso12944Loading={iso12944Loading}
            selectedIso12944System={selectedIso12944System}
            selectedIso12944SystemCode={selectedIso12944SystemCode}
            setSelectedIso12944SystemCode={setSelectedIso12944SystemCode}
            rawEcpServiceLife={rawEcpServiceLife}
            rawEcpSoilMoisture={rawEcpSoilMoisture}
            rawEcpSoilResistivity={rawEcpSoilResistivity}
            rawEcpSoilType={rawEcpSoilType}
          />
        )}

        {gsExternalCoatingConfirmed && globalSpecs?.externalCoatingRecommendation && (
          <ExternalCoatingLockedSupplierSpec
            recommendation={globalSpecs.externalCoatingRecommendation as never}
            blastingGrade={globalSpecs?.externalBlastingGrade}
            topcoatColour={rawExternalTopcoatColour}
            band1Colour={globalSpecs?.externalBand1Colour}
            band2Colour={globalSpecs?.externalBand2Colour}
            installationType={rawInstallationType}
            iso12944Category={rawIso12944Category2}
            marineInfluence={rawMarineInfluence2}
            uvExposure={rawUvExposure}
            temperature={rawTemperature}
            serviceLife={rawServiceLife}
            mechanicalRisk={rawMechanicalRisk}
            industrialPollution={rawIndustrialPollution2}
            onUnlock={() => {
              const rawExternalCoatingActionLog3 = globalSpecs?.externalCoatingActionLog;
              onUpdateGlobalSpecs({
                ...globalSpecs,
                externalCoatingConfirmed: false,
                externalCoatingRecommendation: null,
                externalCoatingActionLog: [
                  ...(rawExternalCoatingActionLog3 || []),
                  { action: "UNLOCKED_FOR_EDIT", timestamp: nowISO() },
                ],
              });
            }}
          />
        )}

        {/* MANUAL COATING FIELDS - Show when:
              1. Recommendation assistant is NOT open (!showExternalCoatingProfile), OR
              2. User has rejected the recommendation (externalCoatingRecommendationRejected)
              AND not already confirmed */}
        {(!gsShowExternalCoatingProfile || globalSpecs?.externalCoatingRecommendationRejected) &&
          !gsExternalCoatingConfirmed && (
            <>
              {/* Show rejection banner only if user explicitly rejected after viewing recommendation */}
              {globalSpecs?.externalCoatingRecommendationRejected && (
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <h4 className="text-md font-bold text-red-800">
                      System Recommendation Rejected
                    </h4>
                  </div>
                  <p className="text-sm text-red-700 mb-3">
                    You have chosen to specify your own coating requirements instead of using the
                    system recommendation.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const rawExternalCoatingActionLog4 = globalSpecs?.externalCoatingActionLog;

                      return onUpdateGlobalSpecs({
                        ...globalSpecs,
                        externalCoatingRecommendationRejected: false,
                        externalCoatingType: null,
                        showExternalCoatingProfile: true,
                        externalCoatingActionLog: [
                          ...(rawExternalCoatingActionLog4 || []),
                          { action: "REVERTED_TO_RECOMMENDATION", timestamp: nowISO() },
                        ],
                      });
                    }}
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
                    value={rawExternalCoatingType || ""}
                    onChange={(e) => {
                      const rawValue17 = e.target.value;

                      return onUpdateGlobalSpecs({
                        ...globalSpecs,
                        externalCoatingType: rawValue17 || null,
                        // Clear related fields when changing coating type
                        externalPrimerType: null,
                        externalPrimerMicrons: null,
                        externalIntermediateType: null,
                        externalIntermediateMicrons: null,
                        externalTopcoatType: null,
                        externalTopcoatMicrons: null,
                        externalPaintConfirmed: null,
                        externalRubberType: null,
                        externalRubberThickness: null,
                        externalRubberColour: null,
                        externalRubberHardness: null,
                      });
                    }}
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

        {gsExternalCoatingConfirmed &&
          gsExternalCoatingType &&
          gsExternalCoatingType !== "Paint" &&
          !globalSpecs?.externalCoatingRecommendation && (
            <ExternalCoatingNonPaintConfirmed
              coatingType={gsExternalCoatingType}
              onEdit={() =>
                onUpdateGlobalSpecs({
                  ...globalSpecs,
                  externalCoatingConfirmed: false,
                })
              }
            />
          )}

        {(!gsShowExternalCoatingProfile || globalSpecs?.externalCoatingRecommendationRejected) &&
          !gsExternalCoatingConfirmed &&
          gsExternalCoatingType &&
          gsExternalCoatingType !== "Paint" &&
          gsExternalCoatingType !== "Rubber Lined" && (
            <SimpleConfirmButton
              label="Confirm External Coating"
              onConfirm={() =>
                onUpdateGlobalSpecs({
                  ...globalSpecs,
                  externalCoatingConfirmed: true,
                })
              }
            />
          )}

        {(!gsShowExternalCoatingProfile || globalSpecs?.externalCoatingRecommendationRejected) &&
          gsExternalCoatingType === "Rubber Lined" &&
          !gsExternalCoatingConfirmed && (
            <ExternalRubberLiningOptions
              rubberType={rawExternalRubberType}
              rubberThickness={rawExternalRubberThickness}
              rubberColour={rawExternalRubberColour}
              rubberHardness={rawExternalRubberHardness}
              globalSpecs={globalSpecs as never}
              onUpdateGlobalSpecs={onUpdateGlobalSpecs}
            />
          )}

        {gsExternalCoatingConfirmed &&
          gsExternalCoatingType === "Rubber Lined" &&
          globalSpecs?.externalRubberType && (
            <ConfirmedLiningBadge
              tone="intense"
              content={
                <>
                  <span className="font-medium">{globalSpecs.externalRubberType}</span> •{" "}
                  {globalSpecs.externalRubberThickness}mm • {globalSpecs.externalRubberColour} •{" "}
                  {globalSpecs.externalRubberHardness} Shore A
                </>
              }
              onEdit={() =>
                onUpdateGlobalSpecs({
                  ...globalSpecs,
                  externalCoatingConfirmed: false,
                  externalCoatingType: "Rubber Lined",
                })
              }
            />
          )}

        {gsExternalCoatingConfirmed &&
          gsExternalCoatingType === "Paint" &&
          globalSpecs?.externalPrimerType && (
            <ExternalPaintConfirmed
              blastingGrade={rawExternalBlastingGrade}
              primerType={globalSpecs.externalPrimerType}
              primerMicrons={globalSpecs.externalPrimerMicrons as number}
              intermediateType={globalSpecs?.externalIntermediateType}
              intermediateMicrons={globalSpecs?.externalIntermediateMicrons}
              topcoatType={globalSpecs?.externalTopcoatType}
              topcoatMicrons={globalSpecs?.externalTopcoatMicrons}
              topcoatColour={rawExternalTopcoatColour2}
              band1Colour={rawExternalBand1Colour}
              band2Colour={rawExternalBand2Colour}
              onEdit={() =>
                onUpdateGlobalSpecs({
                  ...globalSpecs,
                  externalCoatingConfirmed: false,
                  externalPaintSpecConfirmed: false,
                  externalCoatingType: "Paint",
                })
              }
            />
          )}

        {/* Paint Options - Only show when selected AND not confirmed AND (assistant closed OR rejected) */}
        {(!gsShowExternalCoatingProfile || globalSpecs?.externalCoatingRecommendationRejected) &&
          gsExternalCoatingType === "Paint" &&
          !gsExternalCoatingConfirmed && (
            <ExternalPaintOptions
              globalSpecs={globalSpecs as never}
              onUpdateGlobalSpecs={onUpdateGlobalSpecs}
            />
          )}
      </div>

      {/* Internal Lining */}
      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <h3 className="text-xs font-semibold text-gray-800 mb-2">Internal Lining</h3>

        {gsExternalCoatingType === "Galvanized" && <InternalLiningGalvanizedAutoNotice />}

        {/* Material Transfer Profile - Lining Recommendation Assistant */}
        {!gsInternalLiningConfirmed && gsExternalCoatingType !== "Galvanized" && (
          <InternalLiningAssistant
            globalSpecs={globalSpecs as never}
            onUpdateGlobalSpecs={onUpdateGlobalSpecs}
            isUnregisteredCustomer={isUnregisteredCustomer}
            showMaterialTransferProfile={gsShowMaterialTransferProfile}
            showFeatureRestrictionPopup={showFeatureRestrictionPopup}
          />
        )}

        {/* Show dropdown only if no lining confirmed AND external is not galvanized */}
        {!gsInternalLiningConfirmed && gsExternalCoatingType !== "Galvanized" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-1">
                Internal Lining Type <span className="text-red-500">*</span>
              </label>
              <select
                value={rawInternalLiningType2 || ""}
                onChange={(e) => {
                  const rawValue39 = e.target.value;

                  return onUpdateGlobalSpecs({
                    ...globalSpecs,
                    internalLiningType: rawValue39 || null,
                    // Clear related fields when changing lining type
                    internalPrimerType: null,
                    internalPrimerMicrons: null,
                    internalIntermediateType: null,
                    internalIntermediateMicrons: null,
                    internalTopcoatType: null,
                    internalTopcoatMicrons: null,
                    internalPaintConfirmed: null,
                    internalRubberType: null,
                    internalRubberThickness: null,
                    internalRubberColour: null,
                    internalRubberHardness: null,
                    internalCeramicType: null,
                    internalCeramicShape: null,
                    internalCeramicThickness: null,
                    internalHdpeMaterialGrade: null,
                    internalHdpePressureRating: null,
                    internalHdpeSdr: null,
                    internalHdpePipeType: null,
                    internalPuThickness: null,
                    internalPuHardness: null,
                  });
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                required
              >
                <option value="">Select lining...</option>
                <option value="Raw Steel">No Lining (Raw Steel)</option>
                <option value="Paint">Paint</option>
                <option value="Rubber Lined">Rubber Lined</option>
                <option value="Ceramic Lined">Ceramic Lined</option>
                <option value="HDPE Lined">HDPE Lined</option>
                <option value="PU Lined">PU Lined</option>
              </select>
            </div>
          </div>
        )}

        {gsInternalLiningConfirmed &&
          globalSpecs?.internalLiningType &&
          globalSpecs?.internalLiningType !== "Paint" &&
          globalSpecs?.internalLiningType !== "Rubber Lined" &&
          globalSpecs?.internalLiningType !== "Ceramic Lined" &&
          globalSpecs?.internalLiningType !== "HDPE Lined" &&
          globalSpecs?.internalLiningType !== "PU Lined" && (
            <ConfirmedLiningBadge
              tone="intense"
              content={<span className="font-medium">{globalSpecs.internalLiningType}</span>}
              onEdit={() =>
                onUpdateGlobalSpecs({
                  ...globalSpecs,
                  internalLiningConfirmed: false,
                })
              }
            />
          )}

        {!gsInternalLiningConfirmed &&
          globalSpecs?.internalLiningType &&
          globalSpecs?.internalLiningType !== "Paint" &&
          globalSpecs?.internalLiningType !== "Rubber Lined" && (
            <SimpleConfirmButton
              label="Confirm Lining"
              variant="compact"
              onConfirm={() =>
                onUpdateGlobalSpecs({
                  ...globalSpecs,
                  internalLiningConfirmed: true,
                })
              }
            />
          )}

        {/* Rubber Lined Options - Only show when selected AND not confirmed */}
        {globalSpecs?.internalLiningType === "Rubber Lined" && !gsInternalLiningConfirmed && (
          <InternalRubberLinedOptions
            sansType={rawInternalRubberSansType}
            grade={rawInternalRubberGrade}
            hardness={rawInternalRubberHardness}
            thickness={rawInternalRubberThickness}
            vulcanizationMethod={rawInternalRubberVulcanizationMethod}
            colour={rawInternalRubberColour}
            chemicalExposure={globalSpecs?.internalRubberChemicalExposure}
            specialProperties={globalSpecs?.internalRubberSpecialProperties}
            globalSpecs={globalSpecs as never}
            onUpdateGlobalSpecs={onUpdateGlobalSpecs}
          />
        )}

        {gsInternalLiningConfirmed &&
          globalSpecs?.internalLiningType === "Rubber Lined" &&
          (rawInternalRubberType || globalSpecs?.internalRubberSansType) && (
            <InternalRubberLiningConfirmed
              lineCallout={globalSpecs?.internalRubberLineCallout}
              rubberType={globalSpecs?.internalRubberType}
              rubberThickness={globalSpecs?.internalRubberThickness}
              rubberHardness={globalSpecs?.internalRubberHardness}
              rubberColour={globalSpecs?.internalRubberColour}
              rubberVulcanizationMethod={globalSpecs?.internalRubberVulcanizationMethod}
              onEdit={() =>
                onUpdateGlobalSpecs({
                  ...globalSpecs,
                  internalLiningConfirmed: false,
                  internalLiningType: "Rubber Lined",
                })
              }
            />
          )}

        {globalSpecs?.internalLiningType === "Ceramic Lined" && !gsInternalLiningConfirmed && (
          <InternalCeramicLiningOptions
            ceramicType={rawInternalCeramicType}
            ceramicShape={rawInternalCeramicShape}
            ceramicThickness={rawInternalCeramicThickness}
            globalSpecs={globalSpecs as never}
            onUpdateGlobalSpecs={onUpdateGlobalSpecs}
          />
        )}

        {gsInternalLiningConfirmed &&
          globalSpecs?.internalLiningType === "Ceramic Lined" &&
          globalSpecs?.internalCeramicType && (
            <ConfirmedLiningBadge
              tone="subtle"
              editButtonClassName="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
              content={
                <>
                  <span className="font-medium">{globalSpecs.internalCeramicType}</span> •{" "}
                  {globalSpecs.internalCeramicShape} • {globalSpecs.internalCeramicThickness}
                  mm
                </>
              }
              onEdit={() =>
                onUpdateGlobalSpecs({
                  ...globalSpecs,
                  internalLiningConfirmed: false,
                  internalLiningType: "Ceramic Lined",
                })
              }
            />
          )}

        {globalSpecs?.internalLiningType === "HDPE Lined" && !gsInternalLiningConfirmed && (
          <InternalHdpeLiningOptions
            materialGrade={rawInternalHdpeMaterialGrade}
            pressureRating={rawInternalHdpePressureRating}
            sdr={rawInternalHdpeSdr}
            pipeType={rawInternalHdpePipeType}
            globalSpecs={globalSpecs as never}
            onUpdateGlobalSpecs={onUpdateGlobalSpecs}
          />
        )}

        {gsInternalLiningConfirmed &&
          globalSpecs?.internalLiningType === "HDPE Lined" &&
          globalSpecs?.internalHdpeMaterialGrade && (
            <ConfirmedLiningBadge
              tone="subtle"
              editButtonClassName="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
              content={
                <>
                  <span className="font-medium">{globalSpecs.internalHdpeMaterialGrade}</span> •{" "}
                  {globalSpecs.internalHdpePressureRating} • {globalSpecs.internalHdpeSdr} •{" "}
                  {globalSpecs.internalHdpePipeType}
                </>
              }
              onEdit={() =>
                onUpdateGlobalSpecs({
                  ...globalSpecs,
                  internalLiningConfirmed: false,
                  internalLiningType: "HDPE Lined",
                })
              }
            />
          )}

        {globalSpecs?.internalLiningType === "PU Lined" && !gsInternalLiningConfirmed && (
          <InternalPuLiningOptions
            thickness={rawInternalPuThickness}
            hardness={rawInternalPuHardness}
            globalSpecs={globalSpecs as never}
            onUpdateGlobalSpecs={onUpdateGlobalSpecs}
          />
        )}

        {gsInternalLiningConfirmed &&
          globalSpecs?.internalLiningType === "PU Lined" &&
          globalSpecs?.internalPuThickness && (
            <ConfirmedLiningBadge
              tone="subtle"
              editButtonClassName="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
              content={
                <>
                  <span className="font-medium">PU Lining:</span> {globalSpecs.internalPuThickness}
                  mm • {globalSpecs.internalPuHardness} Shore A
                </>
              }
              onEdit={() =>
                onUpdateGlobalSpecs({
                  ...globalSpecs,
                  internalLiningConfirmed: false,
                  internalLiningType: "PU Lined",
                })
              }
            />
          )}

        {gsInternalLiningConfirmed &&
          globalSpecs?.internalLiningType === "Paint" &&
          globalSpecs?.internalPrimerType && (
            <InternalPaintConfirmed
              primerType={globalSpecs.internalPrimerType}
              primerMicrons={globalSpecs.internalPrimerMicrons as number}
              intermediateType={globalSpecs?.internalIntermediateType}
              intermediateMicrons={globalSpecs?.internalIntermediateMicrons}
              topcoatType={globalSpecs?.internalTopcoatType}
              topcoatMicrons={globalSpecs?.internalTopcoatMicrons}
              onEdit={() =>
                onUpdateGlobalSpecs({
                  ...globalSpecs,
                  internalLiningConfirmed: false,
                  internalLiningType: "Paint",
                })
              }
            />
          )}

        {globalSpecs?.internalLiningType === "Paint" && !gsInternalLiningConfirmed && (
          <InternalPaintOptions
            primerType={rawInternalPrimerType}
            primerMicrons={rawInternalPrimerMicrons2}
            intermediateType={rawInternalIntermediateType}
            intermediateMicrons={rawInternalIntermediateMicrons2}
            topcoatType={rawInternalTopcoatType}
            topcoatMicrons={rawInternalTopcoatMicrons2}
            globalSpecs={globalSpecs as never}
            onUpdateGlobalSpecs={onUpdateGlobalSpecs}
          />
        )}

        {gsInternalLiningConfirmed &&
          globalSpecs?.internalLiningType &&
          gsExternalCoatingType !== "Galvanized" &&
          !(
            globalSpecs?.internalLiningType === "Rubber Lined" && globalSpecs?.internalRubberType
          ) &&
          !(
            globalSpecs?.internalLiningType === "Ceramic Lined" && globalSpecs?.internalCeramicType
          ) &&
          !(
            globalSpecs?.internalLiningType === "HDPE Lined" &&
            globalSpecs?.internalHdpeMaterialGrade
          ) &&
          !(globalSpecs?.internalLiningType === "PU Lined" && globalSpecs?.internalPuThickness) &&
          !(globalSpecs?.internalLiningType === "Paint" && globalSpecs?.internalPrimerType) &&
          !["None", "Galvanized", "Cement Mortar", "Epoxy Lined", "FBE Lined"].includes(
            globalSpecs?.internalLiningType,
          ) && (
            <InternalLiningFallbackEditBanner
              liningType={globalSpecs.internalLiningType}
              onEdit={() =>
                onUpdateGlobalSpecs({
                  ...globalSpecs,
                  internalLiningConfirmed: false,
                })
              }
            />
          )}
      </div>

      {(!gsExternalCoatingConfirmed || !gsInternalLiningConfirmed) &&
        (rawExternalCoatingType2 || globalSpecs?.internalLiningType) && (
          <SurfaceProtectionConfirmButton
            disabled={!gsExternalCoatingType}
            onConfirm={() =>
              onUpdateGlobalSpecs({
                ...globalSpecs,
                externalCoatingConfirmed: true,
                internalLiningConfirmed: true,
                surfaceProtectionConfirmed: true,
              })
            }
          />
        )}
    </div>
  );
};

export const SurfaceProtectionSection = memo(SurfaceProtectionSectionInner);
