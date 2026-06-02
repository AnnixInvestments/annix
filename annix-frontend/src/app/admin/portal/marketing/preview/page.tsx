"use client";

import { useState } from "react";
import { MarketingShell } from "@/app/lib/marketing/components/MarketingShell";
import { AboutView } from "@/app/lib/marketing/components/views/AboutView";
import { ContactView } from "@/app/lib/marketing/components/views/ContactView";
import { HomeView } from "@/app/lib/marketing/components/views/HomeView";
import { IndustryView } from "@/app/lib/marketing/components/views/IndustryView";
import { LabsView } from "@/app/lib/marketing/components/views/LabsView";
import { ProductView } from "@/app/lib/marketing/components/views/ProductView";
import { ResourcesView } from "@/app/lib/marketing/components/views/ResourcesView";
import { useMarketingDraft } from "@/app/lib/query/hooks";

type Tab = "home" | "products" | "industries" | "about" | "labs" | "resources" | "contact";

const TABS: { key: Tab; label: string }[] = [
  { key: "home", label: "Home" },
  { key: "products", label: "Products" },
  { key: "industries", label: "Industries" },
  { key: "about", label: "About" },
  { key: "labs", label: "Labs" },
  { key: "resources", label: "Resources" },
  { key: "contact", label: "Contact" },
];

export default function MarketingPreviewPage() {
  const draftQuery = useMarketingDraft();
  const content = draftQuery.data;
  const [tab, setTab] = useState<Tab>("home");
  const [productSlug, setProductSlug] = useState<string>("");
  const [industrySlug, setIndustrySlug] = useState<string>("");

  if (!content) {
    return <div className="p-6 text-gray-500">Loading preview…</div>;
  }

  const firstProduct = content.productPages[0];
  const firstProductSlug = firstProduct ? firstProduct.slug : "";
  const activeProductSlug = productSlug ? productSlug : firstProductSlug;
  const firstIndustry = content.industries.items[0];
  const firstIndustrySlug = firstIndustry ? firstIndustry.slug : "";
  const activeIndustrySlug = industrySlug ? industrySlug : firstIndustrySlug;
  const product = content.productPages.find((page) => page.slug === activeProductSlug);
  const industry = content.industries.items.find((item) => item.slug === activeIndustrySlug);

  return (
    <div>
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b border-gray-200 bg-white px-4 py-3">
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
          Draft preview — not live
        </span>
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
        {tab === "labs" ? <LabsView labs={content.labs} /> : null}
        {tab === "resources" ? <ResourcesView content={content} /> : null}
        {tab === "contact" ? <ContactView /> : null}
      </MarketingShell>
    </div>
  );
}
