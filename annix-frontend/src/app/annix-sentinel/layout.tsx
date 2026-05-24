import { BrandingProvider } from "@/app/lib/branding/BrandingProvider";

export const metadata = {
  title: "Annix Sentinel",
  description: "AI-Powered Compliance & Risk Intelligence",
  icons: {
    icon: [{ url: "/branding/annix-sentinel-favicon.svg", type: "image/svg+xml" }],
    apple: "/branding/annix-sentinel-favicon.svg",
  },
};

export default function AnnixSentinelLayout({ children }: { children: React.ReactNode }) {
  return (
    <BrandingProvider brand="annix-sentinel" surface={false}>
      {children}
    </BrandingProvider>
  );
}
