"use client";

import { useJsApiLoader } from "@react-google-maps/api";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type {
  NixCalendarAdvisoryConflict,
  SeekerInterviewBooking,
} from "@/app/lib/api/annixOrbitApi";
import { DateTime, formatDateLongZA, formatTimeZA, fromISO, now } from "@/app/lib/datetime";
import {
  useOrbitCalendarAdvisory,
  useOrbitMyInterviewBookings,
  useOrbitMyInterviewInvites,
} from "@/app/lib/query/hooks";
import { CalendarSyncButton } from "./components/CalendarSyncButton";
import { InterviewCalendar, type InterviewCalendarPrefill } from "./components/InterviewCalendar";

type LibraryName = "places";
const libraries: LibraryName[] = ["places"];

const rawMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const GOOGLE_MAPS_API_KEY = rawMapsKey || "";
const MAPS_CONFIGURED = GOOGLE_MAPS_API_KEY !== "";

const TRAVEL_BUFFER_MINUTES = 15;
const CALENDAR_DAY_PAGE_SIZE = 14;

interface BookingConflict {
  bookingId: number;
  type: "overlap" | "insufficient-travel";
  message: string;
}

interface MatrixRequest {
  fromBookingId: number;
  toBookingId: number;
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
}

const sameDay = (a: string, b: string): boolean => {
  return fromISO(a).toISODate() === fromISO(b).toISODate();
};

const minutesBetween = (laterIso: string, earlierIso: string): number => {
  return (fromISO(laterIso).toMillis() - fromISO(earlierIso).toMillis()) / 60000;
};

const slotStartMillis = (booking: SeekerInterviewBooking): number => {
  const slot = booking.slot;
  return slot ? fromISO(slot.startsAt).toMillis() : 0;
};

const buildMatrixRequests = (bookings: SeekerInterviewBooking[]): MatrixRequest[] => {
  const sorted = [...bookings].sort((a, b) => slotStartMillis(a) - slotStartMillis(b));

  return sorted.reduce<MatrixRequest[]>((acc, prev, i) => {
    if (i === sorted.length - 1) return acc;
    const next = sorted[i + 1];
    const prevSlot = prev.slot;
    const nextSlot = next.slot;
    if (!prevSlot || !nextSlot) return acc;
    if (!sameDay(prevSlot.startsAt, nextSlot.startsAt)) return acc;
    const prevLat = prevSlot.locationLat;
    const prevLng = prevSlot.locationLng;
    const nextLat = nextSlot.locationLat;
    const nextLng = nextSlot.locationLng;
    if (prevLat === null || prevLng === null || nextLat === null || nextLng === null) return acc;
    acc.push({
      fromBookingId: prev.id,
      toBookingId: next.id,
      origin: { lat: prevLat, lng: prevLng },
      destination: { lat: nextLat, lng: nextLng },
    });
    return acc;
  }, []);
};

