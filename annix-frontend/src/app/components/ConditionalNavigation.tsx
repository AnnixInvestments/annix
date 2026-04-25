"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { shouldShowGlobalNavigation } from "../lib/navigation-utils";

const Navigation = dynamic(() => import("./Navigation"), { ssr: false });

const AU_INDUSTRIES_HOSTS = new Set(["auind.co.za", "www.auind.co.za"]);

function isAuIndustriesHost(): boolean {
  // eslint-disable-next-line no-restricted-syntax -- SSR guard; isUndefined(window) would throw
  if (typeof window === "undefined") return false;
  return AU_INDUSTRIES_HOSTS.has(window.location.hostname.toLowerCase());
}

export default function ConditionalNavigation() {
  const pathname = usePathname();

  if (isAuIndustriesHost()) {
    return null;
  }

  if (!shouldShowGlobalNavigation(pathname)) {
    return null;
  }

  return <Navigation />;
}
