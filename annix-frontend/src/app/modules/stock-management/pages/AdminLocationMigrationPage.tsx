"use client";

import { useState } from "react";
import { useAdminMutations } from "../hooks/useAdminQueries";
import { useStockManagementConfig } from "../provider/useStockManagementConfig";
import type { LocationCandidateInput, LocationClassificationSuggestionDto } from "../types/admin";

interface AdminLocationMigrationPageProps {
  locations: LocationCandidateInput[];
}

export function AdminLocationMigrationPage(props: AdminLocationMigrationPageProps) {
  const config = useStockManagementConfig();
  const mutations = useAdminMutations();
  const [suggestions, setSuggestions] = useState<LocationClassificationSuggestionDto[]>([]);
  const [decisions, setDecisions] = useState<Map<number, number | null>>(new Map());
  const [hasRun, setHasRun] = useState(false);

  const runClassification = async () => {
    try {
      const result = await mutations.classifyUnassignedLocations(props.locations);
      setSuggestions(result);
      const initialDecisions = new Map<number, number | null>();
      for (const s of result) {
        if (s.confidence >= 0.85) {
          initialDecisions.set(s.productId, s.suggestedLocationId);
        }
      }
      setDecisions(initialDecisions);
      setHasRun(true);
    } catch (err) {
      console.error("Classification failed", err);
    }
  };

  const applyDecisions = async () => {
    const decisionList = Array.from(decisions.entries()).map(([productId, locationId]) => ({
      productId,
      locationId,
    }));
    try {
      const result = await mutations.applyLocationClassifications(decisionList);
      // eslint-disable-next-line no-restricted-globals -- legacy sync alert pending modal migration (issue #175)
      alert(`Applied ${result.updated} location assignments`);
      setSuggestions([]);
      setDecisions(new Map());
      setHasRun(false);
    } catch (err) {
      console.error("Apply failed", err);
    }
  };

  const setDecision = (productId: number, locationId: number | null) => {
    const next = new Map(decisions);
    next.set(productId, locationId);
    setDecisions(next);
  };

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {config.label("admin.locationMigration")}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            One-off AI-assisted classification of unassigned products to physical warehouse
            locations
          </p>
        </div>
        {!hasRun ? (
          <button
            type="button"
            onClick={runClassification}
            disabled={(() => {
              const rawIsPending = mutations.isPending;
              return rawIsPending || props.locations.length === 0;
            })()}
            className="px-4 py-2 bg-teal-600 text-white rounded text-sm font-medium disabled:opacity-50"
          >
            Run AI Classification
          </button>
        ) : (
          <button
            type="button"
            onClick={applyDecisions}
            disabled={(() => {
              const rawIsPending = mutations.isPending;
              return rawIsPending || decisions.size === 0;
            })()}
            className="px-4 py-2 bg-teal-600 text-white rounded text-sm font-medium disabled:opacity-50"
          >
            Apply {decisions.size} Decisions
          </button>
        )}
      </header>

      {!hasRun ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-600">
          Click "Run AI Classification" to ask Gemini to classify each unassigned product against
          the {props.locations.length} known locations.
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  SKU
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Product
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Suggested Location
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Confidence
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Reasoning
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Decision
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {suggestions.map((s) => {
                const decision = decisions.get(s.productId);
                const confClass =
                  s.confidence >= 0.85
                    ? "text-green-700"
                    : s.confidence >= 0.6
                      ? "text-amber-700"
                      : "text-red-700";
                return (
                  <tr key={s.productId}>
                    <td className="px-4 py-3 font-mono text-xs">{s.productSku}</td>
                    <td className="px-4 py-3 text-sm">{s.productName}</td>
                    <td className="px-4 py-3 text-sm">
                      {s.suggestedLocationId
                        ? props.locations.find((l) => l.id === s.suggestedLocationId)?.name
                        : "—"}
                    </td>
                    <td className={`px-4 py-3 text-xs font-mono ${confClass}`}>
                      {(s.confidence * 100).toFixed(0)}%
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{s.reasoning}</td>
                    <td className="px-4 py-3">
                      <select
                        value={decision === undefined ? "" : (decision ?? "skip")}
                        onChange={(e) => {
                          if (e.target.value === "") {
                            const next = new Map(decisions);
                            next.delete(s.productId);
                            setDecisions(next);
                          } else if (e.target.value === "skip") {
                            setDecision(s.productId, null);
                          } else {
                            setDecision(s.productId, Number(e.target.value));
                          }
                        }}
                        className="border border-gray-300 rounded px-2 py-1 text-xs"
                      >
                        <option value="">Pending</option>
                        <option value="skip">Skip (leave unassigned)</option>
                        {props.locations.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminLocationMigrationPage;
