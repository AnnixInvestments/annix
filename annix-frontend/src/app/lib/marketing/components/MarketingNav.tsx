"use client";

import type {
  MarketingIndustry,
  MarketingProduct,
  MarketingSite,
} from "@annix/product-data/marketing";
import { ChevronDown, LogIn, Menu, Shield, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useBrandingContext } from "@/app/lib/branding/BrandingProvider";
import { brandHasAsset, resolveBrandAssetUrl } from "@/app/lib/branding/branding";
import { MarketingLanguageSwitcher, useMarketingTranslations } from "@/app/lib/marketing/i18n";
import { loginPortalsForProducts } from "@/app/lib/marketing/links";

const PRIMARY_LINKS = [
  { key: "resources" as const, href: "/resources" },
  { key: "about" as const, href: "/about" },
  { key: "contact" as const, href: "/contact" },
];

// Temporarily hidden until launch — flip to true to restore the nav CTA.
const SHOW_BOOK_A_DEMO = false;

function BrandMark(props: { site: MarketingSite }) {
  const branding = useBrandingContext();
  const logoUrl = props.site.logoUrl ? props.site.logoUrl : "";
  const wordmarkUrl = props.site.wordmarkImageUrl ? props.site.wordmarkImageUrl : "";
  if (logoUrl || wordmarkUrl) {
    return (
      <span className="flex items-center gap-2 sm:gap-3">
        {logoUrl ? (
          <img src={logoUrl} alt={props.site.wordmark} className="h-14 w-auto sm:h-16" />
        ) : null}
        {wordmarkUrl ? (
          <img src={wordmarkUrl} alt={props.site.wordmark} className="h-9 w-auto sm:h-11" />
        ) : null}
      </span>
    );
  }
  const hasLockup = branding ? brandHasAsset("logoLockup", branding) : false;
  if (branding && hasLockup) {
    return (
      <img
        src={resolveBrandAssetUrl("logoLockup", branding)}
        alt={props.site.wordmark}
        className="h-8 w-auto sm:h-9"
      />
    );
  }
  return <span className="text-xl font-bold tracking-tight text-white">{props.site.wordmark}</span>;
}

export function MarketingNav(props: {
  products: MarketingProduct[];
  industries: MarketingIndustry[];
  site: MarketingSite;
}) {
  const products = props.products;
  const industries = props.industries;
  const site = props.site;
  const t = useMarketingTranslations("nav");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const [industriesOpen, setIndustriesOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const portals = loginPortalsForProducts(products);

  return (
    <header className="absolute inset-x-0 top-0 z-50">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <BrandMark site={site} />
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          <div
            className="relative"
            onMouseEnter={() => setProductsOpen(true)}
            onMouseLeave={() => setProductsOpen(false)}
          >
            <button
              type="button"
              className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-white/80 transition hover:text-white"
            >
              {t("products")}
              <ChevronDown className="h-4 w-4" />
            </button>
            {productsOpen ? (
              <div className="absolute left-0 top-full w-72 rounded-xl border border-white/10 bg-slate-900 p-2 shadow-2xl">
                {products.map((product) => {
                  const href = product.comingSoon ? "/labs" : `/products/${product.detailSlug}`;
                  return (
                    <Link
                      key={`${product.appKey}-${product.detailSlug}`}
                      href={href}
                      className="block rounded-lg px-3 py-2 transition hover:bg-white/5"
                    >
                      <div className="text-sm font-semibold text-white">{product.name}</div>
                      <div className="text-xs text-white/50">{product.category}</div>
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div
            className="relative"
            onMouseEnter={() => setIndustriesOpen(true)}
            onMouseLeave={() => setIndustriesOpen(false)}
          >
            <button
              type="button"
              className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-white/80 transition hover:text-white"
            >
              {t("industries")}
              <ChevronDown className="h-4 w-4" />
            </button>
            {industriesOpen ? (
              <div className="absolute left-0 top-full w-64 rounded-xl border border-white/10 bg-slate-900 p-2 shadow-2xl">
                {industries.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/industries/${item.slug}`}
                    className="block rounded-lg px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/5"
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          {PRIMARY_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-white/80 transition hover:text-white"
            >
              {t(link.key)}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <MarketingLanguageSwitcher variant="nav" />
          <div
            className="relative"
            onMouseEnter={() => setLoginOpen(true)}
            onMouseLeave={() => setLoginOpen(false)}
          >
            <button
              type="button"
              className="flex items-center gap-1 rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              <LogIn className="h-4 w-4" />
              {t("login")}
              <ChevronDown className="h-4 w-4" />
            </button>
            {loginOpen ? (
              <div className="absolute right-0 top-full grid w-64 grid-cols-1 gap-1 rounded-xl border border-white/10 bg-slate-900 p-2 shadow-2xl">
                {portals.map((portal) => (
                  <Link
                    key={portal.code}
                    href={portal.href}
                    className="rounded-lg px-3 py-2 text-sm text-white/80 transition hover:bg-white/5 hover:text-white"
                  >
                    {portal.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          <Link
            href="/admin/login"
            className="flex items-center gap-1 rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          >
            <Shield className="h-4 w-4" />
            Admin
          </Link>

          {SHOW_BOOK_A_DEMO ? (
            <Link
              href="/contact"
              className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg transition hover:opacity-90"
              style={{ backgroundColor: "var(--brand-accent)" }}
            >
              {t("bookDemo")}
            </Link>
          ) : null}
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-white lg:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {mobileOpen ? (
        <div className="mx-4 rounded-2xl border border-white/10 bg-slate-900 px-4 py-4 lg:hidden">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">
            {t("products")}
          </div>
          {products.map((product) => {
            const href = product.comingSoon ? "/labs" : `/products/${product.detailSlug}`;
            return (
              <Link
                key={`${product.appKey}-${product.detailSlug}`}
                href={href}
                className="block rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/5"
                onClick={() => setMobileOpen(false)}
              >
                {product.name}
              </Link>
            );
          })}
          <div className="mt-3 border-t border-white/10 pt-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">
              {t("industries")}
            </div>
            {industries.map((item) => (
              <Link
                key={item.slug}
                href={`/industries/${item.slug}`}
                className="block rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/5"
                onClick={() => setMobileOpen(false)}
              >
                {item.name}
              </Link>
            ))}
          </div>
          <div className="mt-3 border-t border-white/10 pt-3">
            {PRIMARY_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/5"
                onClick={() => setMobileOpen(false)}
              >
                {t(link.key)}
              </Link>
            ))}
          </div>
          <div className="mt-3 border-t border-white/10 pt-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">
              {t("login")}
            </div>
            {portals.map((portal) => (
              <Link
                key={portal.code}
                href={portal.href}
                className="block rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/5"
                onClick={() => setMobileOpen(false)}
              >
                {portal.label}
              </Link>
            ))}
            <Link
              href="/admin/login"
              className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/5"
              onClick={() => setMobileOpen(false)}
            >
              <Shield className="h-4 w-4" />
              Admin login
            </Link>
          </div>
          {SHOW_BOOK_A_DEMO ? (
            <Link
              href="/contact"
              className="mt-3 block rounded-lg px-4 py-2 text-center text-sm font-semibold text-slate-900"
              style={{ backgroundColor: "var(--brand-accent)" }}
              onClick={() => setMobileOpen(false)}
            >
              {t("bookDemo")}
            </Link>
          ) : null}
          <MarketingLanguageSwitcher variant="mobile" />
        </div>
      ) : null}
    </header>
  );
}
