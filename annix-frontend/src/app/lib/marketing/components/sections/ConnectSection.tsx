import type {
  MarketingCtaBand,
  MarketingGlobalPresence,
  MarketingPartners,
} from "@annix/product-data/marketing";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { externalHref } from "../../url";

const FLAG_CODE_ALIASES: Record<string, string> = { uk: "gb" };

function flagImageCode(flag: string): string | null {
  const trimmed = flag.trim();
  if (!trimmed) {
    return null;
  }
  const codePoints = Array.from(trimmed).map((char) => char.codePointAt(0) ?? 0);
  const allRegionalIndicators =
    codePoints.length >= 2 && codePoints.every((cp) => cp >= 0x1f1e6 && cp <= 0x1f1ff);
  const letters = allRegionalIndicators
    ? codePoints.map((cp) => String.fromCharCode(cp - 0x1f1e6 + 65)).join("")
    : trimmed.replace(/[^a-zA-Z]/g, "");
  if (letters.length < 2) {
    return null;
  }
  const code = letters.slice(0, 2).toLowerCase();
  const aliased = FLAG_CODE_ALIASES[code];
  return aliased ? aliased : code;
}

export function ConnectSection(props: {
  partners: MarketingPartners;
  globalPresence: MarketingGlobalPresence;
  ctaBand: MarketingCtaBand;
}) {
  const partners = props.partners;
  const globalPresence = props.globalPresence;
  const ctaBand = props.ctaBand;
  const visiblePartners = partners.partners.filter((partner) => partner.logoUrl !== "");
  const hasPartners = visiblePartners.length > 0;
  const backgroundImageUrl = ctaBand.backgroundImageUrl ? ctaBand.backgroundImageUrl : "";

  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-4 sm:px-6 lg:px-8">
      {backgroundImageUrl ? (
        <>
          <div className="absolute inset-0">
            <img
              src={backgroundImageUrl}
              alt=""
              className="h-full w-full object-cover object-bottom"
            />
          </div>
          <div
            className="absolute inset-x-0 top-0 h-32"
            style={{
              backgroundImage: "linear-gradient(180deg, #0a1733, transparent)",
            }}
          />
        </>
      ) : null}

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
            {partners.heading}
          </p>
          {hasPartners ? (
            <div className="mt-5 grid grid-cols-3 items-center gap-x-6 gap-y-5">
              {visiblePartners.map((partner) => {
                const logo = (
                  <span
                    key={partner.name}
                    className="flex h-full w-full items-center justify-center p-1"
                  >
                    <img
                      src={partner.logoUrl}
                      alt={partner.name}
                      className="h-20 w-full object-contain"
                    />
                  </span>
                );
                const href = externalHref(partner.url);
                return href ? (
                  <a
                    key={partner.name}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={partner.name}
                    className="block transition hover:opacity-80"
                  >
                    {logo}
                  </a>
                ) : (
                  <span key={partner.name} className="block">
                    {logo}
                  </span>
                );
              })}
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
            {globalPresence.items.map((item) => {
              const flagCode = flagImageCode(item.flag);
              return (
                <div key={item.region} className="flex items-start gap-2">
                  {flagCode ? (
                    <img
                      src={`https://flagcdn.com/${flagCode}.svg`}
                      alt=""
                      className="mt-0.5 h-4 w-6 shrink-0 rounded-sm object-cover ring-1 ring-white/10"
                    />
                  ) : (
                    <span className="text-lg leading-none">{item.flag}</span>
                  )}
                  <span className="leading-tight">
                    <span className="block text-sm font-semibold text-white">{item.region}</span>
                    <span className="block text-xs text-white/50">{item.label}</span>
                    <span className="block text-xs text-white/50">{item.detail}</span>
                  </span>
                </div>
              );
            })}
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
