"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import type { WorkflowNotification } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import {
  useCpoSummary,
  useDashboardPreferences,
  useDashboardStats,
  usePendingApprovals,
  useRoleSummary,
  useUpdateDashboardPreferences,
  useWorkflowLaneCounts,
} from "@/app/lib/query/hooks";
import { MyTasksWidget } from "../../components/dashboard/MyTasksWidget";
import {
  AccountsWidget,
  AdminWidget,
  ManagerWidget,
  StoremanWidget,
  ViewerWidget,
} from "../../components/dashboard/RoleDashboardWidgets";
import { ViewSwitcher } from "../../components/dashboard/ViewSwitcher";
import { WidgetVisibilityToggle } from "../../components/dashboard/WidgetVisibilityToggle";
import { useStockControlBranding } from "../../context/StockControlBrandingContext";
import { usePushNotifications } from "../../hooks/usePushNotifications";

const DISMISS_KEY = "stock-control-push-dismissed";
const DISMISS_DAYS = 7;

function PushNotificationBanner() {
  const { permissionState, isSubscribed, isLoading, requestPermissionAndSubscribe } =
    usePushNotifications();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const elapsed = Date.now() - Number(dismissedAt);
      if (elapsed < DISMISS_DAYS * 24 * 60 * 60 * 1000) {
        setDismissed(true);
      }
    }
  }, []);

  if (
    isLoading ||
    dismissed ||
    isSubscribed ||
    permissionState === "granted" ||
    permissionState === "denied" ||
    permissionState === "unsupported"
  ) {
    return null;
  }

  return (
    <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
          <svg
            className="w-5 h-5 text-teal-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-teal-800">Enable Push Notifications</p>
          <p className="text-xs text-teal-600">
            Get instant alerts for approvals, dispatches, and more
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, String(Date.now()));
            setDismissed(true);
          }}
          className="text-sm text-teal-600 hover:text-teal-800 px-3 py-1.5"
        >
          Not now
        </button>
        <button
          type="button"
          onClick={requestPermissionAndSubscribe}
          className="text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 px-4 py-1.5 rounded-md"
        >
          Enable
        </button>
      </div>
    </div>
  );
}

interface CountBadgeProps {
  count: number;
  label: string;
  href: string;
  variant?: "default" | "warning" | "danger" | "success" | "info";
}

function CountBadge({ count, label, href, variant = "default" }: CountBadgeProps) {
  if (count === 0) {
    return (
      <div className="flex items-center justify-between py-2 px-3 rounded-md text-gray-400">
        <span className="text-sm">{label}</span>
        <span className="text-sm font-medium">0</span>
      </div>
    );
  }

  const variantStyles: Record<string, string> = {
    default: "bg-gray-50 hover:bg-gray-100 text-gray-700",
    warning: "bg-amber-50 hover:bg-amber-100 text-amber-800",
    danger: "bg-red-50 hover:bg-red-100 text-red-800",
    success: "bg-emerald-50 hover:bg-emerald-100 text-emerald-800",
    info: "bg-blue-50 hover:bg-blue-100 text-blue-800",
  };

  const badgeStyles: Record<string, string> = {
    default: "bg-gray-200 text-gray-800",
    warning: "bg-amber-200 text-amber-900",
    danger: "bg-red-200 text-red-900",
    success: "bg-emerald-200 text-emerald-900",
    info: "bg-blue-200 text-blue-900",
  };

  return (
    <Link
      href={href}
      className={`flex items-center justify-between py-2 px-3 rounded-md transition-colors ${variantStyles[variant]}`}
    >
      <span className="text-sm font-medium">{label}</span>
      <span
        className={`inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 text-xs font-bold rounded-full ${badgeStyles[variant]}`}
      >
        {count}
      </span>
    </Link>
  );
}

function CountBadgeSkeleton() {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-md">
      <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
      <div className="h-5 w-6 bg-gray-200 rounded-full animate-pulse" />
    </div>
  );
}

function LaneSkeleton({ title, color }: { title: string; color: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className={`px-4 py-3 ${color}`}>
        <h2 className="text-sm font-semibold text-white uppercase tracking-wide">{title}</h2>
      </div>
      <div className="p-4 space-y-2">
        <CountBadgeSkeleton />
        <CountBadgeSkeleton />
        <CountBadgeSkeleton />
      </div>
    </div>
  );
}

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

