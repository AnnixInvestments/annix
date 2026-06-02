import type { MarketingProductPage } from "@annix/product-data/marketing";
import Link from "next/link";
import { loginHrefForPortal } from "@/app/lib/marketing/links";
import { MarketingIcon } from "../MarketingIcon";

export function ProductView(props: { page: MarketingProductPage }) {
  const page = props.page;
  const loginHref = loginHrefForPortal(page.portalCode);
  return (
    <>
      <section
        className="px-4 py-24 sm:px-6 lg:px-8"
        style={{
          backgroundImage:
            "linear-gradient(135deg, var(--brand-grad-from), var(--brand-grad-via), var(--brand-grad-to))",
        }}
      >
        <div className="mx-auto max-w-3xl text-center">
          <h1
            className="text-4xl font-bold text-white sm:text-5xl"
            style={{ fontFamily: "var(--brand-font-display)" }}
          >
            {page.headline}
          </h1>
          <p className="mt-6 text-lg text-white/70">{page.subheading}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {loginHref ? (
              <Link
                href={loginHref}
                className="rounded-lg px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90"
                style={{ backgroundColor: "var(--brand-accent)" }}
              >
                Open {page.name}
              </Link>
            ) : null}
            <Link
              href="/contact"
              className="rounded-lg border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Book a demo
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <div className="text-xs font-semibold uppercase tracking-wide text-white/40">
            The problem
          </div>
          <p className="mt-3 text-lg text-white/70">{page.problem}</p>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-3">
          {page.features.map((feature) => (
            <div key={feature.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl text-white"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--brand-accent) 22%, transparent)",
                }}
              >
                <MarketingIcon slot={feature.iconSlot} className="h-6 w-6" />
              </div>
              <div className="mt-4 text-lg font-semibold text-white">{feature.title}</div>
              <p className="mt-2 text-sm text-white/60">{feature.blurb}</p>
            </div>
          ))}
        </div>
      </section>

      {page.roi.length > 0 ? (
        <section className="px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">
            {page.roi.map((roi) => (
              <div key={roi.label} className="text-center">
                <div
                  className="text-3xl font-bold text-white"
                  style={{ fontFamily: "var(--brand-font-display)" }}
                >
                  {roi.metric}
                </div>
                <div className="mt-1 text-sm text-white/50">{roi.label}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {page.industries.length > 0 ? (
        <section className="px-4 pb-24 pt-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="text-xs font-semibold uppercase tracking-wide text-white/40">
              Built for
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              {page.industries.map((industry) => (
                <span
                  key={industry}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70"
                >
                  {industry}
                </span>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
