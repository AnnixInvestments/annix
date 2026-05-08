import AppShell from "@/app/comply-sa/components/AppShell";
import { NixAppProvider, NixAssistant } from "@/app/lib/nix";

export default function AdvisorLayout({ children }: { children: React.ReactNode }) {
  return (
    <NixAppProvider appCode="comply-sa">
      <AppShell>{children}</AppShell>
      <NixAssistant
        context="general"
        pageContext={{ currentPage: "Comply SA Advisor", portalContext: "general" }}
      />
    </NixAppProvider>
  );
}
