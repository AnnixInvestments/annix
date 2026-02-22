"use client";

import { useRouter } from "next/navigation";
import React, { useEffect } from "react";
import PortalToolbar from "@/app/components/PortalToolbar";
import RemoteAccessNotificationBanner from "@/app/components/remote-access/RemoteAccessNotificationBanner";
import { ErrorBoundary } from "@/app/components/ui/ErrorBoundary";
import { useSupplierAuth } from "@/app/context/SupplierAuthContext";
import { useFeatureFlags } from "@/app/hooks/useFeatureFlags";
import { NixAssistant } from "@/app/lib/nix";

const navItems = [
  {
    href: "/supplier/portal/dashboard",
    label: "Supplier Portal",
    sublabel: "Dashboard",
    icon: "M7.5 14.25V16.5M10.5 12V16.5M13.5 9.75V16.5M16.5 7.5V16.5M6 20.25H18C19.2426 20.25 20.25 19.2426 20.25 18V6C20.25 4.75736 19.2426 3.75 18 3.75H6C4.75736 3.75 3.75 4.75736 3.75 6V18C3.75 19.2426 4.75736 20.25 6 20.25Z",
    featureFlag: "SUPPLIER_DASHBOARD",
  },
  {
    href: "/supplier/portal/boqs",
    label: "BOQ Requests",
    icon: "M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z",
    featureFlag: "SUPPLIER_BOQS",
  },
  {
    href: "/supplier/portal/submitted-boqs",
    label: "Submitted BOQs",
    icon: "M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-12.75M10.125 2.25h.375a9 9 0 019 9v.375M10.125 2.25A3.375 3.375 0 0113.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 013.375 3.375M9 15l2.25 2.25L15 12",
    featureFlag: "SUPPLIER_SUBMITTED_BOQS",
  },
  {
    href: "/supplier/portal/products-services",
    label: "Products & Services",
    icon: "M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 6v2.25A2.25 2.25 0 006 10.5zm0 9.75h2.25A2.25 2.25 0 0010.5 18v-2.25a2.25 2.25 0 00-2.25-2.25H6a2.25 2.25 0 00-2.25 2.25V18A2.25 2.25 0 006 20.25zm9.75-9.75H18a2.25 2.25 0 002.25-2.25V6A2.25 2.25 0 0018 3.75h-2.25A2.25 2.25 0 0013.5 6v2.25a2.25 2.25 0 002.25 2.25z",
    featureFlag: "SUPPLIER_PRODUCTS_SERVICES",
  },
];

function SupplierNavigation({
  supplier,
  onLogout,
}: {
  supplier: { firstName?: string; lastName?: string; email?: string; companyName?: string } | null;
  onLogout: () => void;
}) {
  const { flags } = useFeatureFlags();

  return (
    <PortalToolbar
      portalType="supplier"
      navItems={navItems}
      user={
        supplier
          ? {
              firstName: supplier.firstName,
              lastName: supplier.lastName,
              email: supplier.email,
              companyName: supplier.companyName,
            }
          : null
      }
      onLogout={onLogout}
      featureFlags={flags}
    />
  );
}

export default function SupplierPortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading, supplier, logout } = useSupplierAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/supplier/login");
    }
  }, [isLoading, isAuthenticated, router]);

  const handleLogout = async () => {
    await logout();
    window.location.href = "/supplier/login";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-900">
      <SupplierNavigation supplier={supplier} onLogout={handleLogout} />
      <RemoteAccessNotificationBanner />

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <main className="w-full">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
      <NixAssistant
        context="supplier"
        pageContext={{
          currentPage: "Supplier Portal",
          portalContext: "supplier",
        }}
      />
    </div>
  );
}
