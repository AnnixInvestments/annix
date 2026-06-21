"use client";

import { useBranding } from "@/app/lib/query/hooks";
import { LabourCard } from "../rubber-pricing/LabourCard";

export default function LabourAdminPage() {
  const brandingQuery = useBranding("stock-control");
  const branding = brandingQuery.data;
  const brandAccent = branding?.navbarColor;
  const accentColor = brandAccent || "var(--brand-navbar, #0d9488)";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Labour &amp; Curing</h1>
        <p className="text-sm text-gray-500 mt-1">
          Paraffin curing, department hourly rates and per-family throughputs that turn wages into a
          cost per m². These feed the rubber lining bonding-system cost on every quote.
        </p>
      </div>
      <LabourCard accentColor={accentColor} />
    </div>
  );
}
