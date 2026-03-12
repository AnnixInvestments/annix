"use client";

import {
  Bell,
  Building2,
  CheckCircle,
  CreditCard,
  ExternalLink,
  FileText,
  FolderOpen,
  Info,
  Loader2,
  Save,
  Settings,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { COMPLY_SA_VERSION } from "@/app/comply-sa/config/version";
import { formatDateZA } from "@/app/lib/datetime";
import {
  useCancelSubscription,
  useCompanyProfile,
  useNotificationPreferences,
  useSubscriptionStatus,
  useUpdateCompanyProfile,
  useUpdateNotificationPreferences,
} from "@/app/lib/query/hooks";
import type {
  CompanyProfile,
  NotificationPreferences,
  SubscriptionStatusData,
} from "@/app/lib/query/hooks";

function Toggle({
  label,
  enabled,
  onChange,
}: {
  label: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm text-slate-300">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? "bg-teal-500" : "bg-slate-600"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

function NotificationSection() {
  const { data: prefs, isLoading } = useNotificationPreferences();
  const updateMutation = useUpdateNotificationPreferences();
  const [localPrefs, setLocalPrefs] = useState<NotificationPreferences | null>(null);
  const [saved, setSaved] = useState(false);

  const activePrefs = localPrefs ?? prefs ?? null;

  function handleToggle(key: keyof NotificationPreferences, value: boolean) {
    if (!activePrefs) return;
    setLocalPrefs({ ...activePrefs, [key]: value });
    setSaved(false);
  }

  function handleSave() {
    if (!activePrefs) return;
    updateMutation.mutate(activePrefs as unknown as Record<string, unknown>, {
      onSuccess: () => setSaved(true),
      onError: () => setSaved(false),
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 text-teal-400 animate-spin" />
      </div>
    );
  }

  if (!activePrefs) {
    return <p className="text-sm text-slate-500 py-4">Unable to load notification preferences</p>;
  }

  return (
    <div className="space-y-4">
      <div className="divide-y divide-slate-700/50">
        <Toggle
          label="Email Notifications"
          enabled={activePrefs.email}
          onChange={(v) => handleToggle("email", v)}
        />
        <Toggle
          label="SMS Notifications"
          enabled={activePrefs.sms}
          onChange={(v) => handleToggle("sms", v)}
        />
        <Toggle
          label="WhatsApp Notifications"
          enabled={activePrefs.whatsapp}
          onChange={(v) => handleToggle("whatsapp", v)}
        />
        <Toggle
          label="In-App Notifications"
          enabled={activePrefs.inApp}
          onChange={(v) => handleToggle("inApp", v)}
        />
        <Toggle
          label="Weekly Digest"
          enabled={activePrefs.weeklyDigest}
          onChange={(v) => handleToggle("weeklyDigest", v)}
        />
      </div>

      {(activePrefs.sms || activePrefs.whatsapp) && (
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Phone Number</label>
          <input
            type="tel"
            value={activePrefs.phoneNumber ?? ""}
            onChange={(e) => {
              setLocalPrefs({ ...activePrefs, phoneNumber: e.target.value || null });
              setSaved(false);
            }}
            placeholder="+27 XX XXX XXXX"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={updateMutation.isPending}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
      >
        {updateMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : saved ? (
          <>
            <CheckCircle className="h-4 w-4" />
            Saved
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />
            Save Preferences
          </>
        )}
      </button>
    </div>
  );
}

function CompanySection() {
  const { data: company, isLoading } = useCompanyProfile();
  const updateMutation = useUpdateCompanyProfile();
  const [localCompany, setLocalCompany] = useState<CompanyProfile | null>(null);
  const [saved, setSaved] = useState(false);

  const activeCompany = localCompany ?? company ?? null;

  function handleChange(key: keyof CompanyProfile, value: string | null) {
    if (!activeCompany) return;
    setLocalCompany({ ...activeCompany, [key]: value });
    setSaved(false);
  }

  function handleSave() {
    if (!activeCompany) return;
    updateMutation.mutate(activeCompany as unknown as Record<string, unknown>, {
      onSuccess: () => setSaved(true),
      onError: () => setSaved(false),
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 text-teal-400 animate-spin" />
      </div>
    );
  }

  if (!activeCompany) {
    return <p className="text-sm text-slate-500 py-4">Unable to load company profile</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Company Name</label>
          <input
            type="text"
            value={activeCompany.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Registration Number
          </label>
          <input
            type="text"
            value={activeCompany.registrationNumber ?? ""}
            onChange={(e) => handleChange("registrationNumber", e.target.value || null)}
            placeholder="e.g. 2024/123456/07"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
          <input
            type="email"
            value={activeCompany.email ?? ""}
            onChange={(e) => handleChange("email", e.target.value || null)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Phone</label>
          <input
            type="tel"
            value={activeCompany.phone ?? ""}
            onChange={(e) => handleChange("phone", e.target.value || null)}
            placeholder="+27 XX XXX XXXX"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Industry</label>
          <input
            type="text"
            value={activeCompany.industry ?? ""}
            onChange={(e) => handleChange("industry", e.target.value || null)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Financial Year End
          </label>
          <select
            value={activeCompany.financialYearEndMonth ?? ""}
            onChange={(e) =>
              handleChange("financialYearEndMonth" as keyof CompanyProfile, e.target.value || null)
            }
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">Select month</option>
            {[
              "January",
              "February",
              "March",
              "April",
              "May",
              "June",
              "July",
              "August",
              "September",
              "October",
              "November",
              "December",
            ].map((month, i) => (
              <option key={month} value={i + 1}>
                {month}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={updateMutation.isPending}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
      >
        {updateMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : saved ? (
          <>
            <CheckCircle className="h-4 w-4" />
            Saved
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />
            Save Profile
          </>
        )}
      </button>
    </div>
  );
}

const STATUS_BADGE_STYLES: Record<string, string> = {
  active: "bg-green-500/10 text-green-400 border-green-500/30",
  trial: "bg-teal-500/10 text-teal-400 border-teal-500/30",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/30",
};

function CancelModal({
  onClose,
  onConfirm,
  loading,
}: {
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Cancel Subscription</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-slate-400 mb-6">
          Are you sure you want to cancel your subscription? You will continue to have access until
          the end of your current billing period.
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg text-sm transition-colors"
          >
            Keep Subscription
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors inline-flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Cancelling...
              </>
            ) : (
              "Cancel Subscription"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function SubscriptionSection() {
  const { data: sub, isLoading } = useSubscriptionStatus();
  const cancelMutation = useCancelSubscription();
  const [showCancel, setShowCancel] = useState(false);

  function handleCancel() {
    cancelMutation.mutate(undefined, {
      onSuccess: () => setShowCancel(false),
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 text-teal-400 animate-spin" />
      </div>
    );
  }

  if (!sub) {
    return <p className="text-sm text-slate-500 py-4">Unable to load subscription information</p>;
  }

  const badgeStyle = STATUS_BADGE_STYLES[sub.status] ?? STATUS_BADGE_STYLES.active;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white capitalize">{sub.tier} Plan</span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badgeStyle}`}
            >
              {sub.status}
            </span>
          </div>
          {sub.trialDaysRemaining !== null && sub.trialDaysRemaining > 0 && (
            <p className="text-xs text-teal-400 mt-1">
              {sub.trialDaysRemaining} trial days remaining
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div className="bg-slate-900/50 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-0.5">Current Period</p>
          <p className="text-slate-300">
            {formatDateZA(sub.currentPeriodStart)} -{" "}
            {formatDateZA(sub.currentPeriodEnd)}
          </p>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-0.5">Usage Summary</p>
          <div className="flex items-center gap-4 text-slate-300">
            <span className="flex items-center gap-1">
              <FileText className="h-3.5 w-3.5 text-slate-500" />
              {sub.requirementsTracked} requirements
            </span>
            <span className="flex items-center gap-1">
              <FolderOpen className="h-3.5 w-3.5 text-slate-500" />
              {sub.documentsStored} documents
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-slate-500" />
              {sub.clientsManaged} clients
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/comply-sa/pricing"
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 rounded-lg text-sm font-medium transition-colors"
        >
          Change Plan
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
        {sub.status !== "cancelled" && (
          <button
            type="button"
            onClick={() => setShowCancel(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-sm font-medium transition-colors"
          >
            Cancel Subscription
          </button>
        )}
      </div>

      {showCancel && (
        <CancelModal
          onClose={() => setShowCancel(false)}
          onConfirm={handleCancel}
          loading={cancelMutation.isPending}
        />
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Settings className="h-7 w-7 text-teal-400" />
          Settings
        </h1>
        <p className="text-slate-400 mt-1">
          Manage your notification preferences and company profile
        </p>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-700 flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-teal-400" />
          <h2 className="text-sm font-semibold text-white">Subscription</h2>
        </div>
        <div className="p-5">
          <SubscriptionSection />
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-700 flex items-center gap-2">
          <Bell className="h-5 w-5 text-teal-400" />
          <h2 className="text-sm font-semibold text-white">Notification Preferences</h2>
        </div>
        <div className="p-5">
          <NotificationSection />
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-700 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-teal-400" />
          <h2 className="text-sm font-semibold text-white">Company Profile</h2>
        </div>
        <div className="p-5">
          <CompanySection />
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-700 flex items-center gap-2">
          <Info className="h-5 w-5 text-teal-400" />
          <h2 className="text-sm font-semibold text-white">App Info</h2>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="bg-slate-900/50 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-0.5">Application</p>
              <p className="text-slate-300">Comply SA</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-0.5">Version</p>
              <p className="text-slate-300">v{COMPLY_SA_VERSION}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
