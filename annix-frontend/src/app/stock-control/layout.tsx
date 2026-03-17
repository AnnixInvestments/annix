import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import StockControlLayoutClient from "./StockControlLayoutClient";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.startsWith("/")
  ? `http://localhost:${process.env.PORT || "4000"}${process.env.NEXT_PUBLIC_API_URL}`
  : process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001/api";

interface PublicBranding {
  companyName: string;
  brandingType: string;
  primaryColor: string | null;
  hasCustomLogo: boolean;
}

async function companyBranding(companyId: string): Promise<PublicBranding | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/stock-control/branding/${companyId}`, {
      next: { revalidate: 3600 },
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const companyId = cookieStore.get("sc_company_id")?.value;
  const branding = companyId ? await companyBranding(companyId) : null;
  const hasCustomIcon = branding?.hasCustomLogo === true;
  const companyName = branding?.companyName;

  const manifestUrl =
    companyId && branding
      ? `/api/stock-control/${companyId}/manifest.json`
      : "/stock-control-manifest.json";

  const title = companyName ? `${companyName} Stock Control` : "Annix Stock Control";

  const iconUrl =
    hasCustomIcon && companyId
      ? `/api/stock-control/${companyId}/icon/192`
      : "/images/annix-icon.png";

  const icons = {
    icon: [{ url: iconUrl, sizes: "192x192", type: "image/png" }],
    apple: [{ url: iconUrl, sizes: "192x192" }],
  };

  return {
    title: {
      template: `%s | ${title}`,
      default: title,
    },
    description: "Stock control and inventory management",
    manifest: manifestUrl,
    icons,
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: companyName ?? "Stock Control",
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#0d9488",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function StockControlLayout(props: { children: React.ReactNode }) {
  const { children } = props;
  return <StockControlLayoutClient>{children}</StockControlLayoutClient>;
}
