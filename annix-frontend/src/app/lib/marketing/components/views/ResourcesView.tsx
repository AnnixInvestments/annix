"use client";

import type { MarketingResource, MarketingSiteContent } from "@annix/product-data/marketing";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";

function ResourceDetail(props: { resource: MarketingResource; onBack: () => void }) {
  const resource = props.resource;
  const imageUrl = resource.imageUrl ? resource.imageUrl : "";
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
          <img
            src={imageUrl}
            alt=""
            className="mt-8 aspect-[16/9] w-full rounded-2xl border border-white/10 object-cover"
          />
        ) : null}
        <div className="mt-8 space-y-5">
          {paragraphs.map((paragraph, index) => (
            <p key={`para-${index}`} className="text-lg leading-relaxed text-white/70">
              {paragraph}
            </p>
          ))}
        </div>
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

  return (
    <section className="px-4 py-24 sm:px-6 lg:px-8">
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
  );
}
