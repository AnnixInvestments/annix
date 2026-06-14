import type { OrbitSiteReadyStatus } from "@/app/lib/api/annixOrbitApi";

export interface SiteReadyMeta {
  label: string;
  chipClasses: string;
  barClasses: string;
}

// Shared status presentation for the Site-Ready score (issue #362 phase
// 4), used by the candidate list facet/badge and the passport panel.
export function siteReadyMeta(status: OrbitSiteReadyStatus): SiteReadyMeta {
  if (status === "ready") {
    return {
      label: "Site-ready",
      chipClasses: "bg-green-100 text-green-700",
      barClasses: "bg-green-500",
    };
  }
  if (status === "nearly") {
    return {
      label: "Nearly ready",
      chipClasses: "bg-amber-100 text-amber-700",
      barClasses: "bg-amber-500",
    };
  }
  if (status === "not_ready") {
    return {
      label: "Not site-ready",
      chipClasses: "bg-red-100 text-red-700",
      barClasses: "bg-red-500",
    };
  }
  return {
    label: "No passport",
    chipClasses: "bg-gray-100 text-gray-600",
    barClasses: "bg-gray-300",
  };
}

export const SITE_READY_FACETS: Array<{ value: "all" | OrbitSiteReadyStatus; label: string }> = [
  { value: "all", label: "All" },
  { value: "ready", label: "Site-ready" },
  { value: "nearly", label: "Nearly ready" },
  { value: "not_ready", label: "Not ready" },
  { value: "no_passport", label: "No passport" },
];
