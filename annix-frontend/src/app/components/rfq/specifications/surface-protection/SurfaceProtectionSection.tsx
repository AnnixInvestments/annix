"use client";

import React, { useCallback, useState } from "react";
import type { GlobalSpecs } from "@/app/lib/hooks/useRfqForm";
import { ComparisonTool } from "./ComparisonTool";
import { EnvironmentalConditionsInput } from "./EnvironmentalConditionsInput";
import { ExternalCoatingSection } from "./ExternalCoatingSection";
import { InternalLiningSection } from "./InternalLiningSection";
import { ProductCatalogBrowser } from "./ProductCatalogBrowser";
import { QuantityTakeoff } from "./QuantityTakeoff";
import { SpecificationSheetGenerator } from "./SpecificationSheetGenerator";
import { SurfaceAreaCalculator } from "./SurfaceAreaCalculator";
import { SystemBuilderWizard } from "./SystemBuilderWizard";
import { type FeatureType, INSPECTION_REQUIREMENTS } from "./types";

interface SurfaceProtectionSectionProps {
  globalSpecs: GlobalSpecs;
  onUpdateGlobalSpecs: (specs: GlobalSpecs) => void;
  isUnregisteredCustomer: boolean;
  rfqData?: {
    iso12944Category?: string;
    marineInfluence?: string;
    industrialPollution?: string;
    projectName?: string;
    customerName?: string;
  };
}

type ActiveTool =
  | null
  | "catalog"
  | "builder"
  | "comparison"
  | "calculator"
  | "takeoff"
  | "specsheet"
  | "conditions"
  | "inspection";

