import type { MarketingIndustry, MarketingProduct } from "@annix/product-data/marketing";
import { ProductCard } from "../ProductCard";

const INDUSTRY_APPS: Record<string, string[]> = {
  mining: ["annix-core", "annix-forge", "annix-sentinel", "annix-orbit"],
  manufacturing: ["annix-core", "annix-forge", "annix-sentinel", "annix-orbit"],
  engineering: ["annix-core", "annix-forge", "annix-sentinel", "annix-orbit"],
  education: ["annix-orbit", "annix-sentinel"],
  construction: ["annix-core", "annix-forge", "annix-sentinel", "annix-orbit"],
  energy: ["annix-core", "annix-forge", "annix-sentinel", "annix-orbit"],
  logistics: ["annix-core", "annix-orbit", "annix-sentinel", "annix-pulse"],
};

const DEFAULT_APPS = ["annix-core", "annix-forge", "annix-orbit", "annix-sentinel"];

export function IndustryView(props: {
  industry: MarketingIndustry;
  products: MarketingProduct[];
  heroImageUrl: string | null;
  bottomImageUrl: string | null;
}) {
  const industry = props.industry;
  const key = industry.name.toLowerCase();
  const wantedSlugs = key in INDUSTRY_APPS ? INDUSTRY_APPS[key] : DEFAULT_APPS;
  const relevant = wantedSlugs
    .map((slug) => props.products.find((product) => product.detailSlug === slug))
    .filter((product): product is MarketingProduct => product !== undefined);
  const heroImageUrl = props.heroImageUrl ? props.heroImageUrl : "";
  const bottomImageUrl = props.bottomImageUrl ? props.bottomImageUrl : "";
  return (
    <div className="relative overflow-hidden">
      {heroImageUrl ? (
        <>
          <div className="absolute inset-x-0 top-0 h-[26rem]">
            <img src={heroImageUrl} alt="" className="h-full w-full object-cover object-top" />
          </div>
          <div
            className="absolute inset-x-0 top-0 h-[26rem]"
            style={{
              backgroundImage: "linear-gradient(180deg, rgba(10,23,51,0.45) 0%, #0a1733 92%)",
            }}
          />
        </>
      ) : null}
      {bottomImageUrl ? (
        <>
          <div className="absolute inset-x-0 bottom-0 h-[22rem]">
            <img src={bottomImageUrl} alt="" className="h-full w-full object-cover object-bottom" />
          </div>
          <div
            className="absolute inset-x-0 bottom-0 h-[22rem]"
            style={{ backgroundImage: "linear-gradient(0deg, transparent 0%, #0a1733 78%)" }}
          />
        </>
      ) : null}

      <section className="relative px-4 py-24 sm:px-6 lg:px-8">
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

      <section className="relative px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-2xl font-bold text-white">
            Products for {industry.name}
          </h2>
          {relevant.length > 0 ? (
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              {relevant.map((product) => (
                <div
                  key={`${product.appKey}-${product.detailSlug}`}
                  className="w-[calc(50%-0.5rem)] sm:w-56 lg:w-64"
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-center text-white/50">
              Products for this industry are coming soon.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
