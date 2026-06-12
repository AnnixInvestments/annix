"use client";

import { useState } from "react";
import { useToast } from "@/app/components/Toast";
import type { OrbitJob } from "@/app/lib/api/annixOrbitApi";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  useOrbitClients,
  useOrbitDeleteRecruiterJob,
  useOrbitRecruiterJobs,
} from "@/app/lib/query/hooks";
import { RecruiterJobFormModal } from "./components/RecruiterJobFormModal";

function statusMeta(status: string): { label: string; classes: string } {
  if (status === "sourcing") return { label: "Sourcing", classes: "bg-[#e0e0f5] text-[#323288]" };
  if (status === "interviewing")
    return { label: "Interviewing", classes: "bg-blue-100 text-blue-700" };
  if (status === "offer") return { label: "Offer", classes: "bg-indigo-100 text-indigo-700" };
  if (status === "filled") return { label: "Filled", classes: "bg-green-100 text-green-700" };
  if (status === "on_hold") return { label: "On hold", classes: "bg-amber-100 text-amber-700" };
  if (status === "closed") return { label: "Closed", classes: "bg-gray-100 text-gray-600" };
  return { label: "Open", classes: "bg-green-100 text-green-700" };
}

export default function RecruiterJobsPage() {
  const { data: jobs = [], isLoading, isError } = useOrbitRecruiterJobs();
  const { data: clients = [] } = useOrbitClients();
  const deleteMutation = useOrbitDeleteRecruiterJob();
  const { confirm, ConfirmDialog } = useConfirm();
  const { showToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<OrbitJob | null>(null);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (job: OrbitJob) => {
    setEditing(job);
    setModalOpen(true);
  };

  const handleDelete = async (job: OrbitJob) => {
    const confirmed = await confirm({
      title: "Delete this job?",
      message: `"${job.title}" will be removed. This cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync(job.id);
      showToast("Job deleted.", "success");
    } catch {
      showToast("Could not delete the job. Please try again.", "error");
    }
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
          <h1 className="text-2xl font-bold text-[#0A1B3D] dark:text-white">Jobs</h1>
          <p className="mt-1 text-gray-600 dark:text-[#c0c0eb]">
            Client vacancies you're working. Use Matches to find candidates for each brief.
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
          Add job
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#323288]" />
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          Something went wrong loading your jobs — please try again.
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#c0c0eb] bg-white/60 dark:bg-white/5 p-10 text-center">
          <p className="text-lg font-semibold text-gray-900 dark:text-white">No jobs yet</p>
          <p className="mt-2 text-gray-600 dark:text-[#c0c0eb]">
            Add a client vacancy to start sourcing and matching candidates.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-[#323288] text-white font-medium rounded-lg hover:bg-[#252560] transition-colors"
          >
            Add job
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Openings
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
                {jobs.map((job) => {
                  const meta = statusMeta(job.status);
                  const locationParts = [job.city, job.province].filter(Boolean).join(", ");
                  const location = locationParts ? locationParts : "—";
                  return (
                    <tr
                      key={job.id}
                      onClick={() => openEdit(job)}
                      className="hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-[#252560] dark:text-white">
                          {job.title}
                        </div>
                        <div className="text-sm text-gray-500">{location}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-[#c0c0eb]">
                        {clientName(job.clientId)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-[#c0c0eb]">
                        {job.openings}
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
                            handleDelete(job);
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
        <RecruiterJobFormModal
          job={editing}
          clients={clients}
          onClose={() => setModalOpen(false)}
        />
      ) : null}
      {ConfirmDialog}
    </div>
  );
}
