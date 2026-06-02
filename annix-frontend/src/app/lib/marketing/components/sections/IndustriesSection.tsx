import type { MarketingIndustries } from "@annix/product-data/marketing";
import Link from "next/link";
import { MarketingIcon } from "../MarketingIcon";

export function IndustriesSection(props: { industries: MarketingIndustries }) {
  const industries = props.industries;
  return (
    <section
      id="industries"
      className="border-t border-white/10 bg-slate-900 px-4 py-24 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            className="text-3xl font-bold text-white sm:text-4xl"
            style={{ fontFamily: "var(--brand-font-display)" }}
          >
            {industries.heading}
          </h2>
          <p className="mt-4 text-lg text-white/60">{industries.subheading}</p>
        </div>
        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {industries.items.map((industry) => (
            <Link
              key={industry.slug}
              href={`/industries/${industry.slug}`}
              className="group rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-white/25 hover:bg-white/10"
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl text-white"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--brand-accent) 22%, transparent)",
                }}
              >
                <MarketingIcon slot={industry.iconSlot} className="h-6 w-6" />
              </div>
              <div className="mt-4 text-lg font-semibold text-white">{industry.name}</div>
              <p className="mt-2 text-sm text-white/60">{industry.blurb}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
