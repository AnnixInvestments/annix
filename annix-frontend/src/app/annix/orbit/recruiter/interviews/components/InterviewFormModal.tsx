"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/app/components/Toast";
import type {
  OrbitClient,
  OrbitRecruiterInterview,
  OrbitTalentCandidate,
} from "@/app/lib/api/annixOrbitApi";
import {
  useOrbitCreateRecruiterInterview,
  useOrbitUpdateRecruiterInterview,
} from "@/app/lib/query/hooks";

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "video", label: "Video" },
  { value: "phone", label: "Phone" },
  { value: "in_person", label: "In person" },
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "scheduled", label: "Scheduled" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "no_show", label: "No show" },
  { value: "rescheduled", label: "Rescheduled" },
  { value: "passed", label: "Passed" },
  { value: "rejected", label: "Rejected" },
];

interface InterviewFormModalProps {
  interview: OrbitRecruiterInterview | null;
  candidates: OrbitTalentCandidate[];
  clients: OrbitClient[];
  onClose: () => void;
}

export function InterviewFormModal(props: InterviewFormModalProps) {
  const interview = props.interview;
  const { showToast } = useToast();
  const createMutation = useOrbitCreateRecruiterInterview();
  const updateMutation = useOrbitUpdateRecruiterInterview();
  const isCreating = createMutation.isPending;
  const isUpdating = updateMutation.isPending;
  const isSaving = isCreating || isUpdating;

  const initialCandidateId =
    interview && interview.candidateId !== null ? interview.candidateId : null;
  const [candidateId, setCandidateId] = useState<number | null>(initialCandidateId);
  const [candidateName, setCandidateName] = useState(interview ? interview.candidateName : "");
  const [clientId, setClientId] = useState(
    interview && interview.clientId !== null ? String(interview.clientId) : "",
  );
  const [jobTitle, setJobTitle] = useState(interview?.jobTitle ? interview.jobTitle : "");
  const [scheduledAt, setScheduledAt] = useState(
    interview?.scheduledAt ? interview.scheduledAt : "",
  );
  const [interviewType, setInterviewType] = useState(interview ? interview.interviewType : "video");
  const [status, setStatus] = useState(interview ? interview.status : "scheduled");
  const [feedback, setFeedback] = useState(interview?.feedback ? interview.feedback : "");
  const [notes, setNotes] = useState(interview?.notes ? interview.notes : "");

  const onPickCandidate = (value: string) => {
    if (!value) {
      setCandidateId(null);
      return;
    }
    const id = Number(value);
    setCandidateId(id);
    const found = props.candidates.find((c) => c.id === id);
    if (found) {
      setCandidateName(found.fullName);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = candidateName.trim();
    if (!trimmedName) {
      showToast("Candidate name is required.", "error");
      return;
    }
    const payload = {
      candidateId,
      clientId: clientId ? Number(clientId) : null,
      candidateName: trimmedName,
      jobTitle: jobTitle.trim() || null,
      scheduledAt: scheduledAt || null,
      interviewType,
      status,
      feedback: feedback.trim() || null,
      notes: notes.trim() || null,
    };
    try {
      if (interview) {
        await updateMutation.mutateAsync({ id: interview.id, data: payload });
        showToast("Interview updated.", "success");
      } else {
        await createMutation.mutateAsync(payload);
        showToast("Interview scheduled.", "success");
      }
      props.onClose();
    } catch {
      showToast("Could not save the interview. Please try again.", "error");
    }
  };

  const candidateSelectValue = candidateId !== null ? String(candidateId) : "";
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
              {interview ? "Edit interview" : "Schedule interview"}
            </h2>
          </div>

          <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="iv-pick" className="block text-sm font-medium text-gray-700 mb-1">
                Link candidate (optional)
              </label>
              <select
                id="iv-pick"
                value={candidateSelectValue}
                onChange={(e) => onPickCandidate(e.target.value)}
                className={`${inputClasses} bg-white`}
              >
                <option value="">Not linked</option>
                {props.candidates.map((candidate) => (
                  <option key={candidate.id} value={String(candidate.id)}>
                    {candidate.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="iv-name" className="block text-sm font-medium text-gray-700 mb-1">
                Candidate name
              </label>
              <input
                id="iv-name"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                required
                className={inputClasses}
                placeholder="Jane Doe"
              />
            </div>

            <div>
              <label htmlFor="iv-client" className="block text-sm font-medium text-gray-700 mb-1">
                Client
              </label>
              <select
                id="iv-client"
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
              <label htmlFor="iv-title" className="block text-sm font-medium text-gray-700 mb-1">
                Job title
              </label>
              <input
                id="iv-title"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className={inputClasses}
                placeholder="Sales Manager"
              />
            </div>

            <div>
              <label htmlFor="iv-when" className="block text-sm font-medium text-gray-700 mb-1">
                Date & time
              </label>
              <input
                id="iv-when"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className={inputClasses}
              />
            </div>

            <div>
              <label htmlFor="iv-type" className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                id="iv-type"
                value={interviewType}
                onChange={(e) => setInterviewType(e.target.value)}
                className={`${inputClasses} bg-white`}
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="iv-status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="iv-status"
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

            <div className="sm:col-span-2">
              <label htmlFor="iv-feedback" className="block text-sm font-medium text-gray-700 mb-1">
                Feedback
              </label>
              <textarea
                id="iv-feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={2}
                className={inputClasses}
                placeholder="Interviewer feedback."
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="iv-notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                id="iv-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className={inputClasses}
                placeholder="Prep notes, logistics, etc."
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
              {isSaving ? "Saving..." : interview ? "Save changes" : "Schedule interview"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
