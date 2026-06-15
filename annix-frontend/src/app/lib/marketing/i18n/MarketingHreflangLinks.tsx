"use client";

import { DEFAULT_MARKETING_LOCALE, MARKETING_LOCALES } from "@annix/product-data/marketing";
import { useEffect } from "react";

const HREFLANG_ATTR = "data-marketing-hreflang";

export function MarketingHreflangLinks() {
  useEffect(() => {
    const head = document.head;
    const existing = head.querySelectorAll(`link[${HREFLANG_ATTR}]`);
    existing.forEach((node) => node.remove());

    const origin = window.location.origin;
    const path = window.location.pathname;

    const append = (hreflang: string, href: string) => {
      const link = document.createElement("link");
      link.setAttribute("rel", "alternate");
      link.setAttribute("hreflang", hreflang);
      link.setAttribute("href", href);
      link.setAttribute(HREFLANG_ATTR, "true");
      head.appendChild(link);
    };

    MARKETING_LOCALES.forEach((locale) => {
      const href =
        locale === DEFAULT_MARKETING_LOCALE
          ? `${origin}${path}`
          : `${origin}${path}?lang=${locale}`;
      append(locale, href);
    });
    append("x-default", `${origin}${path}`);

    return () => {
      head.querySelectorAll(`link[${HREFLANG_ATTR}]`).forEach((node) => node.remove());
    };
  }, []);

  return null;
}
