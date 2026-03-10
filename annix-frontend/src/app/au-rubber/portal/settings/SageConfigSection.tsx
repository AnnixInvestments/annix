"use client";

import { useCallback, useEffect, useState } from "react";
import { auRubberApiClient } from "@/app/lib/api/auRubberApi";

interface SageCompany {
  ID: number;
  Name: string;
  TaxNumber: string;
}

interface SageConnectionStatus {
  connected: boolean;
  enabled: boolean;
  sageCompanyId: number | null;
  sageCompanyName: string | null;
  connectedAt: string | null;
  tokenExpiresAt: string | null;
  refreshTokenExpiresAt: string | null;
}

export function SageConfigSection() {
  const [status, setStatus] = useState<SageConnectionStatus | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [companies, setCompanies] = useState<SageCompany[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [step, setStep] = useState<"connect" | "company" | "connected">("connect");

  const loadStatus = useCallback(async () => {
    try {
      const config = await auRubberApiClient.sageConnectionStatus();
      setStatus(config);
      if (config.connected) {
        setStep("connected");
        setExpanded(true);
      } else {
        setStep("connect");
      }
    } catch {
      setStatus(null);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sageResult = params.get("sage");

    if (sageResult === "connected") {
      const companiesParam = params.get("companies");
      if (companiesParam) {
        try {
          const parsed = JSON.parse(companiesParam) as SageCompany[];
          setCompanies(parsed);
          setSelectedCompanyId(parsed.length > 0 ? parsed[0].ID : null);
          setStep("company");
          setExpanded(true);
          setSuccess(
            `Authenticated successfully. Found ${parsed.length} Sage ${parsed.length === 1 ? "company" : "companies"}.`,
          );
        } catch {
          setError("Failed to parse company data from Sage");
        }
      }
      window.history.replaceState({}, "", window.location.pathname);
    } else if (sageResult === "error") {
      const message = params.get("message") ?? "Sage authentication failed";
      setError(message);
      setExpanded(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    setError("");
    setSuccess("");
    try {
      const result = await auRubberApiClient.sageAuthorizeUrl();
      window.location.href = result.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to initiate Sage connection");
      setConnecting(false);
    }
  };

  const handleSave = async () => {
    if (!selectedCompanyId) {
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const selected = companies.find((c) => c.ID === selectedCompanyId);
      await auRubberApiClient.selectSageCompany(selectedCompanyId, selected?.Name ?? "");
      setSuccess("Sage connection saved successfully.");
      await loadStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save Sage configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setError("");
    setSuccess("");
    try {
      await auRubberApiClient.disconnectSage();
      setSuccess("Sage connection removed.");
      setCompanies([]);
      setSelectedCompanyId(null);
      setStep("connect");
      await loadStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to disconnect from Sage");
    } finally {
      setDisconnecting(false);
    }
  };

  const connectedSummary = status?.connected
    ? `Connected to ${status.sageCompanyName ?? "Sage"}`
    : "Not connected";

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Sage Accounting</h2>
          {status?.connected && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Connected
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {!expanded && <p className="mt-1 text-sm text-gray-500">{connectedSummary}</p>}
      {expanded && (
        <div className="mt-4">
          <p className="text-sm text-gray-500 mb-4">
            Connect your Sage One accounting to export supplier and customer invoices directly.
          </p>

          {step === "connected" && status?.connected && (
            <div>
              <div className="rounded-lg bg-green-50 border border-green-200 p-4 mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Company:</span>{" "}
                    <span className="text-gray-900">{status.sageCompanyName}</span>
                  </div>
                  {status.connectedAt && (
                    <div>
                      <span className="font-medium text-gray-700">Connected:</span>{" "}
                      <span className="text-gray-900">
                        {new Date(status.connectedAt).toLocaleDateString("en-ZA")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={connecting}
                  className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {connecting ? "Redirecting..." : "Reconnect"}
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {disconnecting ? "Disconnecting..." : "Disconnect"}
                </button>
              </div>
            </div>
          )}

          {step === "connect" && (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Click below to sign in to your Sage account and authorize access.
              </p>
              <button
                type="button"
                onClick={handleConnect}
                disabled={connecting}
                className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {connecting ? "Redirecting to Sage..." : "Connect to Sage"}
              </button>
            </div>
          )}

          {step === "company" && (
            <div>
              <div className="mb-4">
                <label
                  htmlFor="sageCompany"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Select Sage Company
                </label>
                <select
                  id="sageCompany"
                  value={selectedCompanyId ?? ""}
                  onChange={(e) => setSelectedCompanyId(Number(e.target.value))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-sm"
                >
                  {companies.map((c) => (
                    <option key={c.ID} value={c.ID}>
                      {c.Name}
                      {c.TaxNumber ? ` (VAT: ${c.TaxNumber})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !selectedCompanyId}
                  className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? "Saving..." : "Save Connection"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep("connect");
                    setError("");
                    setSuccess("");
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-300 transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
          {success && <p className="mt-4 text-sm text-green-600">{success}</p>}
        </div>
      )}
    </div>
  );
}
