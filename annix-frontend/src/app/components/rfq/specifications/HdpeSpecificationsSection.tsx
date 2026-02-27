"use client";

import React, { useEffect, useMemo, useState } from "react";
import { type FlangePressureClass, masterDataApi } from "@/app/lib/api/client";
import {
  HDPE_FLANGE_DRILLING_OPTIONS,
  HDPE_FLANGE_OPTIONS,
  HDPE_JOINING_OPTIONS,
  HDPE_MATERIALS,
  HDPE_SDR_OPTIONS,
  type HdpeFlangeDrillingStandard,
  type HdpeFlangeType,
  type HdpeGrade,
  type HdpeJoiningMethod,
  type HdpeSdr,
  hdpePressureRatingForSdr,
  hdpeWallThickness,
} from "@/app/lib/config/rfq/hdpe";
import {
  deratedPressure,
  HDPE_TEMPERATURE_DERATING,
} from "@/app/lib/config/rfq/hdpeTemperatureDerating";
import {
  WELDING_STANDARD_LIST,
  WELDING_STANDARDS,
  type WeldingStandardCode,
} from "@/app/lib/config/rfq/hdpeWeldingStandards";
import type { GlobalSpecs } from "@/app/lib/hooks/useRfqForm";
import { flangeTypesForStandardCode, useAllFlangeTypes } from "@/app/lib/query/hooks";

interface FlangeStandard {
  id: number;
  code: string;
}

export interface HdpeSpecificationsSectionProps {
  globalSpecs: GlobalSpecs;
  onUpdateGlobalSpecs: (specs: GlobalSpecs) => void;
  flangeStandards?: FlangeStandard[];
}

interface ColorOption {
  value: "black" | "blue" | "yellow" | "orange" | "green";
  label: string;
  bgClass: string;
  textClass: string;
  description: string;
  application: string;
}

const COLOR_OPTIONS: ColorOption[] = [
  {
    value: "black",
    label: "Black",
    bgClass: "bg-gray-900",
    textClass: "text-white",
    description: "Standard industrial",
    application: "General industrial, mining, slurry",
  },
  {
    value: "blue",
    label: "Blue",
    bgClass: "bg-blue-500",
    textClass: "text-white",
    description: "Potable water",
    application: "Drinking water systems",
  },
  {
    value: "yellow",
    label: "Yellow",
    bgClass: "bg-yellow-400",
    textClass: "text-gray-900",
    description: "Gas distribution",
    application: "Natural gas and LPG",
  },
  {
    value: "orange",
    label: "Orange",
    bgClass: "bg-orange-500",
    textClass: "text-white",
    description: "Electrical conduit",
    application: "Cable protection",
  },
  {
    value: "green",
    label: "Green",
    bgClass: "bg-green-600",
    textClass: "text-white",
    description: "Sewer/drainage",
    application: "Sewerage and drainage systems",
  },
];

