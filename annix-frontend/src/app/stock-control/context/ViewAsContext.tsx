"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import type { CompanyRole } from "@/app/lib/api/stockControlApi";
import { useCompanyRoles } from "@/app/lib/query/hooks";

interface ViewAsContextValue {
  effectiveRole: string;
  viewAsRole: string | null;
  setViewAsRole: (role: string | null) => void;
  isPreviewActive: boolean;
  companyRoles: CompanyRole[];
  companyRolesLoading: boolean;
}

const ViewAsContext = createContext<ViewAsContextValue>({
  effectiveRole: "viewer",
  viewAsRole: null,
  setViewAsRole: () => {},
  isPreviewActive: false,
  companyRoles: [],
  companyRolesLoading: true,
});

export function ViewAsProvider(props: { children: React.ReactNode }) {
  const { children } = props;
  const { user } = useStockControlAuth();
  const [viewAsRole, setViewAsRoleState] = useState<string | null>(null);
  const { data: companyRoles = [], isLoading: companyRolesLoading } = useCompanyRoles();

  const actualRole = user?.role || "viewer";
  const isAdmin = actualRole === "admin";

  const previewableRoles = useMemo(
    () => companyRoles.filter((r) => r.key !== "admin"),
    [companyRoles],
  );

  const previewableKeys = useMemo(
    () => new Set(previewableRoles.map((r) => r.key)),
    [previewableRoles],
  );

  const setViewAsRole = useCallback(
    (role: string | null) => {
      if (!isAdmin) return;
      if (role === null || role === actualRole) {
        setViewAsRoleState(null);
        return;
      }
      if (previewableKeys.has(role)) {
        setViewAsRoleState(role);
      }
    },
    [isAdmin, actualRole, previewableKeys],
  );

  const effectiveRole = useMemo(
    () => (isAdmin && viewAsRole ? viewAsRole : actualRole),
    [isAdmin, viewAsRole, actualRole],
  );

  const isPreviewActive = isAdmin && viewAsRole !== null;

  const value = useMemo(
    () => ({
      effectiveRole,
      viewAsRole,
      setViewAsRole,
      isPreviewActive,
      companyRoles: previewableRoles,
      companyRolesLoading,
    }),
    [
      effectiveRole,
      viewAsRole,
      setViewAsRole,
      isPreviewActive,
      previewableRoles,
      companyRolesLoading,
    ],
  );

  return <ViewAsContext.Provider value={value}>{children}</ViewAsContext.Provider>;
}

export function useViewAs() {
  return useContext(ViewAsContext);
}
