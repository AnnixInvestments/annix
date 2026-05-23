import type { Metadata } from "next";
import { AnnixOrbitAuthProvider } from "@/app/context/AnnixOrbitAuthContext";
import {
  ORBIT_BRANDING_FALLBACK,
  type OrbitBranding,
  resolveOrbitAssetUrl,
} from "@/app/lib/annix-orbit/branding";
import { API_BASE_URL, ipv4LocalhostUrl } from "@/lib/api-config";
import { OrbitBrandingProvider } from "./OrbitBrandingProvider";

async function orbitBrandingForMetadata(): Promise<OrbitBranding> {
  try {
    const url = ipv4LocalhostUrl(`${API_BASE_URL}/public/annix-orbit/branding`);
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return ORBIT_BRANDING_FALLBACK;
    return (await res.json()) as OrbitBranding;
  } catch {
    return ORBIT_BRANDING_FALLBACK;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const branding = await orbitBrandingForMetadata();
  const faviconUrl = resolveOrbitAssetUrl("favicon", branding);
  return {
    title: {
      template: "%s | Annix Orbit",
      default: "Annix Orbit",
    },
    description:
      "Annix Orbit — Hiring, Talent, Compliance. The intelligent workforce ecosystem for modern hiring, talent growth, and compliance.",
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
      <OrbitBrandingProvider>{children}</OrbitBrandingProvider>
    </AnnixOrbitAuthProvider>
  );
}
