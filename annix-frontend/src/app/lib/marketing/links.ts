import type { MarketingProduct } from "@annix/product-data/marketing";
import { PORTAL_HOSTS, type PortalCode, portalForCode } from "@annix/product-data/portals";

const PORTAL_CODES = new Set<string>(PORTAL_HOSTS.map((portal) => portal.code));

function isPortalCode(code: string | null): code is PortalCode {
  return code !== null && PORTAL_CODES.has(code);
}

export function loginHrefForPortal(portalCode: string | null): string | null {
  if (!isPortalCode(portalCode)) {
    return null;
  }
  return portalForCode(portalCode).internalPathPrefix;
}

const LOGIN_PORTALS: Record<string, { label: string; href: string }> = {
  "annix-core": { label: "Annix Core", href: "/stock-control" },
  "annix-forge": { label: "Annix Forge", href: "/rfq" },
  "annix-orbit": { label: "Annix Orbit", href: "/annix/orbit" },
  "annix-pulse": { label: "Annix Pulse", href: "/annix-rep" },
  "annix-sentinel": { label: "Annix Sentinel", href: "/annix-sentinel" },
  "annix-insights": { label: "Annix Insights", href: "/insights" },
  "annix-nexus": { label: "Annix Nexus", href: "/contact" },
};

export function loginPortalsForProducts(
  products: MarketingProduct[],
): { code: string; label: string; href: string }[] {
  return products
    .filter((product) => !product.comingSoon && product.detailSlug in LOGIN_PORTALS)
    .map((product) => {
      const portal = LOGIN_PORTALS[product.detailSlug];
      return { code: product.detailSlug, label: portal.label, href: portal.href };
    });
}
