"use client";

import Link from "next/link";
import { useState } from "react";
import type { Meeting, RescheduleMeetingDto } from "@/app/lib/api/annixRepApi";
import { formatDateZA, fromJSDate, now } from "@/app/lib/datetime";
import { useMeetings, useRepProfile, useRescheduleMeeting } from "@/app/lib/query/hooks";
import { CalendarGrid } from "../components/CalendarGrid";

function dateToString(date: Date): string {
  return fromJSDate(date).toISODate() ?? "";
}

function addDaysHelper(date: Date, days: number): Date {
  return fromJSDate(date).plus({ days }).toJSDate();
}

function startOfWeek(date: Date): Date {
  const dt = fromJSDate(date);
  return dt.minus({ days: dt.weekday - 1 }).toJSDate();
}

export default function CalendarViewPage() {
  const today = now().toJSDate();
  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [selectedDate, setSelectedDate] = useState<Date>(today);

  const { data: meetings, isLoading: meetingsLoading } = useMeetings();
  const { data: profile } = useRepProfile();
  const rescheduleMutation = useRescheduleMeeting();

  const workingStart = profile?.workingHoursStart
    ? parseInt(profile.workingHoursStart.split(":")[0], 10)
    : 8;
  const workingEnd = profile?.workingHoursEnd
    ? parseInt(profile.workingHoursEnd.split(":")[0], 10)
    : 18;

  const meetingsForDate = (date: Date): Meeting[] => {
    if (!meetings) return [];
    const dateStr = dateToString(date);
    return meetings.filter((m) => {
      const meetingDate = fromJSDate(m.scheduledStart).toJSDate();
      return dateToString(meetingDate) === dateStr;
    });
  };

  const weekStart = startOfWeek(selectedDate);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDaysHelper(weekStart, i));

  const handleReschedule = (meetingId: number, newStart: Date, newEnd: Date) => {
    const dto: RescheduleMeetingDto = {
      scheduledStart: fromJSDate(newStart).toISO() ?? "",
      scheduledEnd: fromJSDate(newEnd).toISO() ?? "",
    };

    rescheduleMutation.mutate({ id: meetingId, dto });
  };

  const goToPreviousDay = () => setSelectedDate(addDaysHelper(selectedDate, -1));
  const goToNextDay = () => setSelectedDate(addDaysHelper(selectedDate, 1));
  const goToPreviousWeek = () => setSelectedDate(addDaysHelper(selectedDate, -7));
  const goToNextWeek = () => setSelectedDate(addDaysHelper(selectedDate, 7));
  const goToToday = () => setSelectedDate(today);

  if (meetingsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/annix-rep/schedule"
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calendar View</h1>
            <p className="text-gray-500 dark:text-gray-400">Drag meetings to reschedule</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToToday}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-600"
          >
            Today
          </button>
          <div className="flex items-center border border-gray-300 dark:border-slate-600 rounded-md overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode("day")}
              className={`px-3 py-1.5 text-sm font-medium ${
                viewMode === "day"
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-600"
              }`}
            >
              Day
            </button>
            <button
              type="button"
              onClick={() => setViewMode("week")}
              className={`px-3 py-1.5 text-sm font-medium ${
                viewMode === "week"
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-600"
              }`}
            >
              Week
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={viewMode === "day" ? goToPreviousDay : goToPreviousWeek}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white min-w-[200px] text-center">
            {viewMode === "day"
              ? formatDateZA(selectedDate)
              : `${formatDateZA(weekStart)} - ${formatDateZA(addDaysHelper(weekStart, 6))}`}
          </h2>
          <button
            type="button"
            onClick={viewMode === "day" ? goToNextDay : goToNextWeek}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {rescheduleMutation.isPending && (
          <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
            Saving...
          </div>
        )}
      </div>

      {viewMode === "day" ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          <CalendarGrid
            meetings={meetingsForDate(selectedDate)}
            date={selectedDate}
            startHour={workingStart}
            endHour={workingEnd}
            onReschedule={handleReschedule}
          />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-gray-200 dark:border-slate-700">
            {weekDates.map((date) => {
              const isToday = dateToString(date) === dateToString(today);
              return (
                <div
                  key={fromJSDate(date).toISO()}
                  className={`p-3 text-center border-r border-gray-200 dark:border-slate-700 last:border-r-0 ${
                    isToday ? "bg-blue-50 dark:bg-blue-900/20" : ""
                  }`}
                >
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {fromJSDate(date).toFormat("ccc")}
                  </div>
                  <div
                    className={`text-lg font-semibold ${
                      isToday ? "text-blue-600 dark:text-blue-400" : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {fromJSDate(date).day}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-7">
            {weekDates.map((date) => {
              const dayMeetings = meetingsForDate(date);
              return (
                <div
                  key={fromJSDate(date).toISO()}
                  className="min-h-[400px] p-2 border-r border-gray-200 dark:border-slate-700 last:border-r-0"
                >
                  {dayMeetings.length === 0 ? (
                    <div className="text-xs text-gray-400 dark:text-gray-500 text-center mt-4">
                      No meetings
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {dayMeetings
                        .sort(
                          (a, b) =>
                            fromJSDate(a.scheduledStart).toMillis() -
                            fromJSDate(b.scheduledStart).toMillis(),
                        )
                        .map((meeting) => {
                          const startTime = fromJSDate(meeting.scheduledStart);
                          return (
                            <div
                              key={meeting.id}
                              className="p-2 bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500 rounded-r text-xs"
                            >
                              <div className="font-medium text-gray-900 dark:text-white truncate">
                                {meeting.title}
                              </div>
                              <div className="text-gray-500 dark:text-gray-400">
                                {startTime.toFormat("HH:mm")}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Legend</h3>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-100 dark:bg-green-900/30 border-l-2 border-green-500 rounded-r" />
            <span className="text-gray-600 dark:text-gray-400">In Person</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-indigo-100 dark:bg-indigo-900/30 border-l-2 border-indigo-500 rounded-r" />
            <span className="text-gray-600 dark:text-gray-400">Phone</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-amber-100 dark:bg-amber-900/30 border-l-2 border-amber-500 rounded-r" />
            <span className="text-gray-600 dark:text-gray-400">Video</span>
          </div>
          <div className="border-l border-gray-300 dark:border-slate-600 mx-2" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-gray-600 dark:text-gray-400">Scheduled</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="text-gray-600 dark:text-gray-400">In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-gray-600 dark:text-gray-400">Completed</span>
          </div>
        </div>
      </div>
    </div>
  );
}
