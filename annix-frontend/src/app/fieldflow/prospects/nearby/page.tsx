"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type {
  DiscoveredBusiness,
  DiscoverySource,
  Prospect,
  ProspectStatus,
} from "@/app/lib/api/annixRepApi";
import {
  useDiscoveryImport,
  useDiscoveryQuota,
  useDiscoverySearchMutation,
  useNearbyProspects,
} from "@/app/lib/query/hooks";

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

const sourceLabels: Record<DiscoverySource, string> = {
  google_places: "Google",
  yellow_pages: "Yellow Pages",
  osm: "OpenStreetMap",
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
  const [showDiscovery, setShowDiscovery] = useState(false);
  const [discoveredBusinesses, setDiscoveredBusinesses] = useState<DiscoveredBusiness[]>([]);
  const [selectedBusinesses, setSelectedBusinesses] = useState<Set<string>>(new Set());
  const [selectedSources, setSelectedSources] = useState<DiscoverySource[]>(["google_places"]);

  const {
    data: prospects,
    isLoading,
    refetch,
  } = useNearbyProspects(userLocation?.lat ?? 0, userLocation?.lng ?? 0, radiusKm, 50);

  const { data: quota } = useDiscoveryQuota();
  const discoveryMutation = useDiscoverySearchMutation();
  const importMutation = useDiscoveryImport();

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

  const handleDiscover = useCallback(async () => {
    if (!userLocation) return;

    const result = await discoveryMutation.mutateAsync({
      latitude: userLocation.lat,
      longitude: userLocation.lng,
      radiusKm,
      sources: selectedSources,
    });

    setDiscoveredBusinesses(result.discovered);
    setSelectedBusinesses(new Set());
  }, [userLocation, radiusKm, selectedSources, discoveryMutation]);

  const handleToggleSelect = useCallback((externalId: string) => {
    setSelectedBusinesses((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(externalId)) {
        newSet.delete(externalId);
      } else {
        newSet.add(externalId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedBusinesses(new Set(discoveredBusinesses.map((b) => b.externalId)));
  }, [discoveredBusinesses]);

  const handleDeselectAll = useCallback(() => {
    setSelectedBusinesses(new Set());
  }, []);

  const handleImport = useCallback(async () => {
    const businessesToImport = discoveredBusinesses.filter((b) =>
      selectedBusinesses.has(b.externalId),
    );

    if (businessesToImport.length === 0) return;

    const result = await importMutation.mutateAsync(businessesToImport);

    const importedIds = new Set(
      businessesToImport.map((b) => b.externalId).slice(0, result.created),
    );
    setDiscoveredBusinesses((prev) => prev.filter((b) => !importedIds.has(b.externalId)));
    setSelectedBusinesses(new Set());

    refetch();
  }, [discoveredBusinesses, selectedBusinesses, importMutation, refetch]);

  const handleToggleSource = useCallback((source: DiscoverySource) => {
    setSelectedSources((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source],
    );
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
            href="/fieldflow/prospects"
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
            onClick={() => setShowDiscovery(!showDiscovery)}
            className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 ${
              showDiscovery
                ? "text-orange-700 bg-orange-100 dark:text-orange-300 dark:bg-orange-900/30"
                : "text-orange-600 bg-white border border-orange-300 hover:bg-orange-50 dark:bg-slate-700 dark:border-orange-600 dark:hover:bg-slate-600"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            Discover
          </button>
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

      {showDiscovery && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Discover New Businesses
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Search for businesses in your area to add as prospects
              </p>
            </div>
            {quota && (
              <div className="text-right text-sm">
                <p className="text-gray-600 dark:text-gray-400">
                  Google API: {quota.googleRemaining}/{quota.googleDailyLimit} remaining
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 mb-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">Sources:</span>
            {(["google_places", "yellow_pages", "osm"] as DiscoverySource[]).map((source) => (
              <label key={source} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedSources.includes(source)}
                  onChange={() => handleToggleSource(source)}
                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {sourceLabels[source]}
                </span>
              </label>
            ))}
            <button
              onClick={handleDiscover}
              disabled={discoveryMutation.isPending || selectedSources.length === 0}
              className="ml-auto px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
            >
              {discoveryMutation.isPending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
              )}
              Search Businesses
            </button>
          </div>

          {discoveredBusinesses.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Found {discoveredBusinesses.length} businesses
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSelectAll}
                    className="text-sm text-orange-600 hover:text-orange-700 dark:text-orange-400"
                  >
                    Select all
                  </button>
                  <span className="text-gray-400">|</span>
                  <button
                    onClick={handleDeselectAll}
                    className="text-sm text-gray-600 hover:text-gray-700 dark:text-gray-400"
                  >
                    Deselect all
                  </button>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2">
                {discoveredBusinesses.map((business) => (
                  <label
                    key={business.externalId}
                    className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer ${
                      selectedBusinesses.has(business.externalId)
                        ? "bg-orange-100 dark:bg-orange-900/40"
                        : "bg-white dark:bg-slate-800"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedBusinesses.has(business.externalId)}
                      onChange={() => handleToggleSelect(business.externalId)}
                      className="mt-1 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                          {business.companyName}
                        </p>
                        <span className="px-1.5 py-0.5 text-xs rounded bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-400">
                          {sourceLabels[business.source]}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {[business.streetAddress, business.city].filter(Boolean).join(", ")}
                      </p>
                      {business.businessTypes.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {business.businessTypes.slice(0, 3).map((type, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 text-xs rounded bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400"
                            >
                              {type}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {business.rating && (
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-sm text-yellow-600">
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                          </svg>
                          {business.rating.toFixed(1)}
                        </div>
                        <p className="text-xs text-gray-500">({business.userRatingsTotal})</p>
                      </div>
                    )}
                  </label>
                ))}
              </div>

              {selectedBusinesses.size > 0 && (
                <button
                  onClick={handleImport}
                  disabled={importMutation.isPending}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {importMutation.isPending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  )}
                  Import {selectedBusinesses.size} Business{selectedBusinesses.size !== 1 ? "es" : ""} as Prospects
                </button>
              )}
            </div>
          )}

          {discoveryMutation.isSuccess && discoveredBusinesses.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No new businesses found in this area. Try expanding your search radius or adjusting sources.
            </p>
          )}
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
                  <button
                    onClick={() => setShowDiscovery(true)}
                    className="mt-2 text-orange-600 hover:text-orange-700 text-sm font-medium"
                  >
                    Discover new businesses
                  </button>
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
                          {prospect.discoverySource && (
                            <span className="inline-block mt-1 px-1.5 py-0.5 text-xs rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                              Discovered
                            </span>
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
