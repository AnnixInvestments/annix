"use client";

import { isArray } from "es-toolkit/compat";
import { useParams } from "next/navigation";
import { BrandingEditor } from "@/app/lib/branding/components/BrandingEditor";

const BRAND_TITLES: Record<string, string> = {
  "annix-investments": "Annix Investments",
  "annix-orbit": "Annix Orbit",
  "annix-insights": "Annix Insights",
  "annix-rep": "Annix Pulse",
  "annix-sentinel": "Annix Sentinel",
  "annix-forge": "Annix Forge",
  "annix-core": "Annix Core",
};

const BRAND_HUBS: Record<string, string> = {
  "annix-orbit": "/admin/portal/orbit",
  "annix-insights": "/admin/portal/insights",
  "annix-rep": "/admin/portal/annix-rep",
  "annix-sentinel": "/admin/portal/annix-sentinel",
  "annix-investments": "/admin/portal/dashboard",
  "annix-forge": "/admin/portal/rfqs",
  "annix-core": "/admin/portal/core",
};

export default function AdminBrandingPage() {
  const params = useParams();
  const raw = params.brand;
  const brand = isArray(raw) ? raw[0] : (raw ?? "");
  const mappedTitle = BRAND_TITLES[brand];
  const title = mappedTitle || brand;
  const mappedHub = BRAND_HUBS[brand];
  const backHref = mappedHub || "/admin/portal/global-apps";
  return <BrandingEditor brand={brand} title={title} backHref={backHref} />;
}
