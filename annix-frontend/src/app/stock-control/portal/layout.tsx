"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useLayoutEffect, useState } from "react";
import { FeedbackWidget } from "@/app/components/FeedbackWidget";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import { ChatPanel } from "../components/ChatPanel";
import { HubBreadcrumb } from "../components/HubBreadcrumb";
import { StockControlHeader } from "../components/StockControlHeader";
import { ALL_NAV_ITEMS, isNavItemAllowedForRole } from "../config/navItems";
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
      className="flex-1 overflow-y-auto px-4 py-3 sm:p-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-[max(1.5rem,env(safe-area-inset-bottom))] print:overflow-visible print:p-0"
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
        <div className="print:hidden">
          <HubBreadcrumb />
        </div>
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
  const [accessDenied, setAccessDenied] = useState<{
    label: string;
    reason: "rbac" | "qc" | "staffLeave";
  } | null>(null);

  useEffect(() => {
    if (!isLoaded) {
      setAccessDenied(null);
      return;
    }

    const candidates = ALL_NAV_ITEMS.filter((item) => {
      if (item.group === "hidden") return false;
      const itemPath = item.href.split("?")[0];
      return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
    }).sort((a, b) => b.href.split("?")[0].length - a.href.split("?")[0].length);

    const matchingItem = candidates[0] ?? null;

    if (!matchingItem) {
      setAccessDenied(null);
      return;
    }

    if (matchingItem.requiresQc && !profile?.qcEnabled && effectiveRole !== "admin") {
      setAccessDenied({ label: matchingItem.label, reason: "qc" });
      return;
    }

    if (matchingItem.requiresStaffLeave && !profile?.staffLeaveEnabled) {
      setAccessDenied({ label: matchingItem.label, reason: "staffLeave" });
      return;
    }

    const hasAccess = isNavItemAllowedForRole(matchingItem, effectiveRole, rbacConfig);
    if (!hasAccess) {
      setAccessDenied({ label: matchingItem.label, reason: "rbac" });
      return;
    }

    setAccessDenied(null);
  }, [pathname, rbacConfig, effectiveRole, isLoaded, profile]);

  if (accessDenied) {
    const reasonText =
      accessDenied.reason === "qc"
        ? "The Quality Control module is not enabled for your company. Contact your administrator to enable it."
        : accessDenied.reason === "staffLeave"
          ? "The Staff Leave module is not enabled for your company. Contact your administrator to enable it."
          : `Your role (${effectiveRole}) does not have permission to access "${accessDenied.label}". Contact your administrator to request access.`;

    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="max-w-md rounded-lg border border-amber-200 bg-amber-50 p-6 text-center shadow-sm">
          <svg
            className="mx-auto h-12 w-12 text-amber-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 className="mt-3 text-lg font-semibold text-gray-900">Access Denied</h2>
          <p className="mt-2 text-sm text-gray-700">{reasonText}</p>
          <button
            type="button"
            onClick={() => router.replace("/stock-control/portal/dashboard")}
            className="mt-4 rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function useHideOuterScrollbar() {
  useLayoutEffect(() => {
    const html = document.documentElement;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = "";
    };
  }, []);
}

function PortalContent({ children }: { children: React.ReactNode }) {
  useHideOuterScrollbar();

  return (
    <StockControlBrandingProvider>
      <StockControlRbacProvider>
        <ViewAsProvider>
          <GlossaryProvider>
            <div className="flex flex-col h-screen bg-gray-50 print:h-auto print:bg-white">
              <div className="print:hidden">
                <StockControlHeader />
              </div>
              <PageAccessGuard>
                <MainContent>{children}</MainContent>
              </PageAccessGuard>
              <div className="print:hidden">
                <ChatPanel />
              </div>
              <FeedbackWidget authContext="stock-control" />
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
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto" />
        </div>
      }
    >
      <ProtectedLayout>{children}</ProtectedLayout>
    </Suspense>
  );
}
