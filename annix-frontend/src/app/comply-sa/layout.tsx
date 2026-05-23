import { BrandingProvider } from "@/app/lib/branding/BrandingProvider";

export const metadata = {
  title: "Annix Comply SA",
  description: "SA SME compliance dashboard",
};

export default function ComplySaLayout({ children }: { children: React.ReactNode }) {
  return (
    <BrandingProvider brand="comply-sa" surface={false}>
      {children}
    </BrandingProvider>
  );
}
