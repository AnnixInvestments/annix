import { BrandingProvider } from "@/app/lib/branding/BrandingProvider";

export const metadata = {
  title: "Annix Sentinel",
  description: "AI-Powered Compliance & Risk Intelligence",
  icons: {
    icon: [{ url: "/branding/annix-sentinel-favicon.svg", type: "image/svg+xml" }],
    apple: "/branding/annix-sentinel-favicon.svg",
  },
};

export default function ComplySaLayout({ children }: { children: React.ReactNode }) {
  return (
    <BrandingProvider brand="comply-sa" surface={false}>
      {children}
    </BrandingProvider>
  );
}
