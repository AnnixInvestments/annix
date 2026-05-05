"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { type InterviewSlot } from "@/app/lib/api/cvAssistantApi";
import { DateTime, formatTimeZA, fromISO, now } from "@/app/lib/datetime";
import {
  useCvDeleteInterviewSlot,
  useCvInterviewSlotsForCompany,
  useCvJobPostings,
} from "@/app/lib/query/hooks";

type ViewWeek = { startISODate: string };

const buildWeek = (anchor: DateTime): ViewWeek => {
  const monday = anchor.startOf("week");
  const isoDate = monday.toISODate();
  return { startISODate: isoDate ? isoDate : "" };
};

export default function CompanyCalendarPage() {
  const { showToast } = useToast();
  const [currentWeek, setCurrentWeek] = useState<ViewWeek>(() => buildWeek(now()));
  const [filterJob, setFilterJob] = useState<string>("all");

  const weekStart = currentWeek.startISODate ? fromISO(currentWeek.startISODate) : now();
  const fromIso = weekStart.toISO();

  const slotsQuery = useCvInterviewSlotsForCompany(fromIso ? fromIso : null);
  const { data: jobs = [] } = useCvJobPostings();
  const deleteSlot = useCvDeleteInterviewSlot();

  const slotsData = slotsQuery.data;

  const visibleSlots = useMemo(() => {
    const slots = slotsData ? slotsData : [];
    const weekEnd = weekStart.plus({ days: 7 });
    return slots
      .filter((slot) => {
        const start = fromISO(slot.startsAt).toMillis();
        if (start < weekStart.toMillis() || start >= weekEnd.toMillis()) return false;
        if (filterJob === "all") return true;
        return String(slot.jobPostingId) === filterJob;
      })
      .sort((a, b) => fromISO(a.startsAt).toMillis() - fromISO(b.startsAt).toMillis());
  }, [slotsData, weekStart, filterJob]);

  const slotsByDay = useMemo(() => {
    return visibleSlots.reduce<Map<string, InterviewSlot[]>>((map, slot) => {
      const isoDate = fromISO(slot.startsAt).toISODate();
      const dayKey = isoDate ? isoDate : "";
      const existing = map.get(dayKey);
      const list = existing ? existing : [];
      list.push(slot);
      map.set(dayKey, list);
      return map;
    }, new Map());
  }, [visibleSlots]);

  const days = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => weekStart.plus({ days: i }));
  }, [weekStart]);

  const handlePrev = () => setCurrentWeek(buildWeek(weekStart.minus({ days: 7 })));
  const handleNext = () => setCurrentWeek(buildWeek(weekStart.plus({ days: 7 })));
  const handleToday = () => setCurrentWeek(buildWeek(now()));

  const handleDelete = (slot: InterviewSlot) => {
    const slotBookings = slot.bookings ? slot.bookings : [];
    const activeBookings = slotBookings.filter((b) => b.status === "booked");
    if (activeBookings.length > 0) {
      showToast(
        "This slot has an active booking. Open the candidate to cancel the booking first.",
        "warning",
      );
      return;
    }
    deleteSlot.mutate(slot.id, {
      onSuccess: () => showToast("Slot deleted.", "success"),
      onError: (err) => {
        const msg = err instanceof Error ? err.message : "Couldn't delete slot";
        showToast(msg, "error");
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Interview calendar</h1>
          <p className="text-white/70 mt-1 text-sm">All scheduled interviews across active jobs.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrev}
            className="px-3 py-1.5 text-sm bg-white/10 text-white rounded-lg hover:bg-white/20"
          >
            ←
          </button>
          <button
            type="button"
            onClick={handleToday}
            className="px-3 py-1.5 text-sm bg-white/10 text-white rounded-lg hover:bg-white/20"
          >
            This week
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="px-3 py-1.5 text-sm bg-white/10 text-white rounded-lg hover:bg-white/20"
          >
            →
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#e0e0f5] p-4">
        <div className="flex flex-wrap items-end gap-4 justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {weekStart.toFormat("d LLL yyyy")} –{" "}
              {weekStart.plus({ days: 6 }).toFormat("d LLL yyyy")}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {visibleSlots.length} slot{visibleSlots.length === 1 ? "" : "s"} this week
            </p>
          </div>
          <div className="min-w-[14rem]">
            <label
              htmlFor="cal-job-filter"
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              Filter by job
            </label>
            <select
              id="cal-job-filter"
              value={filterJob}
              onChange={(e) => setFilterJob(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#9999d6] focus:border-transparent"
            >
              <option value="all">All jobs</option>
              {jobs.map((job) => {
                const refNumber = job.referenceNumber;
                const labelPrefix = refNumber ? `[${refNumber}] ` : "";
                return (
                  <option key={job.id} value={String(job.id)}>
                    {labelPrefix}
                    {job.title}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {slotsQuery.isLoading ? (
        <div className="bg-white rounded-xl shadow-sm border border-[#e0e0f5] p-8 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#323288] mx-auto" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {days.map((day) => {
            const isoDate = day.toISODate();
            const dayKey = isoDate ? isoDate : "";
            const fromMap = slotsByDay.get(dayKey);
            const daySlots = fromMap ? fromMap : [];
            const isToday = day.toISODate() === now().toISODate();
            return (
              <div
                key={dayKey}
                className={`bg-white rounded-xl shadow-sm border ${
                  isToday ? "border-[#FFA500] ring-1 ring-[#FFA500]" : "border-[#e0e0f5]"
                } p-3 min-h-[12rem]`}
              >
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-xs uppercase tracking-wider text-gray-500">
                    {day.toFormat("EEE")}
                  </span>
                  <span className="text-sm font-bold text-gray-900">{day.toFormat("d LLL")}</span>
                </div>
                {daySlots.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No interviews</p>
                ) : (
                  <ul className="space-y-2">
                    {daySlots.map((slot) => {
                      const slotBookings = slot.bookings ? slot.bookings : [];
                      const bookings = slotBookings.filter((b) => b.status === "booked");
                      const firstBooking = bookings[0];
                      const candidate = firstBooking ? firstBooking.candidate : null;
                      const candidateName = candidate ? candidate.name : null;
                      const jobPosting = slot.jobPosting;
                      const jobTitle = jobPosting ? jobPosting.title : null;
                      const jobRef = jobPosting ? jobPosting.referenceNumber : null;
                      const isBooked = bookings.length > 0;
                      return (
                        <li
                          key={slot.id}
                          className={`rounded-md border px-2 py-1.5 text-xs ${
                            isBooked
                              ? "border-emerald-200 bg-emerald-50"
                              : "border-blue-200 bg-blue-50"
                          }`}
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="font-semibold text-gray-900">
                              {formatTimeZA(slot.startsAt)} – {formatTimeZA(slot.endsAt)}
                            </span>
                            {!isBooked ? (
                              <button
                                type="button"
                                onClick={() => handleDelete(slot)}
                                disabled={deleteSlot.isPending}
                                className="text-[10px] text-red-600 hover:text-red-700 disabled:opacity-50"
                                aria-label="Delete slot"
                              >
                                ✕
                              </button>
                            ) : null}
                          </div>
                          {jobTitle ? (
                            <p className="text-gray-700 mt-0.5 truncate">
                              {jobRef ? `[${jobRef}] ` : ""}
                              {jobTitle}
                            </p>
                          ) : null}
                          {candidateName ? (
                            <p className="text-emerald-800 mt-0.5 truncate">{candidateName}</p>
                          ) : isBooked ? (
                            <p className="text-emerald-800 mt-0.5 truncate">Candidate booked</p>
                          ) : (
                            <p className="text-blue-800 mt-0.5">Open</p>
                          )}
                          {slot.locationLabel ? (
                            <p className="text-gray-600 mt-0.5 truncate">{slot.locationLabel}</p>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-white/5 rounded-xl border border-white/10 p-4">
        <p className="text-sm text-white/80">
          To add new interview slots, open the{" "}
          <Link href="/cv-assistant/portal/candidates" className="underline hover:text-white">
            candidate shortlist
          </Link>{" "}
          and use the <strong>Interview slots</strong> section in the candidate detail panel.
        </p>
      </div>
    </div>
  );
}
