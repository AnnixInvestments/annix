"use client";

import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { DraggableWidget } from "../../components/dashboard/DraggableWidget";
import { HeroBanner } from "../../components/dashboard/HeroBanner";
import { MyTasksWidget } from "../../components/dashboard/MyTasksWidget";
import { PushNotificationBanner } from "../../components/dashboard/PushNotificationBanner";
import { QuickLinksSection } from "../../components/dashboard/QuickLinksSection";
import { QuickStatsSection } from "../../components/dashboard/QuickStatsSection";
import { RoleSummarySection } from "../../components/dashboard/RoleSummarySection";
import { WidgetVisibilityToggle } from "../../components/dashboard/WidgetVisibilityToggle";
import { WorkflowLanesSection } from "../../components/dashboard/WorkflowLanesSection";
import { ALL_NAV_ITEMS, isNavItemAllowedForRole } from "../../config/navItems";
import { useStockControlBranding } from "../../context/StockControlBrandingContext";
import { useStockControlRbac } from "../../context/StockControlRbacContext";
import { useViewAs } from "../../context/ViewAsContext";

const INBOUND_ROLES = ["accounts", "manager", "admin"];
const WORKSHOP_ROLES = ["storeman", "accounts", "manager", "admin"];
const OUTBOUND_ROLES = ["storeman", "manager", "admin"];

const DEFAULT_WIDGET_ORDER = ["role-summary", "my-tasks", "stats", "workflow-lanes", "quick-links"];

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
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeWidget, setActiveWidget] = useState<string | null>(null);

  useEffect(() => {
    stockControlApiClient
      .workflowNotifications(10)
      .then((data) => setNotifications(Array.isArray(data) ? data : []))
      .catch(() => setNotifications([]));
  }, []);

  const hiddenWidgets2 = preferences?.hiddenWidgets;
  const hiddenWidgets = hiddenWidgets2 || [];

  const widgetOrder = useMemo(() => {
    const rawWidgetOrder = preferences?.widgetOrder;
    const saved = rawWidgetOrder || [];
    if (saved.length === 0) return DEFAULT_WIDGET_ORDER;
    const allKeys = new Set(DEFAULT_WIDGET_ORDER);
    const missing = DEFAULT_WIDGET_ORDER.filter((k) => !saved.includes(k));
    const valid = saved.filter((k) => allKeys.has(k));
    return [...valid, ...missing];
  }, [preferences?.widgetOrder]);

  const handleWidgetToggle = useCallback(
    (widgetKey: string) => {
      const rawHiddenWidgets = preferences?.hiddenWidgets;
      const current = rawHiddenWidgets || [];
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
      return isNavItemAllowedForRole(item, effectiveRole, rbacConfig);
    },
    [rbacConfig, effectiveRole],
  );

  const showInbound = INBOUND_ROLES.includes(effectiveRole);
  const showWorkshop = WORKSHOP_ROLES.includes(effectiveRole);
  const showOutbound = OUTBOUND_ROLES.includes(effectiveRole);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveWidget(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveWidget(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = widgetOrder.indexOf(active.id as string);
      const newIndex = widgetOrder.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return;

      const newOrder = arrayMove(widgetOrder, oldIndex, newIndex);
      updatePreferences.mutate({ widgetOrder: newOrder });
    },
    [widgetOrder, updatePreferences],
  );

  const visibleWidgets = widgetOrder.filter((key) => widgetVisible(key));

  const name = user?.name;
  const renderWidget = (key: string) => {
    if (key === "role-summary") {
      return <RoleSummarySection activeView={effectiveRole} />;
    } else if (key === "my-tasks") {
      return (
        <MyTasksWidget pendingApprovals={pendingApprovals ?? []} notifications={notifications} />
      );
    } else if (key === "stats") {
      if (!stats) return null;
      return <QuickStatsSection stats={stats} navItemVisible={navItemVisible} />;
    } else if (key === "workflow-lanes") {
      return (
        <WorkflowLanesSection
          lanes={lanes}
          lanesLoading={lanesLoading}
          cpoSummary={cpoSummary}
          showInbound={showInbound}
          showWorkshop={showWorkshop}
          showOutbound={showOutbound}
        />
      );
    } else if (key === "quick-links") {
      return <QuickLinksSection navItemVisible={navItemVisible} />;
    }
    return null;
  };

  const activeWidgetLabel = activeWidget
    ? ALL_WIDGETS.find((w) => w.key === activeWidget)?.label
    : null;

  return (
    <div className="space-y-6">
      <HeroBanner
        userName={name || null}
        heroImageUrl={heroImageUrl ?? null}
        backgroundColor={colors.background}
      />

      <PushNotificationBanner />

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setIsEditMode((prev) => !prev)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md shadow-sm transition-colors ${
            isEditMode
              ? "bg-teal-600 text-white hover:bg-teal-700"
              : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
          }`}
        >
          {isEditMode ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Done
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                />
              </svg>
              Reorder
            </>
          )}
        </button>
        <WidgetVisibilityToggle
          allWidgets={ALL_WIDGETS}
          hiddenWidgets={hiddenWidgets}
          onToggle={handleWidgetToggle}
        />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={visibleWidgets} strategy={verticalListSortingStrategy}>
          <div className="space-y-6">
            {visibleWidgets.map((key) => (
              <DraggableWidget key={key} id={key} isEditMode={isEditMode}>
                {renderWidget(key)}
              </DraggableWidget>
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeWidget && activeWidgetLabel && (
            <div className="bg-white border-2 border-teal-400 rounded-lg shadow-2xl px-6 py-4 opacity-90">
              <p className="text-sm font-medium text-teal-700">{activeWidgetLabel}</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
