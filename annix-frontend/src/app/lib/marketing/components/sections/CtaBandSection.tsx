import type { MarketingCtaBand } from "@annix/product-data/marketing";
import Link from "next/link";

export function CtaBandSection(props: { ctaBand: MarketingCtaBand }) {
  const ctaBand = props.ctaBand;
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div
        className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-white/10 px-8 py-14 text-center"
        style={{
          backgroundImage:
            "linear-gradient(135deg, var(--brand-grad-from), var(--brand-grad-via), var(--brand-grad-to))",
        }}
      >
        <h2
          className="text-3xl font-bold text-white sm:text-4xl"
          style={{ fontFamily: "var(--brand-font-display)" }}
        >
          {ctaBand.headline}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-white/70">{ctaBand.subheading}</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={ctaBand.primaryCta.href}
            className="rounded-lg px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90"
            style={{ backgroundColor: "var(--brand-accent)" }}
          >
            {ctaBand.primaryCta.label}
          </Link>
          <Link
            href={ctaBand.secondaryCta.href}
            className="rounded-lg border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            {ctaBand.secondaryCta.label}
          </Link>
        </div>
      </div>
    </section>
  );
}
