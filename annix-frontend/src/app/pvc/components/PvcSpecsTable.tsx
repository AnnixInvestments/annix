"use client";

import { useEffect, useMemo, useState } from "react";
import { NOMINAL_DIAMETERS, PN_VALUES, PvcPipeSpecification, pvcApi } from "@/app/lib/pvc";

interface PvcSpecsTableProps {
  selectedNominalDiameter?: number;
  selectedPressureRating?: number;
  onSelect?: (spec: PvcPipeSpecification) => void;
}

export default function PvcSpecsTable({
  selectedNominalDiameter,
  selectedPressureRating,
  onSelect,
}: PvcSpecsTableProps) {
  const [specs, setSpecs] = useState<PvcPipeSpecification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterDn, setFilterDn] = useState<number | "">("");
  const [filterPn, setFilterPn] = useState<number | "">("");

  useEffect(() => {
    pvcApi.en1452
      .getAllSpecifications()
      .then(setSpecs)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredSpecs = useMemo(() => {
    let result = specs;
    if (filterDn) {
      result = result.filter((s) => s.nominalDiameter === filterDn);
    }
    if (filterPn) {
      result = result.filter((s) => s.pressureRating === filterPn);
    }
    return result.sort((a, b) => {
      if (a.nominalDiameter !== b.nominalDiameter) return a.nominalDiameter - b.nominalDiameter;
      return a.pressureRating - b.pressureRating;
    });
  }, [specs, filterDn, filterPn]);

  const uniqueDns = useMemo(
    () => [...new Set(specs.map((s) => s.nominalDiameter))].sort((a, b) => a - b),
    [specs],
  );
  const uniquePns = useMemo(
    () => [...new Set(specs.map((s) => s.pressureRating))].sort((a, b) => a - b),
    [specs],
  );

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-1/3" />
          <div className="h-64 bg-gray-200 dark:bg-slate-700 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
        <div className="text-red-600 dark:text-red-400">Error loading specifications: {error}</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        PVC-U Pipe Specifications (EN 1452)
      </h2>

      <div className="flex flex-wrap gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Filter by DN
          </label>
          <select
            value={filterDn}
            onChange={(e) => setFilterDn(e.target.value ? Number(e.target.value) : "")}
            className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          >
            <option value="">All Sizes</option>
            {(uniqueDns.length > 0 ? uniqueDns : NOMINAL_DIAMETERS).map((dn) => (
              <option key={dn} value={dn}>
                DN {dn}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Filter by PN
          </label>
          <select
            value={filterPn}
            onChange={(e) => setFilterPn(e.target.value ? Number(e.target.value) : "")}
            className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          >
            <option value="">All Pressures</option>
            {(uniquePns.length > 0 ? uniquePns : PN_VALUES).map((pn) => (
              <option key={pn} value={pn}>
                PN {pn}
              </option>
            ))}
          </select>
        </div>

        {(filterDn || filterPn) && (
          <button
            onClick={() => {
              setFilterDn("");
              setFilterPn("");
            }}
            className="self-end px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Clear Filters
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
          <thead className="bg-gray-50 dark:bg-slate-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                DN
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                OD (mm)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                PN (bar)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Wall (mm)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                ID (mm)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                kg/m
              </th>
              {onSelect && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Action
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
            {filteredSpecs.length === 0 ? (
              <tr>
                <td
                  colSpan={onSelect ? 7 : 6}
                  className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  No specifications found
                </td>
              </tr>
            ) : (
              filteredSpecs.map((spec, idx) => {
                const isSelected =
                  selectedNominalDiameter === spec.nominalDiameter &&
                  selectedPressureRating === spec.pressureRating;
                const key = `${spec.nominalDiameter}-${spec.pressureRating}-${idx}`;

                return (
                  <tr
                    key={key}
                    className={`${
                      isSelected
                        ? "bg-blue-50 dark:bg-blue-900/20"
                        : "hover:bg-gray-50 dark:hover:bg-slate-700"
                    } ${onSelect ? "cursor-pointer" : ""}`}
                    onClick={onSelect ? () => onSelect(spec) : undefined}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {spec.nominalDiameter}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {spec.outerDiameter}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600 dark:text-blue-400 font-medium">
                      {spec.pressureRating}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {spec.wallThickness.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {spec.innerDiameter.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {spec.weightKgPerM.toFixed(3)}
                    </td>
                    {onSelect && (
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelect(spec);
                          }}
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Select
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        Showing {filteredSpecs.length} of {specs.length} specifications
      </div>
    </div>
  );
}
