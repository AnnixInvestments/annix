import type { Branding } from "@/app/lib/branding/branding";
import { API_BASE_URL } from "@/lib/api-config";

/** Public, unauthenticated read of a brand's branding (used by app providers). */
export async function fetchPublicBranding(brand: string): Promise<Branding> {
  const res = await fetch(`${API_BASE_URL}/public/branding/${encodeURIComponent(brand)}`);
  if (!res.ok) {
    throw new Error(`Branding fetch failed for ${brand}: ${res.status}`);
  }
  return res.json();
}
