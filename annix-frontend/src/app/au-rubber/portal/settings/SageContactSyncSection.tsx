"use client";

import { useCallback, useEffect, useState } from "react";
import {
  auRubberApiClient,
  type SageContactMappingStatus,
  type SageContactSyncResult,
} from "@/app/lib/api/auRubberApi";

export function SageContactSyncSection() {
  const [mappings, setMappings] = useState<SageContactMappingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SageContactSyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sageConnected, setSageConnected] = useState(false);
  const [manualSelections, setManualSelections] = useState<Record<number, number>>({});

  const loadMappings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const status = await auRubberApiClient.sageConnectionStatus();
      setSageConnected(status.connected);

      if (status.connected) {
        const data = await auRubberApiClient.sageContactMappings();
        setMappings(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contact mappings");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMappings();
  }, [loadMappings]);

  if (!sageConnected || isLoading) {
    return null;
  }

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      setError(null);
      setSyncResult(null);
      const result = await auRubberApiClient.sageContactSync();
      setSyncResult(result);
      await loadMappings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleManualMap = async (companyId: number, companyType: string) => {
    const sageContactId = manualSelections[companyId];
    if (!sageContactId) return;

    try {
      setError(null);
      await auRubberApiClient.mapSageContact(companyId, sageContactId, companyType);
      setManualSelections((prev) => {
        const next = { ...prev };
        delete next[companyId];
        return next;
      });
      await loadMappings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to map contact");
    }
  };

  const handleUnmap = async (companyId: number) => {
    try {
      setError(null);
      await auRubberApiClient.unmapSageContact(companyId);
      await loadMappings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unmap contact");
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Sage Contact Mappings</h2>
          {mappings && (
            <p className="mt-1 text-sm text-gray-500">
              {mappings.summary.mapped} mapped, {mappings.summary.unmapped} unmapped of{" "}
              {mappings.summary.total} companies
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleSync}
          disabled={isSyncing}
          className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSyncing ? "Syncing..." : "Auto-Match"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {syncResult && (
        <div className="mb-4 rounded-md bg-green-50 border border-green-200 p-3">
          <p className="text-sm text-green-800">
            Auto-matched {syncResult.matched} new{" "}
            {syncResult.matched === 1 ? "contact" : "contacts"}.{" "}
            {syncResult.unmatched > 0 && (
              <span>
                {syncResult.unmatched} {syncResult.unmatched === 1 ? "company" : "companies"} could
                not be matched automatically.
              </span>
            )}
          </p>
        </div>
      )}

      {mappings && mappings.companies.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Company
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Sage Contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mappings.companies.map((company) => {
                const rawCompanySageContactName = company.sageContactName;
                const rawManualSelectionsByCompanyid = manualSelections[company.id];
                return (
                  <tr key={company.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{company.name}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          company.companyType === "SUPPLIER"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {company.companyType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {company.sageContactId !== null ? (
                        rawCompanySageContactName || `ID: ${company.sageContactId}`
                      ) : company.suggestedMatches.length > 0 ? (
                        <select
                          value={rawManualSelectionsByCompanyid ?? ""}
                          onChange={(e) =>
                            setManualSelections((prev) => ({
                              ...prev,
                              [company.id]: Number(e.target.value),
                            }))
                          }
                          className="block w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                        >
                          <option value="">Select Sage contact...</option>
                          {company.suggestedMatches.map((match) => (
                            <option key={match.sageId} value={match.sageId}>
                              {match.sageName} ({Math.round(match.confidence * 100)}%)
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-gray-400">No suggestions</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {company.sageContactId !== null ? (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          Mapped
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                          Unmapped
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {company.sageContactId !== null ? (
                        <button
                          type="button"
                          onClick={() => handleUnmap(company.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Unmap
                        </button>
                      ) : manualSelections[company.id] ? (
                        <button
                          type="button"
                          onClick={() => handleManualMap(company.id, company.companyType)}
                          className="text-orange-600 hover:text-orange-800 text-sm font-medium"
                        >
                          Map
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {mappings && mappings.companies.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-4">
          No companies found. Add companies first, then sync with Sage.
        </p>
      )}
    </div>
  );
}
