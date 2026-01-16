'use client';

import React, { useState, useEffect } from 'react';
import {
  pvcApi,
  NOMINAL_DIAMETERS,
  FITTING_TYPES,
  PvcFittingCostResponse,
  PvcFittingType,
} from '@/app/lib/pvc';

interface FittingEntry {
  id: string;
  fittingTypeCode: string;
  nominalDiameter: number;
  quantity: number;
}

interface PvcFittingCalculatorProps {
  pricePerKg: number;
  cementJointPrice?: number;
  onCalculationComplete?: (results: PvcFittingCostResponse[], totalWeight: number, totalCost: number) => void;
}

export default function PvcFittingCalculator({
  pricePerKg,
  cementJointPrice,
  onCalculationComplete,
}: PvcFittingCalculatorProps) {
  const [entries, setEntries] = useState<FittingEntry[]>([
    { id: crypto.randomUUID(), fittingTypeCode: 'elbow_90', nominalDiameter: 110, quantity: 1 },
  ]);
  const [fittingTypes, setFittingTypes] = useState<PvcFittingType[]>([]);
  const [results, setResults] = useState<(PvcFittingCostResponse | null)[]>([]);
  const [loading, setLoading] = useState<boolean[]>([]);
  const [errors, setErrors] = useState<(string | null)[]>([]);

  useEffect(() => {
    pvcApi.fittingTypes.getAll().then(setFittingTypes).catch(() => {
      setFittingTypes([]);
    });
  }, []);

  const calculateEntry = async (index: number) => {
    const entry = entries[index];
    setLoading((prev) => {
      const next = [...prev];
      next[index] = true;
      return next;
    });
    setErrors((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });

    try {
      const result = await pvcApi.calculations.calculateFittingCost({
        fittingTypeCode: entry.fittingTypeCode,
        nominalDiameter: entry.nominalDiameter,
        pricePerKg,
        cementJointPrice,
      });

      const adjustedResult = {
        ...result,
        weightKg: result.weightKg * entry.quantity,
        materialCost: result.materialCost * entry.quantity,
        cementJointCost: result.cementJointCost * entry.quantity,
        totalCost: result.totalCost * entry.quantity,
      };

      setResults((prev) => {
        const next = [...prev];
        next[index] = adjustedResult;
        return next;
      });
    } catch (err) {
      setErrors((prev) => {
        const next = [...prev];
        next[index] = err instanceof Error ? err.message : 'Calculation failed';
        return next;
      });
      setResults((prev) => {
        const next = [...prev];
        next[index] = null;
        return next;
      });
    } finally {
      setLoading((prev) => {
        const next = [...prev];
        next[index] = false;
        return next;
      });
    }
  };

  const calculateAll = async () => {
    const promises = entries.map((_, index) => calculateEntry(index));
    await Promise.all(promises);
  };

  useEffect(() => {
    const validResults = results.filter((r): r is PvcFittingCostResponse => r !== null);
    if (validResults.length > 0 && onCalculationComplete) {
      const totalWeight = validResults.reduce((sum, r) => sum + r.weightKg, 0);
      const totalCost = validResults.reduce((sum, r) => sum + r.totalCost, 0);
      onCalculationComplete(validResults, totalWeight, totalCost);
    }
  }, [results, onCalculationComplete]);

  const addEntry = () => {
    setEntries((prev) => [
      ...prev,
      { id: crypto.randomUUID(), fittingTypeCode: 'elbow_90', nominalDiameter: 110, quantity: 1 },
    ]);
    setResults((prev) => [...prev, null]);
    setErrors((prev) => [...prev, null]);
    setLoading((prev) => [...prev, false]);
  };

  const removeEntry = (index: number) => {
    if (entries.length <= 1) return;
    setEntries((prev) => prev.filter((_, i) => i !== index));
    setResults((prev) => prev.filter((_, i) => i !== index));
    setErrors((prev) => prev.filter((_, i) => i !== index));
    setLoading((prev) => prev.filter((_, i) => i !== index));
  };

  const updateEntry = <K extends keyof FittingEntry>(
    index: number,
    field: K,
    value: FittingEntry[K]
  ) => {
    setEntries((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    setResults((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  };

  const displayFittingTypes = fittingTypes.length > 0 ? fittingTypes : FITTING_TYPES.map((f) => ({
    id: 0,
    code: f.code,
    name: f.name,
    numJoints: f.joints,
    isSocket: true,
    isFlanged: false,
    isThreaded: false,
    category: f.category,
    angleDegrees: null,
    description: f.description,
    displayOrder: 0,
    isActive: true,
  }));

  const fittingInfo = (code: string) => {
    const found = displayFittingTypes.find((f) => f.code === code);
    return found || { numJoints: 0, isSocket: true, isFlanged: false, isThreaded: false };
  };

  const totalWeight = results.reduce((sum, r) => sum + (r?.weightKg || 0), 0);
  const totalCost = results.reduce((sum, r) => sum + (r?.totalCost || 0), 0);
  const totalJoints = results.reduce((sum, r, i) => {
    const entry = entries[i];
    const info = fittingInfo(entry.fittingTypeCode);
    return sum + (info.numJoints * entry.quantity);
  }, 0);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        PVC Fitting Calculator
      </h2>

      <div className="space-y-4">
        {entries.map((entry, index) => {
          const info = fittingInfo(entry.fittingTypeCode);
          const result = results[index];
          const error = errors[index];
          const isLoading = loading[index];

          return (
            <div
              key={entry.id}
              className="border border-gray-200 dark:border-slate-600 rounded-lg p-4"
            >
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Fitting #{index + 1}
                </span>
                {entries.length > 1 && (
                  <button
                    onClick={() => removeEntry(index)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fitting Type
                  </label>
                  <select
                    value={entry.fittingTypeCode}
                    onChange={(e) => updateEntry(index, 'fittingTypeCode', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  >
                    {displayFittingTypes
                      .filter((f) => f.code !== 'straight_pipe')
                      .map((ft) => (
                        <option key={ft.code} value={ft.code}>
                          {ft.name}
                        </option>
                      ))}
                  </select>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {info.isSocket && <span className="text-blue-600">Socket</span>}
                    {info.isFlanged && <span className="text-purple-600 ml-2">Flanged</span>}
                    {info.isThreaded && <span className="text-orange-600 ml-2">Threaded</span>}
                    {info.numJoints > 0 && (
                      <span className="ml-2">({info.numJoints} joints)</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nominal Diameter (DN)
                  </label>
                  <select
                    value={entry.nominalDiameter}
                    onChange={(e) => updateEntry(index, 'nominalDiameter', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  >
                    {NOMINAL_DIAMETERS.map((dn) => (
                      <option key={dn} value={dn}>
                        DN {dn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={entry.quantity}
                    onChange={(e) => updateEntry(index, 'quantity', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {result && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Weight:</span>{' '}
                      <span className="font-medium text-gray-900 dark:text-white">
                        {result.weightKg.toFixed(2)} kg
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Joints:</span>{' '}
                      <span className="font-medium text-gray-900 dark:text-white">
                        {result.numJoints * entry.quantity}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Joint Cost:</span>{' '}
                      <span className="font-medium text-gray-900 dark:text-white">
                        R {result.cementJointCost.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Total Cost:</span>{' '}
                      <span className="font-medium text-green-600 dark:text-green-400">
                        R {result.totalCost.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-md text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              {isLoading && (
                <div className="mt-4 p-3 bg-gray-50 dark:bg-slate-700 rounded-md text-sm text-gray-600 dark:text-gray-400">
                  Calculating...
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          onClick={addEntry}
          className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
        >
          + Add Fitting
        </button>
        <button
          onClick={calculateAll}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Calculate All
        </button>
      </div>

      {results.some((r) => r !== null) && (
        <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Summary
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Total Weight:</span>{' '}
              <span className="font-bold text-gray-900 dark:text-white">
                {totalWeight.toFixed(2)} kg
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Total Joints:</span>{' '}
              <span className="font-bold text-blue-600 dark:text-blue-400">
                {totalJoints}
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Total Cost:</span>{' '}
              <span className="font-bold text-green-600 dark:text-green-400">
                R {totalCost.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
