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
  const [expanded, setExpanded] = useState(true);

  const loadConfig = useCallback(async () => {
    try {
      const config: InboundEmailConfigResponse = await stockControlApiClient.inboundEmailConfig();
      const loadedEmailHost = config.emailHost;
      const loadedEmailUser = config.emailUser;
      const loadedTlsServerName = config.tlsServerName;
      setEmailHost(loadedEmailHost || "");
      setEmailPort(config.emailPort !== null ? String(config.emailPort) : "993");
      setEmailUser(loadedEmailUser || "");
      setEmailPassSet(config.emailPassSet);
      setEmailPass("");
      setTlsEnabled(config.tlsEnabled);
      setTlsServerName(loadedTlsServerName || "");
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
        const error = result.error;
        setError(error || "Connection test failed.");
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900">Inbound Email Monitor</h2>
          {enabled && emailHost && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
              Active
            </span>
          )}
          {!enabled && emailHost && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
              Paused
            </span>
          )}
        </div>
      </button>
      {!expanded && (
        <p className="mt-1 text-xs text-gray-500 ml-6">
          {emailHost
            ? `${emailUser} on ${emailHost}`
            : "Not configured - set up IMAP to auto-process emailed documents"}
        </p>
      )}
      {expanded && (
        <div className="mt-3">
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            <div>
              <label
                htmlFor="imapHost"
                className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide"
              >
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
                className="mt-0.5 block w-full px-2 py-1 border border-gray-300 rounded text-xs placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <div>
              <label
                htmlFor="imapPort"
                className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide"
              >
                Port
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
                className="mt-0.5 block w-full px-2 py-1 border border-gray-300 rounded text-xs placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <div>
              <label
                htmlFor="imapUser"
                className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide"
              >
                Username
              </label>
              <input
                id="imapUser"
                type="text"
                value={emailUser}
                onChange={(e) => {
                  setEmailUser(e.target.value);
                  setSuccess("");
                }}
                placeholder="documents@example.com"
                className="mt-0.5 block w-full px-2 py-1 border border-gray-300 rounded text-xs placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <div>
              <label
                htmlFor="imapPass"
                className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide"
              >
                Password {emailPassSet && <span className="text-gray-400 normal-case">(set)</span>}
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
                className="mt-0.5 block w-full px-2 py-1 border border-gray-300 rounded text-xs placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <div>
              <label
                htmlFor="tlsServerName"
                className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide"
              >
                TLS Server Name <span className="text-gray-400 normal-case">(optional)</span>
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
                className="mt-0.5 block w-full px-2 py-1 border border-gray-300 rounded text-xs placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <div className="flex items-end gap-4 pb-0.5">
              <label className="flex items-center gap-1.5 text-xs">
                <input
                  type="checkbox"
                  checked={tlsEnabled}
                  onChange={(e) => {
                    setTlsEnabled(e.target.checked);
                    setSuccess("");
                  }}
                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 w-3.5 h-3.5"
                />
                TLS
              </label>
              <label className="flex items-center gap-1.5 text-xs">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => {
                    setEnabled(e.target.checked);
                    setSuccess("");
                  }}
                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 w-3.5 h-3.5"
                />
                <span className="font-medium">Active</span>
              </label>
            </div>
          </div>

          {lastPollAt && (
            <p className="mt-2 text-[10px] text-gray-400">
              Last polled: {new Date(lastPollAt).toLocaleString("en-ZA")}
              {lastError && <span className="text-red-500 ml-2">Error: {lastError}</span>}
            </p>
          )}

          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          {success && <p className="mt-2 text-xs text-green-600">{success}</p>}
          <div className="mt-2 flex gap-1.5">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-2.5 py-1 bg-teal-600 text-white text-xs font-medium rounded hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "..." : "Save"}
            </button>
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || !emailHost}
              className="px-2.5 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {testing ? "..." : "Test"}
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={saving || !emailHost}
              className="px-2.5 py-1 bg-gray-200 text-gray-700 text-xs font-medium rounded hover:bg-gray-300 disabled:opacity-50 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
