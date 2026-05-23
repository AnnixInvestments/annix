import type { Metadata } from "next";
import { AnnixOrbitAuthProvider } from "@/app/context/AnnixOrbitAuthContext";
import { BrandingProvider } from "@/app/lib/branding/BrandingProvider";
import { type Branding, brandingFallback, resolveBrandAssetUrl } from "@/app/lib/branding/branding";
import { API_BASE_URL, ipv4LocalhostUrl } from "@/lib/api-config";

async function orbitBrandingForMetadata(): Promise<Branding> {
  try {
    const url = ipv4LocalhostUrl(`${API_BASE_URL}/public/branding/annix-orbit`);
    // Short timeout + fallback so a production build (no backend reachable)
    // never hangs prerendering these pages.
    const res = await fetch(url, { next: { revalidate: 60 }, signal: AbortSignal.timeout(2500) });
    if (!res.ok) return brandingFallback("annix-orbit");
    return (await res.json()) as Branding;
  } catch {
    return brandingFallback("annix-orbit");
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const branding = await orbitBrandingForMetadata();
  const faviconUrl = resolveBrandAssetUrl("favicon", branding);
  return {
    title: {
      template: "%s | Annix Orbit",
      default: "Annix Orbit",
    },
    description: `Annix Orbit — ${branding.tagline}. ${branding.description}`,
    icons: {
      icon: [{ url: faviconUrl, sizes: "any" }],
      apple: faviconUrl,
    },
  };
}

export default function AnnixOrbitLayout(props: { children: React.ReactNode }) {
  const { children } = props;
  return (
    <AnnixOrbitAuthProvider>
      <BrandingProvider brand="annix-orbit">{children}</BrandingProvider>
    </AnnixOrbitAuthProvider>
  );
}
