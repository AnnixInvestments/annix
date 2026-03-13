"use client";

import { useRoleSummary } from "@/app/lib/query/hooks";
import {
  AccountsWidget,
  AdminWidget,
  ManagerWidget,
  StoremanWidget,
  ViewerWidget,
} from "./RoleDashboardWidgets";

interface RoleSummarySectionProps {
  activeView: string;
}

export function RoleSummarySection({ activeView }: RoleSummarySectionProps) {
  const { data: roleSummary, isLoading } = useRoleSummary(activeView);

  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-16 bg-gray-200 rounded" />
            <div className="h-16 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!roleSummary) {
    return null;
  }

  if (roleSummary.role === "storeman") {
    return <StoremanWidget data={roleSummary} />;
  }
  if (roleSummary.role === "accounts") {
    return <AccountsWidget data={roleSummary} />;
  }
  if (roleSummary.role === "manager") {
    return <ManagerWidget data={roleSummary} />;
  }
  if (roleSummary.role === "admin") {
    return <AdminWidget data={roleSummary} />;
  }
  return <ViewerWidget data={roleSummary} />;
}
