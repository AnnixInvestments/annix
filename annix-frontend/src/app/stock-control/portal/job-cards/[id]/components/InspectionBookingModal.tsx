"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { InspectionBooking } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { DateTime, formatDateZA } from "@/app/lib/datetime";

interface InspectionBookingModalProps {
  jobCardId: number;
  jobNumber: string;
  onClose: () => void;
  onBooked: () => void;
  onSkipped: () => void;
}

const TIME_SLOTS = Array.from({ length: 25 }, (_, i) => {
  const hour = Math.floor(i / 2) + 6;
  const minute = i % 2 === 0 ? "00" : "30";
  return `${String(hour).padStart(2, "0")}:${minute}`;
});

const MAX_DURATION_SLOTS = 6;

export function InspectionBookingModal(props: InspectionBookingModalProps) {
  const jobCardId = props.jobCardId;
  const jobNumber = props.jobNumber;
  const onClose = props.onClose;
  const onBooked = props.onBooked;
  const onSkipped = props.onSkipped;

  const [selectedDate, setSelectedDate] = useState(
    DateTime.now().plus({ days: 1 }).toISODate() || "",
  );
  const [startSlot, setStartSlot] = useState<string | null>(null);
  const [endSlot, setEndSlot] = useState<string | null>(null);
  const [inspectorEmail, setInspectorEmail] = useState("");
  const [inspectorName, setInspectorName] = useState("");
  const [notes, setNotes] = useState("");
  const [bookedSlots, setBookedSlots] = useState<InspectionBooking[]>([]);
  const [existingBookings, setExistingBookings] = useState<InspectionBooking[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"form" | "existing">("form");

  const loadBookedSlots = useCallback(async (date: string) => {
    try {
      const slots = await stockControlApiClient.bookedSlotsForDate(date);
      setBookedSlots(slots);
    } catch {
      setBookedSlots([]);
    }
  }, []);

  const loadExistingBookings = useCallback(async () => {
    try {
      const bookings = await stockControlApiClient.inspectionBookingsForJobCard(jobCardId);
      setExistingBookings(bookings);
    } catch {
      setExistingBookings([]);
    }
  }, [jobCardId]);

  useEffect(() => {
    if (selectedDate) {
      loadBookedSlots(selectedDate);
    }
  }, [selectedDate, loadBookedSlots]);

  useEffect(() => {
    loadExistingBookings();
  }, [loadExistingBookings]);

  const occupiedSlots = useMemo(() => {
    const occupied = new Set<string>();
    bookedSlots.forEach((booking) => {
      TIME_SLOTS.forEach((slot) => {
        if (slot >= booking.startTime && slot < booking.endTime) {
          occupied.add(slot);
        }
      });
    });
    return occupied;
  }, [bookedSlots]);

  const validEndSlots = useMemo(() => {
    if (!startSlot) return [];
    const startIdx = TIME_SLOTS.indexOf(startSlot);
    if (startIdx === -1) return [];
    const maxIdx = Math.min(startIdx + MAX_DURATION_SLOTS, TIME_SLOTS.length - 1);
    const ends: string[] = [];
    for (let i = startIdx + 1; i <= maxIdx; i++) {
      const slot = TIME_SLOTS[i];
      const prevSlot = TIME_SLOTS[i - 1];
      if (occupiedSlots.has(prevSlot) && prevSlot !== startSlot) break;
      if (occupiedSlots.has(slot) && i < maxIdx) {
        ends.push(slot);
        break;
      }
      ends.push(slot);
    }
    return ends;
  }, [startSlot, occupiedSlots]);

  const handleStartSelect = (slot: string) => {
    if (occupiedSlots.has(slot)) return;
    setStartSlot(slot);
    setEndSlot(null);
  };

  const handleEndSelect = (slot: string) => {
    setEndSlot(slot);
  };

  const activeBookings = existingBookings.filter((b) => b.status !== "cancelled");

  const canSubmit =
    selectedDate && startSlot && endSlot && inspectorEmail.includes("@") && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit || !startSlot || !endSlot) return;
    try {
      setIsSubmitting(true);
      setError(null);
      await stockControlApiClient.createInspectionBooking(jobCardId, {
        inspectionDate: selectedDate,
        startTime: startSlot,
        endTime: endSlot,
        inspectorEmail,
        inspectorName: inspectorName || undefined,
        notes: notes || undefined,
      });
      onBooked();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to book inspection");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    try {
      setIsSkipping(true);
      setError(null);
      await stockControlApiClient.completeBackgroundStep(
        jobCardId,
        "book_3rd_party_inspections",
        "Skipped — 3rd party inspection not required",
      );
      onSkipped();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to skip inspection");
    } finally {
      setIsSkipping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-md">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              3rd Party Inspection — {jobNumber}
            </h3>
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => setView("form")}
                className={`text-xs font-medium px-2 py-0.5 rounded ${view === "form" ? "bg-teal-100 text-teal-800" : "text-gray-500 hover:text-gray-700"}`}
              >
                Book New
              </button>
              {activeBookings.length > 0 && (
                <button
                  onClick={() => setView("existing")}
                  className={`text-xs font-medium px-2 py-0.5 rounded ${view === "existing" ? "bg-teal-100 text-teal-800" : "text-gray-500 hover:text-gray-700"}`}
                >
                  Existing ({activeBookings.length})
                </button>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
            <button onClick={() => setError(null)} className="ml-2 font-medium underline">
              Dismiss
            </button>
          </div>
        )}

        {view === "existing" ? (
          <div className="px-6 py-4 space-y-3">
            {activeBookings.map((booking) => (
              <div
                key={booking.id}
                className={`rounded-lg border p-3 ${booking.status === "completed" ? "border-green-200 bg-green-50" : "border-blue-200 bg-blue-50"}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDateZA(booking.inspectionDate)} &middot; {booking.startTime} -{" "}
                      {booking.endTime}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {booking.inspectorEmail}
                      {booking.inspectorName ? ` (${booking.inspectorName})` : ""}
                    </p>
                    {booking.notes && (
                      <p className="text-xs text-gray-500 mt-0.5">{booking.notes}</p>
                    )}
                  </div>
                  <span
                    className={`px-2 py-0.5 text-xs font-semibold rounded-full ${booking.status === "completed" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}`}
                  >
                    {booking.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Inspection Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setStartSlot(null);
                  setEndSlot(null);
                }}
                min={DateTime.now().toISODate() || ""}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-teal-500"
              />
            </div>

            {selectedDate && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <div className="grid grid-cols-6 gap-1">
                  {TIME_SLOTS.slice(0, -1).map((slot) => {
                    const isOccupied = occupiedSlots.has(slot);
                    const isSelected = slot === startSlot;
                    return (
                      <button
                        key={slot}
                        onClick={() => handleStartSelect(slot)}
                        disabled={isOccupied}
                        className={`px-1 py-1.5 text-xs rounded transition-colors ${
                          isSelected
                            ? "bg-teal-600 text-white"
                            : isOccupied
                              ? "bg-red-100 text-red-400 cursor-not-allowed line-through"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {startSlot && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time (max 3 hours)
                </label>
                <div className="flex flex-wrap gap-1">
                  {validEndSlots.map((slot) => {
                    const isSelected = slot === endSlot;
                    const startIdx = TIME_SLOTS.indexOf(startSlot);
                    const slotIdx = TIME_SLOTS.indexOf(slot);
                    const durationMins = (slotIdx - startIdx) * 30;
                    return (
                      <button
                        key={slot}
                        onClick={() => handleEndSelect(slot)}
                        className={`px-3 py-1.5 text-xs rounded transition-colors ${
                          isSelected
                            ? "bg-teal-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {slot} ({durationMins}min)
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Inspector Email
                </label>
                <input
                  type="email"
                  value={inspectorEmail}
                  onChange={(e) => setInspectorEmail(e.target.value)}
                  placeholder="inspector@example.com"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Inspector Name (optional)
                </label>
                <input
                  type="text"
                  value={inspectorName}
                  onChange={(e) => setInspectorName(e.target.value)}
                  placeholder="John Smith"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Any special requirements..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-teal-500"
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            onClick={handleSkip}
            disabled={isSkipping}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition-colors"
          >
            {isSkipping ? "Skipping..." : "Skip 3rd Party Inspection"}
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
            {view === "form" && (
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="px-4 py-2 text-sm font-medium rounded-md bg-teal-600 text-white hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? "Booking..." : "Book Inspection"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
