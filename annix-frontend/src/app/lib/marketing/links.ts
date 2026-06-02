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

export function loginPortals(): { code: PortalCode; label: string; href: string }[] {
  return PORTAL_HOSTS.filter(
    (portal) => portal.code !== "marketing" && portal.code !== "admin",
  ).map((portal) => ({
    code: portal.code,
    label: portal.displayName,
    href: portal.internalPathPrefix,
  }));
}
