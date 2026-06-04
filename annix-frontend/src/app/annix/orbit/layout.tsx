import type { Metadata, Viewport } from "next";
import { AnnixOrbitAuthProvider } from "@/app/context/AnnixOrbitAuthContext";
import { BrandingProvider } from "@/app/lib/branding/BrandingProvider";
import { type Branding, brandingFallback, resolveBrandAssetUrl } from "@/app/lib/branding/branding";
import { API_BASE_URL, ipv4LocalhostUrl } from "@/lib/api-config";
import { OrbitPwaProvider } from "./components/OrbitPwaProvider";

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
    manifest: "/api/annix-orbit/manifest.json",
    icons: {
      icon: [{ url: faviconUrl, sizes: "any" }],
      apple: [{ url: "/branding/annix-orbit-apple-touch-icon.png", sizes: "180x180" }],
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "Orbit",
    },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const branding = await orbitBrandingForMetadata();
  const navbarColor = branding.navbarColor;
  return {
    themeColor: navbarColor || "#323288",
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
  };
}

export default function AnnixOrbitLayout(props: { children: React.ReactNode }) {
  const { children } = props;
  return (
    <AnnixOrbitAuthProvider>
      <BrandingProvider brand="annix-orbit">
        <OrbitPwaProvider>{children}</OrbitPwaProvider>
      </BrandingProvider>
    </AnnixOrbitAuthProvider>
  );
}
