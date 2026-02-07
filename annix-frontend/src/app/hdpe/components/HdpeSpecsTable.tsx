"use client";

import { useEffect, useMemo, useState } from "react";
import { HdpePipeSpecification, hdpeApi, NOMINAL_BORES, SDR_VALUES } from "@/app/lib/hdpe";

interface HdpeSpecsTableProps {
  selectedNominalBore?: number;
  selectedSdr?: number;
  onSelect?: (spec: HdpePipeSpecification) => void;
}

export default function HdpeSpecsTable({
  selectedNominalBore,
  selectedSdr,
  onSelect,
}: HdpeSpecsTableProps) {
  const [specs, setSpecs] = useState<HdpePipeSpecification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterNb, setFilterNb] = useState<number | "">("");
  const [filterSdr, setFilterSdr] = useState<number | "">("");

  useEffect(() => {
    hdpeApi.pipeSpecifications
      .getAll()
      .then(setSpecs)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredSpecs = useMemo(() => {
    let result = specs;
    if (filterNb) {
      result = result.filter((s) => s.nominalBore === filterNb);
    }
    if (filterSdr) {
      result = result.filter((s) => s.sdr === filterSdr);
    }
    return result.sort((a, b) => {
      if (a.nominalBore !== b.nominalBore) return a.nominalBore - b.nominalBore;
      return a.sdr - b.sdr;
    });
  }, [specs, filterNb, filterSdr]);

  const uniqueNbs = useMemo(
    () => [...new Set(specs.map((s) => s.nominalBore))].sort((a, b) => a - b),
    [specs],
  );
  const uniqueSdrs = useMemo(
    () => [...new Set(specs.map((s) => s.sdr))].sort((a, b) => a - b),
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
        HDPE Pipe Specifications (PE100)
      </h2>

      <div className="flex flex-wrap gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Filter by DN
          </label>
          <select
            value={filterNb}
            onChange={(e) => setFilterNb(e.target.value ? Number(e.target.value) : "")}
            className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          >
            <option value="">All Sizes</option>
            {(uniqueNbs.length > 0 ? uniqueNbs : NOMINAL_BORES).map((nb) => (
              <option key={nb} value={nb}>
                DN {nb}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Filter by SDR
          </label>
          <select
            value={filterSdr}
            onChange={(e) => setFilterSdr(e.target.value ? Number(e.target.value) : "")}
            className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          >
            <option value="">All SDRs</option>
            {(uniqueSdrs.length > 0 ? uniqueSdrs : SDR_VALUES).map((sdr) => (
              <option key={sdr} value={sdr}>
                SDR {sdr}
              </option>
            ))}
          </select>
        </div>

        {(filterNb || filterSdr) && (
          <button
            onClick={() => {
              setFilterNb("");
              setFilterSdr("");
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
                SDR
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
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                PN (bar)
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
                  colSpan={onSelect ? 8 : 7}
                  className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  No specifications found
                </td>
              </tr>
            ) : (
              filteredSpecs.map((spec) => {
                const isSelected =
                  selectedNominalBore === spec.nominalBore && selectedSdr === spec.sdr;

                return (
                  <tr
                    key={spec.id}
                    className={`${
                      isSelected
                        ? "bg-blue-50 dark:bg-blue-900/20"
                        : "hover:bg-gray-50 dark:hover:bg-slate-700"
                    } ${onSelect ? "cursor-pointer" : ""}`}
                    onClick={onSelect ? () => onSelect(spec) : undefined}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {spec.nominalBore}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {spec.outerDiameter}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {spec.sdr}
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
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600 dark:text-blue-400 font-medium">
                      {spec.pressureRatingPn}
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
