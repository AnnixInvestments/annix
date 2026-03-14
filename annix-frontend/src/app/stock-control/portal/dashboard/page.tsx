"use client";

import { useCallback, useEffect, useState } from "react";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import type { WorkflowNotification } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import {
  useCpoSummary,
  useDashboardPreferences,
  useDashboardStats,
  usePendingApprovals,
  useUpdateDashboardPreferences,
  useWorkflowLaneCounts,
} from "@/app/lib/query/hooks";
import { HeroBanner } from "../../components/dashboard/HeroBanner";
import { MyTasksWidget } from "../../components/dashboard/MyTasksWidget";
import { PushNotificationBanner } from "../../components/dashboard/PushNotificationBanner";
import { QuickLinksSection } from "../../components/dashboard/QuickLinksSection";
import { QuickStatsSection } from "../../components/dashboard/QuickStatsSection";
import { RoleSummarySection } from "../../components/dashboard/RoleSummarySection";
import { WidgetVisibilityToggle } from "../../components/dashboard/WidgetVisibilityToggle";
import { WorkflowLanesSection } from "../../components/dashboard/WorkflowLanesSection";
import { ALL_NAV_ITEMS } from "../../config/navItems";
import { useStockControlBranding } from "../../context/StockControlBrandingContext";
import { useStockControlRbac } from "../../context/StockControlRbacContext";
import { useViewAs } from "../../context/ViewAsContext";

const INBOUND_ROLES = ["accounts", "manager", "admin"];
const WORKSHOP_ROLES = ["storeman", "accounts", "manager", "admin"];
const OUTBOUND_ROLES = ["storeman", "manager", "admin"];

const ALL_WIDGETS = [
  { key: "role-summary", label: "Role Summary" },
  { key: "my-tasks", label: "My Tasks" },
  { key: "stats", label: "Quick Stats" },
  { key: "workflow-lanes", label: "Workflow Lanes" },
  { key: "quick-links", label: "Quick Links" },
];

export default function StockControlDashboard() {
  const { colors, heroImageUrl } = useStockControlBranding();
  const { user } = useStockControlAuth();
  const { effectiveRole } = useViewAs();
  const { rbacConfig } = useStockControlRbac();
  const { data: lanes, isLoading: lanesLoading } = useWorkflowLaneCounts();
  const { data: stats } = useDashboardStats();
  const { data: cpoSummary } = useCpoSummary();
  const { data: pendingApprovals } = usePendingApprovals();
  const { data: preferences } = useDashboardPreferences();
  const updatePreferences = useUpdateDashboardPreferences();
  const [notifications, setNotifications] = useState<WorkflowNotification[]>([]);

  useEffect(() => {
    stockControlApiClient
      .workflowNotifications(10)
      .then((data) => setNotifications(Array.isArray(data) ? data : []))
      .catch(() => setNotifications([]));
  }, []);

  const hiddenWidgets = preferences?.hiddenWidgets || [];

  const handleWidgetToggle = useCallback(
    (widgetKey: string) => {
      const current = preferences?.hiddenWidgets || [];
      const updated = current.includes(widgetKey)
        ? current.filter((k) => k !== widgetKey)
        : [...current, widgetKey];
      updatePreferences.mutate({ hiddenWidgets: updated });
    },
    [preferences?.hiddenWidgets, updatePreferences],
  );

  const widgetVisible = (key: string) => !hiddenWidgets.includes(key);

  const navItemVisible = useCallback(
    (navKey: string) => {
      const item = ALL_NAV_ITEMS.find((i) => i.key === navKey);
      if (!item) return false;
      const allowedRoles = rbacConfig[navKey] ?? item.defaultRoles;
      return allowedRoles.includes(effectiveRole);
    },
    [rbacConfig, effectiveRole],
  );

  const showInbound = INBOUND_ROLES.includes(effectiveRole);
  const showWorkshop = WORKSHOP_ROLES.includes(effectiveRole);
  const showOutbound = OUTBOUND_ROLES.includes(effectiveRole);

  return (
    <div className="space-y-6">
      <HeroBanner
        userName={user?.name || null}
        heroImageUrl={heroImageUrl ?? null}
        backgroundColor={colors.background}
      />

      <PushNotificationBanner />

      <div className="flex items-center justify-end gap-2">
        <WidgetVisibilityToggle
          allWidgets={ALL_WIDGETS}
          hiddenWidgets={hiddenWidgets}
          onToggle={handleWidgetToggle}
        />
      </div>

      {widgetVisible("role-summary") && <RoleSummarySection activeView={effectiveRole} />}

      {widgetVisible("my-tasks") && (
        <MyTasksWidget pendingApprovals={pendingApprovals ?? []} notifications={notifications} />
      )}

      {widgetVisible("stats") && stats && <QuickStatsSection stats={stats} />}

      {widgetVisible("workflow-lanes") && (
        <WorkflowLanesSection
          lanes={lanes}
          lanesLoading={lanesLoading}
          cpoSummary={cpoSummary}
          showInbound={showInbound}
          showWorkshop={showWorkshop}
          showOutbound={showOutbound}
        />
      )}

      {widgetVisible("quick-links") && <QuickLinksSection navItemVisible={navItemVisible} />}
    </div>
  );
}