export function SurfaceProtectionSection({
  globalSpecs,
  onUpdateGlobalSpecs,
  isUnregisteredCustomer,
  rfqData,
}: SurfaceProtectionSectionProps) {
  const [activeTool, setActiveTool] = useState<ActiveTool>(null);
  const [systemBuilderTarget, setSystemBuilderTarget] = useState<"external" | "internal">(
    "external",
  );
  const [featureRestrictionPopup, setFeatureRestrictionPopup] = useState<{
    feature: FeatureType;
    position: { x: number; y: number };
  } | null>(null);

  const showFeatureRestrictionPopup = useCallback(
    (feature: FeatureType) => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setFeatureRestrictionPopup({
        feature,
        position: { x: e.clientX, y: e.clientY },
      });
    },
    [],
  );

  const deriveTemperatureCategory = (tempC: number | undefined): string | undefined => {
    if (tempC === undefined) return undefined;
    if (tempC <= 40) return "Ambient";
    if (tempC <= 120) return "Elevated";
    return "High";
  };

  const derivedTempCategory = deriveTemperatureCategory(globalSpecs?.workingTemperatureC);
  const effectiveEcpTemperature = globalSpecs?.ecpTemperature || derivedTempCategory;
  const isEcpTemperatureAutoFilled = !globalSpecs?.ecpTemperature && !!derivedTempCategory;

  const derivedIso12944 = rfqData?.iso12944Category || globalSpecs?.iso12944Category;
  const effectiveIso12944 = globalSpecs?.ecpIso12944Category || derivedIso12944;
  const isIso12944AutoFilled = !globalSpecs?.ecpIso12944Category && !!derivedIso12944;

  const derivedMarineInfluence =
    rfqData?.marineInfluence ||
    globalSpecs?.detailedMarineInfluence ||
    globalSpecs?.marineInfluence;
  const effectiveMarineInfluence = globalSpecs?.ecpMarineInfluence || derivedMarineInfluence;
  const isMarineInfluenceAutoFilled = !globalSpecs?.ecpMarineInfluence && !!derivedMarineInfluence;

  const derivedIndustrialPollution =
    rfqData?.industrialPollution || globalSpecs?.industrialPollution;
  const effectiveIndustrialPollution =
    globalSpecs?.ecpIndustrialPollution || derivedIndustrialPollution;
  const isIndustrialPollutionAutoFilled =
    !globalSpecs?.ecpIndustrialPollution && !!derivedIndustrialPollution;

  const derivedInstallationType = globalSpecs?.mineSelected ? "AboveGround" : undefined;
  const effectiveInstallationType = globalSpecs?.ecpInstallationType || derivedInstallationType;
  const isInstallationTypeAutoFilled =
    !globalSpecs?.ecpInstallationType && !!derivedInstallationType;

  const deriveUvExposure = (): string | undefined => {
    if (globalSpecs?.mineSelected) {
      const iso = effectiveIso12944;
      if (iso === "C5" || iso === "CX") return "High";
      if (iso === "C3" || iso === "C4") return "Moderate";
      if (iso === "C1" || iso === "C2") return "Moderate";
      return "High";
    }
    return undefined;
  };
  const derivedUvExposure = deriveUvExposure();
  const effectiveUvExposure = globalSpecs?.ecpUvExposure || derivedUvExposure;
  const isUvExposureAutoFilled = !globalSpecs?.ecpUvExposure && !!derivedUvExposure;

  const derivedMechanicalRisk = globalSpecs?.mineSelected ? "High" : undefined;
  const effectiveMechanicalRisk = globalSpecs?.ecpMechanicalRisk || derivedMechanicalRisk;
  const isMechanicalRiskAutoFilled = !globalSpecs?.ecpMechanicalRisk && !!derivedMechanicalRisk;

  const surfaceAreaM2 = globalSpecs?.calculatedSurfaceAreaM2 || 100;

  const isConfirmed =
    globalSpecs?.surfaceProtectionConfirmed ||
    (globalSpecs?.externalCoatingConfirmed && globalSpecs?.internalLiningConfirmed);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
        <span className="text-2xl">&#128737;</span>
        <h3 className="text-xl font-bold text-gray-900">Surface Protection</h3>
      </div>

      {/* Confirmed Summary */}
      {isConfirmed && (
        <div className="bg-green-100 border border-green-400 rounded-md p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-green-800">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-semibold">Surface Protection Confirmed</span>
              {globalSpecs?.externalCoatingType && (
                <>
                  <span className="mx-2">-</span>
                  <span className="font-medium">External:</span> {globalSpecs.externalCoatingType}
                </>
              )}
              {globalSpecs?.internalLiningType && (
                <>
                  <span className="mx-2">-</span>
                  <span className="font-medium">Internal:</span> {globalSpecs.internalLiningType}
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() =>
                onUpdateGlobalSpecs({
                  ...globalSpecs,
                  externalCoatingConfirmed: false,
                  internalLiningConfirmed: false,
                  surfaceProtectionConfirmed: false,
                })
              }
              className="px-2 py-1 bg-gray-500 text-white font-medium rounded text-xs hover:bg-gray-600"
            >
              Edit
            </button>
          </div>
        </div>
      )}

      {/* Tools Toolbar */}
      <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-lg">
        <button
          type="button"
          onClick={() => setActiveTool(activeTool === "catalog" ? null : "catalog")}
          className={`px-2 py-1 text-xs font-medium rounded ${
            activeTool === "catalog"
              ? "bg-blue-600 text-white"
              : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          Product Catalog
        </button>
        <button
          type="button"
          onClick={() => {
            setSystemBuilderTarget("external");
            setActiveTool(activeTool === "builder" ? null : "builder");
          }}
          className={`px-2 py-1 text-xs font-medium rounded ${
            activeTool === "builder"
              ? "bg-blue-600 text-white"
              : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          System Builder
        </button>
        <button
          type="button"
          onClick={() => setActiveTool(activeTool === "comparison" ? null : "comparison")}
          className={`px-2 py-1 text-xs font-medium rounded ${
            activeTool === "comparison"
              ? "bg-blue-600 text-white"
              : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          Compare Systems
        </button>
        <button
          type="button"
          onClick={() => setActiveTool(activeTool === "calculator" ? null : "calculator")}
          className={`px-2 py-1 text-xs font-medium rounded ${
            activeTool === "calculator"
              ? "bg-blue-600 text-white"
              : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          Surface Area
        </button>
        <button
          type="button"
          onClick={() => setActiveTool(activeTool === "takeoff" ? null : "takeoff")}
          className={`px-2 py-1 text-xs font-medium rounded ${
            activeTool === "takeoff"
              ? "bg-blue-600 text-white"
              : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          Quantity Takeoff
        </button>
        <button
          type="button"
          onClick={() => setActiveTool(activeTool === "conditions" ? null : "conditions")}
          className={`px-2 py-1 text-xs font-medium rounded ${
            activeTool === "conditions"
              ? "bg-blue-600 text-white"
              : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          Conditions
        </button>
        <button
          type="button"
          onClick={() => setActiveTool(activeTool === "inspection" ? null : "inspection")}
          className={`px-2 py-1 text-xs font-medium rounded ${
            activeTool === "inspection"
              ? "bg-blue-600 text-white"
              : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          Inspection
        </button>
        <button
          type="button"
          onClick={() => setActiveTool(activeTool === "specsheet" ? null : "specsheet")}
          className={`px-2 py-1 text-xs font-medium rounded ${
            activeTool === "specsheet"
              ? "bg-blue-600 text-white"
              : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          Spec Sheet
        </button>
      </div>

      {/* Active Tool Panel */}
      {activeTool === "catalog" && (
        <ProductCatalogBrowser
          onSelectProduct={(product, type) => {
            if (type === "paint") {
              onUpdateGlobalSpecs({
                ...globalSpecs,
                externalCoatingType: "Paint",
              });
            }
            setActiveTool(null);
          }}
        />
      )}

      {activeTool === "builder" && (
        <SystemBuilderWizard
          globalSpecs={globalSpecs}
          onUpdateGlobalSpecs={onUpdateGlobalSpecs}
          onClose={() => setActiveTool(null)}
          target={systemBuilderTarget}
        />
      )}

      {activeTool === "comparison" && <ComparisonTool />}

      {activeTool === "calculator" && (
        <SurfaceAreaCalculator
          onCalculationComplete={(results) => {
            onUpdateGlobalSpecs({
              ...globalSpecs,
              calculatedSurfaceAreaM2: results.totalArea,
            });
            setActiveTool(null);
          }}
        />
      )}

      {activeTool === "takeoff" && (
        <QuantityTakeoff
          surfaceAreaM2={surfaceAreaM2}
          coatingType={
            globalSpecs?.externalCoatingType === "Rubber Lined"
              ? "rubber"
              : globalSpecs?.internalLiningType === "Ceramic Lined"
                ? "ceramic"
                : "paint"
          }
          systemDetails={{
            primerDftMicrons: globalSpecs?.externalPrimerMicrons,
            intermediateDftMicrons: globalSpecs?.externalIntermediateMicrons,
            topcoatDftMicrons: globalSpecs?.externalTopcoatMicrons,
            rubberThicknessMm: globalSpecs?.externalRubberThickness
              ? parseFloat(globalSpecs.externalRubberThickness)
              : undefined,
          }}
        />
      )}

      {activeTool === "conditions" && (
        <EnvironmentalConditionsInput
          globalSpecs={globalSpecs}
          onUpdateGlobalSpecs={onUpdateGlobalSpecs}
        />
      )}

      {activeTool === "inspection" && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Inspection Requirements</h3>
          <div className="space-y-2">
            {INSPECTION_REQUIREMENTS.map((req) => (
              <label
                key={req.id}
                className="flex items-start gap-3 p-2 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={globalSpecs?.inspectionRequirements?.includes(req.id) || false}
                  onChange={(e) => {
                    const current = globalSpecs?.inspectionRequirements || [];
                    const updated = e.target.checked
                      ? [...current, req.id]
                      : current.filter((id: string) => id !== req.id);
                    onUpdateGlobalSpecs({
                      ...globalSpecs,
                      inspectionRequirements: updated,
                    });
                  }}
                  className="mt-0.5 rounded text-blue-600"
                />
                <div>
                  <div className="text-xs font-medium text-gray-900">{req.name}</div>
                  <div className="text-[10px] text-gray-500">{req.description}</div>
                  <div className="text-[10px] text-gray-400">
                    Standard: {req.standard} | Frequency: {req.frequency}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {activeTool === "specsheet" && (
        <SpecificationSheetGenerator
          globalSpecs={globalSpecs}
          projectName={rfqData?.projectName}
          customerName={rfqData?.customerName}
        />
      )}

      {/* Main Content - External and Internal Sections */}
      {!isConfirmed && (
        <>
          <ExternalCoatingSection
            globalSpecs={globalSpecs}
            onUpdateGlobalSpecs={onUpdateGlobalSpecs}
            isUnregisteredCustomer={isUnregisteredCustomer}
            showFeatureRestrictionPopup={showFeatureRestrictionPopup}
            effectiveInstallationType={effectiveInstallationType}
            effectiveUvExposure={effectiveUvExposure}
            effectiveMechanicalRisk={effectiveMechanicalRisk}
            effectiveIso12944={effectiveIso12944}
            effectiveMarineInfluence={effectiveMarineInfluence}
            effectiveIndustrialPollution={effectiveIndustrialPollution}
            effectiveEcpTemperature={effectiveEcpTemperature}
            isInstallationTypeAutoFilled={isInstallationTypeAutoFilled}
            isUvExposureAutoFilled={isUvExposureAutoFilled}
            isMechanicalRiskAutoFilled={isMechanicalRiskAutoFilled}
            isIso12944AutoFilled={isIso12944AutoFilled}
            isMarineInfluenceAutoFilled={isMarineInfluenceAutoFilled}
            isIndustrialPollutionAutoFilled={isIndustrialPollutionAutoFilled}
            isEcpTemperatureAutoFilled={isEcpTemperatureAutoFilled}
          />

          <InternalLiningSection
            globalSpecs={globalSpecs}
            onUpdateGlobalSpecs={onUpdateGlobalSpecs}
            isUnregisteredCustomer={isUnregisteredCustomer}
            showFeatureRestrictionPopup={showFeatureRestrictionPopup}
          />

          {/* Confirm Button */}
          {(globalSpecs?.externalCoatingType || globalSpecs?.internalLiningType) &&
            (!globalSpecs?.externalCoatingConfirmed || !globalSpecs?.internalLiningConfirmed) && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateGlobalSpecs({
                      ...globalSpecs,
                      externalCoatingConfirmed: true,
                      internalLiningConfirmed: true,
                      surfaceProtectionConfirmed: true,
                    })
                  }
                  disabled={!globalSpecs?.externalCoatingType}
                  className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm Surface Protection
                </button>
              </div>
            )}
        </>
      )}

      {/* Feature Restriction Popup */}
      {featureRestrictionPopup && (
        <div
          className="fixed z-[100] bg-slate-800 text-white px-4 py-4 rounded-lg shadow-xl border border-slate-600 max-w-md"
          style={{
            left: Math.min(featureRestrictionPopup.position.x - 150, window.innerWidth - 450),
            top: Math.min(featureRestrictionPopup.position.y + 10, window.innerHeight - 300),
          }}
          onMouseLeave={() => setFeatureRestrictionPopup(null)}
        >
          <div className="flex items-start gap-3">
            <svg
              className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m0 0v2m0-2h2m-2 0H10m11-7a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-400">
                {featureRestrictionPopup.feature === "coating-assistant"
                  ? "External Coating Assistant"
                  : "Internal Lining Assistant"}
              </p>
              <p className="text-xs text-gray-300 mt-1">
                This feature is available to registered users.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
