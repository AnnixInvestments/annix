"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/app/components/Toast";
import {
  auRubberApiClient,
  type BoardMeetingDto,
  type GeneratedAgendaDto,
  type MeetingListingDto,
} from "@/app/lib/api/auRubberApi";
import { formatDateZA } from "@/app/lib/datetime";
import { useAlert } from "@/app/lib/hooks/useAlert";
import { Breadcrumb } from "../../../components/Breadcrumb";
import { ConfirmModal } from "../../../components/ConfirmModal";
import { RequirePermission } from "../../../components/RequirePermission";
import { PAGE_PERMISSIONS } from "../../../config/pagePermissions";

// Renders modal content at document.body so it's centred on the viewport rather
// than clipped by the portal layout's scroll/transform container.
function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? createPortal(children, document.body) : null;
}

const PROVIDER_LABELS: Record<string, string> = {
  fathom: "Fathom",
  zoom: "Zoom",
  teams: "Microsoft Teams",
  "google-meet": "Google Meet",
  otter: "Otter.ai",
  fireflies: "Fireflies.ai",
};

const providerLabel = (p: string): string => {
  const label = PROVIDER_LABELS[p];
  return label || p;
};

const fmtDate = (iso: string | null): string => (iso ? formatDateZA(iso) : "—");

