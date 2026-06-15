import type { MarketingLabs } from "@annix/product-data/marketing";

export function LabsView(props: { labs: MarketingLabs }) {
  const labs = props.labs;
  return (
    <section className="relative px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <h1
          className="text-4xl font-bold text-white sm:text-5xl"
          style={{ fontFamily: "var(--brand-font-display)" }}
        >
          {labs.heading}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-white/70">{labs.subheading}</p>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {labs.items.map((item) => (
            <div
              key={item.name}
              className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur"
            >
              <div
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--brand-accent)" }}
              >
                {item.status}
              </div>
              <div className="mt-2 text-lg font-semibold text-white">{item.name}</div>
              <p className="mt-2 text-sm text-white/60">{item.blurb}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
