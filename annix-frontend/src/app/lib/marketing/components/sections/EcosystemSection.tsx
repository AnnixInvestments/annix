import type { MarketingEcosystem } from "@annix/product-data/marketing";
import { ProductCard } from "../ProductCard";

export function EcosystemSection(props: { ecosystem: MarketingEcosystem }) {
  const ecosystem = props.ecosystem;
  return (
    <section id="ecosystem" className="px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            className="text-3xl font-bold text-white sm:text-4xl"
            style={{ fontFamily: "var(--brand-font-display)" }}
          >
            {ecosystem.heading}
          </h2>
          <p className="mt-4 text-lg text-white/60">{ecosystem.subheading}</p>
        </div>
        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ecosystem.products.map((product) => (
            <ProductCard key={product.appKey} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
