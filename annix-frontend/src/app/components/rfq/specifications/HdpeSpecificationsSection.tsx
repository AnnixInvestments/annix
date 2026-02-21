"use client";

import React from "react";
import {
  HDPE_MATERIALS,
  HDPE_SDR_OPTIONS,
  HDPE_PRESSURE_OPTIONS,
  HDPE_JOINING_OPTIONS,
  type HdpeGrade,
  type HdpeSdr,
  type HdpeJoiningMethod,
  hdpePressureRatingForSdr,
} from "@/app/lib/config/rfq/hdpe";
import type { GlobalSpecs } from "@/app/lib/hooks/useRfqForm";

export interface HdpeSpecificationsSectionProps {
  globalSpecs: GlobalSpecs;
  onUpdateGlobalSpecs: (specs: GlobalSpecs) => void;
}

export function HdpeSpecificationsSection({
  globalSpecs,
  onUpdateGlobalSpecs,
}: HdpeSpecificationsSectionProps) {
  const selectedGrade = globalSpecs.hdpeGrade ?? "PE100";
  const selectedSdr = globalSpecs.hdpeSdr;

  const pressureRating =
    selectedSdr && selectedGrade
      ? hdpePressureRatingForSdr(selectedSdr as HdpeSdr, selectedGrade)
      : null;

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
      hdpePressureRating: sdr && selectedGrade
        ? `PN${hdpePressureRatingForSdr(sdr, selectedGrade)}`
        : undefined,
    });
  };

  const handleJoiningMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const method = e.target.value as HdpeJoiningMethod;
    onUpdateGlobalSpecs({
      ...globalSpecs,
      hdpeJoiningMethod: method || undefined,
    });
  };

  const isComplete = globalSpecs.hdpeGrade && globalSpecs.hdpeSdr && globalSpecs.hdpeJoiningMethod;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
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
          {pressureRating && (
            <p className="mt-1 text-xs text-blue-600 font-medium">
              Pressure rating: PN{pressureRating} ({pressureRating} bar)
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
              {HDPE_JOINING_OPTIONS.find((o) => o.value === globalSpecs.hdpeJoiningMethod)?.description}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded-md">
        <h4 className="text-xs font-semibold text-gray-700 mb-2">HDPE Material Properties</h4>
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
              {HDPE_MATERIALS.find((m) => m.id === globalSpecs.hdpeGrade)?.minDesignStress ?? "-"} MPa
            </span>
          </div>
          <div>
            <span className="text-gray-500">Pressure Rating:</span>
            <span className="ml-1 text-gray-900">
              {pressureRating ? `PN${pressureRating}` : "-"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
