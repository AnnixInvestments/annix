"use client";

import { GoogleMap, InfoWindow, Marker, useJsApiLoader } from "@react-google-maps/api";
import Link from "next/link";
import type { Prospect, ProspectStatus } from "@/app/lib/api/annixRepApi";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

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

const mapContainerStyle = {
  width: "100%",
  height: "calc(100vh - 200px)",
  minHeight: "400px",
};

interface NearbyMapProps {
  userLocation: Location;
  prospects: Prospect[];
  selectedProspect: Prospect | null;
  onSelectProspect: (prospect: Prospect | null) => void;
}

export default function NearbyMap({
  userLocation,
  prospects,
  selectedProspect,
  onSelectProspect,
}: NearbyMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  const prospectsWithLocation = prospects.filter((p) => p.latitude && p.longitude);

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-96 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-700 dark:text-red-400">Failed to load Google Maps</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={userLocation}
      zoom={12}
      options={{
        streetViewControl: false,
        mapTypeControl: true,
        fullscreenControl: true,
      }}
    >
      <Marker
        position={userLocation}
        icon={{
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#3B82F6",
          fillOpacity: 1,
          strokeColor: "#FFFFFF",
          strokeWeight: 3,
        }}
        title="Your location"
      />

      {prospectsWithLocation.map((prospect) => (
        <Marker
          key={prospect.id}
          position={{ lat: prospect.latitude!, lng: prospect.longitude! }}
          icon={{
            path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
            scale: 6,
            fillColor: statusColors[prospect.status],
            fillOpacity: 1,
            strokeColor: "#FFFFFF",
            strokeWeight: 2,
          }}
          onClick={() => onSelectProspect(prospect)}
        />
      ))}

      {selectedProspect?.latitude && selectedProspect.longitude && (
        <InfoWindow
          position={{ lat: selectedProspect.latitude, lng: selectedProspect.longitude }}
          onCloseClick={() => onSelectProspect(null)}
        >
          <div className="p-2 min-w-[200px]">
            <h3 className="font-semibold text-gray-900">{selectedProspect.companyName}</h3>
            {selectedProspect.contactName && (
              <p className="text-sm text-gray-600">{selectedProspect.contactName}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {[selectedProspect.city, selectedProspect.province].filter(Boolean).join(", ")}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span
                className="px-2 py-0.5 text-xs font-medium rounded-full text-white"
                style={{ backgroundColor: statusColors[selectedProspect.status] }}
              >
                {statusLabels[selectedProspect.status]}
              </span>
            </div>
            <div className="mt-3 flex gap-2">
              <Link
                href={`/annix-rep/prospects/${selectedProspect.id}`}
                className="text-xs text-blue-600 hover:underline"
              >
                View Details
              </Link>
              {selectedProspect.latitude && selectedProspect.longitude && (
                <a
                  href={`https://waze.com/ul?ll=${selectedProspect.latitude},${selectedProspect.longitude}&navigate=yes`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  Navigate
                </a>
              )}
            </div>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
}
