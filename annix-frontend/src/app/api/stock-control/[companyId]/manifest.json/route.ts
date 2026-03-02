import { NextRequest, NextResponse } from "next/server";
import { generateManifest } from "@/app/lib/branding";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.startsWith("/")
  ? `http://localhost:${process.env.PORT || "4000"}${process.env.NEXT_PUBLIC_API_URL}`
  : process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001/api";

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

    const themeColor = branding.primaryColor || "#0d9488";
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
          ? `/api/stock-control/${companyId}/icon/192`
          : "/images/stock-control-icon-192.png",
        size512: hasCustomIcon
          ? `/api/stock-control/${companyId}/icon/512`
          : "/images/stock-control-icon-512.png",
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
