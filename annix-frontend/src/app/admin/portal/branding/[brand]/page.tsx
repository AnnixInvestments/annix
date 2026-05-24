"use client";

import { isArray } from "es-toolkit/compat";
import { useParams } from "next/navigation";
import { BrandingEditor } from "@/app/lib/branding/components/BrandingEditor";

const BRAND_TITLES: Record<string, string> = {
  "annix-investments": "Annix Investments",
  "annix-orbit": "Annix Orbit",
  "annix-insights": "Annix Insights",
  "annix-rep": "Annix Rep",
  "comply-sa": "Annix Sentinel",
};

export default function AdminBrandingPage() {
  const params = useParams();
  const raw = params.brand;
  const brand = isArray(raw) ? raw[0] : (raw ?? "");
  const mappedTitle = BRAND_TITLES[brand];
  const title = mappedTitle || brand;
  return <BrandingEditor brand={brand} title={title} backHref="/admin/portal/global-apps" />;
}
