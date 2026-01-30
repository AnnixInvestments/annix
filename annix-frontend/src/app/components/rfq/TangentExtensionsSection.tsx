'use client';

import React, { memo, useCallback } from 'react';

interface TangentExtensionsSectionProps {
  entryId: string;
  numberOfTangents: number;
  tangentLengths: number[];
  onTangentCountChange: (count: number, newLengths: number[]) => void;
  onTangentLengthChange: (index: number, length: number) => void;
}

function TangentExtensionsSectionComponent({
  entryId,
  numberOfTangents,
  tangentLengths,
  onTangentCountChange,
  onTangentLengthChange,
}: TangentExtensionsSectionProps) {
  const handleCountChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const count = parseInt(e.target.value) || 0;
    const currentLengths = tangentLengths || [];
    const newLengths = count === 0 ? [] :
                       count === 1 ? [currentLengths[0] || 150] :
                       [currentLengths[0] || 150, currentLengths[1] || 150];
    onTangentCountChange(count, newLengths);
  }, [tangentLengths, onTangentCountChange]);

  const handleLength1Change = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onTangentLengthChange(0, parseInt(e.target.value) || 0);
  }, [onTangentLengthChange]);

  const handleLength2Change = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onTangentLengthChange(1, parseInt(e.target.value) || 0);
  }, [onTangentLengthChange]);

  return (
    <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg p-3 mt-3">
      <div className="mb-2">
        <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-200">
          Tangent Extensions
        </h4>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label
            htmlFor={`bend-tangent-count-${entryId}`}
            className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1"
          >
            Number of Tangents
          </label>
          <select
            id={`bend-tangent-count-${entryId}`}
            value={numberOfTangents}
            onChange={handleCountChange}
            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
          >
            <option value="0">0 - No Tangents</option>
            <option value="1">1 - Single Tangent</option>
            <option value="2">2 - Both Tangents</option>
          </select>
        </div>
        {numberOfTangents >= 1 && (
          <div>
            <label
              htmlFor={`bend-tangent1-length-${entryId}`}
              className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1"
            >
              Tangent 1 Length (mm)
            </label>
            <input
              id={`bend-tangent1-length-${entryId}`}
              type="number"
              value={tangentLengths[0] || ''}
              onChange={handleLength1Change}
              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
              min="0"
              placeholder="150"
            />
          </div>
        )}
        {numberOfTangents >= 2 && (
          <div>
            <label
              htmlFor={`bend-tangent2-length-${entryId}`}
              className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1"
            >
              Tangent 2 Length (mm)
            </label>
            <input
              id={`bend-tangent2-length-${entryId}`}
              type="number"
              value={tangentLengths[1] || ''}
              onChange={handleLength2Change}
              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
              min="0"
              placeholder="150"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export const TangentExtensionsSection = memo(TangentExtensionsSectionComponent);
