"use client";

import { useState } from "react";
import { useToast } from "@/app/components/Toast";
import type { OrbitTalentCandidate } from "@/app/lib/api/annixOrbitApi";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import { useOrbitDeleteTalentCandidate, useOrbitTalentCandidates } from "@/app/lib/query/hooks";
import { CandidateFormModal } from "./components/CandidateFormModal";

function visibilityMeta(visibility: string): { label: string; classes: string } {
  if (visibility === "private") return { label: "Private", classes: "bg-gray-100 text-gray-600" };
  if (visibility === "public") return { label: "Public", classes: "bg-green-100 text-green-700" };
  return { label: "Agency", classes: "bg-[#e0e0f5] text-[#323288]" };
}

export default function RecruiterCandidatesPage() {
  const { data: candidates = [], isLoading, isError } = useOrbitTalentCandidates();
  const deleteMutation = useOrbitDeleteTalentCandidate();
  const { confirm, ConfirmDialog } = useConfirm();
  const { showToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<OrbitTalentCandidate | null>(null);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (candidate: OrbitTalentCandidate) => {
    setEditing(candidate);
    setModalOpen(true);
  };

  const handleDelete = async (candidate: OrbitTalentCandidate) => {
    const confirmed = await confirm({
      title: "Delete this candidate?",
      message: `"${candidate.fullName}" will be removed from your talent database. This cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync(candidate.id);
      showToast("Candidate deleted.", "success");
    } catch {
      showToast("Could not delete the candidate. Please try again.", "error");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0A1B3D] dark:text-white">Candidates</h1>
          <p className="mt-1 text-gray-600 dark:text-[#c0c0eb]">
            Your agency's talent database. Visibility and consent are tracked per candidate (POPIA).
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
          Add candidate
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#323288]" />
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          Something went wrong loading your candidates — please try again.
        </div>
      ) : candidates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#c0c0eb] bg-white/60 dark:bg-white/5 p-10 text-center">
          <p className="text-lg font-semibold text-gray-900 dark:text-white">No candidates yet</p>
          <p className="mt-2 text-gray-600 dark:text-[#c0c0eb]">
            Add your first candidate to start building your talent database.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-[#323288] text-white font-medium rounded-lg hover:bg-[#252560] transition-colors"
          >
            Add candidate
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
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Experience
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Visibility
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Consent
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                {candidates.map((candidate) => {
                  const role = candidate.currentRole ? candidate.currentRole : "—";
                  const locationParts = [candidate.city, candidate.province]
                    .filter(Boolean)
                    .join(", ");
                  const location = locationParts ? locationParts : "—";
                  const years = candidate.yearsExperience;
                  const experience = years === null ? "—" : `${years} yr`;
                  const meta = visibilityMeta(candidate.visibility);
                  return (
                    <tr
                      key={candidate.id}
                      onClick={() => openEdit(candidate)}
                      className="hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-[#252560] dark:text-white">
                          {candidate.fullName}
                        </div>
                        <div className="text-sm text-gray-500">{role}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-[#c0c0eb]">
                        {location}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-[#c0c0eb]">
                        {experience}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${meta.classes}`}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {candidate.consentToShare ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            Consented
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-amber-600">No consent</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(candidate);
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
        <CandidateFormModal candidate={editing} onClose={() => setModalOpen(false)} />
      ) : null}
      {ConfirmDialog}
    </div>
  );
}
