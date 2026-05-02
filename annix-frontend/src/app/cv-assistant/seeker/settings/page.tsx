"use client";

import { useEffect, useState } from "react";
import { cvAssistantApiClient } from "@/app/lib/api/cvAssistantApi";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  useCvMyNotificationPreferences,
  useCvRequestMyAccountDeletion,
  useCvUpdateMyNotificationPreferences,
} from "@/app/lib/query/hooks";

export default function SeekerSettingsPage() {
  const { confirm, ConfirmDialog } = useConfirm();
  const prefsQuery = useCvMyNotificationPreferences();
  const updatePrefs = useCvUpdateMyNotificationPreferences();
  const requestDeletion = useCvRequestMyAccountDeletion();

  const [threshold, setThreshold] = useState(80);
  const [digestEnabled, setDigestEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [deletionRequestedFor, setDeletionRequestedFor] = useState<string | null>(null);

  useEffect(() => {
    const data = prefsQuery.data;
    if (data) {
      setThreshold(data.matchAlertThreshold);
      setDigestEnabled(data.digestEnabled);
      setPushEnabled(data.pushEnabled);
    }
  }, [prefsQuery.data]);

  const handleSavePrefs = async () => {
    setSavedMessage(null);
    setErrorMessage(null);
    try {
      await updatePrefs.mutateAsync({
        matchAlertThreshold: threshold,
        digestEnabled,
        pushEnabled,
      });
      setSavedMessage("Preferences saved");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Could not save preferences");
    }
  };

  const handleExport = async () => {
    setErrorMessage(null);
    setIsExporting(true);
    try {
      const data = await cvAssistantApiClient.myDataExport();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `cv-assistant-data-export-${data.account.id}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Could not export data");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async () => {
    setErrorMessage(null);
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
      setDeletionRequestedFor(result.email);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Could not request deletion");
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Manage your notifications and account.</p>
      </div>

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {errorMessage}
        </div>
      )}

      <SectionCard title="Notifications" description="Choose when we tell you about matching jobs.">
        {prefsQuery.isLoading ? (
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-600" />
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label htmlFor="threshold" className="block text-sm font-medium text-gray-900">
                Match alert threshold
                <span className="ml-2 text-violet-600 font-mono">{threshold}%</span>
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
                className="w-full mt-3 accent-violet-600"
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
              <span className="text-sm text-green-700">{savedMessage}</span>
              <button
                type="button"
                onClick={handleSavePrefs}
                disabled={updatePrefs.isPending}
                className="bg-violet-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
              disabled={isExporting}
              className="bg-white text-violet-700 border border-violet-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              {isExporting ? "Preparing..." : "Download data"}
            </button>
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
              alreadyRequested={deletionRequestedFor !== null}
              onClick={handleDelete}
            />
          </div>

          {deletionRequestedFor !== null && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-lg text-sm">
              <p className="font-medium">Check your email</p>
              <p className="text-xs mt-1">
                We sent a confirmation link to <strong>{deletionRequestedFor}</strong>. Click it
                within 1 hour to permanently delete your account. You will stay signed in until you
                confirm.
              </p>
            </div>
          )}
        </div>
      </SectionCard>

      {ConfirmDialog}
    </div>
  );
}

function SectionCard(props: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
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
          props.checked ? "bg-violet-600" : "bg-gray-300"
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
