"use client";

import { useState } from "react";
import { useToast } from "@/app/components/Toast";
import type { OrbitShortlist } from "@/app/lib/api/annixOrbitApi";
import { annixOrbitApiClient } from "@/app/lib/api/annixOrbitApi";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  useOrbitClients,
  useOrbitDeleteShortlist,
  useOrbitShortlists,
  useOrbitTalentCandidates,
} from "@/app/lib/query/hooks";
import { ShortlistFormModal } from "./components/ShortlistFormModal";

function statusMeta(status: string): { label: string; classes: string } {
  if (status === "ready") return { label: "Ready to send", classes: "bg-blue-100 text-blue-700" };
  if (status === "sent") return { label: "Sent", classes: "bg-indigo-100 text-indigo-700" };
  if (status === "reviewed") return { label: "Reviewed", classes: "bg-green-100 text-green-700" };
  if (status === "closed") return { label: "Closed", classes: "bg-gray-100 text-gray-600" };
  return { label: "Draft", classes: "bg-[#e0e0f5] text-[#323288]" };
}

export default function RecruiterShortlistsPage() {
  const { data: shortlists = [], isLoading, isError } = useOrbitShortlists();
  const { data: candidates = [] } = useOrbitTalentCandidates();
  const { data: clients = [] } = useOrbitClients();
  const deleteMutation = useOrbitDeleteShortlist();
  const { confirm, ConfirmDialog } = useConfirm();
  const { showToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<OrbitShortlist | null>(null);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (shortlist: OrbitShortlist) => {
    setEditing(shortlist);
    setModalOpen(true);
  };

  // Client delivery (issue #337): branded PDF, email with the PDF attached,
  // or a revocable read-only share link. Only consented candidates appear in
  // any client-facing output.
  const handleDownloadPdf = async (shortlist: OrbitShortlist) => {
    try {
      await annixOrbitApiClient.downloadShortlistPdf(shortlist.id, shortlist.name);
    } catch {
      showToast("Could not generate the PDF. Please try again.", "error");
    }
  };

  const handleEmail = async (shortlist: OrbitShortlist) => {
    const email = window.prompt("Send this shortlist (as PDF) to which email address?");
    if (!email) return;
    try {
      const result = await annixOrbitApiClient.emailShortlist(shortlist.id, email.trim(), null);
      if (result.sent) {
        showToast(`Shortlist emailed to ${email.trim()}.`, "success");
      } else {
        showToast("Email delivery is disabled in this environment.", "info");
      }
    } catch {
      showToast("Could not email the shortlist. Please try again.", "error");
    }
  };

  const handleShareLink = async (shortlist: OrbitShortlist) => {
    try {
      const { token } = await annixOrbitApiClient.createShortlistShareLink(shortlist.id);
      const url = `${window.location.origin}/api/public/orbit-shortlists/${token}`;
      await navigator.clipboard.writeText(url);
      showToast(
        "Share link copied to clipboard. Revoke it any time by deleting the shortlist's link.",
        "success",
      );
    } catch {
      showToast("Could not create the share link. Please try again.", "error");
    }
  };

  const handleDelete = async (shortlist: OrbitShortlist) => {
    const confirmed = await confirm({
      title: "Delete this shortlist?",
      message: `"${shortlist.name}" will be removed. Candidates themselves are not deleted.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync(shortlist.id);
      showToast("Shortlist deleted.", "success");
    } catch {
      showToast("Could not delete the shortlist. Please try again.", "error");
    }
  };

  const clientName = (clientId: number | null): string => {
    if (clientId === null) return "—";
    const found = clients.find((c) => c.id === clientId);
    return found ? found.name : "—";
  };

  const memberCount = (shortlist: OrbitShortlist): number => {
    const ids = shortlist.candidateIds;
    return ids ? ids.length : 0;
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0A1B3D] dark:text-white">Shortlists</h1>
          <p className="mt-1 text-gray-600 dark:text-[#c0c0eb]">
            Package candidates for a client, track them from draft to reviewed.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#323288] text-white font-medium rounded-lg hover:bg-[#252560] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create shortlist
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#323288]" />
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          Something went wrong loading your shortlists — please try again.
        </div>
      ) : shortlists.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#c0c0eb] bg-white/60 dark:bg-white/5 p-10 text-center">
          <p className="text-lg font-semibold text-gray-900 dark:text-white">No shortlists yet</p>
          <p className="mt-2 text-gray-600 dark:text-[#c0c0eb]">
            Build a shortlist of candidates to package and send to a client.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-[#323288] text-white font-medium rounded-lg hover:bg-[#252560] transition-colors"
          >
            Create shortlist
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Shortlist
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Candidates
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                {shortlists.map((shortlist) => {
                  const meta = statusMeta(shortlist.status);
                  const title = shortlist.jobTitle ? shortlist.jobTitle : "—";
                  return (
                    <tr
                      key={shortlist.id}
                      onClick={() => openEdit(shortlist)}
                      className="hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-[#252560] dark:text-white">
                          {shortlist.name}
                        </div>
                        <div className="text-sm text-gray-500">{title}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-[#c0c0eb]">
                        {clientName(shortlist.clientId)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-[#c0c0eb]">
                        {memberCount(shortlist)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${meta.classes}`}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap space-x-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDownloadPdf(shortlist);
                          }}
                          className="text-[#323288] dark:text-[#9ea0e8] hover:underline text-sm font-medium"
                        >
                          PDF
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleEmail(shortlist);
                          }}
                          className="text-[#323288] dark:text-[#9ea0e8] hover:underline text-sm font-medium"
                        >
                          Email
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleShareLink(shortlist);
                          }}
                          className="text-[#323288] dark:text-[#9ea0e8] hover:underline text-sm font-medium"
                        >
                          Share link
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(shortlist);
                          }}
                          disabled={deleteMutation.isPending}
                          className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalOpen ? (
        <ShortlistFormModal
          shortlist={editing}
          candidates={candidates}
          clients={clients}
          onClose={() => setModalOpen(false)}
        />
      ) : null}
      {ConfirmDialog}
    </div>
  );
}
