"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ConfirmModal } from "@/app/components/modals/ConfirmModal";
import { useToast } from "@/app/components/Toast";
import { MultiSelect, type MultiSelectOption } from "@/app/components/ui/MultiSelect";
import { SearchableSelect } from "@/app/components/ui/SearchableSelect";
import { ACCESS_APPS } from "@/app/lib/access/accessApps";
import {
  adminApiClient,
  type WhatsAppBroadcastCandidate,
  type WhatsAppBroadcastMode,
} from "@/app/lib/api/adminApi";
import { useAdaptiveExtractionProgress } from "@/app/lib/hooks/useAdaptiveExtractionProgress";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  useAdminWhatsAppBroadcastCandidates,
  useWhatsAppBackfillPhones,
} from "@/app/lib/query/hooks";

const ALL_APPS = "all";
const DEFAULT_TEMPLATE_NAME = "broadcast_update";
const DEFAULT_LANGUAGE_CODE = "en";
const MAX_FAILURE_TOASTS = 3;
const MAX_FAILURE_LINES = 5;

interface BroadcastComposerProps {
  isOpen: boolean;
  onClose: () => void;
  configured: boolean;
  defaultTemplateName?: string;
  defaultLanguageCode?: string;
}

interface AppOption {
  value: string;
  label: string;
}

const appOptions: AppOption[] = [
  { value: ALL_APPS, label: "All apps (repo-wide)" },
  ...ACCESS_APPS.map((app) => ({ value: app.moduleKey, label: app.name })),
];

function maskPhone(phone: string): string {
  if (phone.length <= 4) return phone;
  const tail = phone.slice(-4);
  const head = phone.slice(0, 3);
  return `${head}••••${tail}`;
}

function candidateLabel(candidate: WhatsAppBroadcastCandidate): string {
  const firstName = candidate.firstName;
  return firstName && firstName.trim().length > 0 ? firstName : `User ${candidate.userId}`;
}

