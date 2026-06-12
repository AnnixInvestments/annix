"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/app/components/Toast";
import type {
  OrbitClient,
  OrbitShortlist,
  OrbitTalentCandidate,
} from "@/app/lib/api/annixOrbitApi";
import { useOrbitCreateShortlist, useOrbitUpdateShortlist } from "@/app/lib/query/hooks";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "ready", label: "Ready to send" },
  { value: "sent", label: "Sent to client" },
  { value: "reviewed", label: "Client reviewed" },
  { value: "closed", label: "Closed" },
];

interface ShortlistFormModalProps {
  shortlist: OrbitShortlist | null;
  candidates: OrbitTalentCandidate[];
  clients: OrbitClient[];
  onClose: () => void;
}

export function ShortlistFormModal(props: ShortlistFormModalProps) {
  const shortlist = props.shortlist;
  const { showToast } = useToast();
  const createMutation = useOrbitCreateShortlist();
  const updateMutation = useOrbitUpdateShortlist();
  const isCreating = createMutation.isPending;
  const isUpdating = updateMutation.isPending;
  const isSaving = isCreating || isUpdating;

  const [name, setName] = useState(shortlist ? shortlist.name : "");
  const [jobTitle, setJobTitle] = useState(shortlist?.jobTitle ? shortlist.jobTitle : "");
  const [clientId, setClientId] = useState(
    shortlist && shortlist.clientId !== null ? String(shortlist.clientId) : "",
  );
  const [status, setStatus] = useState(shortlist ? shortlist.status : "draft");
  const [notes, setNotes] = useState(shortlist?.notes ? shortlist.notes : "");
  const initialIds = shortlist?.candidateIds ? shortlist.candidateIds : [];
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
      showToast("Shortlist name is required.", "error");
      return;
    }
    const payload = {
      name: trimmedName,
      jobTitle: jobTitle.trim() || null,
      clientId: clientId ? Number(clientId) : null,
      candidateIds,
      status,
      notes: notes.trim() || null,
    };
    try {
      if (shortlist) {
        await updateMutation.mutateAsync({ id: shortlist.id, data: payload });
        showToast("Shortlist updated.", "success");
      } else {
        await createMutation.mutateAsync(payload);
        showToast("Shortlist created.", "success");
      }
      props.onClose();
    } catch {
      showToast("Could not save the shortlist. Please try again.", "error");
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
              {shortlist ? "Edit shortlist" : "Create shortlist"}
            </h2>
          </div>

          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="sl-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Shortlist name
                </label>
                <input
                  id="sl-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className={inputClasses}
                  placeholder="Sales Manager — March"
                />
              </div>
              <div>
                <label htmlFor="sl-title" className="block text-sm font-medium text-gray-700 mb-1">
                  Job title
                </label>
                <input
                  id="sl-title"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className={inputClasses}
                  placeholder="Sales Manager"
                />
              </div>
              <div>
                <label htmlFor="sl-client" className="block text-sm font-medium text-gray-700 mb-1">
                  Client
                </label>
                <select
                  id="sl-client"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className={`${inputClasses} bg-white`}
                >
                  <option value="">No client linked</option>
                  {props.clients.map((client) => (
                    <option key={client.id} value={String(client.id)}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="sl-status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="sl-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className={`${inputClasses} bg-white`}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <p className="block text-sm font-medium text-gray-700 mb-1">
                Candidates ({candidateIds.length} selected)
              </p>
              {props.candidates.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No candidates yet — add candidates first, then build a shortlist.
                </p>
              ) : (
                <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
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

            <div>
              <label htmlFor="sl-notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes for the client
              </label>
              <textarea
                id="sl-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className={inputClasses}
                placeholder="Why these candidates fit the brief."
              />
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
              {isSaving ? "Saving..." : shortlist ? "Save changes" : "Create shortlist"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
