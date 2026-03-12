"use client";

import { useMemo } from "react";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import { ALL_NAV_ITEMS, type NavItemDef } from "../config/navItems";
import { useStockControlRbac } from "../context/StockControlRbacContext";
import { useViewAs } from "../context/ViewAsContext";

export function useVisibleNavItems(group: string): NavItemDef[] {
  const { profile } = useStockControlAuth();
  const { rbacConfig } = useStockControlRbac();
  const { effectiveRole } = useViewAs();

  return useMemo(() => {
    return ALL_NAV_ITEMS.filter((item) => {
      if (item.group !== group) return false;

      const allowedRoles = rbacConfig[item.key] ?? item.defaultRoles;
      if (!allowedRoles.includes(effectiveRole)) return false;

      if (item.requiresQc && !profile?.qcEnabled && effectiveRole !== "admin") return false;

      return true;
    });
  }, [group, effectiveRole, profile, rbacConfig]);
}
