'use client';

import React from 'react';
import {
  WORKING_PRESSURE_BAR,
  WORKING_TEMPERATURE_CELSIUS,
} from '@/app/lib/config/rfq';
import { getFlangeMaterialGroup } from '@/app/components/rfq/utils';

export interface WorkingConditionsSectionProps {
  globalSpecs: {
    workingPressureBar?: number;
    workingTemperatureC?: number;
    flangeStandardId?: number | string;
    flangePressureClassId?: number;
    steelSpecificationId?: number;
  };
  onUpdateGlobalSpecs: (specs: Record<string, unknown>) => void;
  masterData: {
    steelSpecs?: Array<{ id: number; steelSpecName: string }>;
  };
  errors: {
    workingPressure?: string;
    workingTemperature?: string;
  };
  fetchAndSelectPressureClass: (
    standardId: number | string,
    pressureBar: number,
    temperatureC?: number,
    materialGroup?: string
  ) => Promise<number | undefined>;
}

export function WorkingConditionsSection({
  globalSpecs,
  onUpdateGlobalSpecs,
  masterData,
  errors,
  fetchAndSelectPressureClass,
}: WorkingConditionsSectionProps) {
  const workingPressures = WORKING_PRESSURE_BAR;
  const workingTemperatures = WORKING_TEMPERATURE_CELSIUS;

  const handlePressureChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newPressure = e.target.value ? Number(e.target.value) : undefined;
    let recommendedPressureClassId = globalSpecs?.flangePressureClassId;

    if (newPressure && globalSpecs?.flangeStandardId) {
      const steelSpec = masterData.steelSpecs?.find(
        (s) => s.id === globalSpecs?.steelSpecificationId
      );
      const materialGroup = getFlangeMaterialGroup(steelSpec?.steelSpecName);
      recommendedPressureClassId = await fetchAndSelectPressureClass(
        globalSpecs.flangeStandardId,
        newPressure,
        globalSpecs?.workingTemperatureC,
        materialGroup
      );
    }

    onUpdateGlobalSpecs({
      ...globalSpecs,
      workingPressureBar: newPressure,
      flangePressureClassId:
        recommendedPressureClassId || globalSpecs?.flangePressureClassId,
    });
  };

  const handleTemperatureChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newTemp = e.target.value ? Number(e.target.value) : undefined;
    let recommendedPressureClassId = globalSpecs?.flangePressureClassId;

    if (
      newTemp !== undefined &&
      globalSpecs?.workingPressureBar &&
      globalSpecs?.flangeStandardId
    ) {
      const steelSpec = masterData.steelSpecs?.find(
        (s) => s.id === globalSpecs?.steelSpecificationId
      );
      const materialGroup = getFlangeMaterialGroup(steelSpec?.steelSpecName);
      recommendedPressureClassId = await fetchAndSelectPressureClass(
        globalSpecs.flangeStandardId,
        globalSpecs.workingPressureBar,
        newTemp,
        materialGroup
      );
    }

    onUpdateGlobalSpecs({
      ...globalSpecs,
      workingTemperatureC: newTemp,
      flangePressureClassId:
        recommendedPressureClassId || globalSpecs?.flangePressureClassId,
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <h3 className="text-xs font-semibold text-gray-800 mb-2">
        Working Conditions
        <span className="ml-2 text-xs font-normal text-gray-500">
          (Optional)
        </span>
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <div data-field="workingPressure">
          <label
            className={`block text-xs font-semibold mb-1 ${errors.workingPressure ? 'text-red-700' : 'text-gray-900'}`}
          >
            Working Pressure (bar) <span className="text-red-600">*</span>
          </label>
          <select
            value={globalSpecs?.workingPressureBar || ''}
            onChange={handlePressureChange}
            className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 text-gray-900 ${
              errors.workingPressure
                ? 'border-red-500 focus:ring-red-500 bg-red-50'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
          >
            <option value="">Select pressure...</option>
            {workingPressures.map((pressure) => (
              <option key={pressure} value={pressure}>
                {pressure} bar
              </option>
            ))}
          </select>
          {errors.workingPressure && (
            <p className="mt-0.5 text-xs text-red-600">
              {errors.workingPressure}
            </p>
          )}
        </div>

        <div data-field="workingTemperature">
          <label
            className={`block text-xs font-semibold mb-1 ${errors.workingTemperature ? 'text-red-700' : 'text-gray-900'}`}
          >
            Working Temperature (°C) <span className="text-red-600">*</span>
          </label>
          <select
            value={globalSpecs?.workingTemperatureC || ''}
            onChange={handleTemperatureChange}
            className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 text-gray-900 ${
              errors.workingTemperature
                ? 'border-red-500 focus:ring-red-500 bg-red-50'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
          >
            <option value="">Select temperature...</option>
            {workingTemperatures.map((temp) => (
              <option key={temp} value={temp}>
                {temp}°C
              </option>
            ))}
          </select>
          {errors.workingTemperature && (
            <p className="mt-0.5 text-xs text-red-600">
              {errors.workingTemperature}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
