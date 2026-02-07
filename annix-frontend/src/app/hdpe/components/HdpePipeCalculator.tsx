"use client";

import { useCallback, useEffect, useState } from "react";
import {
  calculatePressureRating,
  hdpeApi,
  NOMINAL_BORES,
  PipeCostResponse,
  SDR_VALUES,
} from "@/app/lib/hdpe";

interface PipeEntry {
  id: string;
  nominalBore: number;
  sdr: number;
  length: number;
  quantity: number;
}

interface HdpePipeCalculatorProps {
  pricePerKg: number;
  buttweldPrice?: number;
  onCalculationComplete?: (
    results: PipeCostResponse[],
    totalWeight: number,
    totalCost: number,
  ) => void;
}

export default function HdpePipeCalculator({
  pricePerKg,
  buttweldPrice,
  onCalculationComplete,
}: HdpePipeCalculatorProps) {
  const [entries, setEntries] = useState<PipeEntry[]>([
    { id: crypto.randomUUID(), nominalBore: 110, sdr: 11, length: 6, quantity: 1 },
  ]);
  const [results, setResults] = useState<(PipeCostResponse | null)[]>([]);
  const [loading, setLoading] = useState<boolean[]>([]);
  const [errors, setErrors] = useState<(string | null)[]>([]);
  const [availableSdrs, setAvailableSdrs] = useState<Record<number, number[]>>({});

  const loadAvailableSdrs = useCallback(
    async (nominalBore: number) => {
      if (availableSdrs[nominalBore]) return;
      try {
        const sdrs = await hdpeApi.metadata.getSdrsByNominalBore(nominalBore);
        setAvailableSdrs((prev) => ({ ...prev, [nominalBore]: sdrs }));
      } catch {
        setAvailableSdrs((prev) => ({ ...prev, [nominalBore]: SDR_VALUES }));
      }
    },
    [availableSdrs],
  );

  useEffect(() => {
    entries.forEach((entry) => {
      loadAvailableSdrs(entry.nominalBore);
    });
  }, [entries, loadAvailableSdrs]);

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
      const result = await hdpeApi.calculations.calculatePipeCost({
        nominalBore: entry.nominalBore,
        sdr: entry.sdr,
        length: entry.length * entry.quantity,
        pricePerKg,
        buttweldPrice,
      });

      setResults((prev) => {
        const next = [...prev];
        next[index] = result;
        return next;
      });
    } catch (err) {
      setErrors((prev) => {
        const next = [...prev];
        next[index] = err instanceof Error ? err.message : "Calculation failed";
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
    const validResults = results.filter((r): r is PipeCostResponse => r !== null);
    if (validResults.length > 0 && onCalculationComplete) {
      const totalWeight = validResults.reduce((sum, r) => sum + r.totalWeight, 0);
      const totalCost = validResults.reduce((sum, r) => sum + r.totalCost, 0);
      onCalculationComplete(validResults, totalWeight, totalCost);
    }
  }, [results, onCalculationComplete]);

  const addEntry = () => {
    setEntries((prev) => [
      ...prev,
      { id: crypto.randomUUID(), nominalBore: 110, sdr: 11, length: 6, quantity: 1 },
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

  const updateEntry = (index: number, field: keyof PipeEntry, value: number) => {
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

  const totalWeight = results.reduce((sum, r) => sum + (r?.totalWeight || 0), 0);
  const totalCost = results.reduce((sum, r) => sum + (r?.totalCost || 0), 0);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        HDPE Pipe Calculator
      </h2>

      <div className="space-y-4">
        {entries.map((entry, index) => {
          const sdrsForNb = availableSdrs[entry.nominalBore] || SDR_VALUES;
          const pressureRating = calculatePressureRating(entry.sdr);
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
                  Pipe #{index + 1}
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

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nominal Bore (DN)
                  </label>
                  <select
                    value={entry.nominalBore}
                    onChange={(e) => updateEntry(index, "nominalBore", Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  >
                    {NOMINAL_BORES.map((nb) => (
                      <option key={nb} value={nb}>
                        DN {nb}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    SDR
                  </label>
                  <select
                    value={entry.sdr}
                    onChange={(e) => updateEntry(index, "sdr", Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  >
                    {sdrsForNb.map((sdr) => (
                      <option key={sdr} value={sdr}>
                        SDR {sdr}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    PN {pressureRating} bar
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Length (m)
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={entry.length}
                    onChange={(e) => updateEntry(index, "length", Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  />
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
                    onChange={(e) => updateEntry(index, "quantity", Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {result && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">OD:</span>{" "}
                      <span className="font-medium text-gray-900 dark:text-white">
                        {result.outerDiameter} mm
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Wall:</span>{" "}
                      <span className="font-medium text-gray-900 dark:text-white">
                        {result.wallThickness.toFixed(2)} mm
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Weight:</span>{" "}
                      <span className="font-medium text-gray-900 dark:text-white">
                        {result.totalWeight.toFixed(2)} kg
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Cost:</span>{" "}
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
          + Add Pipe
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
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Summary</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Total Weight:</span>{" "}
              <span className="font-bold text-gray-900 dark:text-white">
                {totalWeight.toFixed(2)} kg
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Total Cost:</span>{" "}
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
