import type { Metadata } from "next";
import { fetchPublishedMarketingContent } from "@/app/lib/marketing/api";
import { MarketingShell } from "@/app/lib/marketing/components/MarketingShell";
import { CtaBandSection } from "@/app/lib/marketing/components/sections/CtaBandSection";
import { EcosystemSection } from "@/app/lib/marketing/components/sections/EcosystemSection";
import { HeroSection } from "@/app/lib/marketing/components/sections/HeroSection";
import { IndustriesSection } from "@/app/lib/marketing/components/sections/IndustriesSection";
import { TrustBarSection } from "@/app/lib/marketing/components/sections/TrustBarSection";

export const metadata: Metadata = {
  title: "Annix — One platform. Every product.",
  description:
    "Annix builds intelligent platforms for industry — operations, engineering, workforce, compliance and beyond — all on one shared foundation.",
};

export default async function HomePage() {
  const content = await fetchPublishedMarketingContent();
  return (
    <MarketingShell content={content}>
      <HeroSection hero={content.hero} />
      <TrustBarSection trustBar={content.trustBar} />
      <EcosystemSection ecosystem={content.ecosystem} />
      <IndustriesSection industries={content.industries} />
      <CtaBandSection ctaBand={content.ctaBand} />
    </MarketingShell>
  );
}
