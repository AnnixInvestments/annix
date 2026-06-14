import type { MarketingEcosystem } from "@annix/product-data/marketing";
import { ProductCard } from "../ProductCard";

// Desktop column count tracks the number of products so the row always fills the
// width — add a product and they squash to fit, remove one and the rest grow.
const DESKTOP_COLS: Record<number, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-6",
  7: "lg:grid-cols-7",
  8: "lg:grid-cols-8",
};

export function EcosystemSection(props: { ecosystem: MarketingEcosystem }) {
  const ecosystem = props.ecosystem;
  const count = ecosystem.products.length;
  const desktopCols = DESKTOP_COLS[count] ? DESKTOP_COLS[count] : "lg:grid-cols-4";
  return (
    <section id="ecosystem" className="relative z-10 px-4 pb-4 pt-6 sm:px-6 lg:-mt-10 lg:px-8">
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
        <div className={`mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 ${desktopCols}`}>
          {ecosystem.products.map((product) => (
            <ProductCard key={`${product.appKey}-${product.detailSlug}`} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
