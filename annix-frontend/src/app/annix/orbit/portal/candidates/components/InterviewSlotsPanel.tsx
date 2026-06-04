"use client";

import Link from "next/link";
import { useState } from "react";
import { useToast } from "@/app/components/Toast";
import type { Candidate, InterviewSlot } from "@/app/lib/api/annixOrbitApi";
import { formatDateTimeZA, formatTimeZA, fromISO, nowMillis } from "@/app/lib/datetime";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  useOrbitDeleteInterviewSlot,
  useOrbitInterviewSlotsForJob,
  useOrbitSendInterviewInvite,
} from "@/app/lib/query/hooks";
import { CreateInterviewSlotModal } from "./CreateInterviewSlotModal";

interface InterviewSlotsPanelProps {
  candidate: Candidate;
}

export function InterviewSlotsPanel(props: InterviewSlotsPanelProps) {
  const { candidate } = props;
  const jobPostingId = candidate.jobPostingId;
  const status = candidate.status;
  const eligible =
    status === "shortlisted" || status === "accepted" || status === "reference_check";

  const { showToast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const slotsQuery = useOrbitInterviewSlotsForJob(eligible ? jobPostingId : null);
  const deleteSlot = useOrbitDeleteInterviewSlot();
  const sendInvite = useOrbitSendInterviewInvite();

  if (!eligible) {
    return (
      <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
        <p className="text-sm text-gray-600">
          Move this candidate to <strong>shortlisted</strong>, <strong>reference check</strong>, or{" "}
          <strong>accepted</strong> to invite them to an interview.
        </p>
      </div>
    );
  }

  const slotsData = slotsQuery.data;
  const slots = slotsData ? slotsData : [];
  const upcomingSlots = slots.filter((slot) => fromISO(slot.startsAt).toMillis() > nowMillis());
  const candidateBookedSlot = slots.find((slot) => {
    const bookings = slot.bookings ? slot.bookings : [];
    return bookings.some((b) => b.candidateId === candidate.id && b.status === "booked");
  });

  const handleSendInvite = async () => {
    if (upcomingSlots.length === 0) {
      showToast("Add at least one upcoming slot before sending an invite.", "warning");
      return;
    }
    sendInvite.mutate(candidate.id, {
      onSuccess: (result) => {
        if (result.sent) {
          showToast("Interview invite sent. Candidate will receive an email.", "success");
        } else {
          showToast("Invite created — but the email wasn't sent. Check email config.", "warning");
        }
      },
      onError: (err) => {
        const msg = err instanceof Error ? err.message : "Couldn't send invite";
        showToast(msg, "error");
      },
    });
  };

  const handleDelete = async (slot: InterviewSlot) => {
    const slotBookings = slot.bookings ? slot.bookings : [];
    const activeBookings = slotBookings.filter((b) => b.status === "booked");
    if (activeBookings.length > 0) {
      showToast(
        "This slot has an active booking. Cancel the booking before deleting the slot.",
        "warning",
      );
      return;
    }
    const confirmed = await confirm({
      title: "Delete this slot?",
      message: `${formatDateTimeZA(slot.startsAt)} – ${formatTimeZA(slot.endsAt)} will be removed. This cannot be undone.`,
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">Interview slots for this job</h4>
          <Link
            href={`/annix/orbit/portal/jobs/${jobPostingId}/slots`}
            className="text-xs text-[#323288] hover:text-[#252560] dark:text-[#9ea0e8] dark:hover:text-[#c0c0eb] underline"
          >
            View all slots for this job →
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="text-xs px-3 py-1.5 bg-[#323288] text-white rounded-lg hover:bg-[#252560] transition-colors"
          >
            + Add slot
          </button>
          <SendInviteButton
            isPending={sendInvite.isPending}
            disabled={upcomingSlots.length === 0}
            onClick={handleSendInvite}
          />
        </div>
      </div>

      {candidateBookedSlot ? (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
          <p className="text-xs font-semibold text-emerald-900 uppercase tracking-wider">
            Candidate's current booking
          </p>
          <p className="text-sm text-emerald-900 mt-1">
            {formatDateTimeZA(candidateBookedSlot.startsAt)} –{" "}
            {formatTimeZA(candidateBookedSlot.endsAt)}
            {candidateBookedSlot.locationLabel ? ` · ${candidateBookedSlot.locationLabel}` : null}
          </p>
        </div>
      ) : null}

      {slotsQuery.isLoading ? (
        <p className="text-xs text-gray-500">Loading slots…</p>
      ) : slots.length === 0 ? (
        <p className="text-sm text-gray-600">
          No slots for this job yet. Add at least one before sending the candidate an invite.
        </p>
      ) : (
        <ul className="space-y-2">
          {slots.map((slot) => {
            const slotBookings = slot.bookings ? slot.bookings : [];
            const activeBookings = slotBookings.filter((b) => b.status === "booked");
            const slotIsBookedByThisCandidate = activeBookings.some(
              (b) => b.candidateId === candidate.id,
            );
            const slotIsTaken = activeBookings.length > 0;
            const slotIsUpcoming = fromISO(slot.startsAt).toMillis() > nowMillis();
            return (
              <li
                key={slot.id}
                className={`rounded-lg border px-3 py-2 ${
                  slotIsBookedByThisCandidate
                    ? "border-emerald-200 bg-emerald-50"
                    : slotIsTaken
                      ? "border-gray-200 bg-gray-50"
                      : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {formatDateTimeZA(slot.startsAt)} – {formatTimeZA(slot.endsAt)}
                    </p>
                    {slot.locationLabel ? (
                      <p className="text-xs text-gray-600 mt-0.5">{slot.locationLabel}</p>
                    ) : null}
                    {slot.locationAddress ? (
                      <p className="text-xs text-gray-500">{slot.locationAddress}</p>
                    ) : null}
                    {slot.notes ? (
                      <p className="text-xs text-gray-500 italic mt-1">{slot.notes}</p>
                    ) : null}
                    <p className="text-xs mt-1">
                      {slotIsBookedByThisCandidate ? (
                        <span className="text-emerald-700 font-semibold">
                          Booked by this candidate
                        </span>
                      ) : slotIsTaken ? (
                        <span className="text-gray-600">Booked by another candidate</span>
                      ) : slotIsUpcoming ? (
                        <span className="text-blue-700 dark:text-blue-300">Available</span>
                      ) : (
                        <span className="text-gray-500">Past</span>
                      )}
                    </p>
                  </div>
                  {!slotIsTaken && (
                    <button
                      type="button"
                      onClick={() => handleDelete(slot)}
                      disabled={deleteSlot.isPending}
                      className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50 whitespace-nowrap"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {showCreateModal && (
        <CreateInterviewSlotModal
          jobPostingId={jobPostingId}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {ConfirmDialog}
    </div>
  );
}

interface SendInviteButtonProps {
  isPending: boolean;
  disabled: boolean;
  onClick: () => void;
}

function SendInviteButton(props: SendInviteButtonProps) {
  const pending = props.isPending;
  const buttonDisabled = pending || props.disabled;
  const label = pending ? "Sending…" : "Send invite";
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={buttonDisabled}
      className="text-xs px-3 py-1.5 bg-[#FF8A00] text-[#1a1a40] rounded-lg hover:bg-[#FF9C33] disabled:opacity-50 font-semibold"
    >
      {label}
    </button>
  );
}
