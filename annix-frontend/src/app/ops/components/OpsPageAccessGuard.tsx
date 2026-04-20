"use client";

import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { OPS_NAV_ITEMS } from "../config/navItems";
import { useOpsAuth } from "../context/OpsAuthContext";

interface OpsPageAccessGuardProps {
  children: React.ReactNode;
  permissions: string[];
  isAdmin: boolean;
}

export function OpsPageAccessGuard(props: OpsPageAccessGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useOpsAuth();
  const [accessDenied, setAccessDenied] = useState<string | null>(null);

  useEffect(() => {
    const candidates = OPS_NAV_ITEMS.filter((item) => {
      const itemPath = item.href.split("?")[0];
      return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
    }).sort((a, b) => b.href.split("?")[0].length - a.href.split("?")[0].length);

    const firstCandidate = candidates[0];
    const matchingItem = firstCandidate ?? null;

    if (!matchingItem) {
      setAccessDenied(null);
      return;
    }

    const itemPermission = matchingItem.permission;

    const isAdmin = props.isAdmin;
    if (isAdmin || !itemPermission) {
      setAccessDenied(null);
      return;
    }

    const hasPermission = props.permissions.includes(itemPermission);
    if (!hasPermission) {
      setAccessDenied(matchingItem.label);
      return;
    }

    setAccessDenied(null);
  }, [pathname, props.permissions, props.isAdmin, user]);

  if (accessDenied) {
    const userRole = user?.role;
    const roleDisplay = userRole || "user";

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
          <p className="mt-2 text-sm text-gray-700">
            {`Your role (${roleDisplay}) does not have permission to access "${accessDenied}". Contact your administrator to request access.`}
          </p>
          <button
            type="button"
            onClick={() => router.replace("/ops/portal/dashboard")}
            className="mt-4 rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{props.children}</>;
}
