"use client";

import { useState } from "react";
import { useToast } from "@/app/components/Toast";
import type { OrbitRecruiterInterview } from "@/app/lib/api/annixOrbitApi";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  useOrbitClients,
  useOrbitDeleteRecruiterInterview,
  useOrbitRecruiterInterviews,
  useOrbitTalentCandidates,
} from "@/app/lib/query/hooks";
import { InterviewFormModal } from "./components/InterviewFormModal";

function statusMeta(status: string): { label: string; classes: string } {
  if (status === "confirmed") return { label: "Confirmed", classes: "bg-blue-100 text-blue-700" };
  if (status === "completed") return { label: "Completed", classes: "bg-[#e0e0f5] text-[#323288]" };
  if (status === "no_show") return { label: "No show", classes: "bg-red-100 text-red-700" };
  if (status === "rescheduled")
    return { label: "Rescheduled", classes: "bg-amber-100 text-amber-700" };
  if (status === "passed") return { label: "Passed", classes: "bg-green-100 text-green-700" };
  if (status === "rejected") return { label: "Rejected", classes: "bg-red-100 text-red-700" };
  return { label: "Scheduled", classes: "bg-[#e0e0f5] text-[#323288]" };
}

function typeLabel(interviewType: string): string {
  if (interviewType === "phone") return "Phone";
  if (interviewType === "in_person") return "In person";
  return "Video";
}

export default function RecruiterInterviewsPage() {
  const { data: interviews = [], isLoading, isError } = useOrbitRecruiterInterviews();
  const { data: candidates = [] } = useOrbitTalentCandidates();
  const { data: clients = [] } = useOrbitClients();
  const deleteMutation = useOrbitDeleteRecruiterInterview();
  const { confirm, ConfirmDialog } = useConfirm();
  const { showToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<OrbitRecruiterInterview | null>(null);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (interview: OrbitRecruiterInterview) => {
    setEditing(interview);
    setModalOpen(true);
  };

  const handleDelete = async (interview: OrbitRecruiterInterview) => {
    const confirmed = await confirm({
      title: "Delete this interview?",
      message: `The interview for "${interview.candidateName}" will be removed.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync(interview.id);
      showToast("Interview deleted.", "success");
    } catch {
      showToast("Could not delete the interview. Please try again.", "error");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0A1B3D] dark:text-white">Interviews</h1>
          <p className="mt-1 text-gray-600 dark:text-[#c0c0eb]">
            Track candidate interviews, type and outcome, with feedback per round.
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
          Schedule interview
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#323288]" />
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          Something went wrong loading your interviews — please try again.
        </div>
      ) : interviews.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#c0c0eb] bg-white/60 dark:bg-white/5 p-10 text-center">
          <p className="text-lg font-semibold text-gray-900 dark:text-white">No interviews yet</p>
          <p className="mt-2 text-gray-600 dark:text-[#c0c0eb]">
            Schedule an interview to track it through to an outcome.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-[#323288] text-white font-medium rounded-lg hover:bg-[#252560] transition-colors"
          >
            Schedule interview
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
                    When
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
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
                {interviews.map((interview) => {
                  const meta = statusMeta(interview.status);
                  const title = interview.jobTitle ? interview.jobTitle : "—";
                  const when = interview.scheduledAt
                    ? interview.scheduledAt.replace("T", " ")
                    : "—";
                  return (
                    <tr
                      key={interview.id}
                      onClick={() => openEdit(interview)}
                      className="hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-[#252560] dark:text-white">
                          {interview.candidateName}
                        </div>
                        <div className="text-sm text-gray-500">{title}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-[#c0c0eb]">
                        {when}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-[#c0c0eb]">
                        {typeLabel(interview.interviewType)}
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
                            handleDelete(interview);
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
        <InterviewFormModal
          interview={editing}
          candidates={candidates}
          clients={clients}
          onClose={() => setModalOpen(false)}
        />
      ) : null}
      {ConfirmDialog}
    </div>
  );
}
