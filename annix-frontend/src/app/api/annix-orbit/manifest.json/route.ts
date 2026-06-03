import { type NextRequest, NextResponse } from "next/server";
import { generateManifest } from "@/app/lib/branding";
import { type Branding, brandingFallback, resolveBrandAssetUrl } from "@/app/lib/branding/branding";
import { API_BASE_URL, ipv4LocalhostUrl } from "@/lib/api-config";

async function orbitBranding(): Promise<Branding> {
  try {
    const url = ipv4LocalhostUrl(`${API_BASE_URL}/public/branding/annix-orbit`);
    const res = await fetch(url, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(2500) });
    if (!res.ok) return brandingFallback("annix-orbit");
    return (await res.json()) as Branding;
  } catch {
    return brandingFallback("annix-orbit");
  }
}

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const branding = await orbitBranding();
  const navbarColor = branding.navbarColor;
  const themeColor = navbarColor || "#323288";
  const iconUrl = resolveBrandAssetUrl("logoIcon", branding);

  const manifest = generateManifest({
    name: "Annix Orbit",
    shortName: "Orbit",
    startUrl: "/annix/orbit",
    scope: "/annix/orbit",
    themeColor,
    backgroundColor: "#f6f7fb",
    iconUrls: {
      size192: iconUrl,
      size512: iconUrl,
    },
    shortcuts: [
      { name: "My applications", url: "/annix/orbit/seeker/applications" },
      { name: "Interviews", url: "/annix/orbit/seeker/calendar" },
      { name: "Browse jobs", url: "/annix/orbit/seeker/jobs" },
    ],
  });

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
