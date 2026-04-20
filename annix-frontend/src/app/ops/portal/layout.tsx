"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useState } from "react";
import { OpsHeader } from "../components/OpsHeader";
import { OpsPageAccessGuard } from "../components/OpsPageAccessGuard";
import { OpsSidebar } from "../components/OpsSidebar";
import { OpsAuthProvider, useOpsAuth } from "../context/OpsAuthContext";
import { OpsModuleProvider } from "../context/OpsModuleContext";

function OpsPortalShell(props: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, profile, logout } = useOpsAuth();

  const rawCompanyId = profile?.companyId;
  const companyId = rawCompanyId ?? null;

  const rawUserName = user?.name;
  const userName = rawUserName || null;

  const rawCompanyName = profile?.companyName;
  const companyName = rawCompanyName || null;

  const rawRole = user?.role;
  const isAdmin = rawRole === "admin";

  const permissions: string[] = [];

  return (
    <OpsModuleProvider companyId={companyId}>
      <div className="flex h-screen bg-gray-50">
        <OpsSidebar
          permissions={permissions}
          isAdmin={isAdmin}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="flex flex-col flex-1 min-w-0">
          <OpsHeader
            userName={userName}
            companyName={companyName}
            onMenuToggle={() => setSidebarOpen((prev) => !prev)}
            onLogout={logout}
          />

          <main className="flex-1 overflow-y-auto px-4 py-3 sm:p-6">
            <OpsPageAccessGuard permissions={permissions} isAdmin={isAdmin}>
              {props.children}
            </OpsPageAccessGuard>
          </main>
        </div>
      </div>
    </OpsModuleProvider>
  );
}

function ProtectedLayout(props: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useOpsAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const currentUrl = searchParams.toString()
        ? `${pathname}?${searchParams.toString()}`
        : pathname;
      const returnUrl = encodeURIComponent(currentUrl);
      router.push(`/ops/login?returnUrl=${returnUrl}`);
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

  return <OpsPortalShell>{props.children}</OpsPortalShell>;
}

export default function OpsPortalLayout(props: { children: React.ReactNode }) {
  return (
    <OpsAuthProvider>
      <Suspense
        fallback={
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto" />
          </div>
        }
      >
        <ProtectedLayout>{props.children}</ProtectedLayout>
      </Suspense>
    </OpsAuthProvider>
  );
}
