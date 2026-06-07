"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useEffect } from "react";
import { FeedbackWidget } from "@/app/components/FeedbackWidget";
import PortalToolbar from "@/app/components/PortalToolbar";
import { ErrorBoundary } from "@/app/components/ui/ErrorBoundary";
import { useAdminAuth } from "@/app/context/AdminAuthContext";
import { LayoutProvider } from "@/app/context/LayoutContext";
import { useFeatureFlags } from "@/app/hooks/useFeatureFlags";
import { RFQ_VERSION } from "@/app/lib/config/rfq/version";
import { NixAppProvider, NixAssistant } from "@/app/lib/nix";
import { AdminBackButton } from "../components/AdminBackButton";

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
  {
    href: "/admin/portal/access",
    label: "Access & Plans",
    icon: "M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z",
    roles: ["admin", "employee"],
  },
  {
    href: "/admin/portal/marketing",
    label: "Marketing Site",
    icon: "M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z",
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
  return (
    <div className="min-h-screen">
      <AdminNavigation />
      <main className="py-6">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <AdminBackButton />
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
