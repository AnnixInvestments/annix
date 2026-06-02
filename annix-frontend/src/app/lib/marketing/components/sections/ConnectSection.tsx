import type {
  MarketingCtaBand,
  MarketingGlobalPresence,
  MarketingPartners,
} from "@annix/product-data/marketing";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function ConnectSection(props: {
  partners: MarketingPartners;
  globalPresence: MarketingGlobalPresence;
  ctaBand: MarketingCtaBand;
}) {
  const partners = props.partners;
  const globalPresence = props.globalPresence;
  const ctaBand = props.ctaBand;
  const hasPartners = partners.partners.length > 0;

  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
            {partners.heading}
          </p>
          {hasPartners ? (
            <div className="mt-5 grid grid-cols-3 items-center gap-x-6 gap-y-5">
              {partners.partners.map((partner) => (
                <img
                  key={partner.name}
                  src={partner.logoUrl}
                  alt={partner.name}
                  className="h-8 w-full object-contain opacity-70 grayscale transition hover:opacity-100"
                />
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-white/15 p-5">
              <p className="text-sm text-white/50">Partner logos will appear here once added.</p>
              <Link
                href="/admin/portal/marketing"
                className="mt-2 inline-flex items-center gap-1 text-sm font-semibold"
                style={{ color: "var(--brand-accent)" }}
              >
                Add partner logos in the CMS <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>

        <div className="lg:col-span-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
            {globalPresence.heading}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-4">
            {globalPresence.items.map((item) => (
              <div key={item.region} className="flex items-start gap-2">
                <span className="text-lg leading-none">{item.flag}</span>
                <span className="leading-tight">
                  <span className="block text-sm font-semibold text-white">{item.region}</span>
                  <span className="block text-xs text-white/50">{item.label}</span>
                  <span className="block text-xs text-white/50">{item.detail}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5">
          <div
            className="h-full rounded-2xl border border-white/10 p-7"
            style={{
              backgroundImage:
                "linear-gradient(135deg, color-mix(in srgb, var(--brand-accent) 18%, transparent), rgba(56,90,170,0.25))",
            }}
          >
            <h3
              className="text-2xl font-bold text-white"
              style={{ fontFamily: "var(--brand-font-display)" }}
            >
              {ctaBand.headline}
            </h3>
            <p className="mt-3 text-sm text-white/70">{ctaBand.subheading}</p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link
                href={ctaBand.primaryCta.href}
                className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:opacity-90"
                style={{ backgroundColor: "var(--brand-accent)" }}
              >
                {ctaBand.primaryCta.label} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={ctaBand.secondaryCta.href}
                className="text-sm font-semibold text-white underline-offset-4 hover:underline"
              >
                Or {ctaBand.secondaryCta.label}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
