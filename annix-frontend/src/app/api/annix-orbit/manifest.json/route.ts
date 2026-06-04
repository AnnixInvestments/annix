import { type NextRequest, NextResponse } from "next/server";
import { orbitModuleManifest } from "@/app/annix/orbit/config/pwaModules";
import { generateManifest } from "@/app/lib/branding";
import { type Branding, brandingFallback } from "@/app/lib/branding/branding";
import { API_BASE_URL, ipv4LocalhostUrl } from "@/lib/api-config";

const DEFAULT_SHORTCUTS = [
  { name: "My applications", url: "/annix/orbit/seeker/applications" },
  { name: "Interviews", url: "/annix/orbit/seeker/calendar" },
  { name: "Browse jobs", url: "/annix/orbit/seeker/jobs" },
];

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

export async function GET(request: NextRequest): Promise<NextResponse> {
  const branding = await orbitBranding();
  const navbarColor = branding.navbarColor;
  const themeColor = navbarColor || "#323288";

  const moduleParam = request.nextUrl.searchParams.get("module");
  const moduleManifest = orbitModuleManifest(moduleParam);

  const name = moduleManifest ? moduleManifest.name : "Annix Orbit";
  const shortName = moduleManifest ? moduleManifest.name : "Orbit";
  const startUrl = moduleManifest ? moduleManifest.startUrl : "/annix/orbit";
  const scope = moduleManifest ? moduleManifest.scope : "/annix/orbit";
  const shortcuts = moduleManifest ? moduleManifest.shortcuts : DEFAULT_SHORTCUTS;

  const manifest = generateManifest({
    name,
    shortName,
    startUrl,
    scope,
    themeColor,
    backgroundColor: "#f6f7fb",
    iconUrls: {
      size192: "/branding/annix-orbit-icon-192.png",
      size512: "/branding/annix-orbit-icon-512.png",
      maskable512: "/branding/annix-orbit-icon-maskable.png",
    },
    shortcuts,
  });

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