function RoleSummarySection({ activeView }: { activeView: string }) {
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

export default function StockControlDashboard() {
  const { colors, heroImageUrl } = useStockControlBranding();
  const { user } = useStockControlAuth();
  const { data: lanes, isLoading: lanesLoading } = useWorkflowLaneCounts();
  const { data: stats } = useDashboardStats();
  const { data: cpoSummary } = useCpoSummary();
  const { data: pendingApprovals } = usePendingApprovals();
  const { data: preferences } = useDashboardPreferences();
  const updatePreferences = useUpdateDashboardPreferences();
  const [notifications, setNotifications] = useState<WorkflowNotification[]>([]);

  const role = user?.role || "viewer";
  const [activeView, setActiveView] = useState(role);

  useEffect(() => {
    setActiveView(preferences?.viewOverride ?? role);
  }, [preferences?.viewOverride, role]);

  useEffect(() => {
    stockControlApiClient
      .workflowNotifications(10)
      .then((data) => setNotifications(Array.isArray(data) ? data : []))
      .catch(() => setNotifications([]));
  }, []);

  const hiddenWidgets = preferences?.hiddenWidgets ?? [];

  const handleWidgetToggle = useCallback(
    (widgetKey: string) => {
      const current = preferences?.hiddenWidgets ?? [];
      const updated = current.includes(widgetKey)
        ? current.filter((k) => k !== widgetKey)
        : [...current, widgetKey];
      updatePreferences.mutate({ hiddenWidgets: updated });
    },
    [preferences?.hiddenWidgets, updatePreferences],
  );

  const handleViewSwitch = useCallback(
    (newRole: string) => {
      setActiveView(newRole);
      const override = newRole === role ? null : newRole;
      updatePreferences.mutate({ viewOverride: override });
    },
    [role, updatePreferences],
  );

  const widgetVisible = (key: string) => !hiddenWidgets.includes(key);

  const showInbound = INBOUND_ROLES.includes(activeView);
  const showWorkshop = WORKSHOP_ROLES.includes(activeView);
  const showOutbound = OUTBOUND_ROLES.includes(activeView);

  return (
    <div className="space-y-6">
      {heroImageUrl ? (
        <div className="relative rounded-xl overflow-hidden shadow-lg" style={{ minHeight: 100 }}>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroImageUrl})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/30" />
          <div className="relative px-4 py-5 sm:px-8 sm:py-8">
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              Welcome back, {user?.name ? user.name.split(" ")[0] : "there"}
            </h1>
            <p className="mt-1 text-white/80 text-xs sm:text-sm">Workflow overview</p>
          </div>
        </div>
      ) : (
        <div
          className="relative rounded-xl overflow-hidden shadow-lg"
          style={{ backgroundColor: colors.background, minHeight: 80 }}
        >
          <div className="relative px-4 py-4 sm:px-8 sm:py-6">
            <h1 className="text-lg sm:text-2xl font-bold text-white">
              Welcome back, {user?.name ? user.name.split(" ")[0] : "there"}
            </h1>
            <p className="mt-1 text-white/80 text-xs sm:text-sm">Workflow overview</p>
          </div>
        </div>
      )}

      <PushNotificationBanner />

      <div className="flex items-center justify-end gap-2">
        <WidgetVisibilityToggle
          allWidgets={ALL_WIDGETS}
          hiddenWidgets={hiddenWidgets}
          onToggle={handleWidgetToggle}
        />
        <ViewSwitcher currentRole={role} activeView={activeView} onSwitch={handleViewSwitch} />
      </div>

      {widgetVisible("role-summary") && <RoleSummarySection activeView={activeView} />}

      {widgetVisible("my-tasks") && (
        <MyTasksWidget pendingApprovals={pendingApprovals ?? []} notifications={notifications} />
      )}

      {widgetVisible("stats") && stats && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Link
            href="/stock-control/portal/inventory"
            className="bg-white shadow-sm border border-gray-200 rounded-lg p-3 sm:p-4 hover:ring-2 hover:ring-teal-500 transition-all"
          >
            <p className="text-xs font-medium text-gray-500">Items</p>
            <p className="text-xl sm:text-2xl font-semibold text-gray-900">{stats.totalItems}</p>
          </Link>
          <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-3 sm:p-4">
            <p className="text-xs font-medium text-gray-500">Stock Value</p>
            <p className="text-lg sm:text-2xl font-semibold text-gray-900 truncate">
              {new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(
                stats.totalValue,
              )}
            </p>
          </div>
          <Link
            href="/stock-control/portal/job-cards"
            className="bg-white shadow-sm border border-gray-200 rounded-lg p-3 sm:p-4 hover:ring-2 hover:ring-teal-500 transition-all"
          >
            <p className="text-xs font-medium text-gray-500">Active Jobs</p>
            <p className="text-xl sm:text-2xl font-semibold text-gray-900">{stats.activeJobs}</p>
          </Link>
          <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-3 sm:p-4">
            <p className="text-xs font-medium text-gray-500">Low Stock</p>
            <p
              className={`text-xl sm:text-2xl font-semibold ${stats.lowStockCount > 0 ? "text-amber-600" : "text-gray-900"}`}
            >
              {stats.lowStockCount}
            </p>
          </div>
        </div>
      )}

      {widgetVisible("workflow-lanes") && (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {showInbound &&
              (lanesLoading ? (
                <LaneSkeleton title="Inbound" color="bg-blue-600" />
              ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 bg-blue-600">
                    <h2 className="text-sm font-semibold text-white uppercase tracking-wide">
                      Inbound
                    </h2>
                    <p className="text-xs text-blue-200">Deliveries & Invoices</p>
                  </div>
                  <div className="p-3 space-y-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 pt-1">
                      Deliveries
                    </p>
                    <CountBadge
                      count={lanes?.inbound.deliveriesPending ?? 0}
                      label="Pending extraction"
                      href="/stock-control/portal/deliveries"
                      variant="warning"
                    />
                    <CountBadge
                      count={lanes?.inbound.deliveriesProcessed ?? 0}
                      label="Processed"
                      href="/stock-control/portal/deliveries"
                      variant="success"
                    />
                    <div className="border-t border-gray-100 my-2" />
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 pt-1">
                      Invoices
                    </p>
                    <CountBadge
                      count={lanes?.inbound.invoicesPending ?? 0}
                      label="Pending extraction"
                      href="/stock-control/portal/invoices?status=pending"
                      variant="warning"
                    />
                    <CountBadge
                      count={lanes?.inbound.invoicesNeedClarification ?? 0}
                      label="Need clarification"
                      href="/stock-control/portal/invoices?status=needs_clarification"
                      variant="danger"
                    />
                    <CountBadge
                      count={lanes?.inbound.invoicesAwaitingApproval ?? 0}
                      label="Awaiting approval"
                      href="/stock-control/portal/invoices?status=awaiting_approval"
                      variant="info"
                    />
                  </div>
                </div>
              ))}

            {showWorkshop &&
              (lanesLoading ? (
                <LaneSkeleton title="Workshop" color="bg-teal-600" />
              ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 bg-teal-600">
                    <h2 className="text-sm font-semibold text-white uppercase tracking-wide">
                      Workshop
                    </h2>
                    <p className="text-xs text-teal-200">Job Cards & Processing</p>
                  </div>
                  <div className="p-3 space-y-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 pt-1">
                      Job Cards
                    </p>
                    <CountBadge
                      count={lanes?.workshop.jobCardsDraft ?? 0}
                      label="Draft"
                      href="/stock-control/portal/job-cards?status=draft"
                      variant="default"
                    />
                    <CountBadge
                      count={lanes?.workshop.jobCardsPendingAdmin ?? 0}
                      label="Pending admin approval"
                      href="/stock-control/portal/job-cards?status=document_uploaded"
                      variant="warning"
                    />
                    <CountBadge
                      count={lanes?.workshop.jobCardsPendingManager ?? 0}
                      label="Pending manager approval"
                      href="/stock-control/portal/job-cards?status=admin_approved"
                      variant="warning"
                    />
                    <CountBadge
                      count={lanes?.workshop.jobCardsRequisitionSent ?? 0}
                      label="Requisition sent"
                      href="/stock-control/portal/job-cards?status=requisition_sent"
                      variant="info"
                    />
                    <CountBadge
                      count={lanes?.workshop.jobCardsPendingAllocation ?? 0}
                      label="Pending allocation"
                      href="/stock-control/portal/job-cards?status=manager_approved"
                      variant="warning"
                    />
                    <CountBadge
                      count={lanes?.workshop.jobCardsPendingFinal ?? 0}
                      label="Pending final approval"
                      href="/stock-control/portal/job-cards?status=stock_allocated"
                      variant="info"
                    />
                    {((lanes?.workshop.coatingPending ?? 0) > 0 ||
                      (lanes?.workshop.coatingAnalysed ?? 0) > 0) && (
                      <>
                        <div className="border-t border-gray-100 my-2" />
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 pt-1">
                          Coating Analysis
                        </p>
                        <CountBadge
                          count={lanes?.workshop.coatingPending ?? 0}
                          label="Pending analysis"
                          href="/stock-control/portal/job-cards"
                          variant="warning"
                        />
                        <CountBadge
                          count={lanes?.workshop.coatingAnalysed ?? 0}
                          label="Awaiting acceptance"
                          href="/stock-control/portal/job-cards"
                          variant="info"
                        />
                      </>
                    )}
                    <div className="border-t border-gray-100 my-2" />
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 pt-1">
                      Requisitions
                    </p>
                    <CountBadge
                      count={lanes?.workshop.requisitionsPending ?? 0}
                      label="Pending"
                      href="/stock-control/portal/requisitions?status=pending"
                      variant="warning"
                    />
                    <CountBadge
                      count={lanes?.workshop.requisitionsApproved ?? 0}
                      label="Approved"
                      href="/stock-control/portal/requisitions?status=approved"
                      variant="success"
                    />
                    <CountBadge
                      count={lanes?.workshop.requisitionsOrdered ?? 0}
                      label="Ordered"
                      href="/stock-control/portal/requisitions?status=ordered"
                      variant="info"
                    />
                  </div>
                </div>
              ))}

            {showOutbound &&
              (lanesLoading ? (
                <LaneSkeleton title="Outbound" color="bg-purple-600" />
              ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 bg-purple-600">
                    <h2 className="text-sm font-semibold text-white uppercase tracking-wide">
                      Outbound
                    </h2>
                    <p className="text-xs text-purple-200">Dispatch & Stock Alerts</p>
                  </div>
                  <div className="p-3 space-y-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 pt-1">
                      Dispatch
                    </p>
                    <CountBadge
                      count={lanes?.outbound.jobCardsReadyForDispatch ?? 0}
                      label="Ready for dispatch"
                      href="/stock-control/portal/job-cards?status=ready_for_dispatch"
                      variant="warning"
                    />
                    <CountBadge
                      count={lanes?.outbound.jobCardsDispatched ?? 0}
                      label="Dispatched"
                      href="/stock-control/portal/job-cards?status=dispatched"
                      variant="success"
                    />
                    <div className="border-t border-gray-100 my-2" />
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 pt-1">
                      Stock Alerts
                    </p>
                    <CountBadge
                      count={lanes?.outbound.lowStockAlerts ?? 0}
                      label="Low stock items"
                      href="/stock-control/portal/inventory?filter=low-stock"
                      variant="danger"
                    />
                  </div>

                  {cpoSummary &&
                    (cpoSummary.activeCpos > 0 ||
                      cpoSummary.awaitingCalloff > 0 ||
                      cpoSummary.overdueInvoices > 0) && (
                      <>
                        <div className="border-t border-gray-100 mx-3" />
                        <div className="p-3 space-y-1">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 pt-1">
                            Purchase Orders
                          </p>
                          <CountBadge
                            count={cpoSummary.activeCpos}
                            label="Active CPOs"
                            href="/stock-control/portal/purchase-orders"
                            variant="info"
                          />
                          <CountBadge
                            count={cpoSummary.awaitingCalloff}
                            label="Awaiting call-off"
                            href="/stock-control/portal/purchase-orders"
                            variant="warning"
                          />
                          <CountBadge
                            count={cpoSummary.overdueInvoices}
                            label="Overdue invoices"
                            href="/stock-control/portal/purchase-orders"
                            variant="danger"
                          />
                        </div>
                      </>
                    )}
                </div>
              ))}
          </div>

          {!showInbound && !showWorkshop && !showOutbound && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-500">No workflow lanes available for this view.</p>
            </div>
          )}
        </>
      )}

      {widgetVisible("quick-links") && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            href="/stock-control/portal/inventory"
            className="bg-white shadow-sm border border-gray-200 rounded-lg p-4 hover:ring-2 hover:ring-teal-500 transition-all text-center"
          >
            <svg
              className="w-6 h-6 mx-auto text-gray-400 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
            <p className="text-sm font-medium text-gray-700">Inventory</p>
          </Link>
          <Link
            href="/stock-control/portal/staff"
            className="bg-white shadow-sm border border-gray-200 rounded-lg p-4 hover:ring-2 hover:ring-teal-500 transition-all text-center"
          >
            <svg
              className="w-6 h-6 mx-auto text-gray-400 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <p className="text-sm font-medium text-gray-700">Staff</p>
          </Link>
          <Link
            href="/stock-control/portal/reports"
            className="bg-white shadow-sm border border-gray-200 rounded-lg p-4 hover:ring-2 hover:ring-teal-500 transition-all text-center"
          >
            <svg
              className="w-6 h-6 mx-auto text-gray-400 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <p className="text-sm font-medium text-gray-700">Reports</p>
          </Link>
          <Link
            href="/stock-control/portal/settings"
            className="bg-white shadow-sm border border-gray-200 rounded-lg p-4 hover:ring-2 hover:ring-teal-500 transition-all text-center"
          >
            <svg
              className="w-6 h-6 mx-auto text-gray-400 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <p className="text-sm font-medium text-gray-700">Settings</p>
          </Link>
        </div>
      )}
    </div>
  );
}
