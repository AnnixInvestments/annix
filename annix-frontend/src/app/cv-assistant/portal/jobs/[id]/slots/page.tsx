"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useToast } from "@/app/components/Toast";
import type { InterviewSlot } from "@/app/lib/api/cvAssistantApi";
import { formatDateLongZA, formatTimeZA, fromISO, nowMillis } from "@/app/lib/datetime";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  useCvDeleteInterviewSlot,
  useCvInterviewSlotsForJob,
  useCvJobPostings,
} from "@/app/lib/query/hooks";
import { CreateInterviewSlotModal } from "../../../candidates/components/CreateInterviewSlotModal";

export default function PerJobSlotsPage() {
  const params = useParams<{ id: string }>();
  const rawId = params ? params.id : "";
  const jobId = rawId ? Number.parseInt(rawId, 10) : Number.NaN;
  const validJobId = Number.isFinite(jobId) ? jobId : null;

  const { showToast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: jobs = [] } = useCvJobPostings();
  const slotsQuery = useCvInterviewSlotsForJob(validJobId);
  const deleteSlot = useCvDeleteInterviewSlot();

  const job = useMemo(() => {
    if (validJobId === null) return null;
    return jobs.find((j) => j.id === validJobId);
  }, [jobs, validJobId]);

  const slotsData = slotsQuery.data;

  const slots = useMemo(() => (slotsData ? slotsData : []), [slotsData]);

  const slotsSorted = useMemo(() => {
    return [...slots].sort(
      (a, b) => fromISO(a.startsAt).toMillis() - fromISO(b.startsAt).toMillis(),
    );
  }, [slots]);

  const slotsByDay = useMemo(() => {
    return slotsSorted.reduce<Map<string, InterviewSlot[]>>((map, slot) => {
      const isoDate = fromISO(slot.startsAt).toISODate();
      const dayKey = isoDate ? isoDate : "";
      const existing = map.get(dayKey);
      const list = existing ? existing : [];
      list.push(slot);
      map.set(dayKey, list);
      return map;
    }, new Map());
  }, [slotsSorted]);

  const sortedDayKeys = useMemo(() => Array.from(slotsByDay.keys()), [slotsByDay]);

  const upcomingCount = useMemo(() => {
    return slots.filter((slot) => fromISO(slot.startsAt).toMillis() > nowMillis()).length;
  }, [slots]);

  const bookedCount = useMemo(() => {
    return slots.reduce((acc, slot) => {
      const slotBookings = slot.bookings ? slot.bookings : [];
      return acc + slotBookings.filter((b) => b.status === "booked").length;
    }, 0);
  }, [slots]);

  const handleDelete = async (slot: InterviewSlot) => {
    const slotBookings = slot.bookings ? slot.bookings : [];
    const activeBookings = slotBookings.filter((b) => b.status === "booked");
    if (activeBookings.length > 0) {
      showToast(
        "This slot has an active booking. Open the candidate to cancel the booking before deleting.",
        "warning",
      );
      return;
    }
    const confirmed = await confirm({
      title: "Delete this slot?",
      message: `${formatDateLongZA(slot.startsAt)} ${formatTimeZA(slot.startsAt)} – ${formatTimeZA(slot.endsAt)} will be removed. This cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    deleteSlot.mutate(slot.id, {
      onSuccess: () => showToast("Slot deleted.", "success"),
      onError: (err) => {
        const msg = err instanceof Error ? err.message : "Couldn't delete slot";
        showToast(msg, "error");
      },
    });
  };

  if (validJobId === null) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-[#e0e0f5] p-6">
        <p className="text-sm text-gray-700">Invalid job ID.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <Link href="/cv-assistant/portal/jobs" className="text-xs text-white/70 hover:text-white">
            ← Back to jobs
          </Link>
          <h1 className="text-2xl font-bold text-white mt-1">
            Interview slots
            {job ? (
              <span className="ml-2 text-base text-white/70 font-normal">
                {job.referenceNumber ? `[${job.referenceNumber}] ` : ""}
                {job.title}
              </span>
            ) : null}
          </h1>
          <p className="text-white/70 mt-1 text-sm">
            {slots.length} total · {upcomingCount} upcoming · {bookedCount} booked
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-[#FFA500] text-[#1a1a40] rounded-lg hover:bg-[#FFB733] font-semibold"
        >
          + Add slot
        </button>
      </div>

      {slotsQuery.isLoading ? (
        <div className="bg-white rounded-xl shadow-sm border border-[#e0e0f5] p-8 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#323288] mx-auto" />
        </div>
      ) : sortedDayKeys.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-[#e0e0f5] p-6">
          <p className="text-sm text-gray-700">
            No interview slots yet. Add at least one before sending invites to candidates.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDayKeys.map((dayKey) => {
            const dayBookingsRaw = slotsByDay.get(dayKey);
            const daySlots = dayBookingsRaw ? dayBookingsRaw : [];
            return (
              <div
                key={dayKey}
                className="bg-white rounded-xl shadow-sm border border-[#e0e0f5] p-4 space-y-3"
              >
                <h2 className="text-lg font-bold text-gray-900">{formatDateLongZA(dayKey)}</h2>
                <ul className="space-y-2">
                  {daySlots.map((slot) => {
                    const slotBookings = slot.bookings ? slot.bookings : [];
                    const bookings = slotBookings.filter((b) => b.status === "booked");
                    const firstBooking = bookings[0];
                    const candidate = firstBooking ? firstBooking.candidate : null;
                    const candidateName = candidate ? candidate.name : null;
                    const isBooked = bookings.length > 0;
                    const isPast = fromISO(slot.startsAt).toMillis() <= nowMillis();
                    return (
                      <li
                        key={slot.id}
                        className={`rounded-lg border px-3 py-2 flex items-start justify-between gap-3 ${
                          isBooked
                            ? "border-emerald-200 bg-emerald-50"
                            : isPast
                              ? "border-gray-200 bg-gray-50"
                              : "border-blue-200 bg-blue-50"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-gray-900">
                            {formatTimeZA(slot.startsAt)} – {formatTimeZA(slot.endsAt)}
                          </p>
                          {slot.locationLabel ? (
                            <p className="text-xs text-gray-700 mt-0.5">{slot.locationLabel}</p>
                          ) : null}
                          {slot.locationAddress ? (
                            <p className="text-xs text-gray-500">{slot.locationAddress}</p>
                          ) : null}
                          {slot.notes ? (
                            <p className="text-xs text-gray-500 italic mt-1">{slot.notes}</p>
                          ) : null}
                          <p className="text-xs mt-1">
                            {isBooked ? (
                              <span className="text-emerald-700 font-semibold">
                                Booked
                                {candidateName ? ` — ${candidateName}` : ""}
                              </span>
                            ) : isPast ? (
                              <span className="text-gray-500">Past</span>
                            ) : (
                              <span className="text-blue-700">Available</span>
                            )}
                          </p>
                        </div>
                        {!isBooked ? (
                          <button
                            type="button"
                            onClick={() => handleDelete(slot)}
                            disabled={deleteSlot.isPending}
                            className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50 whitespace-nowrap"
                          >
                            Delete
                          </button>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {showCreateModal ? (
        <CreateInterviewSlotModal
          jobPostingId={validJobId}
          onClose={() => setShowCreateModal(false)}
        />
      ) : null}

      {ConfirmDialog}
    </div>
  );
}
