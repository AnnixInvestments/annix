"use client";

import { useMemo } from "react";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import { ALL_NAV_ITEMS, isNavItemAllowedForRole, type NavItemDef } from "../config/navItems";
import { useStockControlRbac } from "../context/StockControlRbacContext";
import { useViewAs } from "../context/ViewAsContext";

export function useVisibleNavItems(group: string): NavItemDef[] {
  const { profile } = useStockControlAuth();
  const { rbacConfig } = useStockControlRbac();
  const { effectiveRole } = useViewAs();

  return useMemo(() => {
    return ALL_NAV_ITEMS.filter((item) => {
      if (item.group !== group) return false;

      if (!isNavItemAllowedForRole(item, effectiveRole, rbacConfig)) return false;

      if (item.requiresQc && !profile?.qcEnabled && effectiveRole !== "admin") return false;
      if (item.requiresStaffLeave && !profile?.staffLeaveEnabled) return false;

      return true;
    });
  }, [group, effectiveRole, profile, rbacConfig]);
}
