"use client";

import { useCallback, useEffect, useState } from "react";
import type { InspectionBooking } from "@/app/lib/api/stock-control-api/types";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";

interface InspectionProposalBannerProps {
  jobCardId: number;
  onChanged: () => void;
}

export function InspectionProposalBanner(props: InspectionProposalBannerProps) {
  const { jobCardId, onChanged } = props;
  const [proposed, setProposed] = useState<InspectionBooking | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const bookings = await stockControlApiClient.inspectionBookingsForJobCard(jobCardId);
      const p = bookings.find((b) => b.status === "proposed");
      setProposed(p || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bookings");
    }
  }, [jobCardId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!proposed) return null;

  const inspectorName = proposed.inspectorName;
  const inspectorEmail = proposed.inspectorEmail;
  const inspectorLabel = inspectorName ? inspectorName : inspectorEmail;

  const handleAccept = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await stockControlApiClient.acceptInspectionProposal(proposed.id);
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await stockControlApiClient.rejectInspectionProposal(proposed.id);
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 my-3">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-amber-900">Inspector proposed a new time</h3>
          <p className="text-xs text-amber-800 mt-1">
            <strong>{inspectorLabel}</strong> has proposed:
          </p>
          <div className="mt-2 text-sm text-gray-900">
            <div>
              <span className="text-gray-500">Proposed:</span>{" "}
              <span className="font-medium">
                {proposed.proposedDate} at {proposed.proposedStartTime} - {proposed.proposedEndTime}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Original: {proposed.inspectionDate} at {proposed.startTime} - {proposed.endTime}
            </div>
            {proposed.proposedNote && (
              <div className="mt-2 text-xs text-gray-700 whitespace-pre-wrap">
                <span className="text-gray-500">Inspector note:</span> {proposed.proposedNote}
              </div>
            )}
          </div>
          {error && <div className="mt-2 text-xs text-red-700">{error}</div>}
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <button
            type="button"
            onClick={handleAccept}
            disabled={submitting}
            className="px-3 py-1.5 rounded-md bg-green-600 text-white text-xs font-medium hover:bg-green-700 disabled:bg-gray-400"
          >
            {submitting ? "..." : "Accept New Time"}
          </button>
          <button
            type="button"
            onClick={handleReject}
            disabled={submitting}
            className="px-3 py-1.5 rounded-md bg-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-300 disabled:bg-gray-100"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}