export default function SeekerCalendarPage() {
  const bookingsQuery = useOrbitMyInterviewBookings();
  const invitesQuery = useOrbitMyInterviewInvites();
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY || "placeholder",
    libraries,
  });

  const [travelMinutesByPair, setTravelMinutesByPair] = useState<Record<string, number | null>>({});
  const [travelCheckFailed, setTravelCheckFailed] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [prefill, setPrefill] = useState<InterviewCalendarPrefill | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const newInterviewFor = params.get("newInterviewFor");
    if (!newInterviewFor) return;
    const parsedId = Number.parseInt(newInterviewFor, 10);
    setPrefill({
      applyClickId: Number.isFinite(parsedId) ? parsedId : null,
      companyName: params.get("company"),
      roleTitle: params.get("role"),
    });
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  const allBookings = useMemo(() => {
    const data = bookingsQuery.data;
    return data ? data : [];
  }, [bookingsQuery.data]);

  const upcomingBookings = useMemo(() => {
    const cutoff = now().toMillis();
    return allBookings.filter((b) => {
      const slot = b.slot;
      if (!slot) return false;
      return fromISO(slot.startsAt).toMillis() >= cutoff;
    });
  }, [allBookings]);

  const pastBookings = useMemo(() => {
    const cutoff = now().toMillis();
    return allBookings
      .filter((b) => {
        const slot = b.slot;
        if (!slot) return false;
        return fromISO(slot.startsAt).toMillis() < cutoff;
      })
      .sort((a, b) => slotStartMillis(b) - slotStartMillis(a));
  }, [allBookings]);

  const travelChecksApplicable = useMemo(
    () => buildMatrixRequests(upcomingBookings).length > 0,
    [upcomingBookings],
  );

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) return;
    if (!isLoaded || upcomingBookings.length < 2) return;
    if (!window.google) return;

    const requests = buildMatrixRequests(upcomingBookings);
    if (requests.length === 0) return;

    const origins = requests.map((r) => r.origin);
    const destinations = requests.map((r) => r.destination);

    const service = new window.google.maps.DistanceMatrixService();
    service.getDistanceMatrix(
      {
        origins,
        destinations,
        travelMode: window.google.maps.TravelMode.DRIVING,
        unitSystem: window.google.maps.UnitSystem.METRIC,
      },
      (response, status) => {
        if (status !== "OK" || !response) {
          console.warn(`Distance Matrix request failed with status "${status}"`);
          setTravelCheckFailed(true);
          return;
        }
        setTravelCheckFailed(false);
        const updates: Record<string, number | null> = {};
        requests.forEach((req, originIdx) => {
          const row = response.rows[originIdx];
          if (!row) return;
          const cell = row.elements[originIdx];
          if (!cell || cell.status !== "OK" || !cell.duration) {
            updates[`${req.fromBookingId}-${req.toBookingId}`] = null;
            return;
          }
          updates[`${req.fromBookingId}-${req.toBookingId}`] = Math.round(cell.duration.value / 60);
        });
        setTravelMinutesByPair((prev) => ({ ...prev, ...updates }));
      },
    );
  }, [isLoaded, upcomingBookings]);

  const conflicts = useMemo<BookingConflict[]>(() => {
    const sorted = [...upcomingBookings].sort((a, b) => slotStartMillis(a) - slotStartMillis(b));
    return sorted.reduce<BookingConflict[]>((out, prev, i) => {
      if (i === sorted.length - 1) return out;
      const next = sorted[i + 1];
      const prevSlot = prev.slot;
      const nextSlot = next.slot;
      if (!prevSlot || !nextSlot) return out;
      if (!sameDay(prevSlot.startsAt, nextSlot.startsAt)) return out;

      const gap = minutesBetween(nextSlot.startsAt, prevSlot.endsAt);
      if (gap < 0) {
        out.push({
          bookingId: next.id,
          type: "overlap",
          message: `This interview overlaps with your earlier one ending at ${formatTimeZA(prevSlot.endsAt)}.`,
        });
        return out;
      }
      const travelMin = travelMinutesByPair[`${prev.id}-${next.id}`];
      if (travelMin != null) {
        const required = travelMin + TRAVEL_BUFFER_MINUTES;
        if (gap < required) {
          out.push({
            bookingId: next.id,
            type: "insufficient-travel",
            message: `Driving from your ${formatTimeZA(prevSlot.endsAt)} interview takes around ${travelMin} min — you only have ${Math.max(0, Math.round(gap))} min before this one. Consider asking for a different time.`,
          });
        }
      }
      return out;
    }, []);
  }, [upcomingBookings, travelMinutesByPair]);

  const conflictsByBooking = useMemo(() => {
    return conflicts.reduce<Map<number, BookingConflict[]>>((map, c) => {
      const existing = map.get(c.bookingId);
      const list = existing ? existing : [];
      list.push(c);
      map.set(c.bookingId, list);
      return map;
    }, new Map());
  }, [conflicts]);

  const advisoryMutation = useOrbitCalendarAdvisory();
  const [nixMessageByBookingId, setNixMessageByBookingId] = useState<Record<number, string>>({});

  const advisoryPayload = useMemo<NixCalendarAdvisoryConflict[]>(() => {
    const sorted = [...upcomingBookings].sort((a, b) => slotStartMillis(a) - slotStartMillis(b));
    return sorted.reduce<NixCalendarAdvisoryConflict[]>((acc, prev, i) => {
      if (i === sorted.length - 1) return acc;
      const next = sorted[i + 1];
      const prevSlot = prev.slot;
      const nextSlot = next.slot;
      if (!prevSlot || !nextSlot) return acc;
      if (!sameDay(prevSlot.startsAt, nextSlot.startsAt)) return acc;
      const gap = minutesBetween(nextSlot.startsAt, prevSlot.endsAt);
      const travelMin = travelMinutesByPair[`${prev.id}-${next.id}`];
      const isOverlap = gap < 0;
      const insufficient =
        !isOverlap && travelMin != null && gap < travelMin + TRAVEL_BUFFER_MINUTES;
      if (!isOverlap && !insufficient) return acc;
      acc.push({
        bookingId: next.id,
        type: isOverlap ? "overlap" : "insufficient-travel",
        prevSlot: {
          endsAt: prevSlot.endsAt,
          locationLabel: prevSlot.locationLabel,
          locationAddress: prevSlot.locationAddress,
        },
        nextSlot: {
          startsAt: nextSlot.startsAt,
          endsAt: nextSlot.endsAt,
          locationLabel: nextSlot.locationLabel,
          locationAddress: nextSlot.locationAddress,
        },
        travelMinutes: travelMin == null ? null : travelMin,
        gapMinutes: gap,
      });
      return acc;
    }, []);
  }, [upcomingBookings, travelMinutesByPair]);

  const advisoryKey = useMemo(
    () =>
      advisoryPayload
        .map((c) => {
          const travel = c.travelMinutes;
          const travelStr = travel === null ? "null" : String(travel);
          return `${c.bookingId}:${c.type}:${travelStr}:${Math.round(c.gapMinutes)}`;
        })
        .join("|"),
    [advisoryPayload],
  );

  const advisoryMutate = advisoryMutation.mutate;
  useEffect(() => {
    if (advisoryPayload.length === 0) {
      setNixMessageByBookingId({});
      return;
    }
    advisoryMutate(advisoryPayload, {
      onSuccess: (response) => {
        const next = response.advisories.reduce<Record<number, string>>((acc, a) => {
          acc[a.bookingId] = a.message;
          return acc;
        }, {});
        setNixMessageByBookingId(next);
      },
    });
  }, [advisoryKey, advisoryMutate, advisoryPayload]);

  const bookingsByDay = useMemo(() => {
    const grouped = upcomingBookings.reduce<Map<string, SeekerInterviewBooking[]>>((map, b) => {
      const slot = b.slot;
      if (!slot) return map;
      const isoDate = fromISO(slot.startsAt).toISODate();
      const dayKey = isoDate ? isoDate : "";
      const existing = map.get(dayKey);
      const list = existing ? existing : [];
      list.push(b);
      map.set(dayKey, list);
      return map;
    }, new Map());
    Array.from(grouped.values()).forEach((list) => {
      list.sort((a, b) => slotStartMillis(a) - slotStartMillis(b));
    });
    return grouped;
  }, [upcomingBookings]);

  const sortedDayKeys = useMemo(() => {
    return Array.from(bookingsByDay.keys()).sort((a, b) =>
      DateTime.fromISO(a).toMillis() < DateTime.fromISO(b).toMillis() ? -1 : 1,
    );
  }, [bookingsByDay]);

  const [visibleDayCount, setVisibleDayCount] = useState(CALENDAR_DAY_PAGE_SIZE);
  const visibleDayKeys = sortedDayKeys.slice(0, visibleDayCount);
  const hasMoreDays = sortedDayKeys.length > visibleDayCount;
  const handleShowMoreDays = () =>
    setVisibleDayCount((current) => current + CALENDAR_DAY_PAGE_SIZE);

  const invitesData = invitesQuery.data;
  const allInvites = invitesData ? invitesData : [];
  const openInvites = allInvites.filter((i) => i.usedAt === null);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">My interviews</h1>
          <p className="text-white/70 mt-1 text-sm">
            Every upcoming interview across the companies you've applied to.
          </p>
        </div>
        <CalendarSyncButton />
      </div>

      {openInvites.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-[var(--brand-navbar-100,#e0e0f5)] p-4 space-y-2">
          <p className="text-sm font-semibold text-gray-900">
            Open invitations ({openInvites.length})
          </p>
          <ul className="space-y-2">
            {openInvites.map((invite) => {
              const job = invite.jobPosting;
              const title = job ? job.title : "An employer";
              const expiryLabel = invite.expiresAt ? formatDateLongZA(invite.expiresAt) : null;
              return (
                <li
                  key={invite.id}
                  className="flex flex-wrap items-center justify-between gap-3 text-sm"
                >
                  <span className="text-gray-700">
                    {title}
                    {expiryLabel ? (
                      <span className="text-gray-500"> — reply by {expiryLabel}</span>
                    ) : null}
                  </span>
                  <Link
                    href={`/annix/orbit/interview-booking/${invite.token}`}
                    className="text-xs font-semibold px-3 py-1.5 bg-[var(--brand-accent,#FF8A00)] text-[var(--brand-grad-from,#1a1a40)] rounded-lg hover:bg-[var(--brand-accent-light,#FF9C33)] whitespace-nowrap"
                  >
                    Pick a time
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <InterviewCalendar bookings={allBookings} prefill={prefill} />

      {!MAPS_CONFIGURED && travelChecksApplicable ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          Travel-time checks between your same-day interviews are unavailable right now (maps aren't
          configured), so we can't warn you about tight gaps — please double-check travel times
          yourself.
        </div>
      ) : travelCheckFailed ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          We couldn't check travel times between your interviews just now. Refresh the page if you'd
          like us to try again.
        </div>
      ) : null}

      {bookingsQuery.isLoading ? (
        <div
          role="status"
          className="bg-white rounded-xl shadow-sm border border-[var(--brand-navbar-100,#e0e0f5)] p-8 text-center"
        >
          <div
            aria-hidden="true"
            className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--brand-navbar,#323288)] mx-auto"
          />
          <span className="sr-only">Loading your interviews…</span>
        </div>
      ) : bookingsQuery.isError ? (
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6 text-red-700 text-sm">
          We couldn't load your interviews right now. Please refresh the page.
        </div>
      ) : sortedDayKeys.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-[var(--brand-navbar-100,#e0e0f5)] p-6">
          <p className="text-sm text-gray-700">
            You have no interviews booked yet. When a company sends you an interview invitation,
            it'll show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleDayKeys.map((dayKey) => {
            const dayBookingsRaw = bookingsByDay.get(dayKey);
            const dayBookings = dayBookingsRaw ? dayBookingsRaw : [];
            const day = fromISO(dayKey);
            return (
              <div
                key={dayKey}
                className="bg-white rounded-xl shadow-sm border border-[var(--brand-navbar-100,#e0e0f5)] p-4 space-y-3"
              >
                <div className="flex items-baseline justify-between">
                  <h2 className="text-lg font-bold text-gray-900">{day.toFormat("EEEE d LLLL")}</h2>
                  <span className="text-xs text-gray-500">
                    {dayBookings.length} interview{dayBookings.length === 1 ? "" : "s"}
                  </span>
                </div>
                <ul className="space-y-3">
                  {dayBookings.map((booking) => {
                    const slot = booking.slot;
                    if (!slot) return null;
                    const job = slot.jobPosting;
                    const title = job ? job.title : "Interview";
                    const ref = job ? job.referenceNumber : null;
                    const conflictsRaw = conflictsByBooking.get(booking.id);
                    const conflictsForBooking = conflictsRaw ? conflictsRaw : [];
                    const hasConflict = conflictsForBooking.length > 0;
                    return (
                      <li
                        key={booking.id}
                        className={`rounded-lg border p-3 ${
                          hasConflict ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-gray-900">
                              {formatTimeZA(slot.startsAt)} – {formatTimeZA(slot.endsAt)} · {title}
                              {ref ? (
                                <span className="ml-2 text-xs text-gray-500 font-normal">
                                  [{ref}]
                                </span>
                              ) : null}
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
                          </div>
                        </div>
                        {hasConflict ? (
                          <div className="mt-2 space-y-1">
                            <ConflictAdvisory
                              fallbackConflicts={conflictsForBooking}
                              nixMessage={nixMessageByBookingId[booking.id]}
                            />
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
          {hasMoreDays ? (
            <button
              type="button"
              onClick={handleShowMoreDays}
              className="w-full py-3 text-sm font-medium rounded-xl border border-[var(--brand-navbar-100,#e0e0f5)] bg-white text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Show more days ({visibleDayKeys.length} of {sortedDayKeys.length})
            </button>
          ) : null}
        </div>
      )}

      {pastBookings.length > 0 ? (
        <div>
          <button
            type="button"
            onClick={() => setShowPast((v) => !v)}
            aria-expanded={showPast}
            className="text-sm font-medium text-[var(--brand-navbar,#323288)] hover:text-[var(--brand-navbar-active,#252560)]"
          >
            {showPast ? "Hide" : "Show"} past interviews ({pastBookings.length})
          </button>
          {showPast ? (
            <ul className="mt-3 space-y-2">
              {pastBookings.map((booking) => {
                const slot = booking.slot;
                if (!slot) return null;
                const job = slot.jobPosting;
                const title = job ? job.title : "Interview";
                return (
                  <li
                    key={booking.id}
                    className="bg-white rounded-lg border border-gray-200 p-3 text-sm opacity-80"
                  >
                    <p className="font-semibold text-gray-700">
                      {formatDateLongZA(slot.startsAt)} · {formatTimeZA(slot.startsAt)} –{" "}
                      {formatTimeZA(slot.endsAt)} · {title}
                    </p>
                    {slot.locationLabel ? (
                      <p className="text-xs text-gray-500 mt-0.5">{slot.locationLabel}</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

interface ConflictAdvisoryProps {
  fallbackConflicts: BookingConflict[];
  nixMessage: string | undefined;
}

function ConflictAdvisory(props: ConflictAdvisoryProps) {
  const message = props.nixMessage;
  if (message) {
    return (
      <p className="text-xs text-red-800 font-medium">
        <span aria-hidden="true">⚠ </span>
        <span className="sr-only">Warning: </span>
        {message}
      </p>
    );
  }
  return (
    <>
      {props.fallbackConflicts.map((c, idx) => (
        <p key={`${c.type}-${idx}`} className="text-xs text-red-800 font-medium">
          <span aria-hidden="true">⚠ </span>
          <span className="sr-only">Warning: </span>
          {c.message}
        </p>
      ))}
    </>
  );
}
