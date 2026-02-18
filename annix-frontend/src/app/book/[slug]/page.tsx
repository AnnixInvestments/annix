"use client";

import { DateTime } from "luxon";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { type AvailableSlot, type CustomQuestion } from "@/app/lib/api/annixRepApi";
import { useBookingAvailability, useBookSlot, usePublicBookingLink } from "@/app/lib/query/hooks";

function formatTime(isoTime: string): string {
  return DateTime.fromISO(isoTime).toFormat("HH:mm");
}

function formatDay(date: DateTime): string {
  return date.toFormat("ccc d");
}

export default function PublicBookingPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    notes: string;
    customAnswers: Record<string, string>;
  }>({
    name: "",
    email: "",
    notes: "",
    customAnswers: {},
  });

  const {
    data: bookingLink,
    isLoading: linkLoading,
    error: linkError,
  } = usePublicBookingLink(slug);
  const { data: slots, isLoading: slotsLoading } = useBookingAvailability(slug, selectedDate ?? "");
  const bookSlotMutation = useBookSlot();

  const availableDates = (): DateTime[] => {
    if (!bookingLink) return [];
    const dates: DateTime[] = [];
    const today = DateTime.now().startOf("day");
    const maxDate = today.plus({ days: bookingLink.maxDaysAhead });
    const availableDaysSet = new Set(
      bookingLink.availableDays.split(",").map((d) => parseInt(d, 10)),
    );

    let current = today;
    while (current <= maxDate) {
      const dayOfWeek = current.weekday % 7;
      if (availableDaysSet.has(dayOfWeek)) {
        dates.push(current);
      }
      current = current.plus({ days: 1 });
    }
    return dates;
  };

  const handleDateSelect = (date: DateTime) => {
    setSelectedDate(date.toISODate() ?? null);
    setSelectedSlot(null);
  };

  const handleSlotSelect = (slot: AvailableSlot) => {
    setSelectedSlot(slot);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;

    try {
      const result = await bookSlotMutation.mutateAsync({
        slug,
        dto: {
          startTime: selectedSlot.startTime,
          name: formData.name,
          email: formData.email,
          notes: formData.notes || undefined,
          customAnswers:
            Object.keys(formData.customAnswers).length > 0 ? formData.customAnswers : undefined,
        },
      });
      router.push(`/book/${slug}/confirm?meetingId=${result.meetingId}`);
    } catch {
      alert("Failed to book the meeting. Please try again.");
    }
  };

  if (linkLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (linkError || !bookingLink) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Link Not Found</h1>
          <p className="text-gray-600">
            This booking link is no longer available or does not exist.
          </p>
        </div>
      </div>
    );
  }

  const dates = availableDates();

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-blue-600 px-6 py-8 text-white">
            <h1 className="text-2xl font-bold mb-2">{bookingLink.name}</h1>
            <p className="text-blue-100">
              {bookingLink.meetingDurationMinutes} minutes with {bookingLink.hostName}
            </p>
            {bookingLink.description && (
              <p className="mt-4 text-sm text-blue-100">{bookingLink.description}</p>
            )}
          </div>

          <div className="p-6">
            {!selectedSlot ? (
              <>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Select a Date & Time</h2>

                <div className="grid grid-cols-7 gap-2 mb-6">
                  {dates.slice(0, 14).map((date) => (
                    <button
                      key={date.toISODate()}
                      onClick={() => handleDateSelect(date)}
                      className={`p-3 rounded-lg text-center text-sm transition-colors ${
                        selectedDate === date.toISODate()
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {formatDay(date)}
                    </button>
                  ))}
                </div>

                {selectedDate && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">
                      Available Times for {DateTime.fromISO(selectedDate).toFormat("MMMM d, yyyy")}
                    </h3>
                    {slotsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                      </div>
                    ) : slots && slots.length > 0 ? (
                      <div className="grid grid-cols-4 gap-2">
                        {slots.map((slot) => (
                          <button
                            key={slot.startTime}
                            onClick={() => handleSlotSelect(slot)}
                            className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                          >
                            {formatTime(slot.startTime)}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">
                        No available times for this date.
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Selected Time</p>
                      <p className="font-semibold text-gray-900">
                        {DateTime.fromISO(selectedSlot.startTime).toFormat("cccc, MMMM d, yyyy")} at{" "}
                        {formatTime(selectedSlot.startTime)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedSlot(null)}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Change
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Details</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Your full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="your@email.com"
                    />
                  </div>

                  {bookingLink.customQuestions?.map((q: CustomQuestion) => (
                    <div key={q.id}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {q.label} {q.required && "*"}
                      </label>
                      {q.type === "textarea" ? (
                        <textarea
                          required={q.required}
                          value={formData.customAnswers[q.id] || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              customAnswers: {
                                ...formData.customAnswers,
                                [q.id]: e.target.value,
                              },
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          rows={3}
                        />
                      ) : q.type === "select" && q.options ? (
                        <select
                          required={q.required}
                          value={formData.customAnswers[q.id] || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              customAnswers: {
                                ...formData.customAnswers,
                                [q.id]: e.target.value,
                              },
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select an option</option>
                          {q.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          required={q.required}
                          value={formData.customAnswers[q.id] || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              customAnswers: {
                                ...formData.customAnswers,
                                [q.id]: e.target.value,
                              },
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      )}
                    </div>
                  ))}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Additional Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                      placeholder="Anything you'd like to share before the meeting"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={bookSlotMutation.isPending}
                  className="mt-6 w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bookSlotMutation.isPending ? "Booking..." : "Confirm Booking"}
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-gray-500">
          Meeting type: {bookingLink.meetingType.replace("_", " ")}
          {bookingLink.location && ` | Location: ${bookingLink.location}`}
        </p>
      </div>
    </div>
  );
}
