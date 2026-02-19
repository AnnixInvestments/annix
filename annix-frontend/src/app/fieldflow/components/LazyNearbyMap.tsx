"use client";

import { GoogleMap, InfoWindow, Marker, useJsApiLoader } from "@react-google-maps/api";
import Link from "next/link";
import { useCallback, useState } from "react";
import type { Prospect, ProspectStatus } from "@/app/lib/api/annixRepApi";

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
  height: "100%",
};

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
};

function createMarkerIcon(color: string, isUserLocation = false): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: isUserLocation ? 10 : 8,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "white",
    strokeWeight: isUserLocation ? 3 : 2,
  };
}

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
  const [infoWindowProspect, setInfoWindowProspect] = useState<Prospect | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
  });

  const onMapClick = useCallback(() => {
    setInfoWindowProspect(null);
    onSelectProspect(null);
  }, [onSelectProspect]);

  const onMarkerClick = useCallback(
    (prospect: Prospect) => {
      setInfoWindowProspect(prospect);
      onSelectProspect(prospect);
    },
    [onSelectProspect],
  );

  const prospectsWithLocation = prospects.filter((p) => p.latitude && p.longitude);

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-800 rounded-lg">
        <p className="text-red-500">Error loading map</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div style={{ height: "calc(100vh - 200px)", minHeight: "400px", width: "100%" }}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={userLocation}
        zoom={12}
        options={mapOptions}
        onClick={onMapClick}
      >
        <Marker
          position={userLocation}
          icon={createMarkerIcon("#3B82F6", true)}
          title="Your Location"
        />

        {prospectsWithLocation.map((prospect) => (
          <Marker
            key={prospect.id}
            position={{ lat: prospect.latitude!, lng: prospect.longitude! }}
            icon={createMarkerIcon(statusColors[prospect.status])}
            onClick={() => onMarkerClick(prospect)}
          />
        ))}

        {infoWindowProspect?.latitude && infoWindowProspect.longitude && (
          <InfoWindow
            position={{ lat: infoWindowProspect.latitude, lng: infoWindowProspect.longitude }}
            onCloseClick={() => setInfoWindowProspect(null)}
          >
            <div className="min-w-[200px] p-2">
              <h3 className="font-semibold text-gray-900">{infoWindowProspect.companyName}</h3>
              {infoWindowProspect.contactName && (
                <p className="text-sm text-gray-600">{infoWindowProspect.contactName}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {[infoWindowProspect.city, infoWindowProspect.province].filter(Boolean).join(", ")}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className="px-2 py-0.5 text-xs font-medium rounded-full text-white"
                  style={{ backgroundColor: statusColors[infoWindowProspect.status] }}
                >
                  {statusLabels[infoWindowProspect.status]}
                </span>
              </div>
              <div className="mt-3 flex gap-2">
                <Link
                  href={`/annix-rep/prospects/${infoWindowProspect.id}`}
                  className="text-xs text-blue-600 hover:underline"
                >
                  View Details
                </Link>
                <a
                  href={`https://waze.com/ul?ll=${infoWindowProspect.latitude},${infoWindowProspect.longitude}&navigate=yes`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  Navigate
                </a>
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}
