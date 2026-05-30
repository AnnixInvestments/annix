"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useEffect } from "react";
import { FeedbackWidget } from "@/app/components/FeedbackWidget";
import PortalToolbar from "@/app/components/PortalToolbar";
import { useTheme } from "@/app/components/ThemeProvider";
import { ErrorBoundary } from "@/app/components/ui/ErrorBoundary";
import { useAdminAuth } from "@/app/context/AdminAuthContext";
import { LayoutProvider } from "@/app/context/LayoutContext";
import { useFeatureFlags } from "@/app/hooks/useFeatureFlags";
import { RFQ_VERSION } from "@/app/lib/config/rfq/version";
import { NixAppProvider, NixAssistant } from "@/app/lib/nix";
import { useBranding } from "@/app/lib/query/hooks";

const navItems = [
  {
    href: "/admin/portal/dashboard",
    label: "Dashboard",
    icon: "M7.5 14.25V16.5M10.5 12V16.5M13.5 9.75V16.5M16.5 7.5V16.5M6 20.25H18C19.2426 20.25 20.25 19.2426 20.25 18V6C20.25 4.75736 19.2426 3.75 18 3.75H6C4.75736 3.75 3.75 4.75736 3.75 6V18C3.75 19.2426 4.75736 20.25 6 20.25Z",
    roles: ["admin", "employee"],
  },
  {
    href: "/admin/portal/global-apps",
    label: "Global Apps",
    icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z",
    roles: ["admin", "employee"],
  },
  {
    href: "/admin/portal/inbound-emails",
    label: "Inbox Emails",
    icon: "M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75",
    roles: ["admin", "employee"],
  },
];

function AdminNavigation() {
  const router = useRouter();
  const { admin, logout } = useAdminAuth();
  const { flags } = useFeatureFlags();

  const handleLogout = async () => {
    await logout();
    window.location.href = "/admin/login";
  };

  return (
    <PortalToolbar
      portalType="admin"
      navItems={navItems}
      user={
        admin
          ? {
              firstName: admin.firstName,
              lastName: admin.lastName,
              email: admin.email,
              roles: admin.roles,
            }
          : null
      }
      onLogout={handleLogout}
      featureFlags={flags}
      version={RFQ_VERSION}
    />
  );
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const branding = useBranding("annix-investments").data;
  const lightBg = branding ? branding.backgroundLight : "#F8FAFC";
  const darkBg = branding ? branding.backgroundDark : "#0F172A";
  const screenBg = resolvedTheme === "light" ? lightBg : darkBg;
  return (
    <div className="min-h-screen" style={{ backgroundColor: screenBg }}>
      <AdminNavigation />
      <main className="py-6">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </main>
      <FeedbackWidget authContext="admin" />
      <NixAssistant
        context="admin"
        pageContext={{
          currentPage: "Admin Portal",
          portalContext: "admin",
        }}
      />
    </div>
  );
}

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useAdminAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const currentUrl = searchParams.toString()
        ? `${pathname}?${searchParams.toString()}`
        : pathname;
      const returnUrl = encodeURIComponent(currentUrl);
      router.push(`/admin/login?returnUrl=${returnUrl}`);
    }
  }, [isAuthenticated, isLoading, router, pathname, searchParams]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <LayoutProvider>
      <LayoutContent>{children}</LayoutContent>
    </LayoutProvider>
  );
}

export default function AdminPortalLayout(props: { children: React.ReactNode }) {
  const { children } = props;
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
        </div>
      }
    >
      <NixAppProvider appCode="admin">
        <ProtectedLayout>{children}</ProtectedLayout>
      </NixAppProvider>
    </Suspense>
  );
}
