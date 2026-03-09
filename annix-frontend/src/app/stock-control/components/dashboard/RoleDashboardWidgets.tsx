"use client";

import Link from "next/link";
import type {
  AccountsDashboard,
  AdminDashboard,
  ManagerDashboard,
  StoremanDashboard,
} from "@/app/lib/api/stockControlApi";

function MetricCard({
  label,
  value,
  href,
  colorClass,
  alertThreshold,
}: {
  label: string;
  value: number;
  href?: string;
  colorClass: string;
  alertThreshold?: number;
}) {
  const valueColor =
    alertThreshold !== null && alertThreshold !== undefined && value >= alertThreshold
      ? "text-red-600"
      : "text-gray-900";

  const content = (
    <div className="bg-white rounded-lg shadow p-3 sm:p-4 flex flex-col items-center text-center">
      <p className={`text-xl sm:text-2xl font-bold ${valueColor}`}>{value}</p>
      <p className="text-xs sm:text-sm text-gray-500 mt-1">{label}</p>
      <div className={`w-full h-1 rounded-full mt-2 ${colorClass}`} />
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="hover:ring-2 hover:ring-teal-500 rounded-lg transition-all">
        {content}
      </Link>
    );
  }

  return content;
}

function WidgetContainer({
  title,
  badge,
  badgeColor,
  children,
}: {
  title: string;
  badge?: string;
  badgeColor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-3 py-4 sm:px-6 sm:py-5 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-base sm:text-lg leading-6 font-medium text-gray-900">{title}</h3>
        {badge && (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeColor ?? "bg-teal-100 text-teal-800"}`}
          >
            {badge}
          </span>
        )}
      </div>
      <div className="p-3 sm:p-6">{children}</div>
    </div>
  );
}

interface StoremanWidgetProps {
  data: StoremanDashboard;
}

export function StoremanWidget({ data }: StoremanWidgetProps) {
  return (
    <WidgetContainer title="Storeman Overview">
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <MetricCard
          label="Incoming Deliveries"
          value={data.incomingDeliveries}
          href="/stock-control/portal/deliveries"
          colorClass="bg-teal-400"
        />
        <MetricCard
          label="Dispatch Ready"
          value={data.dispatchReadyJobs}
          href="/stock-control/portal/job-cards"
          colorClass="bg-emerald-400"
        />
        <MetricCard
          label="Today's Movements"
          value={data.todayMovements}
          href="/stock-control/portal/issue-stock"
          colorClass="bg-blue-400"
        />
        <MetricCard
          label="Reorder Alerts"
          value={data.reorderAlerts}
          href="/stock-control/portal/inventory"
          colorClass="bg-amber-400"
          alertThreshold={1}
        />
      </div>
    </WidgetContainer>
  );
}

interface AccountsWidgetProps {
  data: AccountsDashboard;
}

export function AccountsWidget({ data }: AccountsWidgetProps) {
  const pipelineSteps = [
    { label: "Extraction", value: data.pendingExtraction, colorClass: "bg-gray-400" },
    { label: "Processing", value: data.processing, colorClass: "bg-blue-400" },
    { label: "Clarification", value: data.needsClarification, colorClass: "bg-amber-400" },
    { label: "Approval", value: data.awaitingApproval, colorClass: "bg-teal-400" },
    { label: "Complete", value: data.completedThisMonth, colorClass: "bg-emerald-400" },
  ];

  return (
    <WidgetContainer
      title="Accounts Pipeline"
      badge={data.overdueInvoices > 0 ? `${data.overdueInvoices} overdue` : undefined}
      badgeColor="bg-red-100 text-red-800"
    >
      <div className="space-y-4">
        <Link
          href="/stock-control/portal/invoices"
          className="block hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-1">
            {pipelineSteps.map((step) => (
              <div key={step.label} className="flex-1 text-center">
                <div className={`h-2 rounded-full ${step.colorClass}`} />
                <p className="text-lg sm:text-xl font-bold text-gray-900 mt-2">{step.value}</p>
                <p className="text-xs text-gray-500">{step.label}</p>
              </div>
            ))}
          </div>
        </Link>
        {data.overdueInvoices > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">
              {data.overdueInvoices} overdue invoice{data.overdueInvoices !== 1 ? "s" : ""} require
              attention
            </p>
          </div>
        )}
      </div>
    </WidgetContainer>
  );
}

interface ManagerWidgetProps {
  data: ManagerDashboard;
}

export function ManagerWidget({ data }: ManagerWidgetProps) {
  return (
    <WidgetContainer
      title="Manager Overview"
      badge={data.pendingApprovals > 0 ? `${data.pendingApprovals} pending` : undefined}
      badgeColor="bg-yellow-100 text-yellow-800"
    >
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <MetricCard
          label="Pending Approvals"
          value={data.pendingApprovals}
          href="/stock-control/portal/job-cards"
          colorClass="bg-yellow-400"
          alertThreshold={1}
        />
        <MetricCard
          label="Active Jobs"
          value={data.activeJobs}
          href="/stock-control/portal/job-cards"
          colorClass="bg-blue-400"
        />
        <MetricCard
          label="Over-Allocations"
          value={data.overAllocations}
          href="/stock-control/portal/inventory"
          colorClass="bg-red-400"
          alertThreshold={1}
        />
        <MetricCard
          label="Dispatch Ready"
          value={data.dispatchReady}
          href="/stock-control/portal/job-cards"
          colorClass="bg-emerald-400"
        />
      </div>
      {data.reorderAlerts > 0 && (
        <Link
          href="/stock-control/portal/inventory"
          className="mt-4 block bg-amber-50 border border-amber-200 rounded-lg p-3 hover:bg-amber-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
            <p className="text-sm text-amber-700">
              {data.reorderAlerts} item{data.reorderAlerts !== 1 ? "s" : ""} below reorder level
            </p>
          </div>
        </Link>
      )}
    </WidgetContainer>
  );
}

interface AdminWidgetProps {
  data: AdminDashboard;
}

export function AdminWidget({ data }: AdminWidgetProps) {
  return (
    <div className="space-y-4">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-3 py-4 sm:px-6 sm:py-5 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-base sm:text-lg leading-6 font-medium text-gray-900">
            System Overview
          </h3>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {data.totalUsers} users
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StoremanWidget data={data.storeman} />
        <AccountsWidget data={data.accounts} />
        <ManagerWidget data={data.manager} />
      </div>
    </div>
  );
}

interface ViewerWidgetProps {
  data: { activeJobs: number; totalItems: number; lowStockCount: number };
}

export function ViewerWidget({ data }: ViewerWidgetProps) {
  return (
    <WidgetContainer title="Stock Summary">
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <MetricCard label="Active Jobs" value={data.activeJobs} colorClass="bg-blue-400" />
        <MetricCard label="Total Items" value={data.totalItems} colorClass="bg-teal-400" />
        <MetricCard
          label="Low Stock"
          value={data.lowStockCount}
          colorClass="bg-amber-400"
          alertThreshold={1}
        />
      </div>
    </WidgetContainer>
  );
}
