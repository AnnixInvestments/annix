"use client";

import { useBranding } from "@/app/lib/query/hooks";
import { BondingAgentsCard } from "../rubber-pricing/BondingAgentsCard";
import { BondingSelectorGuide } from "../rubber-pricing/BondingSelectorGuide";
import { BondingSystemsCard } from "../rubber-pricing/BondingSystemsCard";

export default function BondingAgentsAdminPage() {
  const brandingQuery = useBranding("annix-core");
  const branding = brandingQuery.data;
  const brandAccent = branding?.navbarColor;
  const accentColor = brandAccent || "var(--brand-navbar, #0d9488)";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bonding Agents</h1>
        <p className="text-sm text-gray-500 mt-1">
          Adhesives and primers used in rubber lining. Spread rate drives cost/m²; sale/m² = cost ×
          consumable markup. These feed the rubber lining bonding-system pricing on the Rubber
          Pricing and Rubber Quote screens.
        </p>
      </div>
      <BondingSystemsCard accentColor={accentColor} />
      <BondingAgentsCard accentColor={accentColor} />
      <BondingSelectorGuide />
    </div>
  );
}
