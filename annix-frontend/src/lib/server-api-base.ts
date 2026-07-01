import { type PortalCode, portalForCode } from "@annix/product-data/portals";
import { headers } from "next/headers";
import { ipv4LocalhostUrl } from "@/lib/api-config";

const LOCAL_HOSTNAMES = ["localhost", "127.0.0.1"];

/**
 * Server-reachable API base for React Server Components.
 *
 * The browser base (`API_BASE_URL` / `browserBaseUrl()`) resolves the
 * browser-relative `NEXT_PUBLIC_API_URL="/api"` against a hardcoded
 * `http://localhost:3000` during SSR — the wrong port (Next serves on :4000,
 * the backend on :4001) — so every server-side fetch ECONNREFUSEs and the page
 * falls back to `notFound()` / branding fallback. An RSC must instead fetch the
 * same host that served the request, where `/api` is already routed to the
 * backend (verified: `https://orbit.annix.co.za/api/...` returns 200).
 *
 * The request `Host` header is attacker-controllable, so it is validated against
 * the portal's known hosts before use; an unrecognised host falls back to the
 * portal's canonical `prodHost` (never an arbitrary attacker origin — closes the
 * SSRF / reflected-content surface).
 */
export async function serverApiBaseUrl(portalCode: PortalCode): Promise<string> {
  const portal = portalForCode(portalCode);
  const headerList = await headers();
  const rawHost = headerList.get("host");
  const requestedHostname = rawHost?.split(":")[0].toLowerCase() ?? null;
  const allowedHostnames = [
    portal.prodHost,
    ...portal.prodHostAliases,
    portal.devHost,
    ...LOCAL_HOSTNAMES,
  ].map((entry) => entry.toLowerCase());
  const host =
    rawHost && requestedHostname && allowedHostnames.includes(requestedHostname)
      ? rawHost
      : portal.prodHost;
  const isLocalHost = host.includes("localhost") || host.startsWith("127.0.0.1");
  const proto = headerList.get("x-forwarded-proto") ?? (isLocalHost ? "http" : "https");
  return ipv4LocalhostUrl(`${proto}://${host}/api`);
}
