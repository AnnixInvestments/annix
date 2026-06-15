import { notFound } from "next/navigation";
import { MarketingShell } from "@/app/lib/marketing/components/MarketingShell";
import { ProductLandingView } from "@/app/lib/marketing/components/views/ProductLandingView";
import { ProductView } from "@/app/lib/marketing/components/views/ProductView";
import { PulseLandingView } from "@/app/lib/marketing/components/views/PulseLandingView";
import { PRODUCT_LANDING_CONFIGS } from "@/app/lib/marketing/components/views/productLandingData";
import { loadMarketingContent } from "@/app/lib/marketing/serverContent";

export default async function ProductPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const slug = params.slug;
  const { content, locale } = await loadMarketingContent();
  const heroImageUrl = content.hero.imageUrl;
  const bottomImageUrl = content.ctaBand.backgroundImageUrl;
  const landingConfig = PRODUCT_LANDING_CONFIGS[slug];
  const productPage = content.productPages.find((page) => page.slug === slug);

  if (slug === "annix-pulse") {
    return (
      <MarketingShell content={content} initialLocale={locale}>
        <PulseLandingView heroImageUrl={heroImageUrl} bottomImageUrl={bottomImageUrl} />
      </MarketingShell>
    );
  }
  if (landingConfig) {
    return (
      <MarketingShell content={content} initialLocale={locale}>
        <ProductLandingView
          config={landingConfig}
          heroImageUrl={heroImageUrl}
          bottomImageUrl={bottomImageUrl}
        />
      </MarketingShell>
    );
  }
  if (productPage) {
    return (
      <MarketingShell content={content} initialLocale={locale}>
        <ProductView page={productPage} />
      </MarketingShell>
    );
  }
  notFound();
}
