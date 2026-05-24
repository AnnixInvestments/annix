import AppShell from "@/app/annix-sentinel/components/AppShell";
import { NixAppProvider, NixAssistant } from "@/app/lib/nix";

export default function AdvisorLayout({ children }: { children: React.ReactNode }) {
  return (
    <NixAppProvider appCode="annix-sentinel">
      <AppShell>{children}</AppShell>
      <NixAssistant
        context="general"
        pageContext={{ currentPage: "Annix Sentinel Advisor", portalContext: "general" }}
      />
    </NixAppProvider>
  );
}
