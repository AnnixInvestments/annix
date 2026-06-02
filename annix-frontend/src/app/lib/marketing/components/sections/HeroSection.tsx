import type { MarketingHero } from "@annix/product-data/marketing";
import Link from "next/link";

export function HeroSection(props: { hero: MarketingHero }) {
  const hero = props.hero;
  return (
    <section
      className="relative overflow-hidden px-4 py-24 sm:px-6 lg:px-8 lg:py-32"
      style={{
        backgroundImage:
          "linear-gradient(135deg, var(--brand-grad-from), var(--brand-grad-via), var(--brand-grad-to))",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, color-mix(in srgb, var(--brand-accent) 35%, transparent), transparent 45%)",
        }}
      />
      <div className="relative mx-auto max-w-4xl text-center">
        <span className="inline-block rounded-full border border-white/15 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
          {hero.eyebrow}
        </span>
        <h1
          className="mt-6 text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl"
          style={{ fontFamily: "var(--brand-font-display)" }}
        >
          {hero.headlineLead}{" "}
          <span style={{ color: "var(--brand-accent)" }}>{hero.headlineEmphasis}</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-white/70">{hero.subheading}</p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={hero.primaryCta.href}
            className="rounded-lg px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90"
            style={{ backgroundColor: "var(--brand-accent)" }}
          >
            {hero.primaryCta.label}
          </Link>
          <Link
            href={hero.secondaryCta.href}
            className="rounded-lg border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            {hero.secondaryCta.label}
          </Link>
        </div>
        <div className="mt-14 flex flex-wrap items-center justify-center gap-8">
          {hero.stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div
                className="text-3xl font-bold text-white"
                style={{ fontFamily: "var(--brand-font-display)" }}
              >
                {stat.value}
              </div>
              <div className="text-xs uppercase tracking-wide text-white/50">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
