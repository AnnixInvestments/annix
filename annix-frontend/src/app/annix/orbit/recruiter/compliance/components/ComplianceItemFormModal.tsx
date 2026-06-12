"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/app/components/Toast";
import type { OrbitComplianceItem, OrbitTalentCandidate } from "@/app/lib/api/annixOrbitApi";
import { useOrbitCreateComplianceItem, useOrbitUpdateComplianceItem } from "@/app/lib/query/hooks";

const DOC_TYPES = [
  "ID document",
  "Qualification",
  "Certificate",
  "Driver's licence",
  "References",
  "Police clearance",
  "Medical certificate",
  "Work permit",
  "Tax number",
  "Bank confirmation",
  "Other",
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "missing", label: "Missing" },
  { value: "received", label: "Received" },
  { value: "verified", label: "Verified" },
  { value: "expiring", label: "Expiring soon" },
  { value: "expired", label: "Expired" },
];

interface ComplianceItemFormModalProps {
  item: OrbitComplianceItem | null;
  candidates: OrbitTalentCandidate[];
  onClose: () => void;
}

export function ComplianceItemFormModal(props: ComplianceItemFormModalProps) {
  const item = props.item;
  const { showToast } = useToast();
  const createMutation = useOrbitCreateComplianceItem();
  const updateMutation = useOrbitUpdateComplianceItem();
  const isCreating = createMutation.isPending;
  const isUpdating = updateMutation.isPending;
  const isSaving = isCreating || isUpdating;

  const existingType = item ? item.documentType : "";
  const existingIsStandard = DOC_TYPES.includes(existingType);
  const [candidateId, setCandidateId] = useState(item ? String(item.candidateId) : "");
  const [docTypeChoice, setDocTypeChoice] = useState(
    item ? (existingIsStandard ? existingType : "Other") : "ID document",
  );
  const [customType, setCustomType] = useState(item && !existingIsStandard ? existingType : "");
  const [status, setStatus] = useState(item ? item.status : "missing");
  const [expiryDate, setExpiryDate] = useState(item?.expiryDate ? item.expiryDate : "");
  const [notes, setNotes] = useState(item?.notes ? item.notes : "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const documentType = docTypeChoice === "Other" ? customType.trim() : docTypeChoice;
    if (!documentType) {
      showToast("Document type is required.", "error");
      return;
    }
    const sharedFields = {
      documentType,
      status,
      expiryDate: expiryDate || null,
      notes: notes.trim() || null,
    };
    try {
      if (item) {
        await updateMutation.mutateAsync({ id: item.id, data: sharedFields });
        showToast("Document updated.", "success");
      } else {
        if (!candidateId) {
          showToast("Select a candidate.", "error");
          return;
        }
        await createMutation.mutateAsync({ candidateId: Number(candidateId), ...sharedFields });
        showToast("Document added.", "success");
      }
      props.onClose();
    } catch {
      showToast("Could not save the document. Please try again.", "error");
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
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-[#0A1B3D]">
              {item ? "Edit document" : "Add document"}
            </h2>
          </div>

          <div className="px-6 py-5 space-y-4">
            <div>
              <label
                htmlFor="co-candidate"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Candidate
              </label>
              {item ? (
                <p className="px-3 py-2 rounded-lg bg-gray-50 text-gray-700">
                  {(() => {
                    const found = props.candidates.find((c) => c.id === item.candidateId);
                    return found ? found.fullName : "Candidate";
                  })()}
                </p>
              ) : (
                <select
                  id="co-candidate"
                  value={candidateId}
                  onChange={(e) => setCandidateId(e.target.value)}
                  required
                  className={`${inputClasses} bg-white`}
                >
                  <option value="">Select a candidate</option>
                  {props.candidates.map((candidate) => (
                    <option key={candidate.id} value={String(candidate.id)}>
                      {candidate.fullName}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label htmlFor="co-type" className="block text-sm font-medium text-gray-700 mb-1">
                Document type
              </label>
              <select
                id="co-type"
                value={docTypeChoice}
                onChange={(e) => setDocTypeChoice(e.target.value)}
                className={`${inputClasses} bg-white`}
              >
                {DOC_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              {docTypeChoice === "Other" ? (
                <input
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  className={`${inputClasses} mt-2`}
                  placeholder="Document name"
                />
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="co-status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="co-status"
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
              <div>
                <label htmlFor="co-expiry" className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry date
                </label>
                <input
                  id="co-expiry"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className={inputClasses}
                />
              </div>
            </div>

            <div>
              <label htmlFor="co-notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                id="co-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className={inputClasses}
                placeholder="e.g. awaiting certified copy"
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
              {isSaving ? "Saving..." : item ? "Save changes" : "Add document"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
