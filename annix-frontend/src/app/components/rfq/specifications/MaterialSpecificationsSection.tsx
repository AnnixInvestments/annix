"use client";

import React, { useEffect, useRef, useState } from "react";
import { getFlangeMaterialGroup } from "@/app/components/rfq/utils";
import { ArSteelWarningBanner } from "@/app/components/rfq/warnings/ArSteelWarningBanner";
import { materialValidationApi, type ValidPressureClassInfo } from "@/app/lib/api/client";
import { log } from "@/app/lib/logger";
import {
  checkSuitabilityFromCache,
  findMaterialLimits,
  flangeTypesForStandardCode,
  isWearResistant,
  useAllFlangeTypes,
  useAllMaterialLimits,
} from "@/app/lib/query/hooks";

const isSteelSpecAllowedForUnregistered = (specName: string): boolean => {
  const name = specName.toLowerCase();
  if (name.includes("sabs 62") && (name.includes("medium") || name.includes("heavy"))) {
    return true;
  }
  if (name.includes("sabs 719")) {
    return true;
  }
  if (
    name.includes("astm a106") &&
    (name.includes("gr.b") || name.includes("grade b") || name.includes("gr b"))
  ) {
    return true;
  }
  return false;
};

const UNREGISTERED_ALLOWED_FLANGE_STANDARDS = ["BS 4504", "SABS 1123", "BS 10", "ASME B16.5"];

const isFlangeStandardAllowedForUnregistered = (standardCode: string): boolean => {
  return UNREGISTERED_ALLOWED_FLANGE_STANDARDS.some(
    (allowed) =>
      standardCode.toLowerCase().includes(allowed.toLowerCase()) ||
      allowed.toLowerCase().includes(standardCode.toLowerCase()),
  );
};

interface MaterialWarningLimits {
  minTempC: number;
  maxTempC: number;
  maxPressureBar: number;
  type: string;
  notes?: string;
}

export interface MaterialWarning {
  show: boolean;
  specName: string;
  specId: number | undefined;
  warnings: string[];
  recommendation?: string;
  limits?: MaterialWarningLimits;
}

export interface PTRecommendations {
  validPressureClasses: ValidPressureClassInfo[];
  recommendedPressureClassId?: number;
  validation?: {
    isValid: boolean;
    warningMessage?: string;
  };
}

export interface MaterialSpecificationsSectionProps {
  globalSpecs: {
    workingPressureBar?: number;
    workingTemperatureC?: number;
    steelSpecificationId?: number;
    flangeStandardId?: number | string;
    flangePressureClassId?: number;
    flangeTypeCode?: string;
    steelPipesSpecsConfirmed?: boolean;
  };
  onUpdateGlobalSpecs: (specs: Record<string, unknown>) => void;
  masterData: {
    steelSpecs?: Array<{ id: number; steelSpecName: string }>;
    flangeStandards?: Array<{ id: number; code: string }>;
  };
  availablePressureClasses: Array<{ id: number; designation: string }>;
  fetchAndSelectPressureClass: (
    standardId: number | string,
    pressureBar?: number,
    temperatureC?: number,
    materialGroup?: string,
  ) => Promise<number | undefined>;
  ptRecommendations?: PTRecommendations;
  autoPressureClassId: number | null;
  isUnregisteredCustomer: boolean;
  showRestrictionPopup: (e: React.MouseEvent) => void;
  onMaterialWarning: (warning: MaterialWarning) => void;
}

