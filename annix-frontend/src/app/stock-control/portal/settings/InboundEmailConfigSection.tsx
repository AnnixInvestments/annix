"use client";

import { useCallback, useEffect, useState } from "react";
import type { InboundEmailConfigResponse } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";

export function InboundEmailConfigSection() {
  const [emailHost, setEmailHost] = useState("");
  const [emailPort, setEmailPort] = useState("993");
  const [emailUser, setEmailUser] = useState("");
  const [emailPass, setEmailPass] = useState("");
  const [emailPassSet, setEmailPassSet] = useState(false);
  const [tlsEnabled, setTlsEnabled] = useState(true);
  const [tlsServerName, setTlsServerName] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [lastPollAt, setLastPollAt] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [expanded, setExpanded] = useState(false);

  const loadConfig = useCallback(async () => {
    try {
      const config: InboundEmailConfigResponse = await stockControlApiClient.inboundEmailConfig();
      setEmailHost(config.emailHost ?? "");
      setEmailPort(config.emailPort !== null ? String(config.emailPort) : "993");
      setEmailUser(config.emailUser ?? "");
      setEmailPassSet(config.emailPassSet);
      setEmailPass("");
      setTlsEnabled(config.tlsEnabled);
      setTlsServerName(config.tlsServerName ?? "");
      setEnabled(config.enabled);
      setLastPollAt(config.lastPollAt);
      setLastError(config.lastError);
      if (config.emailHost) {
        setExpanded(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load inbound email configuration");
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await stockControlApiClient.updateInboundEmailConfig({
        emailHost: emailHost.trim() || null,
        emailPort: emailPort ? Number(emailPort) : null,
        emailUser: emailUser.trim() || null,
        emailPass: emailPass || null,
        tlsEnabled,
        tlsServerName: tlsServerName.trim() || null,
        enabled,
      });
      setSuccess("Inbound email configuration saved.");
      if (emailPass) {
        setEmailPassSet(true);
        setEmailPass("");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setError("");
    setSuccess("");
    try {
      const result = await stockControlApiClient.testInboundEmailConnection();
      if (result.success) {
        setSuccess("IMAP connection successful.");
      } else {
        setError(result.error ?? "Connection test failed.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection test failed");
    } finally {
      setTesting(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await stockControlApiClient.updateInboundEmailConfig({
        emailHost: null,
        emailPort: null,
        emailUser: null,
        emailPass: null,
        tlsEnabled: true,
        tlsServerName: null,
        enabled: false,
      });
      setEmailHost("");
      setEmailPort("993");
      setEmailUser("");
      setEmailPass("");
      setEmailPassSet(false);
      setTlsEnabled(true);
      setTlsServerName("");
      setEnabled(false);
      setLastPollAt(null);
      setLastError(null);
      setSuccess("Inbound email configuration cleared.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to clear configuration");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex items-center justify-between w-full"
      >
        <h2 className="text-lg font-semibold text-gray-900">Inbound Email Monitor</h2>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {!expanded && (
        <p className="mt-1 text-sm text-gray-500">
          {emailHost
            ? `Monitoring ${emailUser} on ${emailHost}${enabled ? "" : " (paused)"}`
            : "Not configured - set up IMAP to auto-process emailed documents"}
        </p>
      )}
      {expanded && (
        <div className="mt-4">
          <p className="text-sm text-gray-500 mb-4">
            Configure an IMAP mailbox to automatically receive and process supplier documents
            (invoices, delivery notes, certificates). The system polls for new emails every minute.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="imapHost" className="block text-sm font-medium text-gray-700">
                IMAP Host
              </label>
              <input
                id="imapHost"
                type="text"
                value={emailHost}
                onChange={(e) => {
                  setEmailHost(e.target.value);
                  setSuccess("");
                }}
                placeholder="imap.example.com"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm"
              />
            </div>
            <div>
              <label htmlFor="imapPort" className="block text-sm font-medium text-gray-700">
                IMAP Port
              </label>
              <input
                id="imapPort"
                type="number"
                value={emailPort}
                onChange={(e) => {
                  setEmailPort(e.target.value);
                  setSuccess("");
                }}
                placeholder="993"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm"
              />
            </div>
            <div>
              <label htmlFor="imapUser" className="block text-sm font-medium text-gray-700">
                Email Username
              </label>
              <input
                id="imapUser"
                type="text"
                value={emailUser}
                onChange={(e) => {
                  setEmailUser(e.target.value);
                  setSuccess("");
                }}
                placeholder="documents@company.co.za"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm"
              />
            </div>
            <div>
              <label htmlFor="imapPass" className="block text-sm font-medium text-gray-700">
                Password{" "}
                {emailPassSet && <span className="text-gray-400">(set, enter new to change)</span>}
              </label>
              <input
                id="imapPass"
                type="password"
                value={emailPass}
                onChange={(e) => {
                  setEmailPass(e.target.value);
                  setSuccess("");
                }}
                placeholder={emailPassSet ? "********" : "Enter password"}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm"
              />
            </div>
            <div>
              <label htmlFor="tlsServerName" className="block text-sm font-medium text-gray-700">
                TLS Server Name <span className="text-gray-400">(optional, for SNI)</span>
              </label>
              <input
                id="tlsServerName"
                type="text"
                value={tlsServerName}
                onChange={(e) => {
                  setTlsServerName(e.target.value);
                  setSuccess("");
                }}
                placeholder="mail.example.com"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm"
              />
            </div>
            <div className="flex items-end gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={tlsEnabled}
                  onChange={(e) => {
                    setTlsEnabled(e.target.checked);
                    setSuccess("");
                  }}
                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                TLS Enabled
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => {
                    setEnabled(e.target.checked);
                    setSuccess("");
                  }}
                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="font-medium">Monitoring Active</span>
              </label>
            </div>
          </div>

          {lastPollAt && (
            <p className="mt-3 text-xs text-gray-400">
              Last polled: {new Date(lastPollAt).toLocaleString("en-ZA")}
              {lastError && <span className="text-red-500 ml-2">Last error: {lastError}</span>}
            </p>
          )}

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
          {success && <p className="mt-4 text-sm text-green-600">{success}</p>}
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || !emailHost}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {testing ? "Testing..." : "Test Connection"}
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={saving || !emailHost}
              className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
