"use client";

import type { MarketingSiteContent } from "@annix/product-data/marketing";
import { type MouseEvent as ReactMouseEvent, useState } from "react";
import { MarketingShell } from "./MarketingShell";
import { AboutView } from "./views/AboutView";
import { ContactView } from "./views/ContactView";
import { HomeView } from "./views/HomeView";
import { IndustryView } from "./views/IndustryView";
import { ProductLandingView } from "./views/ProductLandingView";
import { ProductView } from "./views/ProductView";
import { PulseLandingView } from "./views/PulseLandingView";
import { PRODUCT_LANDING_CONFIGS, type ProductLandingConfig } from "./views/productLandingData";
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

  const firstProduct = content.ecosystem.products[0];
  const firstProductSlug = firstProduct ? firstProduct.detailSlug : "";
  const activeProductSlug = productSlug ? productSlug : firstProductSlug;
  const firstIndustry = content.industries.items[0];
  const firstIndustrySlug = firstIndustry ? firstIndustry.slug : "";
  const activeIndustrySlug = industrySlug ? industrySlug : firstIndustrySlug;
  const product = content.productPages.find((page) => page.slug === activeProductSlug);
  const industry = content.industries.items.find((item) => item.slug === activeIndustrySlug);
  const landingConfig: ProductLandingConfig | undefined =
    PRODUCT_LANDING_CONFIGS[activeProductSlug];
  const isPulseProduct = activeProductSlug === "annix-pulse";

  const navigateTo = (href: string): boolean => {
    if (href.startsWith("/#industries")) {
      setTab("industries");
      return true;
    }
    const path = href.split(/[?#]/)[0];
    if (path === "" || path === "/") {
      setTab("home");
      return true;
    }
    if (path.startsWith("/products/")) {
      const slug = path.slice("/products/".length);
      setTab("products");
      if (slug) {
        setProductSlug(slug);
      }
      return true;
    }
    if (path.startsWith("/industries/")) {
      const slug = path.slice("/industries/".length);
      setTab("industries");
      if (slug) {
        setIndustrySlug(slug);
      }
      return true;
    }
    if (path === "/industries") {
      setTab("industries");
      return true;
    }
    if (path.startsWith("/resources")) {
      setTab("resources");
      return true;
    }
    if (path.startsWith("/about")) {
      setTab("about");
      return true;
    }
    if (path.startsWith("/contact")) {
      setTab("contact");
      return true;
    }
    return false;
  };

  const handlePreviewNavClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    const target = event.target as Element;
    const anchor = target.closest("a");
    if (!anchor) {
      return;
    }
    const href = anchor.getAttribute("href");
    if (href === null || !href.startsWith("/")) {
      return;
    }
    if (href.startsWith("/labs")) {
      const text = anchor.textContent ? anchor.textContent : "";
      const match = content.ecosystem.products.find((entry) => text.includes(entry.name));
      event.preventDefault();
      if (match) {
        setTab("products");
        setProductSlug(match.detailSlug);
      } else {
        setTab("home");
      }
      return;
    }
    if (navigateTo(href)) {
      event.preventDefault();
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-y border-gray-200 bg-gray-50 px-3 py-2">
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
            {content.ecosystem.products.map((entry) => (
              <option key={entry.detailSlug} value={entry.detailSlug}>
                {entry.name}
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

      <div onClickCapture={handlePreviewNavClick}>
        <MarketingShell content={content}>
          {tab === "home" ? <HomeView content={content} /> : null}
          {tab === "products" ? (
            isPulseProduct ? (
              <PulseLandingView />
            ) : landingConfig ? (
              <ProductLandingView config={landingConfig} />
            ) : product ? (
              <ProductView page={product} />
            ) : null
          ) : null}
          {tab === "industries" && industry ? (
            <IndustryView industry={industry} productPages={content.productPages} />
          ) : null}
          {tab === "about" ? <AboutView about={content.about} /> : null}
          {tab === "resources" ? <ResourcesView content={content} /> : null}
          {tab === "contact" ? <ContactView /> : null}
        </MarketingShell>
      </div>
    </div>
  );
}
