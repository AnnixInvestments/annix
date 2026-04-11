"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import { stockControlTokenStore } from "@/app/lib/api/portalTokenStores";
import { StockManagementProvider } from "@/app/modules/stock-management/provider/StockManagementProvider";
import type { StockManagementHostConfig } from "@/app/modules/stock-management/types/config";

interface StockManagementPreviewLayoutProps {
  children: ReactNode;
}

export default function StockManagementPreviewLayout(props: StockManagementPreviewLayoutProps) {
  const { profile } = useStockControlAuth();
  const linkedStaffId = profile?.linkedStaffId;
  const role = profile?.role;

  const config = useMemo<StockManagementHostConfig>(() => {
    const staffId = linkedStaffId == null ? null : linkedStaffId;
    const roles = role ? [role] : [];
    return {
      hostAppKey: "stock-control",
      apiBaseUrl: "/api/stock-management",
      authHeaders: () => stockControlTokenStore.authHeaders(),
      currentUser: {
        staffId,
        roles,
        permissions: [],
      },
    };
  }, [linkedStaffId, role]);

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        <div className="font-semibold">Stock Management Module — Preview</div>
        <div className="mt-1">
          This is a standalone preview of the new unified Stock Management module (issue #192). It
          runs in parallel to the existing Stock Control pages. None of these routes appear in the
          main nav and the entire <code className="rounded bg-amber-100 px-1">preview/</code> folder
          can be deleted when we cut over.
        </div>
      </div>
      <StockManagementProvider config={config}>{props.children}</StockManagementProvider>
    </div>
  );
}
