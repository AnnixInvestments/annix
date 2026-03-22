"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { InspectionBooking } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { DateTime, formatDateZA } from "@/app/lib/datetime";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function InspectionCalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(DateTime.now().startOf("month"));
  const [bookings, setBookings] = useState<InspectionBooking[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadBookings = useCallback(async (month: DateTime) => {
    try {
      setIsLoading(true);
      const startDate = month.startOf("month").toISODate() || "";
      const endDate = month.endOf("month").toISODate() || "";
      const result = await stockControlApiClient.inspectionBookingsForRange(startDate, endDate);
      setBookings(result);
    } catch {
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings(currentMonth);
  }, [currentMonth, loadBookings]);

  const calendarDays = useMemo(() => {
    const firstDay = currentMonth.startOf("month");
    const lastDay = currentMonth.endOf("month");
    const startWeekday = firstDay.weekday;
    const days: Array<{ date: DateTime; isCurrentMonth: boolean }> = [];

    const paddingStart = startWeekday - 1;
    Array.from({ length: paddingStart }).forEach((_, i) => {
      days.push({
        date: firstDay.minus({ days: paddingStart - i }),
        isCurrentMonth: false,
      });
    });

    const daysInMonth = lastDay.day;
    Array.from({ length: daysInMonth }).forEach((_, i) => {
      days.push({
        date: firstDay.plus({ days: i }),
        isCurrentMonth: true,
      });
    });

    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      Array.from({ length: remaining }).forEach((_, i) => {
        days.push({
          date: lastDay.plus({ days: i + 1 }),
          isCurrentMonth: false,
        });
      });
    }

    return days;
  }, [currentMonth]);

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, InspectionBooking[]>();
    bookings.forEach((b) => {
      const existing = map.get(b.inspectionDate) || [];
      map.set(b.inspectionDate, [...existing, b]);
    });
    return map;
  }, [bookings]);

  const selectedBookings = selectedDate ? bookingsByDate.get(selectedDate) || [] : [];

  const today = DateTime.now().toISODate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Inspection Calendar</h1>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <button
            onClick={() => setCurrentMonth(currentMonth.minus({ months: 1 }))}
            className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
          >
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-gray-900">
            {currentMonth.toFormat("MMMM yyyy")}
          </h2>
          <button
            onClick={() => setCurrentMonth(currentMonth.plus({ months: 1 }))}
            className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
          >
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
          </div>
        ) : (
          <div className="p-4">
            <div className="grid grid-cols-7 gap-px mb-1">
              {WEEKDAYS.map((day) => (
                <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
              {calendarDays.map((day) => {
                const dateStr = day.date.toISODate() || "";
                const dayBookings = bookingsByDate.get(dateStr) || [];
                const activeBookings = dayBookings.filter((b) => b.status !== "cancelled");
                const isToday = dateStr === today;
                const isSelected = dateStr === selectedDate;

                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr === selectedDate ? null : dateStr)}
                    className={`bg-white p-2 min-h-[80px] text-left transition-colors hover:bg-gray-50 ${
                      !day.isCurrentMonth ? "opacity-40" : ""
                    } ${isSelected ? "ring-2 ring-teal-500 ring-inset" : ""}`}
                  >
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 text-xs rounded-full ${
                        isToday ? "bg-teal-600 text-white font-bold" : "text-gray-700 font-medium"
                      }`}
                    >
                      {day.date.day}
                    </span>
                    {activeBookings.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {activeBookings.slice(0, 2).map((b) => (
                          <div
                            key={b.id}
                            className={`text-[10px] px-1 py-0.5 rounded truncate ${
                              b.status === "completed"
                                ? "bg-green-100 text-green-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {b.startTime} - {b.endTime}
                          </div>
                        ))}
                        {activeBookings.length > 2 && (
                          <div className="text-[10px] text-gray-500 px-1">
                            +{activeBookings.length - 2} more
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {selectedDate && (
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">
              Inspections for {formatDateZA(selectedDate)}
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {selectedBookings.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-gray-500">
                No inspections booked for this date.
              </div>
            ) : (
              selectedBookings.map((booking) => (
                <div key={booking.id} className="px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-sm font-medium text-gray-900">
                      {booking.startTime} - {booking.endTime}
                    </div>
                    <div>
                      <Link
                        href={`/stock-control/portal/job-cards/${booking.jobCardId}`}
                        className="text-sm font-medium text-teal-600 hover:text-teal-700"
                      >
                        {(booking as any).jobCard?.jobNumber || `JC #${booking.jobCardId}`}
                      </Link>
                      <p className="text-xs text-gray-500">
                        {booking.inspectorEmail}
                        {booking.inspectorName ? ` (${booking.inspectorName})` : ""}
                      </p>
                      {booking.notes && (
                        <p className="text-xs text-gray-400 mt-0.5">{booking.notes}</p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                      booking.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : booking.status === "cancelled"
                          ? "bg-red-100 text-red-800"
                          : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {booking.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
