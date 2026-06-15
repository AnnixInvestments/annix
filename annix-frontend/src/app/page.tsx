import type { Metadata } from "next";
import { MarketingShell } from "@/app/lib/marketing/components/MarketingShell";
import { HomeView } from "@/app/lib/marketing/components/views/HomeView";
import { loadMarketingContent } from "@/app/lib/marketing/serverContent";

export const metadata: Metadata = {
  title: "Annix — Intelligent software for industries that move the world",
  description:
    "Annix builds intelligent platforms for industry — operations, engineering, workforce, compliance and beyond — all on one shared foundation.",
};

export default async function HomePage() {
  const { content, locale } = await loadMarketingContent();
  return (
    <MarketingShell content={content} initialLocale={locale}>
      <HomeView content={content} />
    </MarketingShell>
  );
}