export function BroadcastComposer(props: BroadcastComposerProps) {
  const isOpen = props.isOpen;
  const onClose = props.onClose;
  const configured = props.configured;
  const propTemplateName = props.defaultTemplateName;
  const propLanguageCode = props.defaultLanguageCode;
  const defaultTemplateName = propTemplateName || DEFAULT_TEMPLATE_NAME;
  const defaultLanguageCode = propLanguageCode || DEFAULT_LANGUAGE_CODE;

  const { showToast } = useToast();
  const { runBulk } = useAdaptiveExtractionProgress();
  const { confirm, ConfirmDialog } = useConfirm();
  const backfillMutation = useWhatsAppBackfillPhones();
  const backfillPending = backfillMutation.isPending;

  const [backfillSummary, setBackfillSummary] = useState<{
    updated: number;
    totalUsersWithPhone: number;
  } | null>(null);

  const [appCode, setAppCode] = useState<string>(ALL_APPS);
  const [repoWide, setRepoWide] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<WhatsAppBroadcastMode>("freeform");
  const [templateName, setTemplateName] = useState(defaultTemplateName);
  const [summary, setSummary] = useState<{
    sent: number;
    failed: number;
    reasons: string[];
  } | null>(null);

  const effectiveAppCode = repoWide ? ALL_APPS : appCode;
  const candidatesQuery = useAdminWhatsAppBroadcastCandidates(isOpen ? effectiveAppCode : null);
  const candidatesData = candidatesQuery.data;
  const candidates = useMemo<WhatsAppBroadcastCandidate[]>(
    () => (candidatesData ? candidatesData.candidates : []),
    [candidatesData],
  );

  const userOptions = useMemo<MultiSelectOption[]>(
    () =>
      candidates.map((candidate) => ({
        value: String(candidate.userId),
        label: candidateLabel(candidate),
        sublabel: maskPhone(candidate.whatsappPhone),
        badge: candidate.whatsappOptIn ? "opted-in" : undefined,
        disabled: !candidate.whatsappOptIn,
        searchTerms: [candidate.whatsappPhone],
      })),
    [candidates],
  );

  const targets = useMemo<WhatsAppBroadcastCandidate[]>(() => {
    if (repoWide) {
      return candidates.filter((candidate) => candidate.whatsappOptIn);
    }
    const selectedSet = new Set(selectedUserIds);
    return candidates.filter(
      (candidate) => selectedSet.has(String(candidate.userId)) && candidate.whatsappOptIn,
    );
  }, [repoWide, candidates, selectedUserIds]);

  const firstTarget = targets.length > 0 ? targets[0] : null;
  const previewName = firstTarget
    ? firstTarget.firstName && firstTarget.firstName.trim().length > 0
      ? firstTarget.firstName
      : "there"
    : "there";
  const previewBody = message.trim().length > 0 ? message.trim() : "…";
  const previewText = `Hi ${previewName}, ${previewBody}`;

  const messageEmpty = message.trim().length === 0;
  const templateMissing = mode === "template" && templateName.trim().length === 0;
  const noTargets = targets.length === 0;
  const sendDisabled = !configured || messageEmpty || templateMissing || noTargets;

  const resetForm = () => {
    setSelectedUserIds([]);
    setMessage("");
    setRepoWide(false);
    setMode("freeform");
    setTemplateName(defaultTemplateName);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleBackfill = async () => {
    const confirmed = await confirm({
      title: "Import WhatsApp numbers",
      message:
        "Import WhatsApp numbers from Orbit profiles? This fills missing numbers only and does not grant consent.",
      confirmLabel: "Import",
      variant: "info",
    });
    if (!confirmed) return;

    backfillMutation.mutate(undefined, {
      onSuccess: (result) => {
        setBackfillSummary(result);
        candidatesQuery.refetch();
      },
      onError: (err) => {
        showToast(`Error: ${err.message}`, "error");
      },
    });
  };

  const backfillSummaryMessage = backfillSummary
    ? `Imported ${backfillSummary.updated} numbers. ${backfillSummary.totalUsersWithPhone} users now have a WhatsApp number.`
    : "";

  const handleSend = async () => {
    if (sendDisabled) return;
    const trimmedMessage = message.trim();
    const trimmedTemplate = templateName.trim();

    const result = await runBulk<WhatsAppBroadcastCandidate>({
      brand: "annix-orbit",
      metricCategory: "whatsapp",
      metricOperation: "broadcast-send",
      items: targets,
      itemId: (candidate) => candidate.userId,
      itemLabel: (candidate, index, total) =>
        `Messaging ${candidateLabel(candidate)} (${index + 1} of ${total})…`,
      run: async (candidate) => {
        const response = await adminApiClient.whatsAppBroadcastSendOne({
          userId: candidate.userId,
          message: trimmedMessage,
          mode,
          templateName: mode === "template" ? trimmedTemplate : undefined,
          languageCode: mode === "template" ? defaultLanguageCode : undefined,
        });
        if (response.status === "failed") {
          const reason = response.error;
          throw new Error(reason && reason.length > 0 ? reason : "Delivery failed");
        }
      },
    });

    const failedReasons = result.failed.map((failure) => {
      const candidate = failure.item;
      const error = failure.error;
      const detail = error instanceof Error ? error.message : "Delivery failed";
      return `${candidateLabel(candidate)}: ${detail}`;
    });

    failedReasons.slice(0, MAX_FAILURE_TOASTS).forEach((reason) => {
      showToast(reason, "error");
    });

    setSummary({
      sent: result.succeeded.length,
      failed: result.failed.length,
      reasons: failedReasons.slice(0, MAX_FAILURE_LINES),
    });
  };

  const summaryReasons = summary ? summary.reasons : [];
  const summaryMessage = summary
    ? [
        `Sent ${summary.sent}, failed ${summary.failed}.`,
        ...(summaryReasons.length > 0 ? ["", "First failures:", ...summaryReasons] : []),
      ].join("\n")
    : "";

  if (!isOpen) {
    return summary ? (
      <ConfirmModal
        isOpen={true}
        title="Broadcast complete"
        message={summaryMessage}
        confirmLabel="Done"
        variant={summary.failed > 0 ? "warning" : "success"}
        hideCancel={true}
        onConfirm={() => setSummary(null)}
        onCancel={() => setSummary(null)}
      />
    ) : null;
  }

  return (
    <>
      {createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="broadcast-composer-title"
        >
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm"
            onClick={handleClose}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
            <div className="sticky top-0 z-10 px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between">
              <h2
                id="broadcast-composer-title"
                className="text-lg font-semibold text-gray-900 dark:text-white"
              >
                New broadcast
              </h2>
              <button
                type="button"
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {!configured && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                  WhatsApp isn't connected in this environment — sending is disabled.
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  App
                </label>
                <SearchableSelect
                  value={appCode}
                  onChange={setAppCode}
                  options={appOptions}
                  disabled={repoWide}
                  placeholder="Choose an app…"
                  className="dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100"
                />
              </div>

              <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={repoWide}
                  onChange={(e) => setRepoWide(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-gray-600"
                />
                <span>
                  <span className="font-medium">Send to ALL users across every app</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    Overrides the app and user selection below — targets every opted-in candidate
                    repo-wide.
                  </span>
                </span>
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Recipients
                </label>
                {candidatesQuery.isLoading ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Loading candidates…</p>
                ) : (
                  <MultiSelect
                    values={selectedUserIds}
                    onChange={setSelectedUserIds}
                    options={userOptions}
                    disabled={repoWide}
                    placeholder="Select recipients…"
                    searchPlaceholder="Search by name or number…"
                    emptyText="No candidates for this app"
                  />
                )}
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {repoWide
                    ? `${targets.length} opted-in users will be messaged.`
                    : `${targets.length} opted-in selected. Non-opted-in users are disabled — they won't receive a message.`}
                </p>
                <button
                  type="button"
                  onClick={handleBackfill}
                  disabled={backfillPending}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--brand-navbar,#323288)] hover:underline disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
                >
                  {backfillPending ? "Importing numbers…" : "Import numbers from Orbit profiles"}
                </button>
              </div>

              <div>
                <label
                  htmlFor="broadcast-message"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Message
                </label>
                <textarea
                  id="broadcast-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder="Type the message body — the greeting is added automatically."
                  className="w-full resize-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[var(--brand-navbar,#323288)] focus:border-transparent"
                />
              </div>

              <div className="rounded-lg bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 px-3 py-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">
                  Preview
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
                  {previewText}
                </p>
              </div>

              <div>
                <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Send mode
                </span>
                <div className="space-y-2">
                  <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="radio"
                      name="broadcast-mode"
                      checked={mode === "freeform"}
                      onChange={() => setMode("freeform")}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-medium">Personalized message</span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">
                        Works for users active in the last 24 hours. Best for testing today.
                      </span>
                    </span>
                  </label>
                  <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="radio"
                      name="broadcast-mode"
                      checked={mode === "template"}
                      onChange={() => setMode("template")}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-medium">Broadcast template (advanced)</span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">
                        Reaches users outside the 24h window — the template must be approved in
                        Meta.
                      </span>
                    </span>
                  </label>
                </div>
                {mode === "template" && (
                  <div className="mt-2">
                    <label
                      htmlFor="broadcast-template-name"
                      className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1"
                    >
                      Approved template name
                    </label>
                    <input
                      id="broadcast-template-name"
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder={defaultTemplateName}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[var(--brand-navbar,#323288)] focus:border-transparent"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 px-5 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={sendDisabled}
                className="px-4 py-2 rounded-lg bg-[var(--brand-navbar,#323288)] text-white text-sm font-medium hover:bg-[var(--brand-navbar-active,#252560)] disabled:opacity-50"
              >
                {`Send to ${targets.length}`}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {summary && (
        <ConfirmModal
          isOpen={true}
          title="Broadcast complete"
          message={summaryMessage}
          confirmLabel="Done"
          variant={summary.failed > 0 ? "warning" : "success"}
          hideCancel={true}
          onConfirm={() => {
            setSummary(null);
            handleClose();
          }}
          onCancel={() => {
            setSummary(null);
            handleClose();
          }}
        />
      )}

      {backfillSummary && (
        <ConfirmModal
          isOpen={true}
          title="Numbers imported"
          message={backfillSummaryMessage}
          confirmLabel="Done"
          variant="success"
          hideCancel={true}
          onConfirm={() => setBackfillSummary(null)}
          onCancel={() => setBackfillSummary(null)}
        />
      )}

      {ConfirmDialog}
    </>
  );
}
