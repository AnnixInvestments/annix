"use client";

import { useMemo } from "react";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import { ALL_NAV_ITEMS, type NavItemDef } from "../config/navItems";
import { useStockControlRbac } from "../context/StockControlRbacContext";

export function useVisibleNavItems(group: string): NavItemDef[] {
  const { user, profile } = useStockControlAuth();
  const { rbacConfig } = useStockControlRbac();

  return useMemo(() => {
    return ALL_NAV_ITEMS.filter((item) => {
      if (item.group !== group) return false;

      const allowedRoles = rbacConfig[item.key] ?? item.defaultRoles;
      if (!user?.role || !allowedRoles.includes(user.role)) return false;

      if (item.requiresQc && !profile?.qcEnabled && user.role !== "admin") return false;

      return true;
    });
  }, [group, user, profile, rbacConfig]);
}
