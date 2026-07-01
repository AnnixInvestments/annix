"use client";

import { useCallback, useEffect, useState } from "react";
import type { InboundEmailConfigResponse } from "@/app/lib/api/auRubberApi";
import { auRubberApiClient } from "@/app/lib/api/auRubberApi";
import { fromISO } from "@/app/lib/datetime";

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
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [expanded, setExpanded] = useState(true);

  const loadConfig = useCallback(async () => {
    try {
      const config: InboundEmailConfigResponse = await auRubberApiClient.inboundEmailConfig();
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
      await auRubberApiClient.updateInboundEmailConfig({
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
      await loadConfig();
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
      const result = await auRubberApiClient.testInboundEmailConnection();
      if (result.success) {
        setSuccess("IMAP connection successful.");
      } else {
        const testError = result.error;
        setError(testError || "Connection test failed.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection test failed");
    } finally {
      setTesting(false);
    }
  };

  const summary =
    enabled && emailHost
      ? `Active — ${emailUser} on ${emailHost}`
      : emailHost
        ? `Paused — ${emailUser} on ${emailHost}`
        : "Not configured";

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Inbound Email Monitor</h2>
          {enabled && emailHost && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Active
            </span>
          )}
          {!enabled && emailHost && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
              Paused
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
      {!expanded && <p className="mt-1 text-sm text-gray-500">{summary}</p>}
      {expanded && (
        <div className="mt-4">
          <p className="text-sm text-gray-500 mb-4">
            Polls the supplier mailbox over IMAP so emailed CoCs are picked up automatically.
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
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-sm"
              />
            </div>
            <div>
              <label htmlFor="imapPort" className="block text-sm font-medium text-gray-700">
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
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-sm"
              />
            </div>
            <div>
              <label htmlFor="imapUser" className="block text-sm font-medium text-gray-700">
                Mailbox Username
              </label>
              <input
                id="imapUser"
                type="text"
                value={emailUser}
                onChange={(e) => {
                  setEmailUser(e.target.value);
                  setSuccess("");
                }}
                placeholder="au-rubber-app@annix.co.za"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-sm"
              />
            </div>
            <div>
              <label htmlFor="imapPass" className="block text-sm font-medium text-gray-700">
                Mailbox Password{" "}
                {emailPassSet && <span className="text-gray-400">(set, enter new to change)</span>}
              </label>
              <div className="relative mt-1">
                <input
                  id="imapPass"
                  type={showPass ? "text" : "password"}
                  value={emailPass}
                  onChange={(e) => {
                    setEmailPass(e.target.value);
                    setSuccess("");
                  }}
                  placeholder={emailPassSet ? "********" : "Enter password"}
                  className="block w-full pr-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="tlsServerName" className="block text-sm font-medium text-gray-700">
                TLS Server Name <span className="text-gray-400">(optional)</span>
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
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-sm"
              />
            </div>
            <div className="flex items-end gap-6 pb-1">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={tlsEnabled}
                  onChange={(e) => {
                    setTlsEnabled(e.target.checked);
                    setSuccess("");
                  }}
                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                TLS
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => {
                    setEnabled(e.target.checked);
                    setSuccess("");
                  }}
                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <span className="font-medium">Active</span>
              </label>
            </div>
          </div>

          {lastPollAt && (
            <p className="mt-3 text-xs text-gray-400">
              Last polled: {fromISO(lastPollAt).toJSDate().toLocaleString("en-ZA")}
            </p>
          )}
          {lastError && <p className="mt-1 text-xs text-red-600">Last poll error: {lastError}</p>}

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          {success && <p className="mt-3 text-sm text-green-600">{success}</p>}

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || !emailHost}
              className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {testing ? "Testing..." : "Test Connection"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
