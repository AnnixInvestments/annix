"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  useOrbitMyDataExport,
  useOrbitMyNotificationPreferences,
  useOrbitRequestMyAccountDeletion,
  useOrbitUpdateMyNotificationPreferences,
  useOrbitWithdrawMyConsent,
  useOrbitWithdrawSeekerMatching,
} from "@/app/lib/query/hooks";

export default function SeekerSettingsPage() {
  const { confirm, ConfirmDialog } = useConfirm();
  const { showToast } = useToast();
  const prefsQuery = useOrbitMyNotificationPreferences();
  const updatePrefs = useOrbitUpdateMyNotificationPreferences();
  const requestDeletion = useOrbitRequestMyAccountDeletion();
  const withdrawConsent = useOrbitWithdrawMyConsent();
  const withdrawMatching = useOrbitWithdrawSeekerMatching();
  const dataExport = useOrbitMyDataExport();

  const [threshold, setThreshold] = useState(80);
  const [digestEnabled, setDigestEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);

  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    const data = prefsQuery.data;
    if (data) {
      hydratedRef.current = true;
      setThreshold(data.matchAlertThreshold);
      setDigestEnabled(data.digestEnabled);
      setPushEnabled(data.pushEnabled);
    }
  }, [prefsQuery.data]);

  const prefsData = prefsQuery.data;
  const savedThreshold = prefsData?.matchAlertThreshold;
  const savedDigest = prefsData?.digestEnabled;
  const savedPush = prefsData?.pushEnabled;
  const deletionRequested = prefsData?.accountDeletionRequested === true;
  const isDirty =
    prefsData != null &&
    (threshold !== savedThreshold || digestEnabled !== savedDigest || pushEnabled !== savedPush);

  const handleSavePrefs = async () => {
    try {
      await updatePrefs.mutateAsync({
        matchAlertThreshold: threshold,
        digestEnabled,
        pushEnabled,
      });
      showToast("Preferences saved.", "success");
    } catch {
      showToast("Could not save preferences — please try again.", "error");
    }
  };

  const handleExport = async () => {
    try {
      const data = await dataExport.mutateAsync();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `annix-orbit-data-export-${data.account.id}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast("Your data export has downloaded.", "success");
    } catch {
      showToast("Could not export your data — please try again.", "error");
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: "Delete your account?",
      message:
        "We will email you a confirmation link. Clicking it permanently deletes your CV, qualifications, certificates, and account. The link expires in 1 hour.",
      confirmLabel: "Email me the link",
      cancelLabel: "Keep my account",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      const result = await requestDeletion.mutateAsync();
      await confirm({
        title: "Check your email",
        message: `We sent a confirmation link to ${result.email}. Click it within 1 hour to permanently delete your account. You'll stay signed in until you confirm.`,
        confirmLabel: "Got it",
        hideCancel: true,
        variant: "info",
      });
    } catch {
      showToast("Could not request deletion — please try again.", "error");
    }
  };

  const handleWithdrawMatching = async () => {
    const confirmed = await confirm({
      title: "Stop matching me to jobs?",
      message:
        "We'll clear the embeddings used to match your CV against external jobs, delete your existing match list, and turn off job alerts. Your CV and account stay — you can re-enable matching anytime by re-uploading or saving your CV.",
      confirmLabel: "Stop matching",
      cancelLabel: "Keep matching",
      variant: "warning",
    });
    if (!confirmed) return;

    try {
      const result = await withdrawMatching.mutateAsync();
      const affected = result.candidatesAffected;
      const cleared = result.matchesCleared;
      const outcomeMessage =
        affected === 0
          ? "Nothing to clear — no candidate records on file."
          : `Matching turned off for ${affected} record${affected === 1 ? "" : "s"}; ${cleared} match${cleared === 1 ? "" : "es"} removed.`;
      await confirm({
        title: "Matching stopped",
        message: outcomeMessage,
        confirmLabel: "Done",
        hideCancel: true,
        variant: "info",
      });
    } catch {
      showToast("Could not stop matching — please try again.", "error");
    }
  };

  const handleWithdrawConsent = async () => {
    const confirmed = await confirm({
      title: "Withdraw POPIA consent?",
      message:
        "This permanently deletes any job applications submitted under your email and revokes our right to process your data. Your account stays open, but we will not be able to apply you to any jobs until you grant consent again.",
      confirmLabel: "Withdraw consent",
      cancelLabel: "Keep consent",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      const result = await withdrawConsent.mutateAsync();
      await confirm({
        title: "Consent withdrawn",
        message: result.message,
        confirmLabel: "Done",
        hideCancel: true,
        variant: "info",
      });
    } catch {
      showToast("Could not withdraw consent — please try again.", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-white/70 mt-2">Manage your notifications and account.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <SectionCard
          title="Notifications"
          description="Choose when we tell you about matching jobs."
        >
          {prefsQuery.isLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--brand-navbar,#323288)]" />
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <label htmlFor="threshold" className="block text-sm font-medium text-gray-900">
                  Match alert threshold
                  <span className="ml-2 text-[var(--brand-navbar,#323288)] font-mono">
                    {threshold}%
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Only notify me about jobs that match my CV at this score or higher.
                </p>
                <input
                  id="threshold"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full mt-3 accent-[var(--brand-navbar,#323288)]"
                />
              </div>

              <ToggleRow
                id="digestEnabled"
                label="Email digest"
                description="Send me a daily summary of new matches."
                checked={digestEnabled}
                onChange={setDigestEnabled}
              />

              <ToggleRow
                id="pushEnabled"
                label="Browser push"
                description="Send me browser push notifications for high-scoring matches."
                checked={pushEnabled}
                onChange={setPushEnabled}
              />

              <div className="flex items-center justify-between pt-2">
                <span className="text-sm">
                  {isDirty ? <span className="text-amber-600">Unsaved changes</span> : null}
                </span>
                <button
                  type="button"
                  onClick={handleSavePrefs}
                  disabled={updatePrefs.isPending}
                  className="bg-[var(--brand-navbar,#323288)] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[var(--brand-navbar-active,#252560)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {updatePrefs.isPending ? "Saving..." : "Save preferences"}
                </button>
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Your data (POPIA)"
          description="Under the Protection of Personal Information Act you can request a copy of your data or have it erased at any time."
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Download my data</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Get a JSON file with everything we hold about you — account details, profile,
                  document metadata, and extracted CV data.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExport}
                disabled={dataExport.isPending}
                className="bg-white text-[var(--brand-navbar-active,#252560)] border border-[var(--brand-navbar-200,#c0c0eb)] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[var(--brand-navbar-50,#f0f0fc)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                {dataExport.isPending ? "Preparing..." : "Download data"}
              </button>
            </div>

            <div className="border-t border-gray-100 pt-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-medium text-amber-700">Stop matching me to jobs</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Clears the embedding used to match your CV against external jobs, deletes your
                  current match list, and turns off job alerts. Your account, CV, and applications
                  stay. Re-enable any time by re-saving your CV.
                </p>
              </div>
              <button
                type="button"
                onClick={handleWithdrawMatching}
                disabled={withdrawMatching.isPending}
                className="bg-white text-amber-700 border border-amber-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                {withdrawMatching.isPending ? "Stopping…" : "Stop matching"}
              </button>
            </div>

            <div className="border-t border-gray-100 pt-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-medium text-amber-700">Withdraw POPIA consent</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Permanently delete any job applications tied to your email and revoke our right to
                  process your data. Your account stays, but we cannot apply you to jobs until you
                  grant consent again.
                </p>
              </div>
              <WithdrawConsentButton
                isPending={withdrawConsent.isPending}
                onClick={handleWithdrawConsent}
              />
            </div>

            <div className="border-t border-gray-100 pt-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-medium text-red-700">Delete my account</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Request permanent deletion of your account, CV, qualifications, and all associated
                  data. We will email you a confirmation link.
                </p>
              </div>
              <DeleteRequestButton
                isPending={requestDeletion.isPending}
                alreadyRequested={deletionRequested}
                onClick={handleDelete}
              />
            </div>

            {deletionRequested ? (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-lg text-sm">
                <p className="font-medium">Deletion pending</p>
                <p className="text-xs mt-1">
                  We've emailed you a confirmation link. Click it within 1 hour to permanently
                  delete your account. You will stay signed in until you confirm.
                </p>
              </div>
            ) : null}
          </div>
        </SectionCard>
      </div>

      {ConfirmDialog}
    </div>
  );
}

function SectionCard(props: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-[var(--brand-navbar-100,#e0e0f5)] p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{props.title}</h2>
        <p className="text-sm text-gray-600 mt-1">{props.description}</p>
      </div>
      {props.children}
    </div>
  );
}

function ToggleRow(props: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={props.id} className="text-sm font-medium text-gray-900">
          {props.label}
        </label>
        <p className="text-xs text-gray-500 mt-1">{props.description}</p>
      </div>
      <button
        type="button"
        id={props.id}
        role="switch"
        aria-checked={props.checked}
        onClick={() => props.onChange(!props.checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
          props.checked ? "bg-[var(--brand-navbar,#323288)]" : "bg-gray-300"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            props.checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

function DeleteRequestButton(props: {
  isPending: boolean;
  alreadyRequested: boolean;
  onClick: () => void;
}) {
  const { isPending, alreadyRequested, onClick } = props;
  const disabled = isPending || alreadyRequested;
  const label = isPending ? "Sending..." : "Request deletion";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="bg-white text-red-700 border border-red-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
    >
      {label}
    </button>
  );
}

function WithdrawConsentButton(props: { isPending: boolean; onClick: () => void }) {
  const { isPending, onClick } = props;
  const label = isPending ? "Withdrawing..." : "Withdraw consent";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      className="bg-white text-amber-700 border border-amber-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
    >
      {label}
    </button>
  );
}
