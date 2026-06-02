import type { MarketingEcosystem } from "@annix/product-data/marketing";
import { ProductCard } from "../ProductCard";

export function EcosystemSection(props: { ecosystem: MarketingEcosystem }) {
  const ecosystem = props.ecosystem;
  return (
    <section id="ecosystem" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <p
            className="text-xs font-semibold uppercase tracking-[0.2em]"
            style={{ color: "color-mix(in srgb, var(--brand-accent) 70%, #6da8ff)" }}
          >
            {ecosystem.eyebrow}
          </p>
          <h2
            className="mt-3 text-3xl font-bold text-white sm:text-4xl"
            style={{ fontFamily: "var(--brand-font-display)" }}
          >
            {ecosystem.heading}
          </h2>
          <p className="mt-3 text-base text-white/60">{ecosystem.subheading}</p>
        </div>
        <div className="mt-14 grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr))]">
          {ecosystem.products.map((product) => (
            <ProductCard key={`${product.appKey}-${product.detailSlug}`} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
