"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { shouldShowGlobalNavigation } from "../lib/navigation-utils";

const Navigation = dynamic(() => import("./Navigation"), { ssr: false });

const AU_INDUSTRIES_HOSTS = new Set(["auind.co.za", "www.auind.co.za"]);
const MARKETING_WEBSITE_HOSTS = new Set(["annix.co.za", "www.annix.co.za"]);

function isAuIndustriesHost(): boolean {
  // eslint-disable-next-line no-restricted-syntax -- SSR guard; isUndefined(window) would throw
  if (typeof window === "undefined") return false;
  return AU_INDUSTRIES_HOSTS.has(window.location.hostname.toLowerCase());
}

function isMarketingWebsiteHost(): boolean {
  // eslint-disable-next-line no-restricted-syntax -- SSR guard; isUndefined(window) would throw
  if (typeof window === "undefined") return false;
  return MARKETING_WEBSITE_HOSTS.has(window.location.hostname.toLowerCase());
}

export default function ConditionalNavigation() {
  const pathname = usePathname();

  if (isAuIndustriesHost()) {
    return null;
  }

  // On every host except the marketing website, the root path is the launcher
  // hub (middleware rewrites "/" -> "/portals"), so it must keep the global nav
  // with the admin login. Only the marketing website (annix.co.za) renders its
  // own MarketingNav at "/" and suppresses the global one.
  if (pathname === "/" && !isMarketingWebsiteHost()) {
    return <Navigation />;
  }

  if (!shouldShowGlobalNavigation(pathname)) {
    return null;
  }

  return <Navigation />;
}
