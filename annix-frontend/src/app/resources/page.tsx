import type { Metadata } from "next";
import Link from "next/link";
import { fetchPublishedMarketingContent } from "@/app/lib/marketing/api";
import { MarketingShell } from "@/app/lib/marketing/components/MarketingShell";

export const metadata: Metadata = {
  title: "Annix Resources",
  description: "Guides, product overviews and resources across the Annix platform.",
};

export default async function ResourcesPage() {
  const content = await fetchPublishedMarketingContent();
  const products = content.ecosystem.products.filter((product) => !product.comingSoon);
  return (
    <MarketingShell content={content}>
      <section className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1
            className="text-4xl font-bold text-white sm:text-5xl"
            style={{ fontFamily: "var(--brand-font-display)" }}
          >
            Resources
          </h1>
          <p className="mt-4 text-lg text-white/60">
            Start with a product overview. More guides and articles are on the way.
          </p>
        </div>
        <div className="mx-auto mt-14 grid max-w-5xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Link
              key={product.appKey}
              href={`/products/${product.detailSlug}`}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-white/25 hover:bg-white/10"
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-white/40">
                {product.category}
              </div>
              <div className="mt-1 text-lg font-semibold text-white">{product.name}</div>
              <p className="mt-2 text-sm text-white/60">{product.blurb}</p>
            </Link>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