export function MaterialSpecificationsSection({
  globalSpecs,
  onUpdateGlobalSpecs,
  masterData,
  availablePressureClasses,
  fetchAndSelectPressureClass,
  ptRecommendations,
  autoPressureClassId,
  isUnregisteredCustomer,
  showRestrictionPopup,
  onMaterialWarning,
}: MaterialSpecificationsSectionProps) {
  const { data: allLimits } = useAllMaterialLimits();
  const { data: allFlangeTypes = [] } = useAllFlangeTypes();
  const [steelSpecDropdownOpen, setSteelSpecDropdownOpen] = useState(false);
  const steelSpecDropdownRef = useRef<HTMLDivElement>(null);
  const [flangeStandardDropdownOpen, setFlangeStandardDropdownOpen] = useState(false);
  const flangeStandardDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        steelSpecDropdownRef.current &&
        !steelSpecDropdownRef.current.contains(event.target as Node)
      ) {
        setSteelSpecDropdownOpen(false);
      }
      if (
        flangeStandardDropdownRef.current &&
        !flangeStandardDropdownRef.current.contains(event.target as Node)
      ) {
        setFlangeStandardDropdownOpen(false);
      }
    };
    if (steelSpecDropdownOpen || flangeStandardDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [steelSpecDropdownOpen, flangeStandardDropdownOpen]);

  // Re-validate selected steel spec when temperature or pressure changes
  useEffect(() => {
    const currentSpecId = globalSpecs?.steelSpecificationId;
    const temp = globalSpecs?.workingTemperatureC;
    const pressure = globalSpecs?.workingPressureBar;

    if (!currentSpecId || !allLimits || (temp === undefined && pressure === undefined)) {
      return;
    }

    const currentSpec = masterData.steelSpecs?.find((s) => s.id === currentSpecId);
    if (!currentSpec) return;

    const suitability = checkSuitabilityFromCache(
      allLimits,
      currentSpec.steelSpecName,
      temp,
      pressure,
    );

    if (!suitability.isSuitable) {
      const mappedLimits = suitability.limits
        ? {
            minTempC: suitability.limits.minTemperatureCelsius,
            maxTempC: suitability.limits.maxTemperatureCelsius,
            maxPressureBar: suitability.limits.maxPressureBar,
            type: suitability.limits.materialType,
            notes: suitability.limits.notes ?? undefined,
          }
        : undefined;

      onMaterialWarning({
        show: true,
        specName: currentSpec.steelSpecName,
        specId: currentSpecId,
        warnings: suitability.warnings,
        recommendation: suitability.recommendation,
        limits: mappedLimits,
      });
    }
  }, [
    globalSpecs?.workingTemperatureC,
    globalSpecs?.workingPressureBar,
    globalSpecs?.steelSpecificationId,
    allLimits,
    masterData.steelSpecs,
    onMaterialWarning,
  ]);

  const pressureClassInfoMap = new Map<number, ValidPressureClassInfo>(
    ptRecommendations?.validPressureClasses.map((c) => [c.id, c]) || [],
  );

  const extractPressureNumeric = (designation: string | undefined): number => {
    if (!designation) return 0;
    const match = designation.match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  };

  const pressureClassOverrideStatus = (() => {
    const currentId = globalSpecs?.flangePressureClassId;
    const autoId = autoPressureClassId;

    if (!currentId || !autoId || currentId === autoId) {
      return { isOverride: false, isHigher: false, isLower: false };
    }

    const currentClass = availablePressureClasses?.find((pc) => pc.id === currentId);
    const autoClass = availablePressureClasses?.find((pc) => pc.id === autoId);

    if (!currentClass || !autoClass) {
      return { isOverride: true, isHigher: false, isLower: false };
    }

    const currentNumeric = extractPressureNumeric(currentClass.designation);
    const autoNumeric = extractPressureNumeric(autoClass.designation);

    return {
      isOverride: true,
      isHigher: currentNumeric > autoNumeric,
      isLower: currentNumeric < autoNumeric,
    };
  })();

  const currentPressureClassInfo = globalSpecs?.flangePressureClassId
    ? pressureClassInfoMap.get(globalSpecs.flangePressureClassId)
    : undefined;
  const isPressureClassUnsuitable =
    currentPressureClassInfo && !currentPressureClassInfo.isAdequate;
  const isPressureClassMissingPTData =
    globalSpecs?.flangePressureClassId &&
    ptRecommendations?.validPressureClasses &&
    ptRecommendations.validPressureClasses.length > 0 &&
    !currentPressureClassInfo;

  const isSpecSuitable = (specName: string): boolean => {
    if (!globalSpecs?.workingPressureBar && !globalSpecs?.workingTemperatureC) return true;
    if (!allLimits) return true;
    const suitability = checkSuitabilityFromCache(
      allLimits,
      specName,
      globalSpecs?.workingTemperatureC,
      globalSpecs?.workingPressureBar,
    );
    return suitability.isSuitable;
  };

  const limitsText = (specName: string): string => {
    if (!allLimits) return "";
    const limits = findMaterialLimits(allLimits, specName);
    if (!limits) return "";
    return ` [Max ${limits.maxTemperatureCelsius}°C]`;
  };

  const handleSpecSelect = async (specId: number) => {
    let recommendedPressureClassId = globalSpecs?.flangePressureClassId;
    const newSteelSpec = masterData.steelSpecs?.find((s) => s.id === specId);
    const specName = newSteelSpec?.steelSpecName || "";

    try {
      if (specName && (globalSpecs?.workingPressureBar || globalSpecs?.workingTemperatureC)) {
        const suitability = await materialValidationApi.checkMaterialSuitability(
          specName,
          globalSpecs?.workingTemperatureC,
          globalSpecs?.workingPressureBar,
        );

        if (!suitability.isSuitable) {
          const mappedLimits = suitability.limits
            ? {
                minTempC: suitability.limits.minTempC,
                maxTempC: suitability.limits.maxTempC,
                maxPressureBar: suitability.limits.maxPressureBar,
                type: suitability.limits.materialType,
                notes: suitability.limits.notes,
              }
            : undefined;

          onMaterialWarning({
            show: true,
            specName,
            specId,
            warnings: suitability.warnings,
            recommendation: suitability.recommendation,
            limits: mappedLimits,
          });
          setSteelSpecDropdownOpen(false);
          return;
        }
      }
    } catch (error) {
      log.warn("Material validation API unavailable, proceeding with selection:", error);
    }

    try {
      if (specId && globalSpecs?.flangeStandardId && globalSpecs?.workingPressureBar) {
        const materialGroup = getFlangeMaterialGroup(newSteelSpec?.steelSpecName);
        recommendedPressureClassId = await fetchAndSelectPressureClass(
          globalSpecs.flangeStandardId,
          globalSpecs.workingPressureBar,
          globalSpecs.workingTemperatureC,
          materialGroup,
        );
      }
    } catch (error) {
      log.warn("Pressure class API unavailable:", error);
    }

    onUpdateGlobalSpecs({
      ...globalSpecs,
      steelSpecificationId: specId,
      flangePressureClassId: recommendedPressureClassId || globalSpecs?.flangePressureClassId,
    });
    setSteelSpecDropdownOpen(false);
  };

  const handleFlangeStandardSelect = async (rawValue: string | number) => {
    if (rawValue === "PE") {
      onUpdateGlobalSpecs({
        ...globalSpecs,
        flangeStandardId: "PE",
        flangePressureClassId: undefined,
      });
      setFlangeStandardDropdownOpen(false);
      return;
    }

    const standardId = typeof rawValue === "number" ? rawValue : Number(rawValue);
    let recommendedPressureClassId: number | undefined;
    const standardChanged = standardId !== globalSpecs?.flangeStandardId;
    const steelSpec = masterData.steelSpecs?.find(
      (s) => s.id === globalSpecs?.steelSpecificationId,
    );
    const materialGroup = getFlangeMaterialGroup(steelSpec?.steelSpecName);

    try {
      if (standardId && globalSpecs?.workingPressureBar) {
        recommendedPressureClassId =
          (await fetchAndSelectPressureClass(
            standardId,
            globalSpecs.workingPressureBar,
            globalSpecs.workingTemperatureC,
            materialGroup,
          )) || undefined;
      } else if (standardId) {
        await fetchAndSelectPressureClass(standardId);
      }
    } catch (error) {
      log.warn("Pressure class fetch failed:", error);
    }

    const newPressureClassId = standardChanged
      ? recommendedPressureClassId
      : recommendedPressureClassId || globalSpecs?.flangePressureClassId;

    onUpdateGlobalSpecs({
      ...globalSpecs,
      flangeStandardId: standardId,
      flangePressureClassId: newPressureClassId,
    });
    setFlangeStandardDropdownOpen(false);
  };

  const groups = [
    { label: "South African Standards (SABS)", filter: (name: string) => name.startsWith("SABS") },
    {
      label: "Carbon Steel - ASTM A106 (High-Temp Seamless) - up to 427°C",
      filter: (name: string) => name.startsWith("ASTM A106"),
    },
    {
      label: "Carbon Steel - ASTM A53 (General Purpose) - up to 400°C",
      filter: (name: string) => name.startsWith("ASTM A53"),
    },
    {
      label: "Line Pipe - API 5L (Oil/Gas Pipelines) - up to 400°C",
      filter: (name: string) => name.startsWith("API 5L"),
    },
    {
      label: "Low Temperature - ASTM A333 - down to -100°C",
      filter: (name: string) => name.startsWith("ASTM A333"),
    },
    {
      label: "Heat Exchangers/Boilers - ASTM A179/A192",
      filter: (name: string) => /^ASTM A1(79|92)/.test(name),
    },
    {
      label: "Structural Tubing - ASTM A500 - up to 200°C",
      filter: (name: string) => name.startsWith("ASTM A500"),
    },
    {
      label: "Alloy Steel - ASTM A335 (Chrome-Moly) - up to 593°C",
      filter: (name: string) => name.startsWith("ASTM A335"),
    },
    {
      label: "Stainless Steel - ASTM A312 - up to 816°C",
      filter: (name: string) => name.startsWith("ASTM A312"),
    },
  ];

  const selectedStandard = masterData.flangeStandards?.find(
    (s) => s.id === globalSpecs?.flangeStandardId,
  );
  const standardCode = selectedStandard?.code || "";
  const flangeTypesForSelected = flangeTypesForStandardCode(allFlangeTypes, standardCode);

  const selectedSteelSpec = masterData.steelSpecs?.find(
    (s) => s.id === globalSpecs?.steelSpecificationId,
  );
  const selectedSteelSpecName = selectedSteelSpec?.steelSpecName;
  const isArSteelSelected =
    selectedSteelSpecName && allLimits ? isWearResistant(allLimits, selectedSteelSpecName) : false;

  // Check if currently selected steel spec is unsuitable for current conditions
  const selectedSpecSuitability = (() => {
    if (!selectedSteelSpecName || !allLimits) return { isSuitable: true, warnings: [] };
    return checkSuitabilityFromCache(
      allLimits,
      selectedSteelSpecName,
      globalSpecs?.workingTemperatureC,
      globalSpecs?.workingPressureBar,
    );
  })();
  const isSelectedSpecUnsuitable = !selectedSpecSuitability.isSuitable;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <h3 className="text-xs font-semibold text-gray-800 mb-2">Material Specifications</h3>

      {isArSteelSelected && (
        <ArSteelWarningBanner steelSpecName={selectedSteelSpecName} className="mb-3" />
      )}

      <div className="grid grid-cols-4 gap-3">
        <div ref={steelSpecDropdownRef} className="relative">
          <label
            className={`block text-xs font-semibold mb-1 ${isSelectedSpecUnsuitable ? "text-red-700" : "text-gray-900"}`}
          >
            Steel Specification <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={() => setSteelSpecDropdownOpen(!steelSpecDropdownOpen)}
            className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 text-left flex items-center justify-between ${
              isSelectedSpecUnsuitable
                ? "border-red-500 bg-red-50 focus:ring-red-500"
                : "border-gray-300 bg-white focus:ring-blue-500"
            }`}
          >
            <span className={globalSpecs?.steelSpecificationId ? "text-gray-900" : "text-gray-400"}>
              {globalSpecs?.steelSpecificationId
                ? masterData.steelSpecs?.find((s) => s.id === globalSpecs.steelSpecificationId)
                    ?.steelSpecName || "Select steel specification..."
                : "Select steel specification..."}
            </span>
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${steelSpecDropdownOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {steelSpecDropdownOpen && (
            <div className="absolute z-[10000] mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
              {groups.map((group, groupIdx) => {
                const specs =
                  masterData.steelSpecs?.filter((spec) => group.filter(spec.steelSpecName || "")) ||
                  [];
                const suitableSpecs = specs.filter((spec) =>
                  isSpecSuitable(spec.steelSpecName || ""),
                );
                const unsuitableSpecs = specs.filter(
                  (spec) => !isSpecSuitable(spec.steelSpecName || ""),
                );

                if (specs.length === 0) return null;

                return (
                  <div key={groupIdx}>
                    <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50 sticky top-0">
                      {suitableSpecs.length > 0 ? group.label : `${group.label} (Not Suitable)`}
                    </div>
                    {suitableSpecs.map((spec) => {
                      const isAllowedForUnregistered = isSteelSpecAllowedForUnregistered(
                        spec.steelSpecName || "",
                      );
                      const isRestricted = isUnregisteredCustomer && !isAllowedForUnregistered;

                      if (isRestricted) {
                        return (
                          <div
                            key={spec.id}
                            onClick={showRestrictionPopup}
                            onMouseEnter={showRestrictionPopup}
                            className="w-full px-3 py-1.5 text-sm text-left text-gray-400 cursor-not-allowed hover:bg-gray-100 flex items-center justify-between"
                          >
                            <span>{spec.steelSpecName}</span>
                            <svg
                              className="w-3.5 h-3.5 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                              />
                            </svg>
                          </div>
                        );
                      }

                      return (
                        <button
                          key={spec.id}
                          type="button"
                          onClick={() => handleSpecSelect(spec.id)}
                          className={`w-full px-3 py-1.5 text-sm text-left hover:bg-blue-50 ${
                            globalSpecs?.steelSpecificationId === spec.id
                              ? "bg-blue-100 text-blue-800"
                              : "text-gray-900"
                          }`}
                        >
                          {spec.steelSpecName}
                        </button>
                      );
                    })}
                    {unsuitableSpecs.map((spec) => {
                      const isAllowedForUnregistered = isSteelSpecAllowedForUnregistered(
                        spec.steelSpecName || "",
                      );
                      const isRestricted = isUnregisteredCustomer && !isAllowedForUnregistered;

                      return (
                        <div
                          key={spec.id}
                          onClick={isRestricted ? showRestrictionPopup : undefined}
                          onMouseEnter={isRestricted ? showRestrictionPopup : undefined}
                          className="w-full px-3 py-1.5 text-sm text-left text-gray-400 cursor-not-allowed flex items-center justify-between"
                        >
                          <span>
                            {spec.steelSpecName}
                            {limitsText(spec.steelSpecName)} - NOT SUITABLE
                          </span>
                          {isRestricted && (
                            <svg
                              className="w-3.5 h-3.5 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                              />
                            </svg>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
          {globalSpecs?.steelSpecificationId &&
            (globalSpecs?.workingPressureBar || globalSpecs?.workingTemperatureC) &&
            (() => {
              const currentSpec = masterData.steelSpecs?.find(
                (s) => s.id === globalSpecs.steelSpecificationId,
              );
              if (!currentSpec) return null;
              if (!allLimits) return null;
              const suitability = checkSuitabilityFromCache(
                allLimits,
                currentSpec.steelSpecName,
                globalSpecs?.workingTemperatureC,
                globalSpecs?.workingPressureBar,
              );
              if (suitability.isSuitable) {
                return (
                  <p className="mt-1 text-xs text-green-600 flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Suitable for {globalSpecs.workingTemperatureC}°C /{" "}
                    {globalSpecs.workingPressureBar} bar
                  </p>
                );
              } else {
                return (
                  <p className="mt-1 text-xs text-red-600 flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Not recommended for current conditions
                  </p>
                );
              }
            })()}
        </div>

        <div ref={flangeStandardDropdownRef} className="relative">
          <label className="block text-xs font-semibold text-gray-900 mb-1">
            Flange Standard <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={() => setFlangeStandardDropdownOpen(!flangeStandardDropdownOpen)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-left flex items-center justify-between bg-white"
          >
            <span className={globalSpecs?.flangeStandardId ? "text-gray-900" : "text-gray-400"}>
              {globalSpecs?.flangeStandardId === "PE"
                ? "Plain Ended (No Flanges)"
                : globalSpecs?.flangeStandardId
                  ? masterData.flangeStandards?.find((s) => s.id === globalSpecs.flangeStandardId)
                      ?.code || "Select flange standard..."
                  : "Select flange standard..."}
            </span>
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${flangeStandardDropdownOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {flangeStandardDropdownOpen && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
              <button
                type="button"
                onClick={() => handleFlangeStandardSelect("PE")}
                className={`w-full px-3 py-2 text-sm text-left hover:bg-blue-50 ${
                  globalSpecs?.flangeStandardId === "PE"
                    ? "bg-blue-100 text-blue-800"
                    : "text-gray-900"
                }`}
              >
                Plain Ended (No Flanges)
              </button>
              {masterData.flangeStandards?.map((standard) => {
                const isAllowed = isFlangeStandardAllowedForUnregistered(standard.code);
                const isRestricted = isUnregisteredCustomer && !isAllowed;

                if (isRestricted) {
                  return (
                    <div
                      key={standard.id}
                      onClick={showRestrictionPopup}
                      onMouseEnter={showRestrictionPopup}
                      className="w-full px-3 py-2 text-sm text-left text-gray-400 cursor-not-allowed hover:bg-gray-100 flex items-center justify-between"
                    >
                      <span>{standard.code}</span>
                      <svg
                        className="w-3.5 h-3.5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    </div>
                  );
                }

                return (
                  <button
                    key={standard.id}
                    type="button"
                    onClick={() => handleFlangeStandardSelect(standard.id)}
                    className={`w-full px-3 py-2 text-sm text-left hover:bg-blue-50 ${
                      globalSpecs?.flangeStandardId === standard.id
                        ? "bg-blue-100 text-blue-800"
                        : "text-gray-900"
                    }`}
                  >
                    {standard.code}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1">
            Pressure Class <span className="text-red-500">*</span>
            {globalSpecs?.workingPressureBar &&
              globalSpecs?.flangeStandardId !== "PE" &&
              (pressureClassOverrideStatus.isOverride ? (
                <span
                  className={`ml-1 text-xs font-normal ${
                    pressureClassOverrideStatus.isLower || isPressureClassUnsuitable
                      ? "text-red-600"
                      : pressureClassOverrideStatus.isHigher
                        ? "text-orange-500"
                        : "text-blue-600"
                  }`}
                >
                  (Override)
                </span>
              ) : (
                <span className="ml-1 text-xs text-blue-600 font-normal">(auto)</span>
              ))}
          </label>
          {globalSpecs?.flangeStandardId === "PE" ? (
            <div className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-gray-100 text-gray-700">
              P/E (Plain Ended)
            </div>
          ) : (
            <>
              <select
                value={globalSpecs?.flangePressureClassId || ""}
                onChange={(e) =>
                  onUpdateGlobalSpecs({
                    ...globalSpecs,
                    flangePressureClassId: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 ${
                  isPressureClassUnsuitable
                    ? "border-red-500 bg-red-50"
                    : isPressureClassMissingPTData
                      ? "border-amber-500 bg-amber-50"
                      : ptRecommendations?.validation && !ptRecommendations.validation.isValid
                        ? "border-amber-500 bg-amber-50"
                        : "border-gray-300"
                }`}
                disabled={!globalSpecs?.flangeStandardId}
                required
              >
                <option value="">Select class...</option>
                {(() => {
                  const seen = new Set<string>();
                  const isSabs1123 = standardCode.includes("SABS 1123");
                  const extractNumeric = (designation: string) => {
                    const match = designation?.match(/^(\d+)/);
                    return match ? parseInt(match[1], 10) : 0;
                  };
                  return [...availablePressureClasses]
                    .sort((a, b) => {
                      const numA = extractNumeric(a.designation);
                      const numB = extractNumeric(b.designation);
                      if (numA !== numB) return numA - numB;
                      return (a.designation || "").localeCompare(b.designation || "");
                    })
                    .map((pc) => {
                      const numericPart = pc.designation.replace(/\/\d+$/, "");
                      const numericValue = extractNumeric(numericPart);
                      // SABS 1123 uses kPa (divide by 100 for bar), BS 4504 uses bar directly
                      const barValue = isSabs1123 ? numericValue / 100 : numericValue;
                      const displayValue = isSabs1123
                        ? `${numericPart} kPa (${barValue} bar)`
                        : numericPart;
                      return { ...pc, displayValue, barValue };
                    })
                    .filter((pc) => {
                      if (seen.has(pc.displayValue)) return false;
                      seen.add(pc.displayValue);
                      return true;
                    })
                    .map((pc) => {
                      const classInfo = pressureClassInfoMap.get(pc.id);
                      const hasPtData =
                        ptRecommendations && ptRecommendations.validPressureClasses.length > 0;
                      const suffix = classInfo
                        ? ptRecommendations?.recommendedPressureClassId === pc.id
                          ? " (Recommended)"
                          : !classInfo.isAdequate
                            ? " (Inadequate for P-T)"
                            : ""
                        : hasPtData
                          ? " (No P-T data)"
                          : "";
                      return (
                        <option key={pc.id} value={pc.id}>
                          {pc.displayValue}
                          {suffix}
                        </option>
                      );
                    });
                })()}
              </select>
              {isPressureClassUnsuitable && (
                <div className="mt-1.5 p-2 bg-red-50 border border-red-300 rounded text-xs">
                  <div className="flex items-start gap-2">
                    <svg
                      className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div className="flex-1">
                      <p className="text-red-800 font-medium">
                        The selected pressure class is unsuitable for the operating conditions (P-T
                        rating inadequate).
                      </p>
                      {autoPressureClassId && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateGlobalSpecs({
                              ...globalSpecs,
                              flangePressureClassId: autoPressureClassId,
                            })
                          }
                          className="mt-1 px-2 py-0.5 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                        >
                          Revert to Recommended Class
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {!isPressureClassUnsuitable && isPressureClassMissingPTData && (
                <div className="mt-1.5 p-2 bg-amber-50 border border-amber-300 rounded text-xs">
                  <div className="flex items-start gap-2">
                    <svg
                      className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div className="flex-1">
                      <p className="text-amber-800 font-medium">
                        No P-T rating data available for this pressure class. Cannot verify
                        suitability for operating conditions.
                      </p>
                      {autoPressureClassId && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateGlobalSpecs({
                              ...globalSpecs,
                              flangePressureClassId: autoPressureClassId,
                            })
                          }
                          className="mt-1 px-2 py-0.5 bg-amber-600 text-white rounded text-xs hover:bg-amber-700"
                        >
                          Use Recommended Class
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {!isPressureClassUnsuitable &&
                !isPressureClassMissingPTData &&
                ptRecommendations?.validation &&
                !ptRecommendations.validation.isValid && (
                  <div className="mt-1.5 p-2 bg-amber-50 border border-amber-300 rounded text-xs">
                    <div className="flex items-start gap-2">
                      <svg
                        className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div className="flex-1">
                        <p className="text-amber-800 font-medium">
                          {ptRecommendations.validation.warningMessage}
                        </p>
                        {ptRecommendations.recommendedPressureClassId && (
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateGlobalSpecs({
                                ...globalSpecs,
                                flangePressureClassId: ptRecommendations.recommendedPressureClassId,
                              })
                            }
                            className="mt-1 px-2 py-0.5 bg-amber-600 text-white rounded text-xs hover:bg-amber-700"
                          >
                            Use Recommended Class
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
            </>
          )}
        </div>

        {flangeTypesForSelected && (
          <div>
            <label className="block text-xs font-semibold text-gray-900 mb-1">Flange Type *</label>
            <select
              value={globalSpecs?.flangeTypeCode || ""}
              onChange={(e) => {
                const newFlangeTypeCode = e.target.value || undefined;
                let newPressureClassId = globalSpecs?.flangePressureClassId;

                if (
                  newFlangeTypeCode &&
                  globalSpecs?.flangePressureClassId &&
                  availablePressureClasses?.length > 0
                ) {
                  const currentPressureClass = availablePressureClasses.find(
                    (pc) => pc.id === globalSpecs.flangePressureClassId,
                  );
                  if (currentPressureClass?.designation) {
                    const basePressure = currentPressureClass.designation.replace(/\/\d+$/, "");
                    const targetDesignation = `${basePressure}/${newFlangeTypeCode}`;
                    const matchingClass = availablePressureClasses.find(
                      (pc) => pc.designation === targetDesignation,
                    );
                    if (matchingClass) {
                      newPressureClassId = matchingClass.id;
                    }
                  }
                }

                onUpdateGlobalSpecs({
                  ...globalSpecs,
                  flangeTypeCode: newFlangeTypeCode,
                  flangePressureClassId: newPressureClassId,
                });
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
              required
            >
              <option value="">Select type...</option>
              {flangeTypesForSelected.map((ft) => (
                <option key={ft.code} value={ft.code}>
                  {ft.code} - {ft.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
