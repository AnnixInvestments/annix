import { portalForCode } from "@annix/product-data/portals";

/**
 * The single source of truth for the public URL of an Orbit job advert.
 *
 * On the Orbit prod host the middleware strips the `/annix/orbit` internal path
 * prefix, so the ONE resolvable public path is `/jobs/{ref}` (the Next route
 * `/annix/orbit/jobs/[ref]` is served there, and `/annix/orbit/jobs/{ref}`
 * 301-redirects to `/jobs/{ref}`). The feed, outbound emails, the Indexing-API
 * ping and the page canonical must all use exactly this URL.
 */
export function orbitPublicBaseUrl(): string {
  const override = process.env.ORBIT_PUBLIC_URL?.trim();
  if (override) return override.replace(/\/+$/, "");
  return `https://${portalForCode("annix-orbit").prodHost}`;
}

export function orbitPublicJobUrl(referenceNumber: string): string {
  return `${orbitPublicBaseUrl()}/jobs/${encodeURIComponent(referenceNumber)}`;
}
