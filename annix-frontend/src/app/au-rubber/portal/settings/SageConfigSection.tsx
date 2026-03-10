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
  sageUsername: string | null;
  sagePasswordSet: boolean;
  sageCompanyId: number | null;
  sageCompanyName: string | null;
  connectedAt: string | null;
}

export function SageConfigSection() {
  const [status, setStatus] = useState<SageConnectionStatus | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [companies, setCompanies] = useState<SageCompany[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [step, setStep] = useState<"credentials" | "company" | "connected">("credentials");

  const loadStatus = useCallback(async () => {
    try {
      const config = await auRubberApiClient.sageConnectionStatus();
      setStatus(config);
      if (config.connected) {
        setStep("connected");
        setExpanded(true);
      } else if (config.sageUsername) {
        setUsername(config.sageUsername);
        setStep("credentials");
      }
    } catch {
      setStatus(null);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleTestConnection = async () => {
    setTesting(true);
    setError("");
    setSuccess("");
    try {
      const result = await auRubberApiClient.testSageConnection(username, password);
      if (result.success && result.companies.length > 0) {
        setCompanies(result.companies);
        setSelectedCompanyId(result.companies[0].ID);
        setStep("company");
        setSuccess(
          `Connected successfully. Found ${result.companies.length} Sage ${result.companies.length === 1 ? "company" : "companies"}.`,
        );
      } else {
        setError("Connection succeeded but no companies found on this Sage account.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect to Sage");
    } finally {
      setTesting(false);
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
      await auRubberApiClient.updateSageConfig({
        sageUsername: username,
        sagePassword: password,
        sageCompanyId: selectedCompanyId,
        sageCompanyName: selected?.Name ?? null,
      });
      setSuccess("Sage connection saved successfully.");
      setPassword("");
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
      setUsername("");
      setPassword("");
      setCompanies([]);
      setSelectedCompanyId(null);
      setStep("credentials");
      await loadStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to disconnect from Sage");
    } finally {
      setDisconnecting(false);
    }
  };

  const connectedSummary = status?.connected
    ? `Connected to ${status.sageCompanyName ?? "Sage"} as ${status.sageUsername}`
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
                    <span className="font-medium text-gray-700">Sage Account:</span>{" "}
                    <span className="text-gray-900">{status.sageUsername}</span>
                  </div>
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
                  onClick={() => {
                    setStep("credentials");
                    setUsername(status.sageUsername ?? "");
                    setPassword("");
                    setSuccess("");
                    setError("");
                  }}
                  className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 transition-colors"
                >
                  Reconfigure
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

          {step === "credentials" && (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="sageUsername" className="block text-sm font-medium text-gray-700">
                    Sage Email
                  </label>
                  <input
                    id="sageUsername"
                    type="email"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setSuccess("");
                    }}
                    placeholder="info@company.co.za"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="sagePassword" className="block text-sm font-medium text-gray-700">
                    Sage Password{" "}
                    {status?.sagePasswordSet && (
                      <span className="text-gray-400">(set, enter new to change)</span>
                    )}
                  </label>
                  <input
                    id="sagePassword"
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setSuccess("");
                    }}
                    placeholder={status?.sagePasswordSet ? "********" : "Enter password"}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-sm"
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testing || !username || !password}
                  className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {testing ? "Connecting..." : "Connect to Sage"}
                </button>
                {status?.connected && (
                  <button
                    type="button"
                    onClick={() => {
                      setStep("connected");
                      setError("");
                      setSuccess("");
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
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
                    setStep("credentials");
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