export function HdpeSpecificationsSection({
  globalSpecs,
  onUpdateGlobalSpecs,
  flangeStandards = [],
}: HdpeSpecificationsSectionProps) {
  const selectedGrade = globalSpecs.hdpeGrade ?? "PE100";
  const selectedSdr = globalSpecs.hdpeSdr;
  const operatingTemp = globalSpecs.hdpeOperatingTempC ?? 20;
  const selectedColorCode = globalSpecs.hdpeColorCode ?? "black";
  const selectedWeldingStandard = globalSpecs.hdpeWeldingStandard ?? "ISO_21307";

  const [availablePressureClasses, setAvailablePressureClasses] = useState<FlangePressureClass[]>(
    [],
  );
  const [isLoadingPressureClasses, setIsLoadingPressureClasses] = useState(false);
  const { data: allFlangeTypes = [] } = useAllFlangeTypes();

  const selectedSteelFlangeStandardId = globalSpecs.hdpeSteelFlangeStandardId;
  const selectedSteelFlangePressureClassId = globalSpecs.hdpeSteelFlangePressureClassId;
  const selectedSteelFlangeTypeCode = globalSpecs.hdpeSteelFlangeTypeCode;

  const selectedStandardCode = useMemo(() => {
    const standard = flangeStandards.find((s) => s.id === selectedSteelFlangeStandardId);
    return standard?.code || "";
  }, [flangeStandards, selectedSteelFlangeStandardId]);

  const availableFlangeTypes = useMemo(() => {
    if (!selectedStandardCode) return [];
    return flangeTypesForStandardCode(allFlangeTypes, selectedStandardCode) || [];
  }, [allFlangeTypes, selectedStandardCode]);

  useEffect(() => {
    const fetchPressureClasses = async () => {
      if (!selectedSteelFlangeStandardId) {
        setAvailablePressureClasses([]);
        return;
      }

      setIsLoadingPressureClasses(true);
      try {
        const classes = await masterDataApi.getFlangePressureClassesByStandard(
          selectedSteelFlangeStandardId,
        );
        setAvailablePressureClasses(classes);
      } catch {
        setAvailablePressureClasses([]);
      } finally {
        setIsLoadingPressureClasses(false);
      }
    };

    fetchPressureClasses();
  }, [selectedSteelFlangeStandardId]);

  const basePressureRating =
    selectedSdr && selectedGrade
      ? hdpePressureRatingForSdr(selectedSdr as HdpeSdr, selectedGrade)
      : null;

  const deratingResult = basePressureRating
    ? deratedPressure(basePressureRating, operatingTemp)
    : null;

  const sampleOd = 110;
  const wallThickness = selectedSdr ? hdpeWallThickness(sampleOd, selectedSdr as HdpeSdr) : null;
  const innerDiameter = wallThickness ? sampleOd - 2 * wallThickness : null;

  const selectedMaterial = HDPE_MATERIALS.find((m) => m.id === selectedGrade);
  const density = selectedMaterial?.densityKgM3 ?? 950;
  const weightPerMeter =
    wallThickness && innerDiameter
      ? ((Math.PI * (sampleOd ** 2 - innerDiameter ** 2)) / 4) * (density / 1e6)
      : null;

  const maxTempForGrade = selectedMaterial?.maxTemperatureC ?? 60;
  const temperatureOptions = HDPE_TEMPERATURE_DERATING.filter(
    (point) => point.temperatureC <= maxTempForGrade,
  );

  const handleGradeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const grade = e.target.value as HdpeGrade;
    onUpdateGlobalSpecs({
      ...globalSpecs,
      hdpeGrade: grade,
      hdpePressureRating: selectedSdr
        ? `PN${hdpePressureRatingForSdr(selectedSdr as HdpeSdr, grade)}`
        : undefined,
    });
  };

  const handleSdrChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sdr = e.target.value ? (parseFloat(e.target.value) as HdpeSdr) : undefined;
    onUpdateGlobalSpecs({
      ...globalSpecs,
      hdpeSdr: sdr,
      hdpePressureRating:
        sdr && selectedGrade ? `PN${hdpePressureRatingForSdr(sdr, selectedGrade)}` : undefined,
    });
  };

  const handleJoiningMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const method = e.target.value as HdpeJoiningMethod;
    onUpdateGlobalSpecs({
      ...globalSpecs,
      hdpeJoiningMethod: method || undefined,
    });
  };

  const handleOperatingTempChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const temp = e.target.value ? parseInt(e.target.value, 10) : undefined;
    onUpdateGlobalSpecs({
      ...globalSpecs,
      hdpeOperatingTempC: temp,
    });
  };

  const handleColorCodeChange = (colorValue: ColorOption["value"]) => {
    onUpdateGlobalSpecs({
      ...globalSpecs,
      hdpeColorCode: colorValue,
    });
  };

  const handleWeldingStandardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const standard = e.target.value as WeldingStandardCode;
    onUpdateGlobalSpecs({
      ...globalSpecs,
      hdpeWeldingStandard: standard,
    });
  };

  const handleFlangeTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const flangeType = e.target.value as HdpeFlangeType;
    const needsDrilling = flangeType !== "none";
    onUpdateGlobalSpecs({
      ...globalSpecs,
      hdpeFlangeType: flangeType || undefined,
      hdpeFlangeDrillingStandard: needsDrilling
        ? (globalSpecs.hdpeFlangeDrillingStandard ?? "SANS1123")
        : undefined,
    });
  };

  const handleFlangeDrillingStandardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const drilling = e.target.value as HdpeFlangeDrillingStandard;
    onUpdateGlobalSpecs({
      ...globalSpecs,
      hdpeFlangeDrillingStandard: drilling,
    });
  };

  const handleSteelFlangeStandardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const standardId = e.target.value ? parseInt(e.target.value, 10) : undefined;
    onUpdateGlobalSpecs({
      ...globalSpecs,
      hdpeSteelFlangeStandardId: standardId,
      hdpeSteelFlangePressureClassId: undefined,
      hdpeSteelFlangeTypeCode: undefined,
    });
  };

  const handleSteelFlangePressureClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const classId = e.target.value ? parseInt(e.target.value, 10) : undefined;
    onUpdateGlobalSpecs({
      ...globalSpecs,
      hdpeSteelFlangePressureClassId: classId,
    });
  };

  const handleSteelFlangeTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const typeCode = e.target.value || undefined;
    onUpdateGlobalSpecs({
      ...globalSpecs,
      hdpeSteelFlangeTypeCode: typeCode,
    });
  };

  const requiresSteelBackingFlange =
    globalSpecs.hdpeFlangeType === "stub_backing_steel" ||
    globalSpecs.hdpeFlangeType === "stub_backing_gi" ||
    globalSpecs.hdpeFlangeType === "stub_backing_ss";

  const isComplete = globalSpecs.hdpeGrade && globalSpecs.hdpeSdr && globalSpecs.hdpeJoiningMethod;

  const selectedWeldingStandardData = WELDING_STANDARDS[selectedWeldingStandard];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs flex items-center justify-center">
            PE
          </span>
          HDPE Pipe Specifications
        </h3>
        {isComplete && (
          <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
            Complete
          </span>
        )}
      </div>

      {/* Primary Specifications */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1">
            PE Grade <span className="text-red-600">*</span>
          </label>
          <select
            value={globalSpecs.hdpeGrade ?? ""}
            onChange={handleGradeChange}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
          >
            <option value="">Select grade...</option>
            {HDPE_MATERIALS.map((material) => (
              <option key={material.id} value={material.id}>
                {material.name}
              </option>
            ))}
          </select>
          {globalSpecs.hdpeGrade && (
            <p className="mt-1 text-xs text-gray-500">
              {HDPE_MATERIALS.find((m) => m.id === globalSpecs.hdpeGrade)?.description}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1">
            SDR (Standard Dimension Ratio) <span className="text-red-600">*</span>
          </label>
          <select
            value={globalSpecs.hdpeSdr ?? ""}
            onChange={handleSdrChange}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
          >
            <option value="">Select SDR...</option>
            {HDPE_SDR_OPTIONS.map((sdr) => (
              <option key={sdr.value} value={sdr.value}>
                {sdr.label}
              </option>
            ))}
          </select>
          {basePressureRating && (
            <p className="mt-1 text-xs text-blue-600 font-medium">
              Base pressure rating: PN{basePressureRating} ({basePressureRating} bar @ 20°C)
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1">
            Joining Method <span className="text-red-600">*</span>
          </label>
          <select
            value={globalSpecs.hdpeJoiningMethod ?? ""}
            onChange={handleJoiningMethodChange}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
          >
            <option value="">Select joining method...</option>
            {HDPE_JOINING_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {globalSpecs.hdpeJoiningMethod && (
            <p className="mt-1 text-xs text-gray-500">
              {
                HDPE_JOINING_OPTIONS.find((o) => o.value === globalSpecs.hdpeJoiningMethod)
                  ?.description
              }
            </p>
          )}
        </div>
      </div>

      {/* Flange Options */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-xs font-semibold text-gray-700 mb-3">Flange Connection Options</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-900 mb-1">Flange Type</label>
            <select
              value={globalSpecs.hdpeFlangeType ?? "none"}
              onChange={handleFlangeTypeChange}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
            >
              {HDPE_FLANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {globalSpecs.hdpeFlangeType && globalSpecs.hdpeFlangeType !== "none" && (
              <p className="mt-1 text-xs text-gray-500">
                {
                  HDPE_FLANGE_OPTIONS.find((o) => o.value === globalSpecs.hdpeFlangeType)
                    ?.description
                }
              </p>
            )}
          </div>

          {globalSpecs.hdpeFlangeType && globalSpecs.hdpeFlangeType !== "none" && (
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-1">
                Flange Drilling Standard
              </label>
              <select
                value={globalSpecs.hdpeFlangeDrillingStandard ?? "SANS1123"}
                onChange={handleFlangeDrillingStandardChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
              >
                {HDPE_FLANGE_DRILLING_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} ({option.region})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {
                  HDPE_FLANGE_DRILLING_OPTIONS.find(
                    (o) => o.value === globalSpecs.hdpeFlangeDrillingStandard,
                  )?.description
                }
              </p>
            </div>
          )}
        </div>

        {globalSpecs.hdpeFlangeType && globalSpecs.hdpeFlangeType !== "none" && (
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="text-xs font-semibold text-blue-800 mb-2">
              Flange Assembly Information
            </div>
            <div className="text-xs text-gray-700 space-y-1">
              <p>
                <span className="font-medium">Backing Material:</span>{" "}
                {
                  HDPE_FLANGE_OPTIONS.find((o) => o.value === globalSpecs.hdpeFlangeType)
                    ?.backingMaterial
                }
              </p>
              <p>
                <span className="font-medium">Pressure Ratings:</span>{" "}
                {HDPE_FLANGE_OPTIONS.find(
                  (o) => o.value === globalSpecs.hdpeFlangeType,
                )?.pressureRatings.join(", ")}
              </p>
              <p>
                <span className="font-medium">Size Range:</span> DN
                {
                  HDPE_FLANGE_OPTIONS.find((o) => o.value === globalSpecs.hdpeFlangeType)
                    ?.suitableForSizes.min
                }{" "}
                - DN
                {
                  HDPE_FLANGE_OPTIONS.find((o) => o.value === globalSpecs.hdpeFlangeType)
                    ?.suitableForSizes.max
                }
              </p>
            </div>
          </div>
        )}

        {/* Welding Standard - shown for butt_fusion or electrofusion joining methods */}
        {(globalSpecs.hdpeJoiningMethod === "butt_fusion" ||
          globalSpecs.hdpeJoiningMethod === "electrofusion") && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-1">
                  Welding Standard
                </label>
                <select
                  value={selectedWeldingStandard}
                  onChange={handleWeldingStandardChange}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                >
                  {WELDING_STANDARD_LIST.map((code) => {
                    const std = WELDING_STANDARDS[code];
                    return (
                      <option key={code} value={code}>
                        {std.name} ({std.region})
                      </option>
                    );
                  })}
                </select>
                {selectedWeldingStandardData && (
                  <p className="mt-1 text-xs text-gray-500">
                    {selectedWeldingStandardData.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Operating Temperature with Derating */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-xs font-semibold text-gray-700 mb-3">
          Operating Temperature & Derating
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-900 mb-1">
              Operating Temperature (°C)
            </label>
            <select
              value={operatingTemp}
              onChange={handleOperatingTempChange}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
            >
              {temperatureOptions.map((point) => (
                <option key={point.temperatureC} value={point.temperatureC}>
                  {point.temperatureC}°C (derating factor: {point.factor.toFixed(2)})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Max for {selectedGrade}: {maxTempForGrade}°C
            </p>
          </div>
          <div className="bg-gray-50 rounded-md p-3">
            <div className="text-xs font-semibold text-gray-700 mb-2">Derating Preview</div>
            {deratingResult ? (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Derating Factor:</span>
                  <span
                    className={`font-medium ${deratingResult.factor < 0.8 ? "text-orange-600" : "text-gray-900"}`}
                  >
                    {deratingResult.factor.toFixed(3)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Derated Pressure:</span>
                  <span
                    className={`font-bold ${deratingResult.deratedPnBar < (basePressureRating ?? 0) * 0.8 ? "text-orange-600" : "text-blue-600"}`}
                  >
                    PN{deratingResult.deratedPnBar} ({deratingResult.deratedPnBar} bar)
                  </span>
                </div>
                {deratingResult.warning && (
                  <p className="text-xs text-orange-600 mt-2">{deratingResult.warning}</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-500">Select SDR to see derated pressure</p>
            )}
          </div>
        </div>

        {/* Derating Reference Table */}
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-2 py-1 text-left text-gray-600">Temp (°C)</th>
                {HDPE_TEMPERATURE_DERATING.map((point) => (
                  <th
                    key={point.temperatureC}
                    className={`px-2 py-1 text-center ${point.temperatureC === operatingTemp ? "bg-blue-100 text-blue-800" : "text-gray-600"}`}
                  >
                    {point.temperatureC}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-2 py-1 text-gray-600">Factor</td>
                {HDPE_TEMPERATURE_DERATING.map((point) => (
                  <td
                    key={point.temperatureC}
                    className={`px-2 py-1 text-center ${point.temperatureC === operatingTemp ? "bg-blue-100 font-bold text-blue-800" : "text-gray-900"}`}
                  >
                    {point.factor.toFixed(2)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Steel Backing Flange Specifications - shown when flange type requires steel backing */}
      {requiresSteelBackingFlange && (
        <div className="border-t border-gray-200 pt-4">
          <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
            <h4 className="text-xs font-semibold text-amber-800 mb-2">
              Steel Backing Flange Specifications
            </h4>
            <p className="text-xs text-gray-600 mb-3">
              Specify the steel flange that will mate with the HDPE stub flange.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-1">
                  Flange Standard
                </label>
                <select
                  value={selectedSteelFlangeStandardId ?? ""}
                  onChange={handleSteelFlangeStandardChange}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                >
                  <option value="">Select standard...</option>
                  {flangeStandards.map((standard) => (
                    <option key={standard.id} value={standard.id}>
                      {standard.code}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-1">
                  Pressure Class
                </label>
                <select
                  value={selectedSteelFlangePressureClassId ?? ""}
                  onChange={handleSteelFlangePressureClassChange}
                  disabled={!selectedSteelFlangeStandardId || isLoadingPressureClasses}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {isLoadingPressureClasses
                      ? "Loading..."
                      : !selectedSteelFlangeStandardId
                        ? "Select standard first"
                        : "Select pressure class..."}
                  </option>
                  {availablePressureClasses.map((pc) => (
                    <option key={pc.id} value={pc.id}>
                      {pc.designation}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-1">
                  Flange Type
                </label>
                <select
                  value={selectedSteelFlangeTypeCode ?? ""}
                  onChange={handleSteelFlangeTypeChange}
                  disabled={!selectedSteelFlangeStandardId || availableFlangeTypes.length === 0}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {availableFlangeTypes.length === 0
                      ? "Select standard first"
                      : "Select flange type..."}
                  </option>
                  {availableFlangeTypes.map((ft) => (
                    <option key={ft.code} value={ft.code}>
                      {ft.name}
                    </option>
                  ))}
                </select>
                {selectedSteelFlangeTypeCode && (
                  <p className="mt-1 text-xs text-gray-500">
                    {availableFlangeTypes.find((ft) => ft.code === selectedSteelFlangeTypeCode)
                      ?.description || ""}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Color Code Selection */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-xs font-semibold text-gray-700 mb-3">Pipe Color Code</h4>
        <div className="flex flex-wrap gap-2">
          {COLOR_OPTIONS.map((color) => (
            <button
              key={color.value}
              type="button"
              onClick={() => handleColorCodeChange(color.value)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md border-2 transition-all ${
                selectedColorCode === color.value
                  ? `${color.bgClass} ${color.textClass} border-gray-900`
                  : "bg-white border-gray-300 hover:border-gray-400"
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full ${color.bgClass} ${selectedColorCode !== color.value ? "border border-gray-400" : ""}`}
              />
              <span
                className={`text-xs font-medium ${selectedColorCode === color.value ? color.textClass : "text-gray-700"}`}
              >
                {color.label}
              </span>
            </button>
          ))}
        </div>
        {selectedColorCode && (
          <p className="mt-2 text-xs text-gray-500">
            {COLOR_OPTIONS.find((c) => c.value === selectedColorCode)?.description} -{" "}
            {COLOR_OPTIONS.find((c) => c.value === selectedColorCode)?.application}
          </p>
        )}
      </div>

      {/* Material Properties & Calculations */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-xs font-semibold text-gray-700 mb-2">Material Properties</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-gray-500">Density:</span>
            <span className="ml-1 text-gray-900">
              {HDPE_MATERIALS.find((m) => m.id === globalSpecs.hdpeGrade)?.densityKgM3 ?? "-"} kg/m³
            </span>
          </div>
          <div>
            <span className="text-gray-500">Max Temp:</span>
            <span className="ml-1 text-gray-900">
              {HDPE_MATERIALS.find((m) => m.id === globalSpecs.hdpeGrade)?.maxTemperatureC ?? "-"}°C
            </span>
          </div>
          <div>
            <span className="text-gray-500">Min Design Stress:</span>
            <span className="ml-1 text-gray-900">
              {HDPE_MATERIALS.find((m) => m.id === globalSpecs.hdpeGrade)?.minDesignStress ?? "-"}{" "}
              MPa
            </span>
          </div>
          <div>
            <span className="text-gray-500">Pressure Rating:</span>
            <span className="ml-1 text-gray-900">
              {deratingResult
                ? `PN${deratingResult.deratedPnBar}`
                : basePressureRating
                  ? `PN${basePressureRating}`
                  : "-"}
            </span>
          </div>
        </div>
      </div>

      {/* Calculations Display (for reference DN110 pipe) */}
      {selectedSdr && (
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-xs font-semibold text-gray-700 mb-2">
            Sample Calculations (DN{sampleOd})
          </h4>
          <div className="bg-gray-50 rounded-md p-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-gray-500">Outside Diameter:</span>
                <span className="ml-1 font-medium text-gray-900">{sampleOd} mm</span>
              </div>
              <div>
                <span className="text-gray-500">Wall Thickness:</span>
                <span className="ml-1 font-medium text-gray-900">
                  {wallThickness?.toFixed(1) ?? "-"} mm
                </span>
              </div>
              <div>
                <span className="text-gray-500">Inside Diameter:</span>
                <span className="ml-1 font-medium text-gray-900">
                  {innerDiameter?.toFixed(1) ?? "-"} mm
                </span>
              </div>
              <div>
                <span className="text-gray-500">Weight:</span>
                <span className="ml-1 font-medium text-gray-900">
                  {weightPerMeter?.toFixed(2) ?? "-"} kg/m
                </span>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Wall thickness = OD / SDR = {sampleOd} / {selectedSdr} ={" "}
              {(sampleOd / selectedSdr).toFixed(1)} mm
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
