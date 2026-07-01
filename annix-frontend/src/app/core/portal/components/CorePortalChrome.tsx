"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { useAuRubberAuth } from "@/app/context/AuRubberAuthContext";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import { useCoreActiveApp } from "../CoreActiveAppContext";
import { CorePortalModuleProvider } from "../CorePortalModuleProvider";
import type { CoreApp } from "../config/navAppMap";
import { CoreAppProviders } from "./CoreAppProviders";
import { CoreChromeBranding } from "./CoreChromeBranding";
import { CorePortalHeader } from "./CorePortalHeader";
import { CorePortalPageAccessGuard } from "./CorePortalPageAccessGuard";
import { CorePortalSidebar } from "./CorePortalSidebar";

interface NormalizedAuth {
  isLoading: boolean;
  isAuthenticated: boolean;
  userName: string | null;
  companyName: string | null;
  permissions: string[];
  isAdmin: boolean;
}

function CorePortalShell(props: { activeApp: CoreApp; auth: NormalizedAuth; children: ReactNode }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const auth = props.auth;
  const isLoading = auth.isLoading;
  const isAuthenticated = auth.isAuthenticated;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/core");
    }
  }, [isLoading, isAuthenticated, router]);

  const ready = !isLoading && isAuthenticated;

  // CoreAppProviders wraps the WHOLE shell (not just the page) so the active
  // app's secondary contexts are available to the chrome too — notably the SC
  // sidebar reads StockControlRbac/ViewAs to render role-correct nav.
  return (
    <CorePortalModuleProvider activeApp={props.activeApp}>
      <CoreAppProviders activeApp={props.activeApp}>
        <CoreChromeBranding activeApp={props.activeApp}>
          <div className="flex h-screen bg-gray-50">
            <CorePortalSidebar
              activeApp={props.activeApp}
              permissions={auth.permissions}
              isAdmin={auth.isAdmin}
              isOpen={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
            />

            <div className="flex min-w-0 flex-1 flex-col">
              <CorePortalHeader
                activeApp={props.activeApp}
                userName={auth.userName}
                companyName={auth.companyName}
                onMenuToggle={() => setSidebarOpen((prev) => !prev)}
              />

              <main className="flex-1 overflow-y-auto px-4 py-3 sm:p-6">
                <CorePortalPageAccessGuard
                  activeApp={props.activeApp}
                  ready={ready}
                  permissions={auth.permissions}
                  isAdmin={auth.isAdmin}
                >
                  {props.children}
                </CorePortalPageAccessGuard>
              </main>
            </div>
          </div>
        </CoreChromeBranding>
      </CoreAppProviders>
    </CorePortalModuleProvider>
  );
}

function StockControlChromeBridge(props: { children: ReactNode }) {
  const auth = useStockControlAuth();
  const profile = auth.profile;
  const user = auth.user;

  const profileCompanyName = profile?.companyName;
  const companyName = profileCompanyName ?? null;

  const userName = user?.name;
  const role = user?.role;
  // SC nav visibility is driven by the SC RBAC/role model inside the sidebar
  // (StockControlRbac + ViewAs), not by this permission array — kept empty here.
  const normalized: NormalizedAuth = {
    isLoading: auth.isLoading,
    isAuthenticated: auth.isAuthenticated,
    userName: userName ?? null,
    companyName,
    permissions: [],
    isAdmin: role === "admin",
  };

  return (
    <CorePortalShell activeApp="stock-control" auth={normalized}>
      {props.children}
    </CorePortalShell>
  );
}

function AuRubberChromeBridge(props: { children: ReactNode }) {
  const auth = useAuRubberAuth();
  const user = auth.user;

  const firstName = user?.firstName;
  const lastName = user?.lastName;
  const namePieces = [firstName ?? "", lastName ?? ""].filter((piece) => piece.length > 0);
  const userName = namePieces.length > 0 ? namePieces.join(" ") : null;

  const normalized: NormalizedAuth = {
    isLoading: auth.isLoading,
    isAuthenticated: auth.isAuthenticated,
    userName,
    companyName: null,
    permissions: auth.permissions,
    isAdmin: auth.isAdmin,
  };

  return (
    <CorePortalShell activeApp="au-rubber" auth={normalized}>
      {props.children}
    </CorePortalShell>
  );
}

/**
 * Renders the chrome bound to whichever single real provider
 * `ActiveAppAuthMount` mounted. Each bridge calls ONLY its own auth hook, so
 * the unmounted app's context is never read.
 */
export function CorePortalChrome(props: { children: ReactNode }) {
  const core = useCoreActiveApp();
  const activeApp = core.activeApp;

  if (activeApp === "stock-control") {
    return <StockControlChromeBridge>{props.children}</StockControlChromeBridge>;
  }
  if (activeApp === "au-rubber") {
    return <AuRubberChromeBridge>{props.children}</AuRubberChromeBridge>;
  }
  return null;
}
