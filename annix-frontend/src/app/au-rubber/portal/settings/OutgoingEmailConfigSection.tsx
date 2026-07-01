"use client";

import { useCallback, useEffect, useState } from "react";
import { auRubberApiClient } from "@/app/lib/api/auRubberApi";
import type { RubberAppProfileDto } from "@/app/lib/api/rubberPortalApi";

export function OutgoingEmailConfigSection() {
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpPassSet, setSmtpPassSet] = useState(false);
  const [smtpFromEmail, setSmtpFromEmail] = useState("");
  const [smtpFromName, setSmtpFromName] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [expanded, setExpanded] = useState(true);

  const loadConfig = useCallback(async () => {
    try {
      const profile: RubberAppProfileDto = await auRubberApiClient.appProfile();
      const rawHost = profile.smtpHost;
      const rawUser = profile.smtpUser;
      const rawFromEmail = profile.smtpFromEmail;
      const rawFromName = profile.smtpFromName;
      setSmtpHost(rawHost || "");
      setSmtpPort(profile.smtpPort !== null ? String(profile.smtpPort) : "587");
      setSmtpUser(rawUser || "");
      setSmtpPassSet(!!profile.smtpPass);
      setSmtpPass("");
      setSmtpFromEmail(rawFromEmail || "");
      setSmtpFromName(rawFromName || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load SMTP configuration");
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
      await auRubberApiClient.updateAppProfile({
        smtpHost: smtpHost.trim() || null,
        smtpPort: smtpPort ? Number(smtpPort) : null,
        smtpUser: smtpUser.trim() || null,
        smtpPass: smtpPass || null,
        smtpFromEmail: smtpFromEmail.trim() || null,
        smtpFromName: smtpFromName.trim() || null,
      });
      setSuccess("Outgoing email configuration saved.");
      if (smtpPass) {
        setSmtpPassSet(true);
        setSmtpPass("");
      }
      await loadConfig();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!smtpPass && smtpPassSet) {
      setError("Password is hidden for security. Re-enter it to test, or save first then test.");
      return;
    }
    setTesting(true);
    setError("");
    setSuccess("");
    try {
      const result = await auRubberApiClient.testSmtpConnection({
        host: smtpHost.trim(),
        port: Number(smtpPort),
        user: smtpUser.trim(),
        pass: smtpPass || "",
      });
      if (result.success) {
        setSuccess("SMTP connection successful!");
      } else {
        const rawError = result.error;
        setError(rawError || "Connection test failed");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection test failed");
    } finally {
      setTesting(false);
    }
  };

  const summary = smtpHost
    ? `Configured — ${smtpUser} on ${smtpHost}:${smtpPort}`
    : "Not configured";

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Outgoing Email (SMTP)</h2>
          {smtpHost && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Configured
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
            Used for all outbound emails from the app — quotation delivery, order confirmations,
            etc.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="smtpHost" className="block text-sm font-medium text-gray-700">
                SMTP Host
              </label>
              <input
                id="smtpHost"
                type="text"
                value={smtpHost}
                onChange={(e) => {
                  setSmtpHost(e.target.value);
                  setSuccess("");
                }}
                placeholder="da01.ondedicatedhosting.co.za"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-sm"
              />
            </div>
            <div>
              <label htmlFor="smtpPort" className="block text-sm font-medium text-gray-700">
                Port
              </label>
              <input
                id="smtpPort"
                type="number"
                value={smtpPort}
                onChange={(e) => {
                  setSmtpPort(e.target.value);
                  setSuccess("");
                }}
                placeholder="587"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-sm"
              />
            </div>
            <div>
              <label htmlFor="smtpUser" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <input
                id="smtpUser"
                type="text"
                value={smtpUser}
                onChange={(e) => {
                  setSmtpUser(e.target.value);
                  setSuccess("");
                }}
                placeholder="au-rubber-app@annix.co.za"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-sm"
              />
            </div>
            <div>
              <label htmlFor="smtpPass" className="block text-sm font-medium text-gray-700">
                Password{" "}
                {smtpPassSet && <span className="text-gray-400">(set, enter new to change)</span>}
              </label>
              <div className="relative mt-1">
                <input
                  id="smtpPass"
                  type={showPass ? "text" : "password"}
                  value={smtpPass}
                  onChange={(e) => {
                    setSmtpPass(e.target.value);
                    setSuccess("");
                  }}
                  placeholder={smtpPassSet ? "********" : "Enter password"}
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
              <label htmlFor="smtpFromEmail" className="block text-sm font-medium text-gray-700">
                From Email
              </label>
              <input
                id="smtpFromEmail"
                type="email"
                value={smtpFromEmail}
                onChange={(e) => {
                  setSmtpFromEmail(e.target.value);
                  setSuccess("");
                }}
                placeholder="au-rubber-app@annix.co.za"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-sm"
              />
            </div>
            <div>
              <label htmlFor="smtpFromName" className="block text-sm font-medium text-gray-700">
                From Name
              </label>
              <input
                id="smtpFromName"
                type="text"
                value={smtpFromName}
                onChange={(e) => {
                  setSmtpFromName(e.target.value);
                  setSuccess("");
                }}
                placeholder="AU Rubber"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-sm"
              />
            </div>
          </div>

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
              disabled={testing || !smtpHost.trim()}
              className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {testing ? "Testing..." : "Test Connection"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
