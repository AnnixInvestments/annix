"use client";

import { useBranding } from "@/app/lib/query/hooks";
import { BlastingCard } from "../rubber-pricing/BlastingCard";

export default function BlastingAdminPage() {
  const brandingQuery = useBranding("annix-core");
  const branding = brandingQuery.data;
  const brandAccent = branding?.navbarColor;
  const accentColor = brandAccent || "var(--brand-navbar, #0d9488)";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Blasting</h1>
        <p className="text-sm text-gray-500 mt-1">
          Grit-blasting cost per m² — blaster wages, electricity, grit and margin spread over the
          blast throughput. Feeds the rubber lining bonding-system cost on every quote.
        </p>
      </div>
      <BlastingCard accentColor={accentColor} />
    </div>
  );
}
