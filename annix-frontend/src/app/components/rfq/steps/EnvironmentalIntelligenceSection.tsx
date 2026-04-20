"use client";

import React from "react";
import {
  AutoFilledDisplay,
  AutoFilledInput,
  AutoFilledSelect,
} from "@/app/components/rfq/shared/AutoFilledField";
import { log } from "@/app/lib/logger";

interface EnvironmentalIntelligenceSectionProps {
  globalSpecs: any;
  rfqData: any;
  isUnregisteredCustomer: boolean;
  isLoadingEnvironmental: boolean;
  environmentalErrors: string[];
  environmentalConfirmed: boolean;
  isEditingEnvironmental: boolean;
  isEnvironmentalLocked: boolean;
  wasAutoFilled: (fieldName: string) => boolean;
  markAsOverridden: (fieldName: string) => void;
  updateEnvironmentalField: (field: string, value: any) => void;
  onUpdateGlobalSpecs: (specs: any) => void;
  onUpdate: (field: string, value: any) => void;
  handleConfirmEnvironmental: () => void;
  handleEditEnvironmental: () => void;
  hasRequiredEnvironmentalData: () => boolean;
  showRestrictionTooltip: (e: React.MouseEvent) => void;
  hideRestrictionTooltip: () => void;
}

export default function EnvironmentalIntelligenceSection(
  props: EnvironmentalIntelligenceSectionProps,
) {
  const globalSpecs = props.globalSpecs;
  const rfqData = props.rfqData;
  const isUnregisteredCustomer = props.isUnregisteredCustomer;
  const isLoadingEnvironmental = props.isLoadingEnvironmental;
  const environmentalErrors = props.environmentalErrors;
  const environmentalConfirmed = props.environmentalConfirmed;
  const isEditingEnvironmental = props.isEditingEnvironmental;
  const isEnvironmentalLocked = props.isEnvironmentalLocked;
  const wasAutoFilled = props.wasAutoFilled;
  const markAsOverridden = props.markAsOverridden;
  const updateEnvironmentalField = props.updateEnvironmentalField;
  const onUpdateGlobalSpecs = props.onUpdateGlobalSpecs;
  const onUpdate = props.onUpdate;
  const handleConfirmEnvironmental = props.handleConfirmEnvironmental;
  const handleEditEnvironmental = props.handleEditEnvironmental;
  const hasRequiredEnvironmentalData = props.hasRequiredEnvironmentalData;
  const showRestrictionTooltip = props.showRestrictionTooltip;
  const hideRestrictionTooltip = props.hideRestrictionTooltip;

  const rawSoilType = globalSpecs?.soilType;
  const rawSoilTexture = globalSpecs?.soilTexture;
  const rawSoilMoistureClass = globalSpecs?.soilMoistureClass;
  const rawSoilDrainage = globalSpecs?.soilDrainage;
  const rawAnnualRainfall = globalSpecs?.annualRainfall;
  const rawTempMin = globalSpecs?.tempMin;
  const rawTempMean = globalSpecs?.tempMean;
  const rawTempMax = globalSpecs?.tempMax;
  const rawHumidityMean = globalSpecs?.humidityMean;
  const rawUvExposure = globalSpecs?.uvExposure;
  const rawDetailedMarineInfluence = globalSpecs?.detailedMarineInfluence;
  const rawFloodRisk = globalSpecs?.floodRisk;
  const rawEcpIndustrialPollution = globalSpecs?.ecpIndustrialPollution;
  const rawSoilCorrosivity = rfqData.soilCorrosivity;
  const rawEcpIso12944Category = globalSpecs?.ecpIso12944Category;
  const rawEnvironmentSeverity = rfqData.environmentSeverity;
  const rawRecommendedCoatingFamily = rfqData.recommendedCoatingFamily;
  const rawMinCoatingThickness = rfqData.minCoatingThickness;
  const rawSurfacePrep = rfqData.surfacePrep;
  const rawCpCompatibility = rfqData.cpCompatibility;
  const rawRequiresConcreteCoating = rfqData.requiresConcreteCoating;
  const rawRequiresRockShield = rfqData.requiresRockShield;
  const rawRequiresHolidayDetection = rfqData.requiresHolidayDetection;
  const rawRequiresFieldJointCoating = rfqData.requiresFieldJointCoating;

  const airSaltContentDisplay = globalSpecs?.airSaltContent
    ? `${globalSpecs.airSaltContent.level} (${globalSpecs.airSaltContent.isoCategory})`
    : undefined;

  const timeOfWetnessDisplay = globalSpecs?.timeOfWetness
    ? `${globalSpecs.timeOfWetness.level} (${globalSpecs.timeOfWetness.isoCategory})`
    : undefined;

  const distanceToCoastFormatted = globalSpecs?.distanceToCoastFormatted;

  return (
    <>
      {isLoadingEnvironmental && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200 mt-4">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm text-blue-700">
            Fetching environmental data for your location...
          </span>
        </div>
      )}

      {!isLoadingEnvironmental && environmentalErrors.length > 0 && (
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 mt-4">
          <div className="flex items-center gap-2 mb-1">
            <svg
              className="w-5 h-5 text-amber-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span className="text-sm font-medium text-amber-700">
              Some environmental data could not be retrieved
            </span>
          </div>
          <ul className="text-xs text-amber-600 ml-7 list-disc list-inside">
            {environmentalErrors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
          <p className="text-xs text-amber-600 mt-1 ml-7">
            Please fill in missing fields manually in the Environmental Intelligence section below.
          </p>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-300">
        {isUnregisteredCustomer ? (
          <div
            onMouseEnter={showRestrictionTooltip}
            onMouseLeave={hideRestrictionTooltip}
            className="bg-gray-100 rounded-lg p-3 border border-gray-300 opacity-60 cursor-not-allowed"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-gray-400 rounded">
                <svg
                  className="w-4 h-4 text-white"
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
              <div>
                <h3 className="text-sm font-bold text-gray-500">Environmental Intelligence</h3>
                <p className="text-xs text-gray-400">Pipeline Corrosion & Coating Data</p>
              </div>
              <div className="ml-auto">
                <span className="text-xs bg-gray-200 text-gray-500 px-2 py-1 rounded-full font-medium">
                  Registered Users Only
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Register or login to access Environmental Intelligence features including automatic
              soil analysis, climate data, and ISO 12944 corrosivity classification.
            </p>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-blue-600 rounded">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Environmental Intelligence</h3>
                <p className="text-xs text-gray-600">Pipeline Corrosion & Coating Data</p>
              </div>
            </div>

            <div className="bg-white rounded p-2 border border-gray-200">
              <div className="grid grid-cols-4 gap-1 mb-1">
                <div className="hidden">
                  <AutoFilledInput
                    type="text"
                    value={rawSoilType || ""}
                    onChange={(value) => updateEnvironmentalField("soilType", value)}
                    onOverride={() => markAsOverridden("soilType")}
                    isAutoFilled={wasAutoFilled("soilType")}
                    placeholder="Soil type"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Soil Texture</label>
                  <AutoFilledSelect
                    value={rawSoilTexture || ""}
                    onChange={(value) => updateEnvironmentalField("soilTexture", value)}
                    onOverride={() => markAsOverridden("soilTexture")}
                    isAutoFilled={wasAutoFilled("soilTexture")}
                    disabled={isEnvironmentalLocked}
                  >
                    <option value="">Select...</option>
                    <option value="Unknown">Unknown</option>
                    <option value="Sand">Sand</option>
                    <option value="Loamy Sand">Loamy Sand</option>
                    <option value="Sandy Loam">Sandy Loam</option>
                    <option value="Loam">Loam</option>
                    <option value="Silt Loam">Silt Loam</option>
                    <option value="Silt">Silt</option>
                    <option value="Sandy Clay Loam">Sandy Clay Loam</option>
                    <option value="Clay Loam">Clay Loam</option>
                    <option value="Silty Clay Loam">Silty Clay Loam</option>
                    <option value="Sandy Clay">Sandy Clay</option>
                    <option value="Silty Clay">Silty Clay</option>
                    <option value="Clay">Clay</option>
                  </AutoFilledSelect>
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Moisture</label>
                  <AutoFilledSelect
                    value={rawSoilMoistureClass || ""}
                    onChange={(value) => updateEnvironmentalField("soilMoistureClass", value)}
                    onOverride={() => markAsOverridden("soilMoistureClass")}
                    isAutoFilled={wasAutoFilled("soilMoistureClass")}
                    disabled={isEnvironmentalLocked}
                  >
                    <option value="">Select...</option>
                    <option value="Unknown">Unknown</option>
                    <option value="Low">Low</option>
                    <option value="Moderate">Moderate</option>
                    <option value="High">High</option>
                  </AutoFilledSelect>
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Drainage</label>
                  <AutoFilledSelect
                    value={rawSoilDrainage || ""}
                    onChange={(value) => updateEnvironmentalField("soilDrainage", value)}
                    onOverride={() => markAsOverridden("soilDrainage")}
                    isAutoFilled={wasAutoFilled("soilDrainage")}
                    disabled={isEnvironmentalLocked}
                  >
                    <option value="">Select...</option>
                    <option value="Unknown">Unknown</option>
                    <option value="Poor">Poor</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Well">Well</option>
                  </AutoFilledSelect>
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Rainfall</label>
                  <AutoFilledSelect
                    value={rawAnnualRainfall || ""}
                    onChange={(value) => updateEnvironmentalField("annualRainfall", value)}
                    onOverride={() => markAsOverridden("annualRainfall")}
                    isAutoFilled={wasAutoFilled("annualRainfall")}
                    disabled={isEnvironmentalLocked}
                  >
                    <option value="">Select...</option>
                    <option value="Unknown">Unknown</option>
                    <option value="<250">&lt;250mm</option>
                    <option value="250-500">250-500mm</option>
                    <option value="500-1000">500-1000mm</option>
                    <option value="1000-2000">1000-2000mm</option>
                    <option value=">2000">&gt;2000mm</option>
                  </AutoFilledSelect>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-1 mb-1">
                <div>
                  <label className="block text-xs text-gray-600">Temp Min °C</label>
                  <AutoFilledInput
                    type="number"
                    step="0.1"
                    value={rawTempMin || ""}
                    onChange={(value) => updateEnvironmentalField("tempMin", value)}
                    onOverride={() => markAsOverridden("tempMin")}
                    isAutoFilled={wasAutoFilled("tempMin")}
                    placeholder="-5"
                    disabled={isEnvironmentalLocked}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Temp Mean</label>
                  <AutoFilledInput
                    type="number"
                    step="0.1"
                    value={rawTempMean || ""}
                    onChange={(value) => updateEnvironmentalField("tempMean", value)}
                    onOverride={() => markAsOverridden("tempMean")}
                    isAutoFilled={wasAutoFilled("tempMean")}
                    placeholder="18"
                    disabled={isEnvironmentalLocked}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Temp Max</label>
                  <AutoFilledInput
                    type="number"
                    step="0.1"
                    value={rawTempMax || ""}
                    onChange={(value) => updateEnvironmentalField("tempMax", value)}
                    onOverride={() => markAsOverridden("tempMax")}
                    isAutoFilled={wasAutoFilled("tempMax")}
                    placeholder="38"
                    disabled={isEnvironmentalLocked}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Humidity %</label>
                  <AutoFilledInput
                    type="number"
                    value={rawHumidityMean || ""}
                    onChange={(value) =>
                      onUpdateGlobalSpecs({ ...globalSpecs, humidityMean: value })
                    }
                    onOverride={() => markAsOverridden("humidityMean")}
                    isAutoFilled={wasAutoFilled("humidityMean")}
                    placeholder="65"
                    disabled={isEnvironmentalLocked}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">UV Level</label>
                  <AutoFilledSelect
                    value={rawUvExposure || ""}
                    onChange={(value) => onUpdateGlobalSpecs({ ...globalSpecs, uvExposure: value })}
                    onOverride={() => markAsOverridden("uvExposure")}
                    isAutoFilled={wasAutoFilled("uvExposure")}
                    disabled={isEnvironmentalLocked}
                  >
                    <option value="">Select...</option>
                    <option value="Unknown">Unknown</option>
                    <option value="Low">Low</option>
                    <option value="Moderate">Moderate</option>
                    <option value="High">High</option>
                    <option value="Very High">Very High</option>
                  </AutoFilledSelect>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1 mb-1">
                <div>
                  <label className="block text-xs text-gray-600">Coast Distance</label>
                  <AutoFilledDisplay
                    value={distanceToCoastFormatted}
                    isAutoFilled={wasAutoFilled("distanceToCoast")}
                    label="Auto"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Marine Influence</label>
                  <AutoFilledSelect
                    value={rawDetailedMarineInfluence || ""}
                    onChange={(value) => updateEnvironmentalField("detailedMarineInfluence", value)}
                    onOverride={() => markAsOverridden("detailedMarineInfluence")}
                    isAutoFilled={wasAutoFilled("detailedMarineInfluence")}
                    disabled={isEnvironmentalLocked}
                  >
                    <option value="">Select...</option>
                    <option value="Unknown">Unknown</option>
                    <option value="Extreme Marine">Extreme (≤0.5km)</option>
                    <option value="Severe Marine">Severe (0.5-1km)</option>
                    <option value="High Marine">High (1-5km)</option>
                    <option value="Moderate Marine">Moderate (5-20km)</option>
                    <option value="Low / Non-Marine">Low (&gt;20km)</option>
                  </AutoFilledSelect>
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Air Salt Content</label>
                  <AutoFilledDisplay
                    value={airSaltContentDisplay}
                    isAutoFilled={wasAutoFilled("airSaltContent")}
                    label="Auto"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <div>
                  <label className="block text-xs text-gray-600">Flood Risk</label>
                  <AutoFilledSelect
                    value={rawFloodRisk || ""}
                    onChange={(value) => updateEnvironmentalField("floodRisk", value)}
                    onOverride={() => markAsOverridden("floodRisk")}
                    isAutoFilled={wasAutoFilled("floodRisk")}
                    disabled={isEnvironmentalLocked}
                  >
                    <option value="">Select...</option>
                    <option value="Unknown">Unknown</option>
                    <option value="None">None</option>
                    <option value="Low">Low</option>
                    <option value="Moderate">Moderate</option>
                    <option value="High">High</option>
                  </AutoFilledSelect>
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Industrial Pollution</label>
                  <AutoFilledSelect
                    value={rawEcpIndustrialPollution || ""}
                    onChange={(value) => updateEnvironmentalField("ecpIndustrialPollution", value)}
                    onOverride={() => markAsOverridden("ecpIndustrialPollution")}
                    isAutoFilled={wasAutoFilled("ecpIndustrialPollution")}
                    disabled={isEnvironmentalLocked}
                  >
                    <option value="">Select...</option>
                    <option value="Unknown">Unknown</option>
                    <option value="None">None</option>
                    <option value="Low">Low</option>
                    <option value="Moderate">Moderate</option>
                    <option value="High">High</option>
                    <option value="Very High">Very High</option>
                  </AutoFilledSelect>
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Time of Wetness</label>
                  <AutoFilledDisplay
                    value={timeOfWetnessDisplay}
                    isAutoFilled={wasAutoFilled("timeOfWetness")}
                    label="Auto"
                  />
                </div>
              </div>
            </div>

            <div className="hidden bg-white rounded-lg p-5 mb-4 border border-gray-200">
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-orange-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                Corrosion Severity Classification
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Soil Corrosivity (AMPP SP0169)
                  </label>
                  <select
                    value={rawSoilCorrosivity || ""}
                    onChange={(e) => {
                      const rawValue = e.target.value;
                      return onUpdate("soilCorrosivity", rawValue || undefined);
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  >
                    <option value="">Select soil corrosivity...</option>
                    <option value="Unknown">Unknown / Not Tested</option>
                    <option value="Mild">Mild</option>
                    <option value="Moderate">Moderately Corrosive</option>
                    <option value="Severe">Severely Corrosive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    ISO 12944 Corrosivity Category
                  </label>
                  <select
                    value={rawEcpIso12944Category || ""}
                    onChange={(e) => {
                      const rawValue2 = e.target.value;
                      const value = rawValue2 || undefined;
                      log.debug("🌍 ISO 12944 Category selected:", value);
                      updateEnvironmentalField("ecpIso12944Category", value);
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  >
                    <option value="">Select ISO 12944 category...</option>
                    <option value="Unknown">Unknown / To Be// Determined</option>
                    <option value="C1">C1 - Very Low</option>
                    <option value="C2">C2 - Low</option>
                    <option value="C3">C3 - Medium</option>
                    <option value="C4">C4 - High</option>
                    <option value="C5-I">C5-I - Very High (Industrial)</option>
                    <option value="C5-M">C5-M - Very High (Marine)</option>
                    <option value="CX">CX - Extreme</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Overall Environment Severity
                </label>
                <select
                  value={rawEnvironmentSeverity || ""}
                  onChange={(e) => {
                    const rawValue3 = e.target.value;
                    return onUpdate("environmentSeverity", rawValue3 || undefined);
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                >
                  <option value="">Select overall severity...</option>
                  <option value="Unknown">Unknown / To Be Assessed</option>
                  <option value="Low">Low - Benign conditions</option>
                  <option value="Moderate">Moderate - Standard protection required</option>
                  <option value="High">High - Enhanced protection required</option>
                  <option value="Severe">Severe - Maximum protection required</option>
                </select>
              </div>
            </div>

            <div className="hidden bg-white rounded-lg p-5 mb-4 border border-gray-200">
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                Coating System Recommendations (ISO 21809)
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Suitable External Coating Families
                  </label>
                  <select
                    value={rawRecommendedCoatingFamily || ""}
                    onChange={(e) => {
                      const rawValue4 = e.target.value;
                      return onUpdate("recommendedCoatingFamily", rawValue4 || undefined);
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  >
                    <option value="">Select recommended coating...</option>
                    <option value="FBE">FBE (Fusion Bonded Epoxy)</option>
                    <option value="2LPE">2LPE (2-Layer Polyethylene)</option>
                    <option value="3LPE">3LPE (3-Layer Polyethylene)</option>
                    <option value="3LPP">3LPP (3-Layer Polypropylene)</option>
                    <option value="PU">Polyurethane Coating</option>
                    <option value="Coal Tar Enamel">Coal Tar Enamel</option>
                    <option value="Concrete Weight">Concrete Weight Coating</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Minimum Coating Thickness
                  </label>
                  <select
                    value={rawMinCoatingThickness || ""}
                    onChange={(e) => {
                      const rawValue5 = e.target.value;
                      return onUpdate("minCoatingThickness", rawValue5 || undefined);
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  >
                    <option value="">Select minimum thickness...</option>
                    <option value="≥0.3mm">≥0.3mm (FBE Standard)</option>
                    <option value="≥0.5mm">≥0.5mm (FBE Enhanced)</option>
                    <option value="≥1.8mm">≥1.8mm (2LPE)</option>
                    <option value="≥2.5mm">≥2.5mm (3LPE Standard)</option>
                    <option value="≥3.0mm">≥3.0mm (3LPE/3LPP Enhanced)</option>
                    <option value="≥3.5mm">≥3.5mm (3LPP High Performance)</option>
                    <option value="≥5.0mm">≥5.0mm (Severe conditions)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Surface Preparation Standard
                  </label>
                  <select
                    value={rawSurfacePrep || ""}
                    onChange={(e) => {
                      const rawValue6 = e.target.value;
                      return onUpdate("surfacePrep", rawValue6 || undefined);
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  >
                    <option value="">Select surface prep...</option>
                    <option value="SSPC-SP6">SSPC-SP6 / Sa 2 (Commercial Blast)</option>
                    <option value="SSPC-SP10">SSPC-SP10 / Sa 2½ (Near-White Blast)</option>
                    <option value="SSPC-SP5">SSPC-SP5 / Sa 3 (White Metal Blast)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Cathodic Protection Compatibility
                  </label>
                  <select
                    value={rawCpCompatibility || ""}
                    onChange={(e) => {
                      const rawValue7 = e.target.value;
                      return onUpdate("cpCompatibility", rawValue7 || undefined);
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  >
                    <option value="">Select CP requirement...</option>
                    <option value="Required">CP Required - Coating must be compatible</option>
                    <option value="Recommended">CP Recommended</option>
                    <option value="Not Required">CP Not Required</option>
                    <option value="TBD">To Be// Determined</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Additional Protection Requirements
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                    <input
                      type="checkbox"
                      checked={rawRequiresConcreteCoating || false}
                      onChange={(e) => onUpdate("requiresConcreteCoating", e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Concrete Coating</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                    <input
                      type="checkbox"
                      checked={rawRequiresRockShield || false}
                      onChange={(e) => onUpdate("requiresRockShield", e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Rock Shield</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                    <input
                      type="checkbox"
                      checked={rawRequiresHolidayDetection || false}
                      onChange={(e) => onUpdate("requiresHolidayDetection", e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Holiday Detection</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                    <input
                      type="checkbox"
                      checked={rawRequiresFieldJointCoating || false}
                      onChange={(e) => onUpdate("requiresFieldJointCoating", e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Field Joint Coating</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg
                  className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div>
                  <h5 className="text-sm font-bold text-amber-800 mb-1">
                    Engineering Disclaimer & Traceability
                  </h5>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Environmental and coating recommendations are <strong>indicative</strong> and
                    based on generalized datasets and standards interpretations (ISO 12944, ISO
                    21809, AMPP SP0169, ISO 9223). Final coating selection
                    <strong> must be validated</strong> by project-specific soil investigations,
                    climate data, and applicable governing codes. These outputs do not replace
                    detailed corrosion engineering studies.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="bg-amber-200 text-amber-800 px-2 py-0.5 rounded">
                      ISO 12944
                    </span>
                    <span className="bg-amber-200 text-amber-800 px-2 py-0.5 rounded">
                      ISO 21809
                    </span>
                    <span className="bg-amber-200 text-amber-800 px-2 py-0.5 rounded">
                      AMPP SP0169
                    </span>
                    <span className="bg-amber-200 text-amber-800 px-2 py-0.5 rounded">
                      ISO 9223
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              {!environmentalConfirmed ? (
                <button
                  type="button"
                  onClick={handleConfirmEnvironmental}
                  disabled={!hasRequiredEnvironmentalData()}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold flex items-center gap-2 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Confirm Environmental Data
                </button>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-green-700 font-semibold bg-green-50 px-4 py-2 rounded-lg">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Environmental Data Confirmed
                  </div>
                  {!isEditingEnvironmental ? (
                    <button
                      type="button"
                      onClick={handleEditEnvironmental}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium underline"
                    >
                      Edit
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConfirmEnvironmental}
                      disabled={!hasRequiredEnvironmentalData()}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 text-sm font-semibold"
                    >
                      Re-confirm Changes
                    </button>
                  )}
                </div>
              )}
              {!hasRequiredEnvironmentalData() && !environmentalConfirmed && (
                <p className="mt-2 text-sm text-amber-600">
                  Please fill in all required environmental fields to confirm this section.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
