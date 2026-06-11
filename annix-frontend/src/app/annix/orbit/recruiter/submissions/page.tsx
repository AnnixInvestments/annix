"use client";

import { useState } from "react";
import { useToast } from "@/app/components/Toast";
import type { OrbitSubmission } from "@/app/lib/api/annixOrbitApi";
import { useAlert } from "@/app/lib/hooks/useAlert";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  useOrbitClients,
  useOrbitDeleteSubmission,
  useOrbitSubmissions,
  useOrbitTalentCandidates,
} from "@/app/lib/query/hooks";
import { SubmissionFormModal } from "./components/SubmissionFormModal";

function statusMeta(status: string): { label: string; classes: string } {
  if (status === "viewed") return { label: "Viewed", classes: "bg-gray-100 text-gray-600" };
  if (status === "interested")
    return { label: "Interested", classes: "bg-[#e0e0f5] text-[#323288]" };
  if (status === "interview") return { label: "Interview", classes: "bg-blue-100 text-blue-700" };
  if (status === "offer") return { label: "Offer", classes: "bg-indigo-100 text-indigo-700" };
  if (status === "placed") return { label: "Placed", classes: "bg-green-100 text-green-700" };
  if (status === "rejected") return { label: "Rejected", classes: "bg-red-100 text-red-700" };
  if (status === "no_response")
    return { label: "No response", classes: "bg-amber-100 text-amber-700" };
  return { label: "Submitted", classes: "bg-[#e0e0f5] text-[#323288]" };
}

export default function RecruiterSubmissionsPage() {
  const { data: submissions = [], isLoading, isError } = useOrbitSubmissions();
  const { data: candidates = [] } = useOrbitTalentCandidates();
  const { data: clients = [] } = useOrbitClients();
  const deleteMutation = useOrbitDeleteSubmission();
  const { confirm, ConfirmDialog } = useConfirm();
  const { showToast } = useToast();
  const { alert, AlertDialog } = useAlert();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<OrbitSubmission | null>(null);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (submission: OrbitSubmission) => {
    setEditing(submission);
    setModalOpen(true);
  };

  const handleDelete = async (submission: OrbitSubmission) => {
    const confirmed = await confirm({
      title: "Delete this submission?",
      message: "This submission record will be removed. This cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync(submission.id);
      showToast("Submission deleted.", "success");
    } catch {
      alert({ message: "Could not delete the submission. Please try again.", variant: "error" });
    }
  };

  const candidateName = (candidateId: number): string => {
    const found = candidates.find((c) => c.id === candidateId);
    return found ? found.fullName : "Candidate";
  };

  const clientName = (clientId: number | null): string => {
    if (clientId === null) return "—";
    const found = clients.find((c) => c.id === clientId);
    return found ? found.name : "—";
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0A1B3D] dark:text-white">Submissions</h1>
          <p className="mt-1 text-gray-600 dark:text-[#c0c0eb]">
            Candidates sent to clients. Only consented candidates can be submitted (POPIA).
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
          Submit candidate
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#323288]" />
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          Something went wrong loading your submissions — please try again.
        </div>
      ) : submissions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#c0c0eb] bg-white/60 dark:bg-white/5 p-10 text-center">
          <p className="text-lg font-semibold text-gray-900 dark:text-white">No submissions yet</p>
          <p className="mt-2 text-gray-600 dark:text-[#c0c0eb]">
            Submit a consented candidate to a client to start tracking the pipeline.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-[#323288] text-white font-medium rounded-lg hover:bg-[#252560] transition-colors"
          >
            Submit candidate
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Candidate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
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
                {submissions.map((submission) => {
                  const meta = statusMeta(submission.status);
                  return (
                    <tr
                      key={submission.id}
                      onClick={() => openEdit(submission)}
                      className="hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-[#252560] dark:text-white">
                          {candidateName(submission.candidateId)}
                        </div>
                        <div className="text-sm text-gray-500">{submission.jobTitle}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-[#c0c0eb]">
                        {clientName(submission.clientId)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${meta.classes}`}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(submission);
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
        <SubmissionFormModal
          submission={editing}
          candidates={candidates}
          clients={clients}
          onClose={() => setModalOpen(false)}
        />
      ) : null}
      {ConfirmDialog}
      {AlertDialog}
    </div>
  );
}