function MinutesStatusBadge({ status }: { status: BoardMeetingDto["minutesStatus"] }) {
  const map: Record<string, string> = {
    NONE: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200",
    GENERATED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    FAILED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  };
  const label =
    status === "GENERATED" ? "Minutes ready" : status === "FAILED" ? "Failed" : "No minutes";
  const cls = map[status];
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls || map.NONE}`}>
      {label}
    </span>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h4>
      <ul className="mt-1 space-y-1 text-sm text-gray-700 dark:text-gray-300 list-disc pl-5">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default function BoardMeetingsPage() {
  const { showToast } = useToast();
  const { alert, AlertDialog } = useAlert();
  const [meetings, setMeetings] = useState<BoardMeetingDto[]>([]);
  const [providers, setProviders] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Import modal
  const [showImport, setShowImport] = useState(false);
  const [importProvider, setImportProvider] = useState("");
  const [available, setAvailable] = useState<MeetingListingDto[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [pasteUrl, setPasteUrl] = useState("");
  const [importing, setImporting] = useState(false);

  // Viewers
  const [viewing, setViewing] = useState<BoardMeetingDto | null>(null);
  const [agenda, setAgenda] = useState<GeneratedAgendaDto | null>(null);
  const [generatingAgenda, setGeneratingAgenda] = useState(false);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [list, prov] = await Promise.all([
        auRubberApiClient.boardMeetings(),
        auRubberApiClient.boardMeetingProviders(),
      ]);
      setMeetings(list);
      setProviders(prov.providers);
    } catch (err) {
      alert({
        message: err instanceof Error ? err.message : "Failed to load board meetings",
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const openImport = () => {
    const first = providers[0];
    setImportProvider(first || "");
    setAvailable([]);
    setPasteUrl("");
    setShowImport(true);
  };

  const loadAvailable = async (provider: string) => {
    if (!provider) return;
    setLoadingAvailable(true);
    try {
      setAvailable(await auRubberApiClient.boardMeetingAvailable(provider));
    } catch (err) {
      alert({
        message: err instanceof Error ? err.message : "Could not list meetings",
        variant: "error",
      });
    } finally {
      setLoadingAvailable(false);
    }
  };

  const doImport = async (ref: { externalId?: string; url?: string }) => {
    if (!importProvider) return;
    setImporting(true);
    try {
      await auRubberApiClient.importBoardMeeting({ provider: importProvider, ...ref });
      showToast("Meeting imported", "success");
      setShowImport(false);
      await fetchAll();
    } catch (err) {
      alert({ message: err instanceof Error ? err.message : "Import failed", variant: "error" });
    } finally {
      setImporting(false);
    }
  };

  const generateMinutes = async (id: number) => {
    setBusyId(id);
    try {
      const updated = await auRubberApiClient.generateBoardMeetingMinutes(id);
      setMeetings((prev) => prev.map((m) => (m.id === id ? updated : m)));
      showToast("Minutes generated", "success");
    } catch (err) {
      alert({
        message: err instanceof Error ? err.message : "Could not generate minutes",
        variant: "error",
      });
    } finally {
      setBusyId(null);
    }
  };

  const downloadMinutes = async (id: number) => {
    try {
      const { filename, dataUrl } = await auRubberApiClient.boardMeetingMinutesPdf(id);
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert({
        message: err instanceof Error ? err.message : "Could not download minutes",
        variant: "error",
      });
    }
  };

  const generateAgenda = async () => {
    setGeneratingAgenda(true);
    try {
      setAgenda(await auRubberApiClient.generateBoardMeetingAgenda());
    } catch (err) {
      alert({
        message: err instanceof Error ? err.message : "Could not generate agenda",
        variant: "error",
      });
    } finally {
      setGeneratingAgenda(false);
    }
  };

  const confirmDelete = async () => {
    if (deleteId == null) return;
    try {
      await auRubberApiClient.deleteBoardMeeting(deleteId);
      setMeetings((prev) => prev.filter((m) => m.id !== deleteId));
      showToast("Meeting removed", "success");
    } catch (err) {
      alert({ message: err instanceof Error ? err.message : "Delete failed", variant: "error" });
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <RequirePermission permission={PAGE_PERMISSIONS["/au-rubber/portal/accounting/board-meetings"]}>
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: "Accounting", href: "/au-rubber/portal/accounting" },
            { label: "Board Meetings" },
          ]}
        />

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Board Meetings</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Import recorded meetings, generate AI minutes, and draft the next agenda.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={generateAgenda}
              disabled={generatingAgenda}
              className="px-4 py-2 text-sm font-medium text-yellow-700 border border-yellow-600 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20 disabled:opacity-50"
            >
              {generatingAgenda ? "Drafting…" : "Generate next agenda"}
            </button>
            <button
              type="button"
              onClick={openImport}
              className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700"
            >
              Import meeting
            </button>
          </div>
        </div>

        {providers.length === 0 && !isLoading && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-4 text-sm text-amber-800 dark:text-amber-200">
            No meeting provider is connected yet. Add a Fathom API key (FATHOM_API_KEY) to import
            meetings. Zoom, Microsoft Teams and Google Meet can be added later behind the same
            screen.
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600" />
          </div>
        ) : meetings.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">
            No board meetings imported yet.
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="px-4 py-3">Meeting</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Minutes</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {meetings.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                      {m.title}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {fmtDate(m.meetingDate)}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {providerLabel(m.provider)}
                    </td>
                    <td className="px-4 py-3">
                      <MinutesStatusBadge status={m.minutesStatus} />
                    </td>
                    <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                      {m.minutesStatus === "GENERATED" && (
                        <button
                          type="button"
                          onClick={() => setViewing(m)}
                          className="text-yellow-700 hover:underline"
                        >
                          View minutes
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => generateMinutes(m.id)}
                        disabled={busyId === m.id}
                        className="text-yellow-700 hover:underline disabled:opacity-50"
                      >
                        {busyId === m.id
                          ? "Generating…"
                          : m.minutesStatus === "GENERATED"
                            ? "Regenerate"
                            : "Generate minutes"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteId(m.id)}
                        className="text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Import modal */}
        {showImport && (
          <Portal>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Import a meeting
                </h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Source
                  </label>
                  <select
                    value={importProvider}
                    onChange={(e) => {
                      setImportProvider(e.target.value);
                      setAvailable([]);
                    }}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 p-2 text-sm"
                  >
                    {providers.length === 0 && <option value="">No provider connected</option>}
                    {providers.map((p) => (
                      <option key={p} value={p}>
                        {providerLabel(p)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => loadAvailable(importProvider)}
                    disabled={!importProvider || loadingAvailable}
                    className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                  >
                    {loadingAvailable ? "Loading…" : "List recent meetings"}
                  </button>
                </div>

                {available.length > 0 && (
                  <div className="max-h-56 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-md divide-y divide-gray-100 dark:divide-gray-700">
                    {available.map((a) => (
                      <button
                        type="button"
                        key={a.externalId}
                        onClick={() => doImport({ externalId: a.externalId })}
                        disabled={importing}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                      >
                        <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                          {a.title}
                        </span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400">
                          {fmtDate(a.meetingDate)}
                          {a.hasTranscript ? " · transcript available" : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    …or paste a recording/share link
                  </label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="text"
                      value={pasteUrl}
                      onChange={(e) => setPasteUrl(e.target.value)}
                      placeholder="https://fathom.video/calls/…"
                      className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 p-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => doImport({ url: pasteUrl })}
                      disabled={!pasteUrl || importing}
                      className="px-3 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50"
                    >
                      Import
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowImport(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </Portal>
        )}

        {/* Minutes viewer */}
        {viewing?.minutes && (
          <Portal>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {viewing.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {fmtDate(viewing.meetingDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => downloadMinutes(viewing.id)}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700"
                    >
                      Download PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewing(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <Section title="Attendees" items={viewing.minutes.attendees} />
                <Section title="Apologies" items={viewing.minutes.apologies} />
                <Section title="Agenda items" items={viewing.minutes.agendaItems} />
                <Section title="Decisions" items={viewing.minutes.decisions} />
                {viewing.minutes.actionItems.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Action items
                    </h4>
                    <ul className="mt-1 space-y-1 text-sm text-gray-700 dark:text-gray-300 list-disc pl-5">
                      {viewing.minutes.actionItems.map((a) => (
                        <li key={a.description}>
                          {a.description}
                          {a.owner ? ` — ${a.owner}` : ""}
                          {a.dueDate ? ` (due ${a.dueDate})` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <Section title="Matters arising" items={viewing.minutes.mattersArising} />
                <Section title="Risks & compliance" items={viewing.minutes.risksAndCompliance} />
                <Section title="Financial highlights" items={viewing.minutes.financialHighlights} />
                <Section title="Next steps" items={viewing.minutes.nextSteps} />
                {viewing.recordingUrl && (
                  <a
                    href={viewing.recordingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-sm text-yellow-700 hover:underline"
                  >
                    Open original recording ↗
                  </a>
                )}
              </div>
            </div>
          </Portal>
        )}

        {/* Agenda viewer */}
        {agenda && (
          <Portal>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {agenda.title}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setAgenda(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Draft generated from your most recent minuted meetings — review and edit before
                  circulating.
                </p>
                <Section title="Standing items" items={agenda.standingItems} />
                <Section title="Carried-forward actions" items={agenda.carriedForwardActions} />
                <Section title="Unresolved matters" items={agenda.unresolvedMatters} />
                <Section title="Suggested items" items={agenda.suggestedItems} />
              </div>
            </div>
          </Portal>
        )}

        <ConfirmModal
          isOpen={deleteId != null}
          title="Remove board meeting?"
          message="This removes the imported meeting and its minutes from Annix. The original recording on the provider is not affected."
          confirmLabel="Remove"
          variant="danger"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteId(null)}
        />
        {AlertDialog}
      </div>
    </RequirePermission>
  );
}
