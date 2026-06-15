import { notFound } from "next/navigation";
import { MarketingShell } from "@/app/lib/marketing/components/MarketingShell";
import { IndustryView } from "@/app/lib/marketing/components/views/IndustryView";
import { loadMarketingContent } from "@/app/lib/marketing/serverContent";

export default async function IndustryPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const slug = params.slug;
  const { content, locale } = await loadMarketingContent();
  const industry = content.industries.items.find((item) => item.slug === slug);
  if (!industry) {
    notFound();
  }
  return (
    <MarketingShell content={content} initialLocale={locale}>
      <IndustryView
        industry={industry}
        products={content.ecosystem.products}
        heroImageUrl={content.hero.imageUrl}
        bottomImageUrl={content.ctaBand.backgroundImageUrl}
      />
    </MarketingShell>
  );
}
