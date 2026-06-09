"use client";

import React, { useCallback, useEffect, useState } from "react";
import { FastenersGasketsSection } from "@/app/components/rfq/specifications/FastenersGasketsSection";
import { HdpeSpecificationsSection } from "@/app/components/rfq/specifications/HdpeSpecificationsSection";
import { MaterialSpecificationsSection } from "@/app/components/rfq/specifications/MaterialSpecificationsSection";
import { PvcSpecificationsSection } from "@/app/components/rfq/specifications/PvcSpecificationsSection";
import {
  ConfirmationWarningModal,
  MaterialWarningModal,
} from "@/app/components/rfq/specifications/SpecificationModals";
import { WorkingConditionsSection } from "@/app/components/rfq/specifications/WorkingConditionsSection";
import { getFlangeMaterialGroup } from "@/app/components/rfq/utils";
import { useOptionalAdminAuth } from "@/app/context/AdminAuthContext";
import { useOptionalCustomerAuth } from "@/app/context/CustomerAuthContext";
import {
  coatingSpecificationApi,
  type ISO12944SystemsByDurabilityResult,
  type ValidPressureClassInfo,
} from "@/app/lib/api/client";
import { WORKING_PRESSURE_BAR, WORKING_TEMPERATURE_CELSIUS } from "@/app/lib/config/rfq";
import { usePtRecommendations } from "@/app/lib/hooks/usePtRecommendations";
import { log } from "@/app/lib/logger";
import {
  checkSuitabilityFromCache,
  useAllFlangeTypes,
  useAllMaterialLimits,
} from "@/app/lib/query/hooks";
import { useRfqWizardStore } from "@/app/lib/store/rfqWizardStore";
import { AutoExtractedSpecsBanner } from "./specifications/AutoExtractedSpecsBanner";
import {
  isPressureClassMissingPTData as computePressureClassMissingPTData,
  isPressureClassUnsuitable as computePressureClassUnsuitable,
  deriveMiningUvExposure,
  derivePressureClassOverrideStatus,
  deriveTemperatureCategory,
  serviceLifeToDurability,
} from "./specifications/helpers";
import { NoProductsSelectedBanner } from "./specifications/NoProductsSelectedBanner";
import { FeatureRestrictionPopup, RestrictionPopup } from "./specifications/RestrictionPopup";
import { SteelPipesConfirmButton } from "./specifications/SteelPipesConfirmButton";
import { SteelPipesConfirmedSummary } from "./specifications/SteelPipesConfirmedSummary";
import { SurfaceProtectionSection } from "./specifications/SurfaceProtectionSection";
import { TransportInstallSection } from "./specifications/TransportInstallSection";
import type { FeatureType, RestrictionPopupPosition } from "./specifications/types";

