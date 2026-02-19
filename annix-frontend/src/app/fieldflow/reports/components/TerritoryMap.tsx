"use client";

import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import { useEffect, useRef } from "react";
import type { TerritoryCoverageReport } from "@/app/lib/api/annixRepApi";
import { formatDateZA } from "@/app/lib/datetime";

interface TerritoryMapProps {
  report: TerritoryCoverageReport;
}

const statusColors: Record<string, string> = {
  new: "#9CA3AF",
  contacted: "#3B82F6",
  qualified: "#EAB308",
  proposal: "#A855F7",
  won: "#22C55E",
  lost: "#EF4444",
};

const statusLabels: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
};

export default function TerritoryMap({ report }: TerritoryMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    const initMap = async () => {
      const L = await import("leaflet");
      // @ts-expect-error - CSS import for leaflet styles
      await import("leaflet/dist/leaflet.css");

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }

      const map = L.map(mapContainerRef.current!, {
        center: [-30.5595, 22.9375],
        zoom: 6,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      const createProspectIcon = (status: string) => {
        const color = statusColors[status] ?? "#9CA3AF";
        return L.divIcon({
          className: "custom-marker",
          html: `<div style="
            background-color: ${color};
            width: 24px;
            height: 24px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          "></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });
      };

      const visitIcon = L.divIcon({
        className: "custom-marker",
        html: `<div style="
          background-color: #6366F1;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          opacity: 0.7;
        "></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      const markers: LeafletMarker[] = [];

      report.prospects.forEach((prospect) => {
        const marker = L.marker([prospect.latitude, prospect.longitude], {
          icon: createProspectIcon(prospect.status),
        }).addTo(map);

        marker.bindPopup(`
          <div style="min-width: 200px;">
            <h3 style="font-weight: 600; margin: 0 0 8px 0;">${prospect.companyName}</h3>
            <p style="margin: 4px 0; color: #666;">
              Status: <span style="color: ${statusColors[prospect.status] ?? "#666"}; font-weight: 500;">
                ${statusLabels[prospect.status] ?? prospect.status}
              </span>
            </p>
            <p style="margin: 4px 0; color: #666;">
              Visits: ${prospect.visitCount}
            </p>
            ${
              prospect.lastVisitDate
                ? `<p style="margin: 4px 0; color: #666;">
                  Last Visit: ${formatDateZA(prospect.lastVisitDate)}
                </p>`
                : ""
            }
          </div>
        `);

        markers.push(marker);
      });

      report.visits.forEach((visit) => {
        const marker = L.marker([visit.latitude, visit.longitude], {
          icon: visitIcon,
        }).addTo(map);

        marker.bindPopup(`
          <div style="min-width: 150px;">
            <p style="margin: 4px 0; font-weight: 500;">Visit</p>
            <p style="margin: 4px 0; color: #666;">
              Date: ${formatDateZA(visit.date)}
            </p>
            ${visit.outcome ? `<p style="margin: 4px 0; color: #666;">Outcome: ${visit.outcome}</p>` : ""}
          </div>
        `);

        markers.push(marker);
      });

      if (markers.length > 0) {
        const group = L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.1));
      } else if (
        report.bounds.north !== report.bounds.south &&
        report.bounds.east !== report.bounds.west
      ) {
        map.fitBounds([
          [report.bounds.south, report.bounds.west],
          [report.bounds.north, report.bounds.east],
        ]);
      }

      mapInstanceRef.current = map;
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [report]);

  return (
    <div className="relative">
      <div ref={mapContainerRef} className="w-full h-[500px] rounded-xl overflow-hidden" />
      <div className="absolute bottom-4 left-4 bg-white dark:bg-slate-800 rounded-lg p-3 shadow-lg z-[1000]">
        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Legend</p>
        <div className="space-y-1">
          {Object.entries(statusLabels).map(([status, label]) => (
            <div key={status} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: statusColors[status] }}
              />
              <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200 dark:border-slate-600">
            <div className="w-3 h-3 rounded-full bg-indigo-500 opacity-70" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Visit</span>
          </div>
        </div>
      </div>
    </div>
  );
}
