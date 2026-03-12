"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { useEffect } from "react";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import { ChatPanel } from "../components/ChatPanel";
import { HubBreadcrumb } from "../components/HubBreadcrumb";
import { StockControlHeader } from "../components/StockControlHeader";
import { ALL_NAV_ITEMS } from "../config/navItems";
import { GlossaryProvider } from "../context/GlossaryContext";
import {
  StockControlBrandingProvider,
  useStockControlBranding,
} from "../context/StockControlBrandingContext";
import { StockControlRbacProvider, useStockControlRbac } from "../context/StockControlRbacContext";
import { useViewAs, ViewAsProvider } from "../context/ViewAsContext";

function MainContent({ children }: { children: React.ReactNode }) {
  const { heroImageUrl } = useStockControlBranding();

  return (
    <main
      className="flex-1 overflow-y-auto px-4 py-3 sm:p-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      style={
        heroImageUrl
          ? {
              backgroundImage: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url(${heroImageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundAttachment: "fixed",
            }
          : undefined
      }
    >
      <div
        className={`w-full ${heroImageUrl ? "bg-white/95 rounded-lg p-4 sm:p-6 shadow-sm backdrop-blur-sm" : ""}`}
      >
        <HubBreadcrumb />
        {children}
      </div>
    </main>
  );
}

function PageAccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { rbacConfig, isLoaded } = useStockControlRbac();
  const { effectiveRole } = useViewAs();
  const { profile } = useStockControlAuth();

  useEffect(() => {
    if (!isLoaded) return;

    const candidates = ALL_NAV_ITEMS.filter((item) => {
      if (item.group === "hidden") return false;
      const itemPath = item.href.split("?")[0];
      return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
    }).sort((a, b) => b.href.split("?")[0].length - a.href.split("?")[0].length);

    const matchingItem = candidates[0] ?? null;

    if (!matchingItem) return;

    const allowedRoles = rbacConfig[matchingItem.key] ?? matchingItem.defaultRoles;
    const hasAccess = allowedRoles.includes(effectiveRole);

    if (matchingItem.requiresQc && !profile?.qcEnabled && effectiveRole !== "admin") {
      router.replace("/stock-control/portal/dashboard");
      return;
    }

    if (!hasAccess) {
      router.replace("/stock-control/portal/dashboard");
    }
  }, [pathname, rbacConfig, effectiveRole, isLoaded, router, profile]);

  return <>{children}</>;
}

function PortalContent({ children }: { children: React.ReactNode }) {
  return (
    <StockControlBrandingProvider>
      <StockControlRbacProvider>
        <ViewAsProvider>
          <GlossaryProvider>
            <div className="flex flex-col h-screen bg-gray-50">
              <StockControlHeader />
              <PageAccessGuard>
                <MainContent>{children}</MainContent>
              </PageAccessGuard>
              <ChatPanel />
            </div>
          </GlossaryProvider>
        </ViewAsProvider>
      </StockControlRbacProvider>
    </StockControlBrandingProvider>
  );
}

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useStockControlAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const currentUrl = searchParams.toString()
        ? `${pathname}?${searchParams.toString()}`
        : pathname;
      const returnUrl = encodeURIComponent(currentUrl);
      router.push(`/stock-control/login?returnUrl=${returnUrl}`);
    }
  }, [isAuthenticated, isLoading, router, pathname, searchParams]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <PortalContent>{children}</PortalContent>;
}

export default function StockControlPortalLayout(props: { children: React.ReactNode }) {
  const { children } = props;
  return <ProtectedLayout>{children}</ProtectedLayout>;
}
