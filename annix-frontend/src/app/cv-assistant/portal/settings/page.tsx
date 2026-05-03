"use client";

import { allIndustryLabels } from "@annix/product-data/portals/annix-rep-industries";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PasskeyManagementSection } from "@/app/components/PasskeyManagementSection";
import { cvAssistantApiClient } from "@/app/lib/api/cvAssistantApi";
import { cvAssistantTokenStore } from "@/app/lib/api/portalTokenStores";
import {
  BEE_LEVELS,
  COMPANY_SIZE_OPTIONS,
  SOUTH_AFRICAN_PROVINCES,
} from "@/app/lib/config/registration/constants";
import {
  useCvNotificationPreferences,
  useCvPopiaStats,
  useCvSettings,
  useCvUpdateCompanySettings,
  useCvUpdateImapSettings,
  useCvUpdateNotificationPreferences,
} from "@/app/lib/query/hooks";

export default function SettingsPage() {
  const { data: settings, isLoading: settingsLoading } = useCvSettings();
  const { data: popiaStats } = useCvPopiaStats();
  const { data: notifPrefs } = useCvNotificationPreferences();
  const updateCompanyMutation = useCvUpdateCompanySettings();
  const updateImapMutation = useCvUpdateImapSettings();
  const updateNotifMutation = useCvUpdateNotificationPreferences();

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [notifSaved, setNotifSaved] = useState(false);

  const [companyName, setCompanyName] = useState("");
  const [companyIndustry, setCompanyIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [companyProvince, setCompanyProvince] = useState("");
  const [companyCity, setCompanyCity] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [beeLevel, setBeeLevel] = useState<string>("");
  const [companySaved, setCompanySaved] = useState(false);
  const industryOptions = useMemo(() => allIndustryLabels(), []);
  const [imapHost, setImapHost] = useState("");
  const [imapPort, setImapPort] = useState("993");
  const [imapUser, setImapUser] = useState("");
  const [imapPassword, setImapPassword] = useState("");
  const [monitoringEnabled, setMonitoringEnabled] = useState(false);
  const [emailFromAddress, setEmailFromAddress] = useState("");

  const [matchAlertThreshold, setMatchAlertThreshold] = useState(80);
  const [digestEnabled, setDigestEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);

  useEffect(() => {
    if (settings) {
      const imapHostVal = settings.imapHost;
      const imapPortVal = settings.imapPort;
      const imapUserVal = settings.imapUser;
      const imapPortStr = imapPortVal?.toString();
      const emailFromVal = settings.emailFromAddress;
      const industryVal = settings.industry;
      const companySizeVal = settings.companySize;
      const provinceVal = settings.province;
      const cityVal = settings.city;
      const streetVal = settings.streetAddress;
      const postalVal = settings.postalCode;
      const phoneVal = settings.phone;
      const contactEmailVal = settings.contactEmail;
      const websiteVal = settings.websiteUrl;
      const regNumVal = settings.registrationNumber;
      const vatVal = settings.vatNumber;
      const beeLevelStr = settings.beeLevel?.toString();
      setCompanyName(settings.name);
      setCompanyIndustry(industryVal || "");
      setCompanySize(companySizeVal || "");
      setCompanyProvince(provinceVal || "");
      setCompanyCity(cityVal || "");
      setStreetAddress(streetVal || "");
      setPostalCode(postalVal || "");
      setCompanyPhone(phoneVal || "");
      setContactEmail(contactEmailVal || "");
      setWebsiteUrl(websiteVal || "");
      setRegistrationNumber(regNumVal || "");
      setVatNumber(vatVal || "");
      setBeeLevel(beeLevelStr || "");
      setImapHost(imapHostVal || "");
      setImapPort(imapPortStr || "993");
      setImapUser(imapUserVal || "");
      setMonitoringEnabled(settings.monitoringEnabled);
      setEmailFromAddress(emailFromVal || "");
    }
  }, [settings]);

  useEffect(() => {
    if (notifPrefs) {
      setMatchAlertThreshold(notifPrefs.matchAlertThreshold);
      setDigestEnabled(notifPrefs.digestEnabled);
      setPushEnabled(notifPrefs.pushEnabled);
    }
  }, [notifPrefs]);

  const handleSaveCompany = () => {
    setCompanySaved(false);
    const beeLevelNum = beeLevel ? parseInt(beeLevel, 10) : undefined;
    updateCompanyMutation.mutate(
      {
        name: companyName,
        industry: companyIndustry || undefined,
        companySize: companySize || undefined,
        province: companyProvince || undefined,
        city: companyCity || undefined,
        streetAddress: streetAddress || undefined,
        postalCode: postalCode || undefined,
        phone: companyPhone || undefined,
        contactEmail: contactEmail || undefined,
        websiteUrl: websiteUrl || undefined,
        registrationNumber: registrationNumber || undefined,
        vatNumber: vatNumber || undefined,
        beeLevel: beeLevelNum,
      },
      {
        onSuccess: () => {
          setCompanySaved(true);
          setTimeout(() => setCompanySaved(false), 3000);
        },
      },
    );
  };

  const handleSaveImap = () => {
    updateImapMutation.mutate(
      {
        imapHost: imapHost || null,
        imapPort: imapPort ? parseInt(imapPort, 10) : null,
        imapUser: imapUser || null,
        imapPassword: imapPassword || null,
        monitoringEnabled,
        emailFromAddress: emailFromAddress || null,
      },
      {
        onSuccess: () => setImapPassword(""),
      },
    );
  };

  const handleTestConnection = async () => {
    if (!imapHost || !imapUser || !imapPassword) {
      setTestResult({ success: false, error: "Please fill in all IMAP fields" });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await cvAssistantApiClient.testImapConnection({
        host: imapHost,
        port: parseInt(imapPort, 10),
        user: imapUser,
        password: imapPassword,
      });
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : "Test failed",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveNotifications = () => {
    setNotifSaved(false);
    updateNotifMutation.mutate(
      {
        matchAlertThreshold,
        digestEnabled,
        pushEnabled,
      },
      {
        onSuccess: () => {
          setNotifSaved(true);
          setTimeout(() => setNotifSaved(false), 3000);
        },
      },
    );
  };

  const handleEnablePush = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }

    try {
      const { key } = await cvAssistantApiClient.notificationVapidKey();
      if (!key) {
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key,
      });

      const subJson = subscription.toJSON();
      await cvAssistantApiClient.subscribePush({
        endpoint: subJson.endpoint!,
        keys: {
          p256dh: subJson.keys!.p256dh!,
          auth: subJson.keys!.auth!,
        },
      });

      setPushEnabled(true);
    } catch (error) {
      console.error("Failed to enable push notifications:", error);
    }
  };

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#323288]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-white/70 mt-1">Configure your CV Assistant settings</p>
      </div>

      <PasskeyManagementSection
        authHeaders={cvAssistantTokenStore.authHeaders()}
        title="Your passkeys"
      />

      <Link
        href="/cv-assistant/portal/settings/email-templates"
        className="block bg-white rounded-xl shadow-sm border border-[#e0e0f5] p-6 hover:border-[#FFA500] transition-all"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Email templates</h2>
            <p className="text-sm text-gray-600 mt-1">
              Customise the candidate-facing emails for rejection, shortlist, acceptance, reference
              requests and acknowledgement. Nix can draft them for you.
            </p>
          </div>
          <span className="text-[#FFA500] text-sm font-semibold">Manage →</span>
        </div>
      </Link>

      <div className="bg-white rounded-xl shadow-sm border border-[#e0e0f5] p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Company Information</h2>
        <p className="text-sm text-gray-600 mb-4">
          A complete profile improves how the AI matches candidates to your roles.
        </p>
        <div className="space-y-4 max-w-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f0f0fc]0 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
              <select
                value={companyIndustry}
                onChange={(e) => setCompanyIndustry(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f0f0fc]0 focus:border-transparent bg-white"
              >
                <option value="">Select industry</option>
                {industryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Size</label>
              <select
                value={companySize}
                onChange={(e) => setCompanySize(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f0f0fc]0 focus:border-transparent bg-white"
              >
                <option value="">Select company size</option>
                {COMPANY_SIZE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://yourcompany.co.za"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f0f0fc]0 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
              <select
                value={companyProvince}
                onChange={(e) => setCompanyProvince(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f0f0fc]0 focus:border-transparent bg-white"
              >
                <option value="">Select province</option>
                {SOUTH_AFRICAN_PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City / Town</label>
              <input
                type="text"
                value={companyCity}
                onChange={(e) => setCompanyCity(e.target.value)}
                placeholder="Johannesburg"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f0f0fc]0 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="2000"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f0f0fc]0 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
            <input
              type="text"
              value={streetAddress}
              onChange={(e) => setStreetAddress(e.target.value)}
              placeholder="123 Main Road, Sandton"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f0f0fc]0 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={companyPhone}
                onChange={(e) => setCompanyPhone(e.target.value)}
                placeholder="+27 11 000 0000"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f0f0fc]0 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="hr@yourcompany.co.za"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f0f0fc]0 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Registration No. (CIPC)
              </label>
              <input
                type="text"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                placeholder="2020/123456/07"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f0f0fc]0 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">VAT Number</label>
              <input
                type="text"
                value={vatNumber}
                onChange={(e) => setVatNumber(e.target.value)}
                placeholder="4000000000"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f0f0fc]0 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">B-BBEE Level</label>
              <select
                value={beeLevel}
                onChange={(e) => setBeeLevel(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f0f0fc]0 focus:border-transparent bg-white"
              >
                <option value="">Not specified</option>
                {BEE_LEVELS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {companySaved && (
            <div className="px-4 py-3 rounded-lg text-sm bg-green-50 text-green-700">
              Company information saved
            </div>
          )}

          <button
            onClick={handleSaveCompany}
            disabled={updateCompanyMutation.isPending}
            className="px-4 py-2 bg-[#323288] text-white rounded-lg hover:bg-[#252560] disabled:opacity-50"
          >
            {updateCompanyMutation.isPending ? "Saving..." : "Save Company Information"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#e0e0f5] p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Email Monitoring (IMAP)</h2>
        <p className="text-sm text-gray-600 mb-4">
          Configure IMAP settings to automatically monitor an inbox for CV submissions.
        </p>

        <div className="space-y-4 max-w-md">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="monitoringEnabled"
              checked={monitoringEnabled}
              onChange={(e) => setMonitoringEnabled(e.target.checked)}
              className="h-4 w-4 text-[#323288] focus:ring-[#f0f0fc]0 border-gray-300 rounded"
            />
            <label htmlFor="monitoringEnabled" className="ml-2 text-sm text-gray-700">
              Enable email monitoring
            </label>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">IMAP Host</label>
              <input
                type="text"
                value={imapHost}
                onChange={(e) => setImapHost(e.target.value)}
                placeholder="imap.gmail.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f0f0fc]0 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
              <input
                type="number"
                value={imapPort}
                onChange={(e) => setImapPort(e.target.value)}
                placeholder="993"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f0f0fc]0 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">IMAP Username</label>
            <input
              type="text"
              value={imapUser}
              onChange={(e) => setImapUser(e.target.value)}
              placeholder="recruiting@example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f0f0fc]0 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              IMAP Password{" "}
              {settings?.imapConfigured && (
                <span className="text-gray-400">(leave blank to keep current)</span>
              )}
            </label>
            <input
              type="password"
              value={imapPassword}
              onChange={(e) => setImapPassword(e.target.value)}
              placeholder="App password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f0f0fc]0 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Email Address
            </label>
            <input
              type="email"
              value={emailFromAddress}
              onChange={(e) => setEmailFromAddress(e.target.value)}
              placeholder="noreply@example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f0f0fc]0 focus:border-transparent"
            />
          </div>

          {testResult && (
            <div
              className={`px-4 py-3 rounded-lg text-sm ${
                testResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
              }`}
            >
              {testResult.success
                ? "Connection successful!"
                : `Connection failed: ${testResult.error}`}
            </div>
          )}

          <div className="flex items-center space-x-3">
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {isTesting ? "Testing..." : "Test Connection"}
            </button>
            <button
              onClick={handleSaveImap}
              disabled={updateImapMutation.isPending}
              className="px-4 py-2 bg-[#323288] text-white rounded-lg hover:bg-[#252560] disabled:opacity-50"
            >
              {updateImapMutation.isPending ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#e0e0f5] p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Notifications & Alerts</h2>
        <p className="text-sm text-gray-600 mb-4">
          Configure how and when you receive notifications about candidate matches and recruitment
          activity.
        </p>

        <div className="space-y-5 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Match Alert Threshold
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Only notify when candidate match score exceeds this percentage
            </p>
            <div className="flex items-center space-x-3">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={matchAlertThreshold}
                onChange={(e) => setMatchAlertThreshold(parseInt(e.target.value, 10))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#323288]"
              />
              <span className="text-sm font-medium text-gray-900 w-12 text-right">
                {matchAlertThreshold}%
              </span>
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="digestEnabled"
              checked={digestEnabled}
              onChange={(e) => setDigestEnabled(e.target.checked)}
              className="h-4 w-4 text-[#323288] focus:ring-[#f0f0fc]0 border-gray-300 rounded"
            />
            <label htmlFor="digestEnabled" className="ml-2 text-sm text-gray-700">
              Weekly email digest of matching jobs and candidate activity
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="pushEnabled"
              checked={pushEnabled}
              onChange={(e) => {
                if (e.target.checked) {
                  handleEnablePush();
                } else {
                  setPushEnabled(false);
                }
              }}
              className="h-4 w-4 text-[#323288] focus:ring-[#f0f0fc]0 border-gray-300 rounded"
            />
            <label htmlFor="pushEnabled" className="ml-2 text-sm text-gray-700">
              Push notifications for high-scoring matches
            </label>
          </div>

          {notifSaved && (
            <div className="px-4 py-3 rounded-lg text-sm bg-green-50 text-green-700">
              Notification preferences saved
            </div>
          )}

          <button
            onClick={handleSaveNotifications}
            disabled={updateNotifMutation.isPending}
            className="px-4 py-2 bg-[#323288] text-white rounded-lg hover:bg-[#252560] disabled:opacity-50"
          >
            {updateNotifMutation.isPending ? "Saving..." : "Save Notification Settings"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#e0e0f5] p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">POPIA Compliance</h2>
        <p className="text-sm text-gray-600 mb-4">
          Data retention policy in accordance with the Protection of Personal Information Act.
          Candidate data is automatically deleted after 12 months of inactivity.
        </p>

        {popiaStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Total Candidates</p>
              <p className="text-lg font-semibold text-gray-900">{popiaStats.totalCandidates}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider">With Consent</p>
              <p className="text-lg font-semibold text-green-600">{popiaStats.withConsent}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Without Consent</p>
              <p className="text-lg font-semibold text-amber-600">{popiaStats.withoutConsent}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Expiring (30 days)</p>
              <p className="text-lg font-semibold text-red-600">
                {popiaStats.expiringWithin30Days}
              </p>
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-blue-500 mt-0.5 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="ml-3 text-sm text-blue-700">
              <p className="font-medium">Retention Policy</p>
              <ul className="mt-1 list-disc pl-4 space-y-1">
                <li>Candidate data auto-deleted after 12 months of inactivity</li>
                <li>CV files removed from storage upon deletion</li>
                <li>Right to erasure available per candidate via the candidate detail page</li>
                <li>POPIA consent recorded with timestamp at candidate upload</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
