"use client";

import { useState } from "react";
import { useToast } from "@/app/components/Toast";
import type { OrbitTalentPool } from "@/app/lib/api/annixOrbitApi";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  useOrbitDeleteTalentPool,
  useOrbitTalentCandidates,
  useOrbitTalentPools,
} from "@/app/lib/query/hooks";
import { TalentPoolFormModal } from "./components/TalentPoolFormModal";

export default function RecruiterTalentPoolsPage() {
  const { data: pools = [], isLoading, isError } = useOrbitTalentPools();
  const { data: candidates = [] } = useOrbitTalentCandidates();
  const deleteMutation = useOrbitDeleteTalentPool();
  const { confirm, ConfirmDialog } = useConfirm();
  const { showToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<OrbitTalentPool | null>(null);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (pool: OrbitTalentPool) => {
    setEditing(pool);
    setModalOpen(true);
  };

  const handleDelete = async (pool: OrbitTalentPool) => {
    const confirmed = await confirm({
      title: "Delete this talent pool?",
      message: `"${pool.name}" will be removed. Candidates themselves are not deleted.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync(pool.id);
      showToast("Talent pool deleted.", "success");
    } catch {
      showToast("Could not delete the talent pool. Please try again.", "error");
    }
  };

  const memberCount = (pool: OrbitTalentPool): number => {
    const ids = pool.candidateIds;
    return ids ? ids.length : 0;
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0A1B3D] dark:text-white">Talent Pools</h1>
          <p className="mt-1 text-gray-600 dark:text-[#c0c0eb]">
            Named groups of candidates you can match to a brief and share as shortlists.
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
          Create pool
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#323288]" />
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          Something went wrong loading your talent pools — please try again.
        </div>
      ) : pools.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#c0c0eb] bg-white/60 dark:bg-white/5 p-10 text-center">
          <p className="text-lg font-semibold text-gray-900 dark:text-white">No talent pools yet</p>
          <p className="mt-2 text-gray-600 dark:text-[#c0c0eb]">
            Group your candidates into pools so you can match a whole pool to a vacancy.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-[#323288] text-white font-medium rounded-lg hover:bg-[#252560] transition-colors"
          >
            Create pool
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pools.map((pool) => {
            const description = pool.description ? pool.description : "No description";
            return (
              <div
                key={pool.id}
                onClick={() => openEdit(pool)}
                className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 cursor-pointer hover:border-[#c0c0eb] transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold text-[#252560] dark:text-white">{pool.name}</h2>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(pool);
                    }}
                    disabled={deleteMutation.isPending}
                    className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
                <p className="mt-1 text-sm text-gray-500 line-clamp-2">{description}</p>
                <p className="mt-4 text-sm font-medium text-[#323288] dark:text-[#9ea0e8]">
                  {memberCount(pool)} candidates
                </p>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen ? (
        <TalentPoolFormModal
          pool={editing}
          candidates={candidates}
          onClose={() => setModalOpen(false)}
        />
      ) : null}
      {ConfirmDialog}
    </div>
  );
}
