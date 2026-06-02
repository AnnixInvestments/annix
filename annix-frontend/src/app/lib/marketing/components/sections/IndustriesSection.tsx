import type { MarketingIndustries } from "@annix/product-data/marketing";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { MarketingIcon } from "../MarketingIcon";

export function IndustriesSection(props: { industries: MarketingIndustries }) {
  const industries = props.industries;
  return (
    <section id="industries" className="px-4 pb-4 pt-2 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-[0.2em]"
              style={{ color: "var(--brand-accent)" }}
            >
              {industries.eyebrow}
            </p>
            <h2
              className="mt-2 text-3xl font-bold text-white sm:text-4xl"
              style={{ fontFamily: "var(--brand-font-display)" }}
            >
              {industries.heading}
            </h2>
          </div>
          <Link
            href="#industries"
            className="inline-flex w-fit items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:opacity-90"
            style={{ backgroundColor: "var(--brand-accent)" }}
          >
            {industries.ctaLabel} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,150px),1fr))]">
          {industries.items.map((industry) => {
            const imageUrl = industry.imageUrl ? industry.imageUrl : "";
            return (
              <Link
                key={industry.slug}
                href={`/industries/${industry.slug}`}
                className="group relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-xl border border-white/10"
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={industry.name}
                    className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage:
                        "linear-gradient(160deg, rgba(40,70,130,0.6), rgba(10,18,34,0.9))",
                    }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="relative flex items-center gap-2 p-3">
                  <MarketingIcon slot={industry.iconSlot} className="h-4 w-4 text-white" />
                  <span className="text-sm font-semibold text-white">{industry.name}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
