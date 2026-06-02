import type { MarketingHero } from "@annix/product-data/marketing";
import Link from "next/link";
import { MarketingIcon } from "../MarketingIcon";

export function HeroSection(props: { hero: MarketingHero }) {
  const hero = props.hero;
  const imageUrl = hero.imageUrl ? hero.imageUrl : "";
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-28 sm:px-6 lg:min-h-[680px] lg:px-8 lg:pb-24 lg:pt-36">
      {imageUrl ? (
        <>
          <div className="absolute inset-0">
            <img src={imageUrl} alt="" className="h-full w-full object-cover object-right" />
          </div>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(90deg, #0a1733 0%, color-mix(in srgb, #0a1733 55%, transparent) 42%, transparent 72%)",
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-40"
            style={{
              backgroundImage: "linear-gradient(180deg, transparent, #0a1733)",
            }}
          />
        </>
      ) : null}

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-[0.2em] sm:text-sm"
            style={{ color: "var(--brand-accent)" }}
          >
            {hero.eyebrow}
          </p>
          <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl">
            {hero.headlineLead} <span className="text-white/85">{hero.headlineEmphasis}</span>
          </h1>
          <p className="mt-6 max-w-xl text-base text-white/70 sm:text-lg">{hero.subheading}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={hero.primaryCta.href}
              className="inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg transition hover:opacity-90"
              style={{ backgroundColor: "var(--brand-accent)" }}
            >
              {hero.primaryCta.label} →
            </Link>
            <Link
              href={hero.secondaryCta.href}
              className="inline-flex items-center justify-center rounded-lg border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              {hero.secondaryCta.label}
            </Link>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4 lg:flex lg:flex-wrap lg:gap-8">
            {hero.highlights.map((highlight) => (
              <div key={highlight.subtitle} className="flex items-center gap-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-slate-900/40"
                  style={{ color: "var(--brand-accent)" }}
                >
                  <MarketingIcon slot={highlight.iconSlot} className="h-4 w-4" />
                </span>
                <span className="leading-tight">
                  <span className="block text-xs text-white/50">{highlight.title}</span>
                  <span className="block text-sm font-semibold text-white">
                    {highlight.subtitle}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative min-h-[220px]">
          {imageUrl ? null : (
            <div className="relative mx-auto aspect-square w-full max-w-md">
              <div
                className="absolute inset-0 rounded-full opacity-90"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--brand-accent) 28%, transparent), transparent 55%), radial-gradient(circle at 70% 70%, rgba(56,120,220,0.35), transparent 60%), radial-gradient(circle at 50% 50%, rgba(20,40,80,0.9), rgba(8,16,32,0.95))",
                  boxShadow: "0 0 120px rgba(40,90,180,0.25)",
                }}
              />
              <div className="absolute inset-6 rounded-full border border-white/10" />
              <div className="absolute inset-16 rounded-full border border-white/10" />
            </div>
          )}
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 backdrop-blur lg:absolute lg:bottom-0 lg:right-0 lg:max-w-xs">
            <div className="text-base font-semibold text-white">{hero.globalReachTitle}</div>
            <div className="mt-2 h-0.5 w-10" style={{ backgroundColor: "var(--brand-accent)" }} />
            <p className="mt-3 text-sm text-white/60">{hero.globalReachBody}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
