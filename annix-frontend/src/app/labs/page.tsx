import type { Metadata } from "next";
import { MarketingShell } from "@/app/lib/marketing/components/MarketingShell";
import { LabsView } from "@/app/lib/marketing/components/views/LabsView";
import { loadMarketingContent } from "@/app/lib/marketing/serverContent";

export const metadata: Metadata = {
  title: "Annix Labs — what we're building next",
  description: "Experiments and upcoming products from the Annix platform.",
};

export default async function LabsPage() {
  const { content, locale } = await loadMarketingContent();
  return (
    <MarketingShell content={content} initialLocale={locale}>
      <LabsView labs={content.labs} />
    </MarketingShell>
  );
}
