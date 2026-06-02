"use client";

import { MarketingShell } from "@/app/lib/marketing/components/MarketingShell";
import { CtaBandSection } from "@/app/lib/marketing/components/sections/CtaBandSection";
import { EcosystemSection } from "@/app/lib/marketing/components/sections/EcosystemSection";
import { HeroSection } from "@/app/lib/marketing/components/sections/HeroSection";
import { IndustriesSection } from "@/app/lib/marketing/components/sections/IndustriesSection";
import { TrustBarSection } from "@/app/lib/marketing/components/sections/TrustBarSection";
import { useMarketingDraft } from "@/app/lib/query/hooks";

export default function MarketingPreviewPage() {
  const draftQuery = useMarketingDraft();
  const content = draftQuery.data;

  if (!content) {
    return <div className="p-6 text-gray-500">Loading preview…</div>;
  }

  return (
    <div>
      <div className="bg-amber-500 px-4 py-2 text-center text-sm font-semibold text-white">
        Draft preview — this is not the live site
      </div>
      <MarketingShell content={content}>
        <HeroSection hero={content.hero} />
        <TrustBarSection trustBar={content.trustBar} />
        <EcosystemSection ecosystem={content.ecosystem} />
        <IndustriesSection industries={content.industries} />
        <CtaBandSection ctaBand={content.ctaBand} />
      </MarketingShell>
    </div>
  );
}
