"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  useStartEnrollment,
  useUpsertVoiceProfile,
  useVoiceEnrollmentStatus,
} from "@/app/lib/query/hooks";

interface EnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EnrollmentModal(props: EnrollmentModalProps) {
  const { isOpen, onClose } = props;
  const startEnrollment = useStartEnrollment();
  const upsertProfile = useUpsertVoiceProfile();
  const { data: status } = useVoiceEnrollmentStatus(isOpen);

  const startMutate = startEnrollment.mutate;
  useEffect(() => {
    if (isOpen) {
      startMutate();
    }
  }, [isOpen, startMutate]);

  const state = status ? status.state : "recording";
  const progress = status ? status.progress : 0;
  const message = status ? status.message : null;

  const upsertMutate = upsertProfile.mutate;
  useEffect(() => {
    if (state === "complete") {
      upsertMutate({ enrolled: true });
    }
  }, [state, upsertMutate]);

  if (!isOpen) {
    return null;
  }

  const isComplete = state === "complete";
  const isErrored = state === "error";
  const headline = isComplete
    ? "Voice enrolled"
    : isErrored
      ? "Enrollment failed"
      : "Enrolling your voice";
  const body = isComplete
    ? "Your voice profile is ready. The filter can now verify you in real time."
    : isErrored
      ? (message ?? "Something went wrong during enrollment. Please try again.")
      : (message ?? "Speak naturally for a few seconds so we can learn your voice.");
  const barColor = isErrored ? "bg-red-500" : isComplete ? "bg-green-500" : "bg-indigo-500";
  const barWidth = isComplete ? 100 : Math.max(0, Math.min(100, progress));

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{headline}</h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{body}</p>

        {!isErrored && (
          <div className="mt-5 h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
            <div
              className={`h-full rounded-full transition-all duration-300 ${barColor}`}
              style={{ width: `${barWidth}%` }}
            />
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          {(isComplete || isErrored) && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              {isComplete ? "Done" : "Close"}
            </button>
          )}
          {!isComplete && !isErrored && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
