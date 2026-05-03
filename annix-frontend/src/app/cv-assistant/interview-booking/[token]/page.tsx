"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { fromISO } from "@/app/lib/datetime";
import { API_BASE_URL } from "@/lib/api-config";

interface InterviewSlotView {
  id: number;
  startsAt: string;
  endsAt: string;
  locationLabel: string | null;
  locationAddress: string | null;
  locationLat: number | null;
  locationLng: number | null;
  capacity: number;
  notes: string | null;
  available: boolean;
}

interface InterviewBookingLookupResponse {
  candidate: { name: string | null; email: string | null };
  job: { id: number; title: string; location: string | null; province: string | null };
  currentBooking: { id: number; slotId: number; bookedAt: string } | null;
  slots: InterviewSlotView[];
  expiresAt: string;
}

export default function InterviewBookingPage() {
  const params = useParams<{ token: string }>();
  const rawToken = params ? params.token : "";
  const token = rawToken ?? "";
  const { showToast } = useToast();
  const [data, setData] = useState<InterviewBookingLookupResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingSlotId, setSubmittingSlotId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/public/cv-assistant/interview-booking/${token}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        const message = body ? body.message : null;
        throw new Error(message || "Couldn't load this invitation.");
      }
      const json = (await res.json()) as InterviewBookingLookupResponse;
      setData(json);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't load this invitation.";
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) void load();
  }, [token, load]);

  const handleBook = async (slotId: number) => {
    setSubmittingSlotId(slotId);
    try {
      const res = await fetch(
        `${API_BASE_URL}/public/cv-assistant/interview-booking/${token}/book/${slotId}`,
        { method: "POST" },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        const message = body ? body.message : null;
        throw new Error(message || "Couldn't book this slot.");
      }
      showToast("Interview booked. Check your email for a confirmation.", "success");
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't book this slot.";
      showToast(message, "error");
    } finally {
      setSubmittingSlotId(null);
    }
  };

  const handleCancel = async (bookingId: number) => {
    setSubmittingSlotId(-1);
    try {
      const res = await fetch(
        `${API_BASE_URL}/public/cv-assistant/interview-booking/${token}/cancel/${bookingId}`,
        { method: "POST" },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        const message = body ? body.message : null;
        throw new Error(message || "Couldn't cancel.");
      }
      showToast("Booking cancelled. You can pick a new time below.", "success");
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't cancel.";
      showToast(message, "error");
    } finally {
      setSubmittingSlotId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a40] via-[#0d0d20] to-[#1a1a40] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a40] via-[#0d0d20] to-[#1a1a40] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-[#1a1a40] mb-2">Invitation unavailable</h1>
          <p className="text-sm text-gray-600">{error ?? "Couldn't load this invitation."}</p>
        </div>
      </div>
    );
  }

  const rawCandidateName = data.candidate.name;
  const candidateName = rawCandidateName ?? "there";
  const currentBooking = data.currentBooking;
  const currentSlot = currentBooking
    ? data.slots.find((s) => s.id === currentBooking.slotId)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a40] via-[#0d0d20] to-[#1a1a40] py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="bg-white rounded-2xl shadow-xl p-6">
          <p className="text-xs uppercase tracking-widest text-[#FFA500] font-semibold">
            Interview booking
          </p>
          <h1 className="text-2xl font-bold text-[#1a1a40] mt-1">
            Hi {candidateName}, pick a time that works for you
          </h1>
          <p className="text-sm text-gray-600 mt-2">
            You're invited to interview for <strong>{data.job.title}</strong>
            {data.job.location ? ` in ${data.job.location}` : null}. Choose any open slot below —
            once you book, the slot is yours and won't be offered to other candidates.
          </p>
        </header>

        {currentBooking && currentSlot ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
            <p className="text-sm font-semibold text-emerald-900">Your current booking</p>
            <p className="text-sm text-emerald-900 mt-1">
              {formatSlotRange(currentSlot.startsAt, currentSlot.endsAt)}
              {currentSlot.locationLabel ? ` — ${currentSlot.locationLabel}` : null}
            </p>
            <button
              type="button"
              onClick={() => handleCancel(currentBooking.id)}
              disabled={submittingSlotId !== null}
              className="mt-3 text-xs px-3 py-1.5 bg-white border border-emerald-300 text-emerald-800 rounded-lg hover:bg-emerald-100 disabled:opacity-50"
            >
              Cancel and pick a different time
            </button>
          </div>
        ) : null}

        <div className="bg-white rounded-2xl shadow-xl p-6 space-y-3">
          <h2 className="text-lg font-bold text-[#1a1a40]">Available times</h2>
          {data.slots.length === 0 ? (
            <p className="text-sm text-gray-600">
              No interview slots are available right now. Reply to the email and the company will
              get back to you.
            </p>
          ) : (
            <ul className="space-y-2">
              {data.slots.map((slot) => {
                const slotAvailable = slot.available;
                const isBookedByMe = currentBooking && currentBooking.slotId === slot.id;
                const isDisabled =
                  !slotAvailable || submittingSlotId !== null || Boolean(isBookedByMe);
                return (
                  <li
                    key={slot.id}
                    className={`border rounded-lg p-4 flex items-start justify-between gap-4 ${
                      isBookedByMe
                        ? "border-emerald-300 bg-emerald-50"
                        : slot.available
                          ? "border-gray-200 bg-white"
                          : "border-gray-200 bg-gray-50 opacity-70"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#1a1a40]">
                        {formatSlotRange(slot.startsAt, slot.endsAt)}
                      </p>
                      {slot.locationLabel ? (
                        <p className="text-xs text-gray-600 mt-0.5">{slot.locationLabel}</p>
                      ) : null}
                      {slot.locationAddress ? (
                        <p className="text-xs text-gray-500">{slot.locationAddress}</p>
                      ) : null}
                      {slot.notes ? (
                        <p className="text-xs text-gray-500 mt-1 italic">{slot.notes}</p>
                      ) : null}
                      {!slot.available ? (
                        <p className="text-xs text-red-600 mt-1">Already taken</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      disabled={isDisabled}
                      onClick={() => handleBook(slot.id)}
                      className={`text-sm px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all disabled:opacity-50 ${
                        isBookedByMe
                          ? "bg-emerald-600 text-white"
                          : "bg-[#FFA500] text-[#1a1a40] hover:bg-[#FFB733]"
                      }`}
                    >
                      {submittingSlotId === slot.id
                        ? "Booking…"
                        : isBookedByMe
                          ? "Your slot"
                          : "Book this time"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <p className="text-center text-xs text-white/60">
          This link is unique to you. Don't forward it.
        </p>
      </div>
    </div>
  );
}

const formatSlotRange = (startsAtIso: string, endsAtIso: string): string => {
  const start = fromISO(startsAtIso);
  const end = fromISO(endsAtIso);
  const dayPart = start.toFormat("EEEE d LLLL");
  const startTime = start.toFormat("HH:mm");
  const endTime = end.toFormat("HH:mm");
  return `${dayPart} · ${startTime} – ${endTime}`;
};
