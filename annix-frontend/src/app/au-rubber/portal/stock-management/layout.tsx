"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { useAuRubberAuth } from "@/app/context/AuRubberAuthContext";
import { auRubberTokenStore } from "@/app/lib/api/portalTokenStores";
import { StockManagementProvider } from "@/app/modules/stock-management/provider/StockManagementProvider";
import type { StockManagementHostConfig } from "@/app/modules/stock-management/types/config";

export default function AuRubberStockManagementLayout(props: { children: ReactNode }) {
  const { profile } = useAuRubberAuth();
  const profileRoles = profile == null ? [] : profile.roles;

  const config = useMemo<StockManagementHostConfig>(() => {
    return {
      hostAppKey: "au-rubber",
      apiBaseUrl: "/api/stock-management",
      authHeaders: () => auRubberTokenStore.authHeaders(),
      currentUser: {
        staffId: null,
        roles: profileRoles,
        permissions: [],
      },
      theme: {
        primaryColor: "#ca8a04",
        primaryHoverColor: "#a16207",
      },
    };
  }, [profileRoles]);

  return <StockManagementProvider config={config}>{props.children}</StockManagementProvider>;
}
