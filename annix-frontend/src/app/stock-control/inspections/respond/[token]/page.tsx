"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
// eslint-disable-next-line no-restricted-imports -- Token-based public inspection response page; requires new unauthenticated hooks for inspection booking and response flows. Tracked as tech debt.
import { browserBaseUrl } from "@/lib/api-config";

interface BookingDetails {
  booking: {
    id: number;
    inspectionDate: string;
    startTime: string;
    endTime: string;
    inspectorEmail: string;
    inspectorName: string | null;
    notes: string | null;
    status: string;
    bookedByName: string | null;
    proposedDate: string | null;
    proposedStartTime: string | null;
    proposedEndTime: string | null;
  };
  jobCard: { id: number; jobName: string | null; jcNumber: string | null } | null;
  company: { name: string };
}

type Mode = "choose" | "propose" | "done";

export default function InspectionRespondPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [details, setDetails] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("choose");
  const [submitting, setSubmitting] = useState(false);
  const [proposedDate, setProposedDate] = useState("");
  const [proposedStart, setProposedStart] = useState("");
  const [proposedEnd, setProposedEnd] = useState("");
  const [note, setNote] = useState("");
  const [resultMessage, setResultMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(
          `${browserBaseUrl()}/stock-control/public/inspection-bookings/${token}`,
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const bodyMessage = body.message;
          throw new Error(bodyMessage ? bodyMessage : `Failed to load booking (${res.status})`);
        }
        const data = (await res.json()) as BookingDetails;
        setDetails(data);
        if (
          data.booking.status === "accepted" ||
          data.booking.status === "completed" ||
          data.booking.status === "proposed"
        ) {
          setMode("done");
          const msg =
            data.booking.status === "proposed"
              ? "Your proposed time has been sent. The QA team will confirm."
              : data.booking.status === "accepted"
                ? "You have accepted this inspection slot."
                : "This inspection is already complete.";
          setResultMessage(msg);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const handleAccept = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `${browserBaseUrl()}/stock-control/public/inspection-bookings/${token}/accept`,
        { method: "POST" },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const bodyMessage = body.message;
        throw new Error(bodyMessage ? bodyMessage : "Accept failed");
      }
      setMode("done");
      setResultMessage("Thank you - the inspection is confirmed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Accept failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePropose = async () => {
    if (!proposedDate || !proposedStart || !proposedEnd) {
      setError("Date, start and end time are required");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `${browserBaseUrl()}/stock-control/public/inspection-bookings/${token}/propose`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            proposedDate,
            proposedStartTime: proposedStart,
            proposedEndTime: proposedEnd,
            note: note || null,
          }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const bodyMessage = body.message;
        throw new Error(bodyMessage ? bodyMessage : "Propose failed");
      }
      setMode("done");
      setResultMessage("Thanks - your proposed time has been sent for confirmation.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Propose failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="max-w-xl mx-auto p-6 text-sm text-gray-500">Loading...</div>;
  }

  if (error && !details) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!details) return null;

  const b = details.booking;
  const jc = details.jobCard;
  const jcNumber = jc ? jc.jcNumber : null;
  const jcJobName = jc ? jc.jobName : null;
  const jobRef = jcNumber ? jcNumber : jc ? `JC-${jc.id}` : "";
  const inspectorName = b.inspectorName;
  const inspectorEmail = b.inspectorEmail;
  const inspectorLabel = inspectorName ? inspectorName : inspectorEmail;

  return (
    <div className="max-w-xl mx-auto p-6">
      <div className="rounded-lg bg-white shadow-sm border border-gray-200 p-6">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">{details.company.name}</h1>
        <p className="text-sm text-gray-500 mb-4">Inspection Booking Response</p>

        <div className="rounded-md bg-gray-50 border border-gray-200 p-4 mb-4 text-sm">
          <div className="mb-1">
            <span className="text-gray-500">Job:</span>{" "}
            <span className="font-medium">
              {jobRef}
              {jcJobName ? ` - ${jcJobName}` : ""}
            </span>
          </div>
          <div className="mb-1">
            <span className="text-gray-500">Inspector:</span>{" "}
            <span className="font-medium">{inspectorLabel}</span>
          </div>
          <div className="mb-1">
            <span className="text-gray-500">Proposed date:</span>{" "}
            <span className="font-medium">{b.inspectionDate}</span>
          </div>
          <div className="mb-1">
            <span className="text-gray-500">Time:</span>{" "}
            <span className="font-medium">
              {b.startTime} - {b.endTime}
            </span>
          </div>
          {b.notes && (
            <div>
              <span className="text-gray-500">Notes:</span>{" "}
              <span className="whitespace-pre-wrap">{b.notes}</span>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {mode === "done" && (
          <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            {resultMessage}
          </div>
        )}

        {mode === "choose" && (
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={handleAccept}
              disabled={submitting}
              className="flex-1 px-4 py-2 rounded-md bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:bg-gray-400"
            >
              {submitting ? "..." : "Accept This Slot"}
            </button>
            <button
              type="button"
              onClick={() => setMode("propose")}
              disabled={submitting}
              className="flex-1 px-4 py-2 rounded-md bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:bg-gray-400"
            >
              Propose Different Time
            </button>
          </div>
        )}

        {mode === "propose" && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Proposed date</label>
              <input
                type="date"
                value={proposedDate}
                onChange={(e) => setProposedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Start time</label>
                <input
                  type="time"
                  value={proposedStart}
                  onChange={(e) => setProposedStart(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">End time</label>
                <input
                  type="time"
                  value={proposedEnd}
                  onChange={(e) => setProposedEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Note to QA team (optional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handlePropose}
                disabled={submitting}
                className="flex-1 px-4 py-2 rounded-md bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:bg-gray-400"
              >
                {submitting ? "..." : "Send Proposal"}
              </button>
              <button
                type="button"
                onClick={() => setMode("choose")}
                disabled={submitting}
                className="px-4 py-2 rounded-md bg-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-300"
              >
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
