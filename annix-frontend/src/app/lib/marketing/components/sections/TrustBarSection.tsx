import type { MarketingTrustBar } from "@annix/product-data/marketing";

export function TrustBarSection(props: { trustBar: MarketingTrustBar }) {
  const trustBar = props.trustBar;
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/40">
          {trustBar.heading}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {trustBar.regions.map((region) => (
            <span
              key={region}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70"
            >
              {region}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
