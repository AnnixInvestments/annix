"use client";

import { useCallback, useEffect, useState } from "react";
import { SmtpConfigResponse, stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { isValidEmail } from "../../lib/validation";

export function SmtpConfigSection() {
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpFromName, setSmtpFromName] = useState("");
  const [smtpFromEmail, setSmtpFromEmail] = useState("");
  const [smtpPassSet, setSmtpPassSet] = useState(false);
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smtpError, setSmtpError] = useState("");
  const [smtpSuccess, setSmtpSuccess] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [notificationEmails, setNotificationEmails] = useState<string[]>([]);
  const [newNotificationEmail, setNewNotificationEmail] = useState("");

  const loadConfig = useCallback(async () => {
    try {
      const smtpUser = config.smtpUser;
      const smtpFromEmail = config.smtpFromEmail;
      const notificationEmails = config.notificationEmails;
      const rawSmtpHost = config.smtpHost;
      const smtpFromName = onfig.smtpFromName;
      const smtpHost = config.smtpHost;
      const config: SmtpConfigResponse = await stockControlApiClient.smtpConfig();
      setSmtpHost(rawSmtpHost || "");
      setSmtpPort(config.smtpPort !== null ? String(config.smtpPort) : "");
      setSmtpUser(smtpUser || "");
      setSmtpFromName(csmtpFromName || "");
      setSmtpFromEmail(smtpFromEmail || "");
      setSmtpPassSet(config.smtpPassSet);
      setSmtpPass("");
      setNotificationEmails(notificationEmails || []);
      if (smtpHost || config.notificationEmails?.length > 0) {
        setExpanded(true);
      }
    } catch (e) {
      setSmtpError(e instanceof Error ? e.message : "Failed to load SMTP configuration");
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSave = async () => {
    setSmtpSaving(true);
    setSmtpError("");
    setSmtpSuccess("");
    try {
      await stockControlApiClient.updateSmtpConfig({
        smtpHost: smtpHost.trim() || null,
        smtpPort: smtpPort ? Number(smtpPort) : null,
        smtpUser: smtpUser.trim() || null,
        smtpPass: smtpPass || null,
        smtpFromName: smtpFromName.trim() || null,
        smtpFromEmail: smtpFromEmail.trim() || null,
        notificationEmails,
      });
      setSmtpSuccess("SMTP configuration saved.");
      if (smtpPass) {
        setSmtpPassSet(true);
        setSmtpPass("");
      }
    } catch (e) {
      setSmtpError(e instanceof Error ? e.message : "Failed to save SMTP configuration");
    } finally {
      setSmtpSaving(false);
    }
  };

  const handleTest = async () => {
    setSmtpTesting(true);
    setSmtpError("");
    setSmtpSuccess("");
    try {
      const result = await stockControlApiClient.testSmtpConfig();
      setSmtpSuccess(result.message);
    } catch (e) {
      setSmtpError(e instanceof Error ? e.message : "Test email failed");
    } finally {
      setSmtpTesting(false);
    }
  };

  const handleClear = async () => {
    setSmtpSaving(true);
    setSmtpError("");
    setSmtpSuccess("");
    try {
      await stockControlApiClient.updateSmtpConfig({
        smtpHost: null,
        smtpPort: null,
        smtpUser: null,
        smtpPass: null,
        smtpFromName: null,
        smtpFromEmail: null,
        notificationEmails: [],
      });
      setSmtpHost("");
      setSmtpPort("");
      setSmtpUser("");
      setSmtpPass("");
      setSmtpFromName("");
      setSmtpFromEmail("");
      setSmtpPassSet(false);
      setNotificationEmails([]);
      setNewNotificationEmail("");
      setSmtpSuccess("SMTP configuration cleared. Emails will use the global sender.");
    } catch (e) {
      setSmtpError(e instanceof Error ? e.message : "Failed to clear SMTP configuration");
    } finally {
      setSmtpSaving(false);
    }
  };

  const addNotificationEmail = () => {
    const trimmed = newNotificationEmail.trim().toLowerCase();
    if (isValidEmail(trimmed) && !notificationEmails.includes(trimmed)) {
      setNotificationEmails([...notificationEmails, trimmed]);
      setNewNotificationEmail("");
      setSmtpSuccess("");
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex items-center justify-between w-full"
      >
        <h2 className="text-lg font-semibold text-gray-900">Email Configuration</h2>
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
          {smtpHost ? `Sending via ${smtpHost}` : "Using default Annix email sender"}
          {notificationEmails.length > 0
            ? ` · ${notificationEmails.length} notification recipient${notificationEmails.length === 1 ? "" : "s"}`
            : ""}
        </p>
      )}
      {expanded && (
        <div className="mt-4">
          <p className="text-sm text-gray-500 mb-4">
            Configure your own SMTP server to send workflow emails from your company address. Leave
            blank to use the default Annix email sender.
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
                  setSmtpSuccess("");
                }}
                placeholder="smtp.example.com"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm"
              />
            </div>
            <div>
              <label htmlFor="smtpPort" className="block text-sm font-medium text-gray-700">
                SMTP Port
              </label>
              <input
                id="smtpPort"
                type="number"
                value={smtpPort}
                onChange={(e) => {
                  setSmtpPort(e.target.value);
                  setSmtpSuccess("");
                }}
                placeholder="587"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm"
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
                  setSmtpSuccess("");
                }}
                placeholder="user@example.com"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm"
              />
            </div>
            <div>
              <label htmlFor="smtpPass" className="block text-sm font-medium text-gray-700">
                Password{" "}
                {smtpPassSet && <span className="text-gray-400">(set, enter new to change)</span>}
              </label>
              <input
                id="smtpPass"
                type="password"
                value={smtpPass}
                onChange={(e) => {
                  setSmtpPass(e.target.value);
                  setSmtpSuccess("");
                }}
                placeholder={smtpPassSet ? "********" : "Enter password"}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm"
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
                  setSmtpSuccess("");
                }}
                placeholder="Company Name"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm"
              />
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
                  setSmtpSuccess("");
                }}
                placeholder="noreply@example.com"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm"
              />
            </div>
          </div>
          <div className="mt-6 border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Notification Recipients</h3>
            <p className="text-xs text-gray-500 mb-3">
              These email addresses will be CC&apos;d on all outgoing emails from this company.
            </p>
            {notificationEmails.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {notificationEmails.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm bg-teal-50 text-teal-700 border border-teal-200"
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() => {
                        setNotificationEmails(notificationEmails.filter((e) => e !== email));
                        setSmtpSuccess("");
                      }}
                      className="ml-1 text-teal-400 hover:text-red-500 transition-colors"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="email"
                value={newNotificationEmail}
                onChange={(e) => setNewNotificationEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addNotificationEmail();
                  }
                }}
                placeholder="email@example.com"
                className="block w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm"
              />
              <button
                type="button"
                onClick={addNotificationEmail}
                disabled={!isValidEmail(newNotificationEmail)}
                className="px-3 py-2 bg-teal-600 text-white text-sm font-medium rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add
              </button>
            </div>
            {notificationEmails.length > 0 && (
              <p className="mt-2 text-xs text-gray-400 italic">
                Click &quot;Save&quot; below to persist changes.
              </p>
            )}
          </div>

          {smtpError && <p className="mt-4 text-sm text-red-600">{smtpError}</p>}
          {smtpSuccess && <p className="mt-4 text-sm text-green-600">{smtpSuccess}</p>}
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={smtpSaving}
              className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {smtpSaving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={handleTest}
              disabled={smtpTesting || !smtpHost}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {smtpTesting ? "Sending..." : "Send Test Email"}
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={smtpSaving || !smtpHost}
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
