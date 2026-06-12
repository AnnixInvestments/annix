"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/app/components/Toast";
import type { OrbitTalentCandidate, OrbitTalentPool } from "@/app/lib/api/annixOrbitApi";
import { useOrbitCreateTalentPool, useOrbitUpdateTalentPool } from "@/app/lib/query/hooks";

interface TalentPoolFormModalProps {
  pool: OrbitTalentPool | null;
  candidates: OrbitTalentCandidate[];
  onClose: () => void;
}

export function TalentPoolFormModal(props: TalentPoolFormModalProps) {
  const pool = props.pool;
  const { showToast } = useToast();
  const createMutation = useOrbitCreateTalentPool();
  const updateMutation = useOrbitUpdateTalentPool();
  const isCreating = createMutation.isPending;
  const isUpdating = updateMutation.isPending;
  const isSaving = isCreating || isUpdating;

  const [name, setName] = useState(pool ? pool.name : "");
  const [description, setDescription] = useState(pool?.description ? pool.description : "");
  const initialIds = pool?.candidateIds ? pool.candidateIds : [];
  const [candidateIds, setCandidateIds] = useState<number[]>(initialIds);

  const toggleCandidate = (id: number) => {
    setCandidateIds((prev) =>
      prev.includes(id) ? prev.filter((existing) => existing !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      showToast("Pool name is required.", "error");
      return;
    }
    const payload = {
      name: trimmedName,
      description: description.trim() || null,
      candidateIds,
    };
    try {
      if (pool) {
        await updateMutation.mutateAsync({ id: pool.id, data: payload });
        showToast("Talent pool updated.", "success");
      } else {
        await createMutation.mutateAsync(payload);
        showToast("Talent pool created.", "success");
      }
      props.onClose();
    } catch {
      showToast("Could not save the talent pool. Please try again.", "error");
    }
  };

  const inputClasses =
    "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c0c0eb] focus:border-transparent";

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={props.onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-[#0A1B3D]">
              {pool ? "Edit talent pool" : "Create talent pool"}
            </h2>
          </div>

          <div className="px-6 py-5 space-y-4">
            <div>
              <label htmlFor="tp-name" className="block text-sm font-medium text-gray-700 mb-1">
                Pool name
              </label>
              <input
                id="tp-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={inputClasses}
                placeholder="Available immediately"
              />
            </div>

            <div>
              <label htmlFor="tp-desc" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                id="tp-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputClasses}
                placeholder="Sales candidates ready to start within 2 weeks"
              />
            </div>

            <div>
              <p className="block text-sm font-medium text-gray-700 mb-1">
                Candidates ({candidateIds.length} selected)
              </p>
              {props.candidates.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No candidates yet — add candidates first, then group them here.
                </p>
              ) : (
                <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
                  {props.candidates.map((candidate) => {
                    const checked = candidateIds.includes(candidate.id);
                    const role = candidate.currentRole ? candidate.currentRole : "—";
                    return (
                      <label
                        key={candidate.id}
                        className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCandidate(candidate.id)}
                          className="h-4 w-4 text-[#323288] border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-800">{candidate.fullName}</span>
                        <span className="text-xs text-gray-400">{role}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={props.onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-[#323288] text-white rounded-lg font-medium hover:bg-[#252560] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : pool ? "Save changes" : "Create pool"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
