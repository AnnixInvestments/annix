"use client";

import React from "react";
import {
  PVC_JOINING_OPTIONS,
  PVC_MATERIALS,
  PVC_PRESSURE_OPTIONS,
  type PvcJoiningMethod,
  type PvcPressureClass,
  type PvcType,
} from "@/app/lib/config/rfq/pvc";
import type { GlobalSpecs } from "@/app/lib/hooks/useRfqForm";

export interface PvcSpecificationsSectionProps {
  globalSpecs: GlobalSpecs;
  onUpdateGlobalSpecs: (specs: GlobalSpecs) => void;
}

export function PvcSpecificationsSection({
  globalSpecs,
  onUpdateGlobalSpecs,
}: PvcSpecificationsSectionProps) {
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pvcType = e.target.value as PvcType;
    onUpdateGlobalSpecs({
      ...globalSpecs,
      pvcType: pvcType || undefined,
    });
  };

  const handlePressureClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pressureClass = e.target.value
      ? (parseInt(e.target.value, 10) as PvcPressureClass)
      : undefined;
    onUpdateGlobalSpecs({
      ...globalSpecs,
      pvcPressureClass: pressureClass,
    });
  };

  const handleJoiningMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const method = e.target.value as PvcJoiningMethod;
    onUpdateGlobalSpecs({
      ...globalSpecs,
      pvcJoiningMethod: method || undefined,
    });
  };

  const selectedMaterial = PVC_MATERIALS.find((m) => m.id === globalSpecs.pvcType);
  const isComplete =
    globalSpecs.pvcType && globalSpecs.pvcPressureClass && globalSpecs.pvcJoiningMethod;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-400 text-white text-xs flex items-center justify-center">
            PVC
          </span>
          PVC Pipe Specifications
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
            PVC Type <span className="text-red-600">*</span>
          </label>
          <select
            value={globalSpecs.pvcType ?? ""}
            onChange={handleTypeChange}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
          >
            <option value="">Select type...</option>
            {PVC_MATERIALS.map((material) => (
              <option key={material.id} value={material.id}>
                {material.name}
              </option>
            ))}
          </select>
          {selectedMaterial && (
            <p className="mt-1 text-xs text-gray-500">{selectedMaterial.description}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1">
            Pressure Class <span className="text-red-600">*</span>
          </label>
          <select
            value={globalSpecs.pvcPressureClass ?? ""}
            onChange={handlePressureClassChange}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
          >
            <option value="">Select pressure class...</option>
            {PVC_PRESSURE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {globalSpecs.pvcPressureClass && (
            <p className="mt-1 text-xs text-gray-500">
              {
                PVC_PRESSURE_OPTIONS.find((o) => o.value === globalSpecs.pvcPressureClass)
                  ?.description
              }
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1">
            Joining Method <span className="text-red-600">*</span>
          </label>
          <select
            value={globalSpecs.pvcJoiningMethod ?? ""}
            onChange={handleJoiningMethodChange}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
          >
            <option value="">Select joining method...</option>
            {PVC_JOINING_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {globalSpecs.pvcJoiningMethod && (
            <p className="mt-1 text-xs text-gray-500">
              {
                PVC_JOINING_OPTIONS.find((o) => o.value === globalSpecs.pvcJoiningMethod)
                  ?.description
              }
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded-md">
        <h4 className="text-xs font-semibold text-gray-700 mb-2">PVC Material Properties</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-gray-500">Density:</span>
            <span className="ml-1 text-gray-900">{selectedMaterial?.densityKgM3 ?? "-"} kg/m³</span>
          </div>
          <div>
            <span className="text-gray-500">Max Temp:</span>
            <span className="ml-1 text-gray-900">{selectedMaterial?.maxTemperatureC ?? "-"}°C</span>
          </div>
          <div>
            <span className="text-gray-500">Pressure Rating:</span>
            <span className="ml-1 text-gray-900">
              {globalSpecs.pvcPressureClass ? `Class ${globalSpecs.pvcPressureClass}` : "-"}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Applications:</span>
            <span className="ml-1 text-gray-900">
              {selectedMaterial?.applications.slice(0, 2).join(", ") ?? "-"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
