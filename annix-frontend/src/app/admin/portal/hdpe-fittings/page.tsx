"use client";

import { useEffect, useMemo, useState } from "react";
import { log } from "@/app/lib/logger";
import { API_BASE_URL } from "@/lib/api-config";

interface HdpeFittingDimensionRow {
  id: number;
  fittingType: string;
  mainDnMm: number;
  branchDnMm: number | null;
  faceToFaceMm: number | null;
  centreToFaceMm: number | null;
  branchLengthMm: number | null;
  lengthMm: number | null;
  source: "catalogue" | "estimated";
  sourceId: string;
  notes: string | null;
}

const FITTING_TYPE_LABELS: Record<string, string> = {
  elbow_90: "90° Elbow",
  elbow_45: "45° Elbow",
  tee_equal: "Equal Tee",
  tee_reducing: "Reducing Tee",
  reducer: "Reducer",
  lateral_45: "45° Lateral",
  end_cap: "End Cap",
};

const FITTING_TYPE_ORDER = [
  "elbow_90",
  "elbow_45",
  "tee_equal",
  "tee_reducing",
  "reducer",
  "lateral_45",
  "end_cap",
];

export default function HdpeFittingDimensionsAdminPage() {
  const [rows, setRows] = useState<HdpeFittingDimensionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("");
  const [filterSource, setFilterSource] = useState<string>("");

  useEffect(() => {
    const fetchRows = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/hdpe-fitting-dimensions`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data: HdpeFittingDimensionRow[] = await response.json();
        setRows(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        log.error("Failed to load HDPE fitting dimensions:", err);
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    fetchRows();
  }, []);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (filterType && row.fittingType !== filterType) return false;
      if (filterSource && row.source !== filterSource) return false;
      return true;
    });
  }, [rows, filterType, filterSource]);

  const groupedByType = useMemo(() => {
    const map = new Map<string, HdpeFittingDimensionRow[]>();
    filteredRows.forEach((row) => {
      const key = row.fittingType;
      const existing = map.get(key);
      if (existing) {
        existing.push(row);
      } else {
        map.set(key, [row]);
      }
    });
    return map;
  }, [filteredRows]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          HDPE Fitting Dimensions
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          Canonical PE100 SDR 11 butt-fusion fitting body geometry consumed by the BOQ row builder.
          Source-of-truth lives in
          <code className="mx-1 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">
            packages/product-data/hdpe/*-dimensions.ts
          </code>
          and is seeded into this DB table on migration. Read-only in v1 — per-customer overrides
          come in a follow-up.
        </p>
      </header>

      <div className="flex gap-4 mb-4 items-end">
        <div>
          <label
            htmlFor="filter-type"
            className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Fitting type
          </label>
          <select
            id="filter-type"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
          >
            <option value="">All types</option>
            {FITTING_TYPE_ORDER.map((type) => {
              const label = FITTING_TYPE_LABELS[type];
              return (
                <option key={type} value={type}>
                  {label || type}
                </option>
              );
            })}
          </select>
        </div>
        <div>
          <label
            htmlFor="filter-source"
            className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Source
          </label>
          <select
            id="filter-source"
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
          >
            <option value="">All</option>
            <option value="catalogue">Catalogue</option>
            <option value="estimated">Estimated</option>
          </select>
        </div>
        <div className="text-xs text-gray-500 ml-auto">
          {filteredRows.length} of {rows.length} row{rows.length === 1 ? "" : "s"}
        </div>
      </div>

      {loading && (
        <div className="text-sm text-gray-600 dark:text-gray-400 py-8 text-center">Loading…</div>
      )}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3 mb-4 text-sm text-red-800 dark:text-red-200">
          Failed to load: {error}
        </div>
      )}

      {!loading &&
        !error &&
        FITTING_TYPE_ORDER.map((type) => {
          const typeRows = groupedByType.get(type);
          if (!typeRows || typeRows.length === 0) return null;
          const sectionLabel = FITTING_TYPE_LABELS[type];
          return (
            <section key={type} className="mb-6">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {sectionLabel || type}
                <span className="ml-2 text-xs font-normal text-gray-500">
                  ({typeRows.length} rows)
                </span>
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600">
                      <th className="text-left px-3 py-2 font-medium">DN main</th>
                      <th className="text-left px-3 py-2 font-medium">DN branch</th>
                      <th className="text-right px-3 py-2 font-medium">F-F (mm)</th>
                      <th className="text-right px-3 py-2 font-medium">C-F (mm)</th>
                      <th className="text-right px-3 py-2 font-medium">Branch L (mm)</th>
                      <th className="text-right px-3 py-2 font-medium">Length (mm)</th>
                      <th className="text-left px-3 py-2 font-medium">Source</th>
                      <th className="text-left px-3 py-2 font-medium">Catalogue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {typeRows.map((row) => {
                      const branchDn = row.branchDnMm;
                      const faceToFace = row.faceToFaceMm;
                      const centreToFace = row.centreToFaceMm;
                      const branchLength = row.branchLengthMm;
                      const length = row.lengthMm;
                      return (
                        <tr
                          key={row.id}
                          className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <td className="px-3 py-1.5">{row.mainDnMm}</td>
                          <td className="px-3 py-1.5 text-gray-500">{branchDn ?? "—"}</td>
                          <td className="text-right px-3 py-1.5 font-mono text-xs">
                            {faceToFace ?? "—"}
                          </td>
                          <td className="text-right px-3 py-1.5 font-mono text-xs">
                            {centreToFace ?? "—"}
                          </td>
                          <td className="text-right px-3 py-1.5 font-mono text-xs">
                            {branchLength ?? "—"}
                          </td>
                          <td className="text-right px-3 py-1.5 font-mono text-xs">
                            {length ?? "—"}
                          </td>
                          <td className="px-3 py-1.5">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                                row.source === "catalogue"
                                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
                              }`}
                            >
                              {row.source}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400">
                            {row.sourceId}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
    </div>
  );
}
