"use client";

import type { MarketingSiteContent } from "@annix/product-data/marketing";
import { useState } from "react";
import { MarketingShell } from "./MarketingShell";
import { AboutView } from "./views/AboutView";
import { ContactView } from "./views/ContactView";
import { HomeView } from "./views/HomeView";
import { IndustryView } from "./views/IndustryView";
import { ProductView } from "./views/ProductView";
import { ResourcesView } from "./views/ResourcesView";

type Tab = "home" | "products" | "industries" | "about" | "resources" | "contact";

const TABS: { key: Tab; label: string }[] = [
  { key: "home", label: "Home" },
  { key: "products", label: "Products" },
  { key: "industries", label: "Industries" },
  { key: "about", label: "About" },
  { key: "resources", label: "Resources" },
  { key: "contact", label: "Contact" },
];

export function MarketingSitePreview(props: { content: MarketingSiteContent }) {
  const content = props.content;
  const [tab, setTab] = useState<Tab>("home");
  const [productSlug, setProductSlug] = useState<string>("");
  const [industrySlug, setIndustrySlug] = useState<string>("");

  const firstProduct = content.productPages[0];
  const firstProductSlug = firstProduct ? firstProduct.slug : "";
  const activeProductSlug = productSlug ? productSlug : firstProductSlug;
  const firstIndustry = content.industries.items[0];
  const firstIndustrySlug = firstIndustry ? firstIndustry.slug : "";
  const activeIndustrySlug = industrySlug ? industrySlug : firstIndustrySlug;
  const product = content.productPages.find((page) => page.slug === activeProductSlug);
  const industry = content.industries.items.find((item) => item.slug === activeIndustrySlug);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2">
        {TABS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => setTab(entry.key)}
            className={
              tab === entry.key
                ? "rounded-lg bg-[#323288] px-3 py-1.5 text-sm font-semibold text-white"
                : "rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
            }
          >
            {entry.label}
          </button>
        ))}
        {tab === "products" ? (
          <select
            value={activeProductSlug}
            onChange={(event) => setProductSlug(event.target.value)}
            className="ml-auto rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
          >
            {content.productPages.map((page) => (
              <option key={page.slug} value={page.slug}>
                {page.name}
              </option>
            ))}
          </select>
        ) : null}
        {tab === "industries" ? (
          <select
            value={activeIndustrySlug}
            onChange={(event) => setIndustrySlug(event.target.value)}
            className="ml-auto rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
          >
            {content.industries.items.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <MarketingShell content={content}>
        {tab === "home" ? <HomeView content={content} /> : null}
        {tab === "products" && product ? <ProductView page={product} /> : null}
        {tab === "industries" && industry ? (
          <IndustryView industry={industry} productPages={content.productPages} />
        ) : null}
        {tab === "about" ? <AboutView about={content.about} /> : null}
        {tab === "resources" ? <ResourcesView content={content} /> : null}
        {tab === "contact" ? <ContactView /> : null}
      </MarketingShell>
    </div>
  );
}
