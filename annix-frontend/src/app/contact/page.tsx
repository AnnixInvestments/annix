import type { Metadata } from "next";
import { MarketingShell } from "@/app/lib/marketing/components/MarketingShell";
import { ContactView } from "@/app/lib/marketing/components/views/ContactView";
import { loadMarketingContent } from "@/app/lib/marketing/serverContent";

export const metadata: Metadata = {
  title: "Contact — Annix",
  description: "Book a demo and we will show you the Annix products that fit your operation.",
};

export default async function ContactPage() {
  const { content, locale } = await loadMarketingContent();
  return (
    <MarketingShell content={content} initialLocale={locale}>
      <ContactView
        heroImageUrl={content.hero.imageUrl}
        bottomImageUrl={content.ctaBand.backgroundImageUrl}
      />
    </MarketingShell>
  );
}
