import { type NextRequest, NextResponse } from "next/server";
import { ORBIT_MODULE_MANIFESTS, orbitModuleManifest } from "@/app/annix/orbit/config/pwaModules";
import { generateManifest } from "@/app/lib/branding";
import { type Branding, brandingFallback } from "@/app/lib/branding/branding";
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

export async function GET(request: NextRequest): Promise<NextResponse> {
  const branding = await orbitBranding();
  const navbarColor = branding.navbarColor;
  const themeColor = navbarColor || "#323288";

  const moduleParam = request.nextUrl.searchParams.get("module");
  // Default to the Seeker module when no module is specified: the installed app
  // must cold-start into the seeker flow (which routes a logged-out user to the
  // seeker login), never the /annix/orbit hub selector with every login option.
  const resolvedModule = orbitModuleManifest(moduleParam);
  const moduleManifest = resolvedModule ? resolvedModule : ORBIT_MODULE_MANIFESTS.seeker;

  const name = moduleManifest.name;
  const shortName = moduleManifest.name;
  const startUrl = moduleManifest.startUrl;
  const scope = moduleManifest.scope;
  const shortcuts = moduleManifest.shortcuts;

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
