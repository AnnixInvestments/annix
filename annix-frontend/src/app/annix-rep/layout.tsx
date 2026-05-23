import type { Metadata } from "next";
import { BrandingProvider } from "@/app/lib/branding/BrandingProvider";
import { NixAppProvider, NixAssistant } from "@/app/lib/nix";
import AnnixRepLayoutClient from "./AnnixRepLayoutClient";

export const metadata: Metadata = {
  title: {
    template: "%s | Annix Rep",
    default: "Annix Rep",
  },
  description:
    "Mobile-first sales field assistant with smart prospecting, calendar sync, and meeting recording",
};

export default function AnnixRepLayout(props: { children: React.ReactNode }) {
  const { children } = props;
  return (
    <NixAppProvider appCode="annix-rep">
      <BrandingProvider brand="annix-rep" surface={false}>
        <AnnixRepLayoutClient>{children}</AnnixRepLayoutClient>
      </BrandingProvider>
      <NixAssistant
        context="general"
        pageContext={{ currentPage: "Annix Rep", portalContext: "general" }}
      />
    </NixAppProvider>
  );
}
