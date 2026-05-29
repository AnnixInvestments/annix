import type { Branding } from "@/app/lib/branding/branding";
import { API_BASE_URL } from "@/lib/api-config";

/** Public, unauthenticated read of a brand's branding (used by app providers).
 *  Uses no-store so a refetch after publishing bypasses the endpoint's 30s HTTP
 *  cache and reflects new colours/assets immediately; TanStack Query's in-memory
 *  cache (staleTime) still prevents over-fetching during normal navigation. */
export async function fetchPublicBranding(brand: string): Promise<Branding> {
  const res = await fetch(`${API_BASE_URL}/public/branding/${encodeURIComponent(brand)}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Branding fetch failed for ${brand}: ${res.status}`);
  }
  return res.json();
}
