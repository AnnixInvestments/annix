"use client";

import type { MarketingResource, MarketingSiteContent } from "@annix/product-data/marketing";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useState } from "react";

function ResourceDetail(props: { resource: MarketingResource; onBack: () => void }) {
  const resource = props.resource;
  const imageUrl = resource.imageUrl ? resource.imageUrl : "";
  const ctaUrl = resource.ctaUrl ? resource.ctaUrl : "";
  const ctaLabelRaw = resource.ctaLabel;
  const ctaLabel = ctaLabelRaw ? ctaLabelRaw : "Register your interest";
  // External CTAs (e.g. a "Website launched → annix.co.za" post) open the site
  // in a new tab; internal app links navigate in place.
  const isExternalCta = ctaUrl.startsWith("http");
  const ctaTarget = isExternalCta ? "_blank" : undefined;
  const ctaRel = isExternalCta ? "noopener noreferrer" : undefined;
  const paragraphs = resource.body.split("\n\n");
  return (
    <section className="px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={props.onBack}
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-white/60 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          All resources
        </button>
        <div className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-accent)]">
          {resource.category}
        </div>
        <h1
          className="mt-3 text-3xl font-bold text-white sm:text-4xl"
          style={{ fontFamily: "var(--brand-font-display)" }}
        >
          {resource.title}
        </h1>
        {imageUrl ? (
          ctaUrl ? (
            // The pre-launch creatives have the "Register your interest" button
            // baked into the artwork, so make the whole image link to the CTA
            // (e.g. the seeker early-access page) — clicking the painted button
            // now actually navigates.
            <a
              href={ctaUrl}
              target={ctaTarget}
              rel={ctaRel}
              aria-label={ctaLabel}
              className="mt-8 block"
            >
              <img
                src={imageUrl}
                alt={resource.title}
                className="w-full rounded-2xl border border-white/10 transition hover:border-white/30"
              />
            </a>
          ) : (
            <img
              src={imageUrl}
              alt={resource.title}
              className="mt-8 w-full rounded-2xl border border-white/10"
            />
          )
        ) : null}
        <div className="mt-8 space-y-5">
          {paragraphs.map((paragraph, index) => (
            <p key={`para-${index}`} className="text-lg leading-relaxed text-white/70">
              {paragraph}
            </p>
          ))}
        </div>
        {ctaUrl ? (
          <a
            href={ctaUrl}
            target={ctaTarget}
            rel={ctaRel}
            className="mt-10 inline-flex items-center gap-2 rounded-full bg-[var(--brand-accent)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            {ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </a>
        ) : null}
      </div>
    </section>
  );
}

export function ResourcesView(props: { content: MarketingSiteContent }) {
  const resources = props.content.resources.items.filter((resource) => resource.published);
  const [category, setCategory] = useState<string>("All");
  const [selected, setSelected] = useState<MarketingResource | null>(null);

  if (selected) {
    return <ResourceDetail resource={selected} onBack={() => setSelected(null)} />;
  }

  const seen = new Set<string>();
  const categories = resources.reduce<string[]>((acc, resource) => {
    if (seen.has(resource.category)) {
      return acc;
    }
    seen.add(resource.category);
    return [...acc, resource.category];
  }, []);
  const tabs = ["All", ...categories];
  const filtered =
    category === "All" ? resources : resources.filter((r) => r.category === category);
  const heroImageUrl = props.content.hero.imageUrl ? props.content.hero.imageUrl : "";
  const bottomImageUrl = props.content.ctaBand.backgroundImageUrl
    ? props.content.ctaBand.backgroundImageUrl
    : "";

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
          <h1
            className="text-4xl font-bold text-white sm:text-5xl"
            style={{ fontFamily: "var(--brand-font-display)" }}
          >
            {props.content.resources.heading}
          </h1>
          <p className="mt-4 text-lg text-white/60">{props.content.resources.subheading}</p>
        </div>

        <div className="mx-auto mt-10 flex max-w-4xl flex-wrap justify-center gap-2">
          {tabs.map((tab) => {
            const active = tab === category;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setCategory(tab)}
                className={
                  active
                    ? "rounded-full border border-[var(--brand-accent)] bg-[var(--brand-accent)]/15 px-4 py-1.5 text-sm font-semibold text-white"
                    : "rounded-full border border-white/15 px-4 py-1.5 text-sm font-medium text-white/60 transition hover:border-white/30 hover:text-white"
                }
              >
                {tab}
              </button>
            );
          })}
        </div>

        <div className="mx-auto mt-12 grid max-w-6xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((resource) => {
            const imageUrl = resource.imageUrl ? resource.imageUrl : "";
            return (
              <button
                key={resource.slug}
                type="button"
                onClick={() => setSelected(resource)}
                className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 text-left transition hover:border-white/25 hover:bg-white/10"
              >
                {imageUrl ? (
                  <img src={imageUrl} alt="" className="aspect-[16/9] w-full object-cover" />
                ) : (
                  <div className="aspect-[16/9] w-full bg-gradient-to-br from-white/10 to-transparent" />
                )}
                <div className="flex flex-1 flex-col p-6">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-accent)]">
                    {resource.category}
                  </div>
                  <div className="mt-2 text-lg font-semibold text-white">{resource.title}</div>
                  <p className="mt-2 text-sm text-white/60">{resource.excerpt}</p>
                  <span className="mt-4 text-sm font-medium text-[var(--brand-accent)]">
                    Read more
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
