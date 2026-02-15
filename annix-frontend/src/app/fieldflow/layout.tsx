"use client";

import { useRouter } from "next/navigation";
import React, { useEffect } from "react";
import PortalToolbar from "@/app/components/PortalToolbar";
import {
  OfflineIndicator,
  PwaInstallPrompt,
  ServiceWorkerRegistration,
} from "@/app/components/pwa";
import { AdminAuthProvider, useAdminAuth } from "@/app/context/AdminAuthContext";
import { LayoutProvider } from "@/app/context/LayoutContext";
import { useFeatureFlags } from "@/app/hooks/useFeatureFlags";
import { startBackgroundSync, stopBackgroundSync } from "@/app/lib/offline";

const navItems = [
  {
    href: "/fieldflow",
    label: "FieldFlow",
    sublabel: "Dashboard",
    icon: "M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z",
    roles: ["admin", "employee"],
  },
  {
    href: "/fieldflow/prospects",
    label: "Prospects",
    icon: "M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z",
    roles: ["admin", "employee"],
  },
  {
    href: "/fieldflow/schedule",
    label: "Schedule",
    icon: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z",
    roles: ["admin", "employee"],
  },
  {
    href: "/fieldflow/meetings",
    label: "Meetings",
    icon: "M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z",
    roles: ["admin", "employee"],
  },
  {
    href: "/fieldflow/settings",
    label: "Settings",
    icon: "M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
    roles: ["admin", "employee"],
  },
];

function FieldFlowNavigation() {
  const { admin, logout } = useAdminAuth();
  const { flags } = useFeatureFlags();

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  return (
    <PortalToolbar
      portalType="fieldflow"
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
    />
  );
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    startBackgroundSync();
    return () => stopBackgroundSync();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <FieldFlowNavigation />
      <main className="py-6">
        <div className="w-full px-4 sm:px-6 lg:px-8">{children}</div>
      </main>
      <ServiceWorkerRegistration />
      <PwaInstallPrompt />
      <OfflineIndicator />
    </div>
  );
}

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAdminAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/admin/login");
    }
  }, [isAuthenticated, isLoading, router]);

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

export default function FieldFlowLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <ProtectedLayout>{children}</ProtectedLayout>
    </AdminAuthProvider>
  );
}
