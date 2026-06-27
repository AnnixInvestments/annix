"use client";

import type { ReactNode } from "react";
import { AuRubberDynamicBranding } from "@/app/au-rubber/components/AuRubberDynamicBranding";
import { AuRubberNotificationProvider } from "@/app/au-rubber/components/AuRubberNotificationProvider";
import { AuRubberBrandingProvider } from "@/app/context/AuRubberBrandingContext";
import { NixAppProvider } from "@/app/lib/nix";
import { ErrorModalProvider } from "@/app/stock-control/context/ErrorModalContext";
import { GlossaryProvider } from "@/app/stock-control/context/GlossaryContext";
import { StockControlBrandingProvider } from "@/app/stock-control/context/StockControlBrandingContext";
import { StockControlRbacProvider } from "@/app/stock-control/context/StockControlRbacContext";
import { ViewAsProvider } from "@/app/stock-control/context/ViewAsContext";
import type { CoreApp } from "../config/navAppMap";

/**
 * Replicates each app's SECONDARY (non-auth) provider stack inside the unified
 * shell, conditional on `activeApp`, so a hosted real app page finds every
 * context it consumes. Exactly one stack mounts at a time, consistent with the
 * single-auth-provider rule (the matching real auth provider is already mounted
 * by ActiveAppAuthMount above this).
 *
 * The provider components are reused as-is (never edited/forked) and each one
 * self-fetches what it needs via the active portal token store — none take a
 * companyId prop — so the shell needn't supply company data the AU profile
 * lacks. Toast is intentionally absent here: ToastProvider is mounted globally
 * in components/Providers.tsx, so useToast already resolves.
 */
function StockControlProviders(props: { children: ReactNode }) {
  // Mirrors stock-control/portal/layout.tsx: NixAppProvider (outer, above auth
  // in the real tree) → Branding → ErrorModal → Rbac → ViewAs → Glossary.
  return (
    <NixAppProvider appCode="stock-control">
      <StockControlBrandingProvider>
        <ErrorModalProvider>
          <StockControlRbacProvider>
            <ViewAsProvider>
              <GlossaryProvider>{props.children}</GlossaryProvider>
            </ViewAsProvider>
          </StockControlRbacProvider>
        </ErrorModalProvider>
      </StockControlBrandingProvider>
    </NixAppProvider>
  );
}

function AuRubberProviders(props: { children: ReactNode }) {
  // Mirrors AuRubberLayoutClient.tsx + au-rubber/portal/layout.tsx:
  // Branding → DynamicBranding side-effect → Notification → NixAppProvider.
  // (Auth is already mounted above; Branding/Notification are auth-independent.)
  return (
    <AuRubberBrandingProvider>
      <AuRubberDynamicBranding />
      <AuRubberNotificationProvider>
        <NixAppProvider appCode="au-rubber">{props.children}</NixAppProvider>
      </AuRubberNotificationProvider>
    </AuRubberBrandingProvider>
  );
}

export function CoreAppProviders(props: { activeApp: CoreApp; children: ReactNode }) {
  if (props.activeApp === "stock-control") {
    return <StockControlProviders>{props.children}</StockControlProviders>;
  }
  return <AuRubberProviders>{props.children}</AuRubberProviders>;
}
