"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";

interface ViewAsContextValue {
  effectiveRole: string;
  viewAsRole: string | null;
  setViewAsRole: (role: string | null) => void;
  isPreviewActive: boolean;
}

const ViewAsContext = createContext<ViewAsContextValue>({
  effectiveRole: "viewer",
  viewAsRole: null,
  setViewAsRole: () => {},
  isPreviewActive: false,
});

const ROLE_HIERARCHY = ["viewer", "quality", "storeman", "accounts", "manager", "admin"];

export function ViewAsProvider(props: { children: React.ReactNode }) {
  const { children } = props;
  const { user } = useStockControlAuth();
  const [viewAsRole, setViewAsRoleState] = useState<string | null>(null);

  const actualRole = user?.role || "viewer";
  const isAdmin = actualRole === "admin";

  const setViewAsRole = useCallback(
    (role: string | null) => {
      if (!isAdmin) return;
      if (role === null || role === actualRole) {
        setViewAsRoleState(null);
        return;
      }
      const roleIndex = ROLE_HIERARCHY.indexOf(role);
      if (roleIndex >= 0 && roleIndex < ROLE_HIERARCHY.indexOf(actualRole)) {
        setViewAsRoleState(role);
      }
    },
    [isAdmin, actualRole],
  );

  const effectiveRole = useMemo(
    () => (isAdmin && viewAsRole ? viewAsRole : actualRole),
    [isAdmin, viewAsRole, actualRole],
  );

  const isPreviewActive = isAdmin && viewAsRole !== null;

  const value = useMemo(
    () => ({ effectiveRole, viewAsRole, setViewAsRole, isPreviewActive }),
    [effectiveRole, viewAsRole, setViewAsRole, isPreviewActive],
  );

  return <ViewAsContext.Provider value={value}>{children}</ViewAsContext.Provider>;
}

export function useViewAs() {
  return useContext(ViewAsContext);
}
