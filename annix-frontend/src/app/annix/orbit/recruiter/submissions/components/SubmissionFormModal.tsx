"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/app/components/Toast";
import type {
  OrbitClient,
  OrbitSubmission,
  OrbitTalentCandidate,
} from "@/app/lib/api/annixOrbitApi";
import { isApiError } from "@/app/lib/api/apiError";
import { useAlert } from "@/app/lib/hooks/useAlert";
import { useOrbitCreateSubmission, useOrbitUpdateSubmission } from "@/app/lib/query/hooks";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "submitted", label: "Submitted" },
  { value: "viewed", label: "Viewed" },
  { value: "interested", label: "Interested" },
  { value: "interview", label: "Interview" },
  { value: "offer", label: "Offer" },
  { value: "placed", label: "Placed" },
  { value: "rejected", label: "Rejected" },
  { value: "no_response", label: "No response" },
];

interface SubmissionFormModalProps {
  submission: OrbitSubmission | null;
  candidates: OrbitTalentCandidate[];
  clients: OrbitClient[];
  onClose: () => void;
}

export function SubmissionFormModal(props: SubmissionFormModalProps) {
  const submission = props.submission;
  const { showToast } = useToast();
  const { alert, AlertDialog } = useAlert();
  const createMutation = useOrbitCreateSubmission();
  const updateMutation = useOrbitUpdateSubmission();
  const isCreating = createMutation.isPending;
  const isUpdating = updateMutation.isPending;
  const isSaving = isCreating || isUpdating;

  const consentedCandidates = props.candidates.filter((c) => c.consentToShare);
  const existingCandidate = submission
    ? props.candidates.find((c) => c.id === submission.candidateId)
    : null;
  const existingCandidateName = existingCandidate ? existingCandidate.fullName : "Candidate";

  const [candidateId, setCandidateId] = useState(submission ? String(submission.candidateId) : "");
  const [clientId, setClientId] = useState(
    submission && submission.clientId !== null ? String(submission.clientId) : "",
  );
  const [jobTitle, setJobTitle] = useState(submission ? submission.jobTitle : "");
  const [status, setStatus] = useState(submission ? submission.status : "submitted");
  const [feedback, setFeedback] = useState(submission?.feedback ? submission.feedback : "");
  const [notes, setNotes] = useState(submission?.notes ? submission.notes : "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = jobTitle.trim();
    if (!trimmedTitle) {
      showToast("Job title is required.", "error");
      return;
    }

    try {
      if (submission) {
        await updateMutation.mutateAsync({
          id: submission.id,
          data: {
            clientId: clientId ? Number(clientId) : null,
            jobTitle: trimmedTitle,
            status,
            feedback: feedback.trim() || null,
            notes: notes.trim() || null,
          },
        });
        showToast("Submission updated.", "success");
      } else {
        if (!candidateId) {
          showToast("Select a candidate to submit.", "error");
          return;
        }
        await createMutation.mutateAsync({
          candidateId: Number(candidateId),
          clientId: clientId ? Number(clientId) : null,
          jobTitle: trimmedTitle,
          status,
          feedback: feedback.trim() || null,
          notes: notes.trim() || null,
        });
        showToast("Candidate submitted.", "success");
      }
      props.onClose();
    } catch (err) {
      if (isApiError(err) && err.status === 400) {
        const apiMessage = err.message;
        alert({ message: apiMessage, variant: "error" });
      } else {
        alert({ message: "Could not save the submission. Please try again.", variant: "error" });
      }
    }
  };

  const inputClasses =
    "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c0c0eb] focus:border-transparent";

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {AlertDialog}
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
              {submission ? "Edit submission" : "Submit a candidate"}
            </h2>
          </div>

          <div className="px-6 py-5 space-y-4">
            <div>
              <label
                htmlFor="sb-candidate"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Candidate
              </label>
              {submission ? (
                <p className="px-3 py-2 rounded-lg bg-gray-50 text-gray-700">
                  {existingCandidateName}
                </p>
              ) : consentedCandidates.length === 0 ? (
                <p className="px-3 py-2 rounded-lg bg-amber-50 text-amber-700 text-sm">
                  No candidates have consented to be submitted yet. Capture POPIA consent on a
                  candidate first.
                </p>
              ) : (
                <select
                  id="sb-candidate"
                  value={candidateId}
                  onChange={(e) => setCandidateId(e.target.value)}
                  required
                  className={`${inputClasses} bg-white`}
                >
                  <option value="">Select a candidate</option>
                  {consentedCandidates.map((candidate) => (
                    <option key={candidate.id} value={String(candidate.id)}>
                      {candidate.fullName}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label htmlFor="sb-client" className="block text-sm font-medium text-gray-700 mb-1">
                Client
              </label>
              <select
                id="sb-client"
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
              <label htmlFor="sb-title" className="block text-sm font-medium text-gray-700 mb-1">
                Job title
              </label>
              <input
                id="sb-title"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                required
                className={inputClasses}
                placeholder="Sales Manager"
              />
            </div>

            <div>
              <label htmlFor="sb-status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="sb-status"
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
              <label htmlFor="sb-feedback" className="block text-sm font-medium text-gray-700 mb-1">
                Client feedback
              </label>
              <textarea
                id="sb-feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={2}
                className={inputClasses}
                placeholder="Client's response to this candidate."
              />
            </div>

            <div>
              <label htmlFor="sb-notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                id="sb-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className={inputClasses}
                placeholder="Internal notes on this submission."
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
              {isSaving ? "Saving..." : submission ? "Save changes" : "Submit candidate"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
