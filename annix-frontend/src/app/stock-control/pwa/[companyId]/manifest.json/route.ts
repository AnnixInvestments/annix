import { NextRequest, NextResponse } from "next/server";
import { generateManifest } from "@/app/lib/branding";
import { ipv4LocalhostUrl } from "@/lib/api-config";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const port = process.env.PORT;
// ipv4LocalhostUrl rewrites any "localhost" to "127.0.0.1" so undici
// doesn't IPv6-first against an IPv4-only NestJS listener — required
// because env-var values inline at compile-time and override our
// in-code fallback.
const BACKEND_URL = ipv4LocalhostUrl(
  apiUrl?.startsWith("/")
    ? `http://127.0.0.1:${port || "4000"}${apiUrl}`
    : apiUrl || "http://127.0.0.1:4001/api",
);

interface PublicBrandingResponse {
  companyName: string;
  brandingType: string;
  primaryColor: string | null;
  accentColor: string | null;
  hasCustomLogo: boolean;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
): Promise<NextResponse> {
  const { companyId } = await params;

  try {
    const response = await fetch(`${BACKEND_URL}/stock-control/branding/${companyId}`, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Branding not found" }, { status: response.status });
    }

    const branding: PublicBrandingResponse = await response.json();

    const primaryColor = branding.primaryColor;
    const themeColor = primaryColor || "#0d9488";
    const hasCustomIcon = branding.hasCustomLogo;

    const manifest = generateManifest({
      name: `${branding.companyName} Stock Control`,
      shortName: branding.companyName.length > 12 ? "Stock Control" : branding.companyName,
      startUrl: "/stock-control/portal/dashboard",
      scope: "/stock-control",
      themeColor,
      backgroundColor: "#f9fafb",
      iconUrls: {
        size192: hasCustomIcon
          ? `/stock-control/pwa/${companyId}/icon/192`
          : "/images/annix-icon.png",
        size512: hasCustomIcon
          ? `/stock-control/pwa/${companyId}/icon/512`
          : "/images/annix-icon.png",
      },
      shortcuts: [
        { name: "Dashboard", url: "/stock-control/portal/dashboard" },
        { name: "Inventory", url: "/stock-control/portal/inventory" },
        { name: "Job Cards", url: "/stock-control/portal/job-cards" },
        { name: "Deliveries", url: "/stock-control/portal/deliveries" },
      ],
    });

    return NextResponse.json(manifest, {
      headers: {
        "Content-Type": "application/manifest+json",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to generate manifest";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
