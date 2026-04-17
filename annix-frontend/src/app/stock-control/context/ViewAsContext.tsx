"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import type { CompanyRole, StockControlTeamMember } from "@/app/lib/api/stockControlApi";
import { useCompanyRoles, useSettingsTeamMembers } from "@/app/lib/query/hooks";

interface ViewAsContextValue {
  effectiveRole: string;
  viewAsRole: string | null;
  viewAsUser: StockControlTeamMember | null;
  setViewAsUser: (member: StockControlTeamMember | null) => void;
  isPreviewActive: boolean;
  companyRoles: CompanyRole[];
  companyRolesLoading: boolean;
  teamMembers: StockControlTeamMember[];
  effectiveName: string | null;
}

const ViewAsContext = createContext<ViewAsContextValue>({
  effectiveRole: "viewer",
  viewAsRole: null,
  viewAsUser: null,
  setViewAsUser: () => {},
  isPreviewActive: false,
  companyRoles: [],
  companyRolesLoading: true,
  teamMembers: [],
  effectiveName: null,
});

export function ViewAsProvider(props: { children: React.ReactNode }) {
  const name = user?.name;
  const { children } = props;
  const { user } = useStockControlAuth();
  const [viewAsUser, setViewAsUserState] = useState<StockControlTeamMember | null>(null);
  const { data: companyRoles = [], isLoading: companyRolesLoading } = useCompanyRoles();
  const { data: teamMembers = [] } = useSettingsTeamMembers();

  const rawRole = user?.role;
  const actualRole = rawRole || "viewer";
  const isAdmin = actualRole === "admin";

  const previewableRoles = useMemo(
    () => companyRoles.filter((r) => r.key !== "admin"),
    [companyRoles],
  );

  const previewableMembers = useMemo(
    () => teamMembers.filter((m) => m.role !== "admin"),
    [teamMembers],
  );

  const setViewAsUser = useCallback(
    (member: StockControlTeamMember | null) => {
      const role = viewAsUser?.role;
      if (!isAdmin) return;
      setViewAsUserState(member);
    },
    [isAdmin],
  );

  const effectiveRole = useMemo(
    () => (isAdmin && viewAsUser ? viewAsUser.role : actualRole),
    [isAdmin, viewAsUser, actualRole],
  );

  const effectiveName = useMemo(
    () => (isAdmin && viewAsUser ? viewAsUser.name : name || null),
    [isAdmin, viewAsUser, user?.name],
  );

  const isPreviewActive = isAdmin && viewAsUser !== null;

  const value = useMemo(
    () => ({
      effectiveRole,
      viewAsRole: role || null,
      viewAsUser,
      setViewAsUser,
      isPreviewActive,
      companyRoles: previewableRoles,
      companyRolesLoading,
      teamMembers: previewableMembers,
      effectiveName,
    }),
    [
      effectiveRole,
      viewAsUser,
      setViewAsUser,
      isPreviewActive,
      previewableRoles,
      companyRolesLoading,
      previewableMembers,
      effectiveName,
    ],
  );

  return <ViewAsContext.Provider value={value}>{children}</ViewAsContext.Provider>;
}

export function useViewAs() {
  return useContext(ViewAsContext);
}
