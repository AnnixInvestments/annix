"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/app/components/Toast";
import { DateInput } from "@/app/components/ui/DateInput";
import { fromISO } from "@/app/lib/datetime";

import { useOrbitCreateInterviewSlot } from "@/app/lib/query/hooks";

const GoogleMapLocationPicker = dynamic(() => import("@/app/components/GoogleMapLocationPicker"), {
  ssr: false,
  loading: () => <div className="w-full h-64 rounded-lg bg-gray-100 animate-pulse" />,
});

const rawMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const GOOGLE_MAPS_API_KEY = rawMapsKey || "";

interface CreateInterviewSlotModalProps {
  jobPostingId: number;
  onClose: () => void;
}

export function CreateInterviewSlotModal(props: CreateInterviewSlotModalProps) {
  const { jobPostingId, onClose } = props;
  const { showToast } = useToast();
  const createSlot = useOrbitCreateInterviewSlot();

  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("09:30");
  const [locationLabel, setLocationLabel] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [capacity, setCapacity] = useState(1);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const handleLocationSelect = (
    location: { lat: number; lng: number },
    addressComponents?: { address: string; region: string; country: string },
  ) => {
    setLocationLat(location.lat);
    setLocationLng(location.lng);
    if (addressComponents) {
      setLocationAddress(addressComponents.address);
    }
    setShowLocationPicker(false);
  };

  const buildIso = (timePart: string): string | null => {
    if (!date) return null;
    const combined = `${date}T${timePart}:00`;
    const parsed = fromISO(combined);
    if (!parsed.isValid) return null;
    return parsed.toISO();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!date) {
      setError("Pick a date for this slot.");
      return;
    }
    const startIso = buildIso(startTime);
    const endIso = buildIso(endTime);
    if (!startIso || !endIso) {
      setError("Couldn't parse the start/end times.");
      return;
    }
    if (fromISO(endIso).toMillis() <= fromISO(startIso).toMillis()) {
      setError("End time must be after start time.");
      return;
    }

    createSlot.mutate(
      {
        jobPostingId,
        input: {
          startsAt: startIso,
          endsAt: endIso,
          locationLabel: locationLabel || null,
          locationAddress: locationAddress || null,
          locationLat,
          locationLng,
          capacity,
          notes: notes || null,
        },
      },
      {
        onSuccess: () => {
          showToast("Slot added.", "success");
          onClose();
        },
        onError: (err) => {
          const msg = err instanceof Error ? err.message : "Couldn't create slot";
          setError(msg);
        },
      },
    );
  };

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9999] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <div className="px-6 py-4 border-b border-[#e0e0f5] flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">New interview slot</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
              aria-label="Close"
            >
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

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error ? (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            ) : null}

            <div>
              <label htmlFor="slot-date" className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <DateInput
                id="slot-date"
                value={date}
                onChange={(value) => setDate(value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9999d6] focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="slot-start"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Starts
                </label>
                <input
                  id="slot-start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9999d6] focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="slot-end" className="block text-sm font-medium text-gray-700 mb-1">
                  Ends
                </label>
                <input
                  id="slot-end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9999d6] focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label htmlFor="slot-label" className="block text-sm font-medium text-gray-700 mb-1">
                Location label{" "}
                <span className="text-gray-400 text-xs">(optional, e.g. "Boardroom 2")</span>
              </label>
              <input
                id="slot-label"
                type="text"
                value={locationLabel}
                onChange={(e) => setLocationLabel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9999d6] focus:border-transparent"
                placeholder="Boardroom 2"
              />
            </div>

            <div>
              <label
                htmlFor="slot-address"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Address <span className="text-gray-400 text-xs">(optional)</span>
              </label>
              <div className="flex gap-2">
                <input
                  id="slot-address"
                  type="text"
                  value={locationAddress}
                  onChange={(e) => setLocationAddress(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9999d6] focus:border-transparent"
                  placeholder="123 Main Rd, Sandton"
                />
                {GOOGLE_MAPS_API_KEY ? (
                  <button
                    type="button"
                    onClick={() => setShowLocationPicker(true)}
                    className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 whitespace-nowrap"
                  >
                    Pick on map
                  </button>
                ) : null}
              </div>
              {locationLat !== null && locationLng !== null ? (
                <p className="text-xs text-gray-500 mt-1">
                  Pin: {locationLat.toFixed(5)}, {locationLng.toFixed(5)}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="slot-capacity"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Capacity{" "}
                <span className="text-gray-400 text-xs">
                  (1 = single candidate; raise for assessment days)
                </span>
              </label>
              <input
                id="slot-capacity"
                type="number"
                min={1}
                max={20}
                value={capacity}
                onChange={(e) => setCapacity(Math.max(1, Number(e.target.value) || 1))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9999d6] focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="slot-notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes <span className="text-gray-400 text-xs">(optional)</span>
              </label>
              <textarea
                id="slot-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9999d6] focus:border-transparent"
                placeholder="Bring a copy of your CV. Reception on the 4th floor."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createSlot.isPending}
                className="px-4 py-2 text-sm bg-[#323288] text-white rounded-lg hover:bg-[#252560] disabled:opacity-50"
              >
                {createSlot.isPending ? "Creating…" : "Create slot"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {showLocationPicker ? (
        <GoogleMapLocationPicker
          apiKey={GOOGLE_MAPS_API_KEY}
          initialLocation={
            locationLat !== null && locationLng !== null
              ? { lat: locationLat, lng: locationLng }
              : undefined
          }
          onLocationSelect={handleLocationSelect}
          onClose={() => setShowLocationPicker(false)}
          config="responsive"
        />
      ) : null}
    </>,
    document.body,
  );
}
