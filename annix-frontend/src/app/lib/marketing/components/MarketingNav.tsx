"use client";

import type { MarketingProduct } from "@annix/product-data/marketing";
import { ChevronDown, LogIn, Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useBrandingContext } from "@/app/lib/branding/BrandingProvider";
import { brandHasAsset, resolveBrandAssetUrl } from "@/app/lib/branding/branding";
import { loginPortals } from "@/app/lib/marketing/links";

const PRIMARY_LINKS = [
  { label: "Industries", href: "/#industries" },
  { label: "Resources", href: "/resources" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

function BrandMark() {
  const branding = useBrandingContext();
  const hasLockup = branding ? brandHasAsset("logoLockup", branding) : false;
  if (branding && hasLockup) {
    const url = resolveBrandAssetUrl("logoLockup", branding);
    return <img src={url} alt="Annix" className="h-8 w-auto" />;
  }
  return (
    <span
      className="text-xl font-bold tracking-tight text-white"
      style={{ fontFamily: "var(--brand-font-display)" }}
    >
      Annix
      <span style={{ color: "var(--brand-accent)" }}>.</span>
    </span>
  );
}

export function MarketingNav(props: { products: MarketingProduct[] }) {
  const products = props.products;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const portals = loginPortals();

  return (
    <header
      className="sticky top-0 z-50 border-b border-white/10 backdrop-blur-md"
      style={{ backgroundColor: "color-mix(in srgb, var(--brand-navbar) 88%, transparent)" }}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <BrandMark />
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          <div
            className="relative"
            onMouseEnter={() => setProductsOpen(true)}
            onMouseLeave={() => setProductsOpen(false)}
          >
            <button
              type="button"
              className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              Products
              <ChevronDown className="h-4 w-4" />
            </button>
            {productsOpen ? (
              <div className="absolute left-0 top-full w-72 rounded-xl border border-white/10 bg-slate-900 p-2 shadow-2xl">
                {products.map((product) => {
                  const href = product.comingSoon ? "/labs" : `/products/${product.detailSlug}`;
                  return (
                    <Link
                      key={product.appKey}
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

          {PRIMARY_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <div
            className="relative"
            onMouseEnter={() => setLoginOpen(true)}
            onMouseLeave={() => setLoginOpen(false)}
          >
            <button
              type="button"
              className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              <LogIn className="h-4 w-4" />
              Login
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
            href="/contact"
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:opacity-90"
            style={{ backgroundColor: "var(--brand-accent)" }}
          >
            Book a demo
          </Link>
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
        <div className="border-t border-white/10 bg-slate-900 px-4 py-4 lg:hidden">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">
            Products
          </div>
          {products.map((product) => {
            const href = product.comingSoon ? "/labs" : `/products/${product.detailSlug}`;
            return (
              <Link
                key={product.appKey}
                href={href}
                className="block rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/5"
                onClick={() => setMobileOpen(false)}
              >
                {product.name}
              </Link>
            );
          })}
          <div className="mt-3 border-t border-white/10 pt-3">
            {PRIMARY_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/5"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="mt-3 border-t border-white/10 pt-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">
              Login
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
          </div>
          <Link
            href="/contact"
            className="mt-3 block rounded-lg px-4 py-2 text-center text-sm font-semibold text-white"
            style={{ backgroundColor: "var(--brand-accent)" }}
            onClick={() => setMobileOpen(false)}
          >
            Book a demo
          </Link>
        </div>
      ) : null}
    </header>
  );
}
