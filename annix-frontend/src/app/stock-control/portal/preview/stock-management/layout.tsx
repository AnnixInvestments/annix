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
      <StockManagementProvider config={config}>{props.children}</StockManagementProvider>
    </div>
  );
}
