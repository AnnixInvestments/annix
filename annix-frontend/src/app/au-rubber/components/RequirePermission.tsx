"use client";

import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { useAuRubberAuth } from "@/app/context/AuRubberAuthContext";

interface RequirePermissionProps {
  permission: string;
  children: ReactNode;
  fallbackUrl?: string;
}

export function RequirePermission({
  permission,
  children,
  fallbackUrl = "/au-rubber/portal/dashboard",
}: RequirePermissionProps) {
  const router = useRouter();
  const { isLoading, isAuthenticated, hasPermission, isAdmin } = useAuRubberAuth();

  const hasAccess = isAdmin || hasPermission(permission);

  useEffect(() => {
    if (!isLoading && isAuthenticated && !hasAccess) {
      router.replace(fallbackUrl);
    }
  }, [isLoading, isAuthenticated, hasAccess, router, fallbackUrl]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-yellow-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
