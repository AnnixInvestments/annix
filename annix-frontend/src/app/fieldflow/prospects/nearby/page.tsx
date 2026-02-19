"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Prospect, ProspectStatus } from "@/app/lib/api/annixRepApi";
import { useNearbyProspects } from "@/app/lib/query/hooks";

const NearbyMap = dynamic(() => import("../../components/LazyNearbyMap"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  ),
});

const statusColors: Record<ProspectStatus, string> = {
  new: "#3B82F6",
  contacted: "#EAB308",
  qualified: "#A855F7",
  proposal: "#F97316",
  won: "#22C55E",
  lost: "#6B7280",
};

const statusLabels: Record<ProspectStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
};

interface Location {
  lat: number;
  lng: number;
}

const defaultCenter: Location = {
  lat: -26.20227,
  lng: 28.04363,
};

export default function NearbyProspectsPage() {
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(true);
  const [radiusKm, setRadiusKm] = useState(10);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);

  const {
    data: prospects,
    isLoading,
    refetch,
  } = useNearbyProspects(userLocation?.lat ?? 0, userLocation?.lng ?? 0, radiusKm, 50);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setIsGettingLocation(false);
        },
        (error) => {
          setLocationError(
            error.code === 1
              ? "Location access denied. Please enable location services."
              : "Unable to get your location. Using default location.",
          );
          setUserLocation(defaultCenter);
          setIsGettingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    } else {
      setLocationError("Geolocation is not supported by your browser.");
      setUserLocation(defaultCenter);
      setIsGettingLocation(false);
    }
  }, []);

  const handleRadiusChange = useCallback((newRadius: number) => {
    setRadiusKm(newRadius);
  }, []);

  const prospectsWithLocation = (prospects ?? []).filter((p) => p.latitude && p.longitude);

  if (isGettingLocation) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Getting your location...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/annix-rep/prospects"
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg
              className="w-5 h-5"
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
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nearby Prospects</h1>
            <p className="text-gray-500 dark:text-gray-400">
              {prospectsWithLocation.length} prospects within {radiusKm}km
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Radius:</label>
            <select
              value={radiusKm}
              onChange={(e) => handleRadiusChange(Number(e.target.value))}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
            >
              <option value={5}>5 km</option>
              <option value={10}>10 km</option>
              <option value={25}>25 km</option>
              <option value={50}>50 km</option>
              <option value={100}>100 km</option>
            </select>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
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
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </svg>
            )}
            Refresh
          </button>
        </div>
      </div>

      {locationError && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
          <p className="text-sm text-yellow-700 dark:text-yellow-400">{locationError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          {userLocation && (
            <NearbyMap
              userLocation={userLocation}
              prospects={prospects ?? []}
              selectedProspect={selectedProspect}
              onSelectProspect={setSelectedProspect}
            />
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Legend</h2>
            <div className="space-y-2">
              {(Object.keys(statusLabels) as ProspectStatus[]).map((status) => (
                <div key={status} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: statusColors[status] }}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {statusLabels[status]}
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-slate-700">
                <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Your location</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Prospects ({prospectsWithLocation.length})
              </h2>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : prospectsWithLocation.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p>No prospects found within {radiusKm}km</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-slate-700">
                  {prospectsWithLocation.map((prospect) => (
                    <button
                      key={prospect.id}
                      onClick={() => setSelectedProspect(prospect)}
                      className={`w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors ${
                        selectedProspect?.id === prospect.id ? "bg-blue-50 dark:bg-blue-900/20" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-sm">
                            {prospect.companyName}
                          </p>
                          {prospect.city && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {prospect.city}
                            </p>
                          )}
                        </div>
                        <span
                          className="px-2 py-0.5 text-xs font-medium rounded-full text-white"
                          style={{ backgroundColor: statusColors[prospect.status] }}
                        >
                          {statusLabels[prospect.status]}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