export default function SpecificationsStep(props: {
  fetchAndSelectPressureClass: (
    standardId: number,
    workingPressureBar?: number,
    temperatureCelsius?: number,
    materialGroup?: string,
  ) => Promise<any>;
}) {
  const { fetchAndSelectPressureClass } = props;
  const rfqData = useRfqWizardStore((s) => s.rfqData) as any;
  const masterData = useRfqWizardStore((s) => s.masterData);
  const errors = useRfqWizardStore((s) => s.validationErrors);
  const availablePressureClasses = useRfqWizardStore((s) => s.availablePressureClasses);
  const onUpdateGlobalSpecs = useRfqWizardStore((s) => s.updateGlobalSpecs) as (specs: any) => void;
  const globalSpecs = rfqData.globalSpecs;
  const gsDetailedMarineInfluence = globalSpecs?.detailedMarineInfluence;
  const gsMarineInfluence = globalSpecs?.marineInfluence;
  const gsWorkingPressureBar = globalSpecs?.workingPressureBar;
  const gsWorkingTemperatureC = globalSpecs?.workingTemperatureC;
  const gsExternalCoatingConfirmed = globalSpecs?.externalCoatingConfirmed;
  const gsExternalCoatingType = globalSpecs?.externalCoatingType;
  const gsShowExternalCoatingProfile = globalSpecs?.showExternalCoatingProfile;
  const gsInternalLiningConfirmed = globalSpecs?.internalLiningConfirmed;
  const gsHdpeGrade = globalSpecs?.hdpeGrade;
  const gsHdpeSdr = globalSpecs?.hdpeSdr;
  const gsPvcType = globalSpecs?.pvcType;
  const gsPvcPressureClass = globalSpecs?.pvcPressureClass;
  const gsEcpIso12944Category = globalSpecs?.ecpIso12944Category;
  const gsEcpMarineInfluence = globalSpecs?.ecpMarineInfluence;
  const gsShowMaterialTransferProfile = globalSpecs?.showMaterialTransferProfile;
  const rawRequiredProducts = rfqData.requiredProducts;
  const requiredProducts = rawRequiredProducts || [];
  // Authentication status for restrictions
  // Don't apply restrictions while auth is still loading to prevent flash of restricted state
  const { isAuthenticated: isCustomerAuthenticated, isLoading: isCustomerAuthLoading } =
    useOptionalCustomerAuth();
  const { isAuthenticated: isAdminAuthenticated, isLoading: isAdminAuthLoading } =
    useOptionalAdminAuth();
  const isAuthLoading = isCustomerAuthLoading || isAdminAuthLoading;
  const isUnregisteredCustomer =
    !isAuthLoading && !isCustomerAuthenticated && !isAdminAuthenticated;

  // Restriction popup state
  const [restrictionPopup, setRestrictionPopup] = useState<RestrictionPopupPosition | null>(null);

  const showRestrictionPopup = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRestrictionPopup({ x: e.clientX, y: e.clientY });
  }, []);

  // Feature restriction popup state (for Coating/Lining assistants)
  const [featureRestrictionPopup, setFeatureRestrictionPopup] = useState<{
    feature: FeatureType;
    position: RestrictionPopupPosition;
  } | null>(null);

  const showFeatureRestrictionPopup = useCallback(
    (feature: FeatureType) => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setFeatureRestrictionPopup({ feature, position: { x: e.clientX, y: e.clientY } });
    },
    [],
  );

  // Check which product types are selected
  const showSteelPipes = requiredProducts.includes("fabricated_steel");
  const showFastenersGaskets = requiredProducts.includes("fasteners_gaskets");
  const showHdpePipes = requiredProducts.includes("hdpe");
  const showPvcPipes = requiredProducts.includes("pvc");
  const showStructuralSteel = requiredProducts.includes("structural_steel");
  const showSurfaceProtection = requiredProducts.includes("surface_protection");
  const showTransportInstall = requiredProducts.includes("transport_install");
  const workingPressures = WORKING_PRESSURE_BAR;
  const workingTemperatures = WORKING_TEMPERATURE_CELSIUS;

  // Material suitability warning modal state
  const { data: allLimits } = useAllMaterialLimits();
  const { data: allFlangeTypes = [] } = useAllFlangeTypes();

  const [materialWarning, setMaterialWarning] = useState<{
    show: boolean;
    specName: string;
    specId: number | null;
    warnings: string[];
    recommendation?: string;
    limits?: {
      minTempC: number;
      maxTempC: number;
      maxPressureBar: number;
      type: string;
      notes?: string;
    } | null;
  }>({ show: false, specName: "", specId: null, warnings: [] });

  // Confirmation warning popup state (shows when specs have issues but user tries to confirm)
  const [confirmationWarning, setConfirmationWarning] = useState<{
    show: boolean;
    warnings: string[];
  }>({ show: false, warnings: [] });

  // ISO 12944-5 paint system state
  const [iso12944Systems, setIso12944Systems] = useState<ISO12944SystemsByDurabilityResult | null>(
    null,
  );
  const [iso12944Loading, setIso12944Loading] = useState(false);
  const [selectedIso12944SystemCode, setSelectedIso12944SystemCode] = useState<string | null>(null);

  // Track the auto-selected pressure class ID for override detection
  const [autoPressureClassId, setAutoPressureClassId] = useState<number | null>(null);

  const rawWorkingPressure = errors.workingPressure;

  const hasErrors =
    errors &&
    (rawWorkingPressure ||
      errors.workingTemperature ||
      errors.steelPipesConfirmation ||
      errors.fastenersConfirmation);

  const currentSteelSpec = masterData?.steelSpecs?.find(
    (s: any) => s.id === globalSpecs?.steelSpecificationId,
  );
  const currentPressureClass = availablePressureClasses?.find(
    (pc: any) => pc.id === globalSpecs?.flangePressureClassId,
  );
  const {
    recommendations: ptRecommendations,
    boltRecommendation,
    gasketRecommendation,
    isLoading: ptLoading,
  } = usePtRecommendations({
    standardId: globalSpecs?.flangeStandardId !== "PE" ? globalSpecs?.flangeStandardId : null,
    workingPressureBar: gsWorkingPressureBar,
    temperatureCelsius: gsWorkingTemperatureC,
    currentPressureClassId: globalSpecs?.flangePressureClassId,
    steelSpecName: currentSteelSpec?.steelSpecName,
    pressureClassDesignation: currentPressureClass?.designation,
    enabled: showSteelPipes && !globalSpecs?.steelPipesSpecsConfirmed,
  });

  const pressureClassInfoMap = new Map<number, ValidPressureClassInfo>(
    ptRecommendations?.validPressureClasses.map((c) => [c.id, c]) || [],
  );

  // Track when auto-selected pressure class changes (set when recommendation is first received)
  useEffect(() => {
    if (ptRecommendations?.recommendedPressureClassId && autoPressureClassId === null) {
      setAutoPressureClassId(ptRecommendations.recommendedPressureClassId);
    }
  }, [ptRecommendations?.recommendedPressureClassId, autoPressureClassId]);

  // Reset auto pressure class when flange standard changes
  useEffect(() => {
    setAutoPressureClassId(null);
  }, [globalSpecs?.flangeStandardId]);

  const currentPressureClassId = globalSpecs?.flangePressureClassId;
  const pressureClassOverrideStatus = derivePressureClassOverrideStatus(
    currentPressureClassId,
    autoPressureClassId,
    availablePressureClasses,
  );
  const isPressureClassUnsuitable = computePressureClassUnsuitable(
    currentPressureClassId,
    pressureClassInfoMap,
  );
  const isPressureClassMissingPTData = computePressureClassMissingPTData(
    currentPressureClassId,
    pressureClassInfoMap,
    ptRecommendations,
  );

  // Derive temperature category from working temperature if not manually set
  const derivedTempCategory = deriveTemperatureCategory(gsWorkingTemperatureC);
  const rawEcpTemperature = globalSpecs?.ecpTemperature;
  const effectiveEcpTemperature = rawEcpTemperature || derivedTempCategory;
  const isEcpTemperatureAutoFilled = !globalSpecs?.ecpTemperature && !!derivedTempCategory;

  const rawIso12944Category = rfqData?.iso12944Category;

  // Derive atmospheric fields from Page 1 Environmental Intelligence data
  // Check multiple sources: user override (ecp prefix), rfqData, and globalSpecs (from mine selection)
  const gsIso12944Category = globalSpecs?.iso12944Category;
  const derivedIso12944 = rawIso12944Category || gsIso12944Category;
  const effectiveIso12944 = gsEcpIso12944Category || derivedIso12944;
  const isIso12944AutoFilled = !gsEcpIso12944Category && !!derivedIso12944;

  const rawMarineInfluence = rfqData?.marineInfluence;

  const derivedMarineInfluence =
    rawMarineInfluence || gsDetailedMarineInfluence || gsMarineInfluence;
  const effectiveMarineInfluence = gsEcpMarineInfluence || derivedMarineInfluence;
  const isMarineInfluenceAutoFilled = !gsEcpMarineInfluence && !!derivedMarineInfluence;

  const rawIndustrialPollution = rfqData?.industrialPollution;

  const derivedIndustrialPollution = rawIndustrialPollution || globalSpecs?.industrialPollution;
  const rawEcpIndustrialPollution = globalSpecs?.ecpIndustrialPollution;
  const effectiveIndustrialPollution = rawEcpIndustrialPollution || derivedIndustrialPollution;
  const isIndustrialPollutionAutoFilled =
    !globalSpecs?.ecpIndustrialPollution && !!derivedIndustrialPollution;

  // Derive Installation Conditions from Page 1 data
  // Installation Type: Default to AboveGround for mining applications
  const derivedInstallationType = globalSpecs?.mineSelected ? "AboveGround" : null;
  const rawEcpInstallationType = globalSpecs?.ecpInstallationType;
  const effectiveInstallationType = rawEcpInstallationType || derivedInstallationType;
  const isInstallationTypeAutoFilled =
    !globalSpecs?.ecpInstallationType && !!derivedInstallationType;

  const derivedUvExposure = deriveMiningUvExposure(
    Boolean(globalSpecs?.mineSelected),
    effectiveIso12944 ?? null,
  );
  const rawEcpUvExposure = globalSpecs?.ecpUvExposure;
  const effectiveUvExposure = rawEcpUvExposure || derivedUvExposure;
  const isUvExposureAutoFilled = !globalSpecs?.ecpUvExposure && !!derivedUvExposure;

  // Mechanical Risk: Mining environments are typically high mechanical risk
  const derivedMechanicalRisk = globalSpecs?.mineSelected ? "High" : null;
  const rawEcpMechanicalRisk = globalSpecs?.ecpMechanicalRisk;
  const effectiveMechanicalRisk = rawEcpMechanicalRisk || derivedMechanicalRisk;
  const isMechanicalRiskAutoFilled = !globalSpecs?.ecpMechanicalRisk && !!derivedMechanicalRisk;

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
      if (!["C1", "C2", "C3", "C4", "C5"].includes(effectiveIso12944)) {
        setIso12944Systems(null);
        setSelectedIso12944SystemCode(null);
        return;
      }

      setIso12944Loading(true);
      try {
        const result = await coatingSpecificationApi.systemsByDurability(
          effectiveIso12944,
          effectiveDurability,
        );
        setIso12944Systems(result);
        // Auto-select the recommended system
        if (result.recommended?.systemCode) {
          setSelectedIso12944SystemCode(result.recommended.systemCode);
        }
      } catch (error) {
        log.error("Failed to fetch ISO 12944-5 systems", { error });
        setIso12944Systems(null);
      } finally {
        setIso12944Loading(false);
      }
    };

    fetchIso12944Systems();
  }, [effectiveIso12944, effectiveDurability]);

  // Get the currently selected ISO 12944 system
  const selectedIso12944System = selectedIso12944SystemCode
    ? iso12944Systems?.recommended?.systemCode === selectedIso12944SystemCode
      ? iso12944Systems.recommended
      : iso12944Systems?.alternatives.find((s) => s.systemCode === selectedIso12944SystemCode)
    : iso12944Systems?.recommended;

  const rawSteelSpecName = masterData.steelSpecs.find(
    (s: any) => s.id === globalSpecs.steelSpecificationId,
  )?.steelSpecName;

  const rawCode = masterData.flangeStandards.find(
    (s: any) => s.id === globalSpecs.flangeStandardId,
  )?.code;

  const rawWorkingPressureBar = gsWorkingPressureBar;
  const rawWorkingTemperatureC = gsWorkingTemperatureC;

  const rawSteelSpecName2 = masterData.steelSpecs?.find(
    (s: any) => s.id === globalSpecs.steelSpecificationId,
  )?.steelSpecName;

  const rawWorkingPressureBar3 = gsWorkingPressureBar;

  const rawCode2 = masterData.flangeStandards?.find(
    (s: any) => s.id === globalSpecs.flangeStandardId,
  )?.code;

  const rawIsLower = pressureClassOverrideStatus.isLower;
  const rawFlangePressureClassId = globalSpecs?.flangePressureClassId;
  const rawFlangeFace = globalSpecs?.flangeFace;
  const rawSurfaceProtectionConfirmed = globalSpecs?.surfaceProtectionConfirmed;
  const rawExternalCoatingRecommendation = globalSpecs?.externalCoatingRecommendation;
  const rawExternalCoatingConfirmed = gsExternalCoatingConfirmed;
  const rawCoating = globalSpecs.externalCoatingRecommendation?.coating;
  const rawInternalLiningConfirmed = gsInternalLiningConfirmed;
  const rawInternalLiningType = globalSpecs.internalLiningType;
  const rawEcpSoilType = globalSpecs?.ecpSoilType;
  const rawEcpSoilResistivity = globalSpecs?.ecpSoilResistivity;
  const rawEcpSoilMoisture = globalSpecs?.ecpSoilMoisture;
  const rawEcpServiceLife = globalSpecs?.ecpServiceLife;
  const rawExternalTopcoatColour = globalSpecs?.externalTopcoatColour;

  const envProfile = globalSpecs.externalCoatingRecommendation?.environmentProfile;
  const epInstallationType = envProfile?.installationType;
  const rawInstallationType = epInstallationType || null;
  const epIso12944Category = envProfile?.iso12944Category;
  const rawIso12944Category2 = epIso12944Category || null;
  const epMarineInfluence = envProfile?.marineInfluence;
  const rawMarineInfluence2 = epMarineInfluence || null;
  const epUvExposure = envProfile?.uvExposure;
  const rawUvExposure = epUvExposure || null;
  const epTemperature = envProfile?.temperature;
  const rawTemperature = epTemperature || null;
  const epServiceLife = envProfile?.serviceLife;
  const rawServiceLife = epServiceLife || null;
  const epMechanicalRisk = envProfile?.mechanicalRisk;
  const rawMechanicalRisk = epMechanicalRisk || null;
  const epIndustrialPollution = envProfile?.industrialPollution;
  const rawIndustrialPollution2 = epIndustrialPollution || null;

  const rawExternalCoatingType = gsExternalCoatingType;
  const rawExternalRubberType = globalSpecs?.externalRubberType;
  const rawExternalRubberThickness = globalSpecs?.externalRubberThickness;
  const rawExternalRubberColour = globalSpecs?.externalRubberColour;
  const rawExternalRubberHardness = globalSpecs?.externalRubberHardness;
  const rawExternalBlastingGrade = globalSpecs?.externalBlastingGrade;
  const rawExternalTopcoatColour2 = globalSpecs?.externalTopcoatColour;
  const rawExternalBand1Colour = globalSpecs?.externalBand1Colour;
  const rawExternalBand2Colour = globalSpecs?.externalBand2Colour;
  const rawExternalPrimerMicrons = globalSpecs.externalPrimerMicrons;
  const rawExternalIntermediateMicrons = globalSpecs.externalIntermediateMicrons;
  const rawExternalTopcoatMicrons = globalSpecs.externalTopcoatMicrons;
  const rawInternalLiningType2 = globalSpecs?.internalLiningType;
  const rawInternalRubberSansType = globalSpecs?.internalRubberSansType;
  const rawInternalRubberGrade = globalSpecs?.internalRubberGrade;
  const rawInternalRubberHardness = globalSpecs?.internalRubberHardness;
  const rawInternalRubberThickness = globalSpecs?.internalRubberThickness;
  const rawInternalRubberVulcanizationMethod = globalSpecs?.internalRubberVulcanizationMethod;
  const rawInternalRubberColour = globalSpecs?.internalRubberColour;
  const rawInternalRubberType = globalSpecs?.internalRubberType;
  const rawInternalCeramicType = globalSpecs?.internalCeramicType;
  const rawInternalCeramicShape = globalSpecs?.internalCeramicShape;
  const rawInternalCeramicThickness = globalSpecs?.internalCeramicThickness;
  const rawInternalHdpeMaterialGrade = globalSpecs?.internalHdpeMaterialGrade;
  const rawInternalHdpePressureRating = globalSpecs?.internalHdpePressureRating;
  const rawInternalHdpeSdr = globalSpecs?.internalHdpeSdr;
  const rawInternalHdpePipeType = globalSpecs?.internalHdpePipeType;
  const rawInternalPuThickness = globalSpecs?.internalPuThickness;
  const rawInternalPuHardness = globalSpecs?.internalPuHardness;
  const rawInternalPrimerMicrons = globalSpecs.internalPrimerMicrons;
  const rawInternalIntermediateMicrons = globalSpecs.internalIntermediateMicrons;
  const rawInternalTopcoatMicrons = globalSpecs.internalTopcoatMicrons;
  const rawInternalPrimerType = globalSpecs?.internalPrimerType;
  const rawInternalPrimerMicrons2 = globalSpecs?.internalPrimerMicrons;
  const rawInternalIntermediateType = globalSpecs?.internalIntermediateType;
  const rawInternalIntermediateMicrons2 = globalSpecs?.internalIntermediateMicrons;
  const rawInternalTopcoatType = globalSpecs?.internalTopcoatType;
  const rawInternalTopcoatMicrons2 = globalSpecs?.internalTopcoatMicrons;
  const rawInternalPrimerMicrons3 = globalSpecs.internalPrimerMicrons;
  const rawInternalIntermediateMicrons3 = globalSpecs.internalIntermediateMicrons;
  const rawInternalTopcoatMicrons3 = globalSpecs.internalTopcoatMicrons;
  const rawExternalCoatingType2 = gsExternalCoatingType;
  const rawHdpeGrade = gsHdpeGrade;
  const rawHdpeSdr = gsHdpeSdr;
  const rawPvcType = gsPvcType;
  const rawPvcPressureClass = gsPvcPressureClass;
  const rawBoltGrade = globalSpecs?.boltGrade;
  const rawGasketType = globalSpecs?.gasketType;
  const rawDesignation3 = currentPressureClass?.designation;

  return (
    <div>
      <h2 className="text-md font-bold text-gray-900 mb-1">Specifications</h2>
      <p className="text-gray-600 text-xs mb-2">
        Define working conditions and material specifications.
      </p>
      <AutoExtractedSpecsBanner globalSpecs={globalSpecs} />
      {/* Validation Error Banner */}
      {hasErrors && (
        <div className="mb-2 bg-red-50 border-l-4 border-red-500 rounded p-2">
          <div className="flex items-start gap-2">
            <svg
              className="h-4 w-4 text-red-500 flex-shrink-0"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h3 className="text-xs font-semibold text-red-800">
                Action required before proceeding
              </h3>
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
              <SteelPipesConfirmedSummary
                workingPressureBar={gsWorkingPressureBar}
                workingTemperatureC={gsWorkingTemperatureC}
                hasSteelSpec={!!globalSpecs?.steelSpecificationId && !!masterData?.steelSpecs}
                hasFlangeStandard={!!globalSpecs?.flangeStandardId && !!masterData?.flangeStandards}
                steelSpecName={rawSteelSpecName}
                flangeStandardCode={rawCode}
                onEdit={() =>
                  onUpdateGlobalSpecs({
                    ...globalSpecs,
                    steelPipesSpecsConfirmed: false,
                  })
                }
              />
            )}

            {/* Detail Forms - show when not confirmed */}
            {!globalSpecs?.steelPipesSpecsConfirmed && (
              <>
                <WorkingConditionsSection
                  globalSpecs={globalSpecs}
                  onUpdateGlobalSpecs={onUpdateGlobalSpecs}
                  masterData={masterData}
                  errors={errors}
                  fetchAndSelectPressureClass={fetchAndSelectPressureClass}
                />

                <MaterialSpecificationsSection
                  globalSpecs={globalSpecs as never}
                  onUpdateGlobalSpecs={onUpdateGlobalSpecs}
                  masterData={masterData}
                  availablePressureClasses={availablePressureClasses}
                  fetchAndSelectPressureClass={fetchAndSelectPressureClass}
                  ptRecommendations={ptRecommendations ?? undefined}
                  autoPressureClassId={autoPressureClassId}
                  isUnregisteredCustomer={isUnregisteredCustomer}
                  showRestrictionPopup={showRestrictionPopup}
                  onMaterialWarning={setMaterialWarning}
                />
              </>
            )}
          </div>
        )}

        {showSteelPipes && !globalSpecs?.steelPipesSpecsConfirmed && (
          <SteelPipesConfirmButton
            disabled={!gsWorkingPressureBar || !gsWorkingTemperatureC}
            onConfirm={() => {
              const warnings: string[] = [];

              if (globalSpecs?.steelSpecificationId) {
                const currentSpec = masterData.steelSpecs?.find(
                  (s: any) => s.id === globalSpecs.steelSpecificationId,
                );
                if (currentSpec && allLimits) {
                  const suitability = checkSuitabilityFromCache(
                    allLimits,
                    currentSpec.steelSpecName,
                    gsWorkingTemperatureC,
                    gsWorkingPressureBar,
                  );
                  if (!suitability.isSuitable) {
                    warnings.push(
                      `Steel Specification "${currentSpec.steelSpecName}" is not recommended for ${globalSpecs.workingTemperatureC}°C / ${globalSpecs.workingPressureBar} bar operating conditions.`,
                    );
                  }
                }
              }

              if (isPressureClassUnsuitable) {
                warnings.push(
                  "Pressure Class: The selected pressure class is unsuitable for the operating conditions (P-T rating inadequate).",
                );
              } else if (ptRecommendations?.validation && !ptRecommendations.validation.isValid) {
                warnings.push(`Pressure Class: ${ptRecommendations.validation.warningMessage}`);
              }

              if (warnings.length > 0) {
                setConfirmationWarning({ show: true, warnings });
              } else {
                onUpdateGlobalSpecs({
                  ...globalSpecs,
                  steelPipesSpecsConfirmed: true,
                });
              }
            }}
          />
        )}

        {/* Surface Protection - Only show if Surface Protection is selected */}
        {showSurfaceProtection && (
          <SurfaceProtectionSection
            globalSpecs={globalSpecs as never}
            onUpdateGlobalSpecs={onUpdateGlobalSpecs}
            isUnregisteredCustomer={isUnregisteredCustomer}
            showFeatureRestrictionPopup={showFeatureRestrictionPopup}
            gsExternalCoatingConfirmed={gsExternalCoatingConfirmed}
            gsExternalCoatingType={gsExternalCoatingType}
            gsInternalLiningConfirmed={gsInternalLiningConfirmed}
            gsShowExternalCoatingProfile={gsShowExternalCoatingProfile}
            gsShowMaterialTransferProfile={gsShowMaterialTransferProfile}
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
            iso12944Loading={iso12944Loading}
            iso12944Systems={iso12944Systems}
            selectedIso12944System={selectedIso12944System}
            selectedIso12944SystemCode={selectedIso12944SystemCode}
            setSelectedIso12944SystemCode={setSelectedIso12944SystemCode}
            rawCoating={rawCoating}
            rawEcpServiceLife={rawEcpServiceLife}
            rawEcpSoilMoisture={rawEcpSoilMoisture}
            rawEcpSoilResistivity={rawEcpSoilResistivity}
            rawEcpSoilType={rawEcpSoilType}
            rawExternalBand1Colour={rawExternalBand1Colour}
            rawExternalBand2Colour={rawExternalBand2Colour}
            rawExternalBlastingGrade={rawExternalBlastingGrade}
            rawExternalCoatingConfirmed={rawExternalCoatingConfirmed}
            rawExternalCoatingRecommendation={rawExternalCoatingRecommendation}
            rawExternalCoatingType={rawExternalCoatingType}
            rawExternalCoatingType2={rawExternalCoatingType2}
            rawExternalRubberColour={rawExternalRubberColour}
            rawExternalRubberHardness={rawExternalRubberHardness}
            rawExternalRubberThickness={rawExternalRubberThickness}
            rawExternalRubberType={rawExternalRubberType}
            rawExternalTopcoatColour={rawExternalTopcoatColour}
            rawExternalTopcoatColour2={rawExternalTopcoatColour2}
            rawIndustrialPollution2={rawIndustrialPollution2}
            rawInstallationType={rawInstallationType}
            rawInternalCeramicShape={rawInternalCeramicShape}
            rawInternalCeramicThickness={rawInternalCeramicThickness}
            rawInternalCeramicType={rawInternalCeramicType}
            rawInternalHdpeMaterialGrade={rawInternalHdpeMaterialGrade}
            rawInternalHdpePipeType={rawInternalHdpePipeType}
            rawInternalHdpePressureRating={rawInternalHdpePressureRating}
            rawInternalHdpeSdr={rawInternalHdpeSdr}
            rawInternalIntermediateMicrons2={rawInternalIntermediateMicrons2}
            rawInternalIntermediateType={rawInternalIntermediateType}
            rawInternalLiningConfirmed={rawInternalLiningConfirmed}
            rawInternalLiningType={rawInternalLiningType}
            rawInternalLiningType2={rawInternalLiningType2}
            rawInternalPrimerMicrons2={rawInternalPrimerMicrons2}
            rawInternalPrimerType={rawInternalPrimerType}
            rawInternalPuHardness={rawInternalPuHardness}
            rawInternalPuThickness={rawInternalPuThickness}
            rawInternalRubberColour={rawInternalRubberColour}
            rawInternalRubberGrade={rawInternalRubberGrade}
            rawInternalRubberHardness={rawInternalRubberHardness}
            rawInternalRubberSansType={rawInternalRubberSansType}
            rawInternalRubberThickness={rawInternalRubberThickness}
            rawInternalRubberType={rawInternalRubberType}
            rawInternalRubberVulcanizationMethod={rawInternalRubberVulcanizationMethod}
            rawInternalTopcoatMicrons2={rawInternalTopcoatMicrons2}
            rawInternalTopcoatType={rawInternalTopcoatType}
            rawIso12944Category2={rawIso12944Category2}
            rawMarineInfluence2={rawMarineInfluence2}
            rawMechanicalRisk={rawMechanicalRisk}
            rawServiceLife={rawServiceLife}
            rawSurfaceProtectionConfirmed={rawSurfaceProtectionConfirmed}
            rawTemperature={rawTemperature}
            rawUvExposure={rawUvExposure}
          />
        )}

        {/* HDPE Pipes & Fittings Section */}
        {showHdpePipes && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
              <span className="w-8 h-8 rounded-full bg-gray-900 text-white text-xs flex items-center justify-center font-semibold">
                PE
              </span>
              <h3 className="text-xl font-bold text-gray-900">HDPE Pipes & Fittings</h3>
              {globalSpecs?.hdpeSpecsConfirmed && (
                <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                  Confirmed
                </span>
              )}
            </div>
            {globalSpecs?.hdpeSpecsConfirmed ? (
              <div className="bg-green-100 border border-green-400 rounded-md p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg
                      className="w-5 h-5 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <div className="text-sm">
                      <span className="font-semibold text-gray-900">{rawHdpeGrade || "PE100"}</span>
                      <span className="text-gray-600 mx-2">|</span>
                      <span className="text-gray-700">SDR {rawHdpeSdr || "-"}</span>
                      <span className="text-gray-600 mx-2">|</span>
                      <span className="text-gray-700">
                        {globalSpecs?.hdpeJoiningMethod?.replace(/_/g, " ") || "-"}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateGlobalSpecs({ ...globalSpecs, hdpeSpecsConfirmed: false })
                    }
                    className="px-3 py-1 text-xs font-medium text-green-700 hover:text-green-800 hover:underline"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ) : (
              <>
                <HdpeSpecificationsSection
                  globalSpecs={globalSpecs}
                  onUpdateGlobalSpecs={onUpdateGlobalSpecs}
                  flangeStandards={masterData?.flangeStandards}
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (gsHdpeGrade && gsHdpeSdr && globalSpecs?.hdpeJoiningMethod) {
                        onUpdateGlobalSpecs({ ...globalSpecs, hdpeSpecsConfirmed: true });
                      }
                    }}
                    disabled={!gsHdpeGrade || !gsHdpeSdr || !globalSpecs?.hdpeJoiningMethod}
                    className="px-4 py-2 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Confirm HDPE Specifications
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* PVC Pipes & Fittings Section */}
        {showPvcPipes && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
              <span className="w-8 h-8 rounded-full bg-blue-400 text-white text-xs flex items-center justify-center font-semibold">
                PVC
              </span>
              <h3 className="text-xl font-bold text-gray-900">PVC Pipes & Fittings</h3>
              {globalSpecs?.pvcSpecsConfirmed && (
                <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                  Confirmed
                </span>
              )}
            </div>
            {globalSpecs?.pvcSpecsConfirmed ? (
              <div className="bg-green-100 border border-green-400 rounded-md p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg
                      className="w-5 h-5 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <div className="text-sm">
                      <span className="font-semibold text-gray-900">{rawPvcType || "uPVC"}</span>
                      <span className="text-gray-600 mx-2">|</span>
                      <span className="text-gray-700">Class {rawPvcPressureClass || "-"}</span>
                      <span className="text-gray-600 mx-2">|</span>
                      <span className="text-gray-700">
                        {globalSpecs?.pvcJoiningMethod?.replace(/_/g, " ") || "-"}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateGlobalSpecs({ ...globalSpecs, pvcSpecsConfirmed: false })
                    }
                    className="px-3 py-1 text-xs font-medium text-green-700 hover:text-green-800 hover:underline"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ) : (
              <>
                <PvcSpecificationsSection
                  globalSpecs={globalSpecs}
                  onUpdateGlobalSpecs={onUpdateGlobalSpecs}
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (gsPvcType && gsPvcPressureClass && globalSpecs?.pvcJoiningMethod) {
                        onUpdateGlobalSpecs({ ...globalSpecs, pvcSpecsConfirmed: true });
                      }
                    }}
                    disabled={!gsPvcType || !gsPvcPressureClass || !globalSpecs?.pvcJoiningMethod}
                    className="px-4 py-2 bg-blue-400 text-white font-semibold rounded-lg hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Confirm PVC Specifications
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {showFastenersGaskets && (
          <FastenersGasketsSection
            globalSpecs={globalSpecs as never}
            onUpdateGlobalSpecs={onUpdateGlobalSpecs}
            boltRecommendation={boltRecommendation ?? undefined}
            gasketRecommendation={gasketRecommendation ?? undefined}
            currentPressureClass={currentPressureClass}
          />
        )}

        {/* Transportation & Installation Section */}
        {showTransportInstall && <TransportInstallSection />}

        {/* No Products Selected Warning */}
        {!showSteelPipes &&
          !showFastenersGaskets &&
          !showHdpePipes &&
          !showPvcPipes &&
          !showStructuralSteel &&
          !showSurfaceProtection &&
          !showTransportInstall && <NoProductsSelectedBanner />}

        {/* Material Suitability Warning Modal */}
        <MaterialWarningModal
          warning={materialWarning}
          onClose={() =>
            setMaterialWarning({
              show: false,
              specName: "",
              specId: null,
              warnings: [],
            })
          }
          onProceed={async () => {
            const newSpecId = materialWarning.specId;
            let recommendedPressureClassId = globalSpecs?.flangePressureClassId;
            if (newSpecId && globalSpecs?.flangeStandardId && gsWorkingPressureBar) {
              const newSteelSpec = masterData.steelSpecs?.find((s: any) => s.id === newSpecId);
              const materialGroup = getFlangeMaterialGroup(newSteelSpec?.steelSpecName);
              recommendedPressureClassId = await fetchAndSelectPressureClass(
                globalSpecs.flangeStandardId,
                globalSpecs.workingPressureBar,
                globalSpecs.workingTemperatureC,
                materialGroup,
              );
            }
            onUpdateGlobalSpecs({
              ...globalSpecs,
              steelSpecificationId: newSpecId,
              flangePressureClassId:
                recommendedPressureClassId || globalSpecs?.flangePressureClassId,
            });
            setMaterialWarning({
              show: false,
              specName: "",
              specId: null,
              warnings: [],
            });
          }}
        />

        {/* Confirmation Warning Popup - Shows when user tries to confirm with non-recommended specs */}
        <ConfirmationWarningModal
          warning={confirmationWarning}
          onClose={() => setConfirmationWarning({ show: false, warnings: [] })}
          onProceed={() => {
            onUpdateGlobalSpecs({
              ...globalSpecs,
              steelPipesSpecsConfirmed: true,
            });
            setConfirmationWarning({ show: false, warnings: [] });
          }}
        />

        {/* Restriction Popup for unregistered users */}
        {restrictionPopup && (
          <RestrictionPopup position={restrictionPopup} onClose={() => setRestrictionPopup(null)} />
        )}

        {/* Feature Restriction Popup for Coating/Lining Assistants */}
        {featureRestrictionPopup && (
          <FeatureRestrictionPopup
            feature={featureRestrictionPopup.feature}
            position={featureRestrictionPopup.position}
            onClose={() => setFeatureRestrictionPopup(null)}
          />
        )}
      </div>
    </div>
  );
}
