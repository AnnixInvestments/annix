import type { Metadata } from "next";
import { MarketingShell } from "@/app/lib/marketing/components/MarketingShell";
import { ResourcesView } from "@/app/lib/marketing/components/views/ResourcesView";
import { loadMarketingContent } from "@/app/lib/marketing/serverContent";

export const metadata: Metadata = {
  title: "Resources — Annix",
  description: "Guides, playbooks, standards and industry briefs from the Annix platform.",
};

export default async function ResourcesPage() {
  const { content, locale } = await loadMarketingContent();
  return (
    <MarketingShell content={content} initialLocale={locale}>
      <ResourcesView content={content} />
    </MarketingShell>
  );
}
