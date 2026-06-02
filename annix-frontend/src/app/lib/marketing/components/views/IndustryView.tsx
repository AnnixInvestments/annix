import type { MarketingIndustry, MarketingProductPage } from "@annix/product-data/marketing";
import Link from "next/link";

export function IndustryView(props: {
  industry: MarketingIndustry;
  productPages: MarketingProductPage[];
}) {
  const industry = props.industry;
  const relevant = props.productPages.filter((page) =>
    page.industries.some((name) => name.toLowerCase() === industry.name.toLowerCase()),
  );
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
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
            Annix for
          </div>
          <h1
            className="mt-3 text-4xl font-bold text-white sm:text-5xl"
            style={{ fontFamily: "var(--brand-font-display)" }}
          >
            {industry.name}
          </h1>
          <p className="mt-6 text-lg text-white/70">{industry.blurb}</p>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold text-white">
            Products for {industry.name}
          </h2>
          {relevant.length > 0 ? (
            <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {relevant.map((page) => (
                <Link
                  key={page.slug}
                  href={`/products/${page.slug}`}
                  className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-white/25 hover:bg-white/10"
                >
                  <div className="text-lg font-semibold text-white">{page.name}</div>
                  <p className="mt-2 text-sm text-white/60">{page.subheading}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-center text-white/50">
              Products for this industry are coming soon.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
