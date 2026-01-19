'use client';

import React from 'react';
import {
  closureWeight,
  closureLengthLimits,
  CLOSURE_LENGTH_OPTIONS,
} from '@/app/lib/config/rfq';

interface ClosureLengthSelectorProps {
  nominalBore: number;
  currentValue: number | null;
  wallThickness: number;
  onUpdate: (closureLength: number | null) => void;
  error?: string;
  showTackWeldInfo?: boolean;
  variant?: 'default' | 'compact';
}

export function ClosureLengthSelector({
  nominalBore,
  currentValue,
  wallThickness,
  onUpdate,
  error,
  showTackWeldInfo = true,
  variant = 'default',
}: ClosureLengthSelectorProps) {
  const limits = closureLengthLimits(nominalBore);
  const closureWeightKg = currentValue && currentValue > 0
    ? closureWeight(nominalBore, currentValue, wallThickness)
    : 0;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value ? Number(e.target.value) : null;
    const closureLength = rawValue !== null
      ? Math.max(limits.min, Math.min(limits.max, rawValue))
      : null;
    onUpdate(closureLength);
  };

  const isCompact = variant === 'compact';

  return (
    <div className={isCompact ? '' : 'flex items-start gap-4'}>
      <div className={isCompact ? '' : 'flex-1'}>
        <label className="block text-xs font-semibold text-purple-900 dark:text-purple-300 mb-1">
          Closure Length (mm) *
          <span
            className="ml-1 text-purple-600 dark:text-purple-400 font-normal"
            title={`Recommended: ${limits.recommended}mm for ${nominalBore}NB`}
          >
            (Rec: {limits.recommended}mm)
          </span>
        </label>
        <div className="flex gap-1 mb-1">
          {CLOSURE_LENGTH_OPTIONS
            .filter((length) => length >= limits.min && length <= limits.max)
            .map((length) => (
              <button
                key={length}
                type="button"
                onClick={() => onUpdate(length)}
                className={`px-1.5 py-0.5 text-xs rounded border ${
                  currentValue === length
                    ? 'bg-purple-200 dark:bg-purple-700 border-purple-400 dark:border-purple-500 font-medium text-purple-900 dark:text-purple-100'
                    : 'bg-white dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-800/40 border-purple-300 dark:border-purple-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                {length}mm
              </button>
            ))}
        </div>
        <input
          type="number"
          value={currentValue || ''}
          onChange={handleInputChange}
          placeholder={`${limits.min}-${limits.max}mm`}
          min={limits.min}
          max={limits.max}
          className="w-full px-2 py-1.5 bg-white dark:bg-purple-900/20 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900 dark:text-gray-100 border-purple-300 dark:border-purple-600"
        />
        {error && (
          <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
        )}
        <p className="mt-1 text-xs text-purple-600 dark:text-purple-400">
          Valid range: {limits.min}-{limits.max}mm for {nominalBore}NB
        </p>
        {closureWeightKg > 0 && (
          <p className="mt-1 text-xs text-purple-600 dark:text-purple-400">
            Closure weight: {closureWeightKg.toFixed(2)}kg each
          </p>
        )}
        {isCompact && (
          <p className="mt-1 text-xs text-purple-700 dark:text-purple-400">
            Pipe extension past L/F for site weld connection
          </p>
        )}
      </div>
      {!isCompact && showTackWeldInfo && (
        <div className="flex-1 text-xs text-purple-700 dark:text-purple-400">
          <p className="font-semibold">L/F Tack Welds:</p>
          <p>8 total (~20mm each), 4 per side</p>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Closure adds to total pipe weight
          </p>
        </div>
      )}
      {isCompact && showTackWeldInfo && (
        <div className="mt-2 p-2 bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-600 rounded-md">
          <p className="text-xs font-bold text-purple-800 dark:text-purple-300">
            L/F Tack Welds:
          </p>
          <p className="text-xs text-purple-700 dark:text-purple-400">8 total (~20mm each), 4 per side</p>
        </div>
      )}
    </div>
  );
}
