"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ColdCallSuggestion, RouteStop, ScheduleGap } from "@/app/lib/api/annixRepApi";
import { nowISO } from "@/app/lib/datetime";
import { useColdCallSuggestions, usePlanDayRoute, useScheduleGaps } from "@/app/lib/query/hooks";

function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function GapCard({ gap }: { gap: ScheduleGap }) {
  const startTime = formatTime(gap.startTime);
  const endTime = formatTime(gap.endTime);

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-yellow-600 dark:text-yellow-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            {startTime} - {endTime}
          </span>
        </div>
        <span className="text-xs text-yellow-600 dark:text-yellow-400">
          {formatDuration(gap.durationMinutes)} available
        </span>
      </div>
    </div>
  );
}

function SuggestionCard({
  suggestion,
  onAddToRoute,
}: {
  suggestion: ColdCallSuggestion;
  onAddToRoute: () => void;
}) {
  const priorityColors = {
    high: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
    medium: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
    low: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300",
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {suggestion.prospect.companyName}
            </h3>
            <span
              className={`px-1.5 py-0.5 text-xs font-medium rounded capitalize ${priorityColors[suggestion.priority]}`}
            >
              {suggestion.priority}
            </span>
          </div>
          {suggestion.prospect.contactName && (
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
              {suggestion.prospect.contactName}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                />
              </svg>
              {suggestion.distanceKm.toFixed(1)} km away
            </span>
            <span className="flex items-center gap-1">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
                />
              </svg>
              ~{suggestion.estimatedTravelMinutes} min drive
            </span>
            {suggestion.suggestedCallTime && (
              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Suggested: {formatTime(suggestion.suggestedCallTime)}
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-green-600 dark:text-green-400">{suggestion.reason}</p>
        </div>
        <button
          onClick={onAddToRoute}
          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
          title="Add to route"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function RouteStopCard({
  stop,
  index,
  isLast,
}: {
  stop: RouteStop;
  index: number;
  isLast: boolean;
}) {
  const typeColor =
    stop.type === "meeting"
      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
      : stop.type === "current_location"
        ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
        : "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400";

  const typeBadgeColor =
    stop.type === "meeting"
      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
      : stop.type === "current_location"
        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
        : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300";

  return (
    <div className="relative">
      <div className="flex gap-3">
        <div className="flex flex-col items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${typeColor}`}
          >
            {index + 1}
          </div>
          {!isLast && (
            <div className="w-0.5 h-full min-h-[40px] bg-gray-200 dark:bg-slate-700"></div>
          )}
        </div>
        <div className="flex-1 pb-4">
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{stop.name}</h4>
                {stop.address && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {stop.address}
                  </p>
                )}
              </div>
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize whitespace-nowrap ${typeBadgeColor}`}
              >
                {stop.type.replace("_", " ")}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
              {stop.arrivalTime && (
                <span className="flex items-center gap-1">
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Arrive: {formatTime(stop.arrivalTime)}
                </span>
              )}
              {stop.departureTime && (
                <span className="flex items-center gap-1">
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                    />
                  </svg>
                  Depart: {formatTime(stop.departureTime)}
                </span>
              )}
              {stop.durationMinutes && (
                <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {formatDuration(stop.durationMinutes)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RoutePlannerPage() {
  const [selectedDate, setSelectedDate] = useState(nowISO().split("T")[0]);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [includeColdCalls, setIncludeColdCalls] = useState(true);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          console.log("Geolocation permission denied or unavailable");
        },
      );
    }
  }, []);

  const { data: gaps, isLoading: gapsLoading } = useScheduleGaps(selectedDate);
  const { data: suggestions, isLoading: suggestionsLoading } = useColdCallSuggestions(
    selectedDate,
    currentLocation?.lat,
    currentLocation?.lng,
    5,
  );
  const { data: route, isLoading: routeLoading } = usePlanDayRoute(
    selectedDate,
    includeColdCalls,
    currentLocation?.lat,
    currentLocation?.lng,
  );

  const isLoading = gapsLoading || suggestionsLoading || routeLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Route Planner</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Optimize your daily route and find cold call opportunities
          </p>
        </div>
        <Link
          href="/annix-rep/schedule"
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-600 flex items-center gap-2"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
          Back to Schedule
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="date" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Date:
          </label>
          <input
            type="date"
            id="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeColdCalls}
            onChange={(e) => setIncludeColdCalls(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-gray-700 dark:text-gray-300">Include cold call suggestions</span>
        </label>
        {!currentLocation && (
          <span className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
            Enable location for better suggestions
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Schedule Gaps</h2>
            {!gaps || gaps.length === 0 ? (
              <div className="text-center py-8 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                <svg
                  className="w-10 h-10 mx-auto text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  No gaps in your schedule
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {gaps.map((gap, i) => (
                  <GapCard key={i} gap={gap} />
                ))}
              </div>
            )}

            <h2 className="text-lg font-semibold text-gray-900 dark:text-white pt-4">
              Cold Call Suggestions
            </h2>
            {!suggestions || suggestions.length === 0 ? (
              <div className="text-center py-8 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                <svg
                  className="w-10 h-10 mx-auto text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                  />
                </svg>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {currentLocation
                    ? "No prospects nearby to suggest"
                    : "Enable location for suggestions"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {suggestions.map((suggestion) => (
                  <SuggestionCard
                    key={suggestion.prospect.id}
                    suggestion={suggestion}
                    onAddToRoute={() => {}}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Optimized Route
              </h2>
              {route && route.stops.length > 0 && (
                <div className="flex items-center gap-4">
                  <a
                    href={route.wazeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.54 6.63c-.62-2.75-2.37-4.68-4.22-5.73-.63-.36-1.34-.6-2.12-.75-.79-.15-1.58-.14-2.12-.14-.85 0-1.56.06-2.21.18-.63.12-1.31.32-2.05.61C5.83 1.67 4.16 3.12 3.18 5.25c-.95 2.07-1.28 4.9-.47 8.19.68 2.75 2.11 5.97 4.49 8.59 1.03 1.13 1.85 1.74 2.46 1.93.23.07.49.1.78.07.55-.06 1.33-.33 2.32-1.3.97-.95 2.11-2.58 3.23-5.02 1.51-3.3 2.44-6.12 2.98-8.4.57-2.42.71-4.02.57-4.68zM12 15c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" />
                    </svg>
                    Waze
                  </a>
                  <a
                    href={route.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 rounded-md hover:bg-green-100 dark:hover:bg-green-900/50 flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                    </svg>
                    Google Maps
                  </a>
                </div>
              )}
            </div>

            {!route || route.stops.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                <svg
                  className="w-12 h-12 mx-auto text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"
                  />
                </svg>
                <p className="mt-2 text-gray-500 dark:text-gray-400">No stops to display</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Schedule meetings or enable cold call suggestions
                </p>
              </div>
            ) : (
              <div>
                <div className="mb-4 flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                      />
                    </svg>
                    <span>
                      <strong>{route.totalDistanceKm.toFixed(1)}</strong> km total
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>
                      <strong>{formatDuration(route.totalDurationMinutes)}</strong> driving
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                      />
                    </svg>
                    <span>
                      <strong>{route.stops.length}</strong> stops
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-slate-900/50 rounded-lg p-4">
                  {route.stops.map((stop, i) => (
                    <RouteStopCard
                      key={`${stop.type}-${stop.id}`}
                      stop={stop}
                      index={i}
                      isLast={i === route.stops.length - 1}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
