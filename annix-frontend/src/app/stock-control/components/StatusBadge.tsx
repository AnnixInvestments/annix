"use client";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  admin_approval: "bg-yellow-100 text-yellow-800",
  manager_approval: "bg-orange-100 text-orange-800",
  quality_check: "bg-blue-100 text-blue-800",
  dispatched: "bg-teal-100 text-teal-800",
  file_closed: "bg-slate-100 text-slate-800",
  active: "bg-green-100 text-green-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  ordered: "bg-purple-100 text-purple-800",
  received: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  needs_clarification: "bg-yellow-100 text-yellow-800",
  awaiting_approval: "bg-purple-100 text-purple-800",
  fulfilled: "bg-blue-100 text-blue-800",
  document_uploaded: "bg-yellow-100 text-yellow-800",
  admin_approved: "bg-orange-100 text-orange-800",
  manager_approved: "bg-blue-100 text-blue-800",
  requisition_sent: "bg-indigo-100 text-indigo-800",
  stock_allocated: "bg-blue-100 text-blue-800",
  ready_for_dispatch: "bg-emerald-100 text-emerald-800",
};

interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
}

export function StatusBadge(props: StatusBadgeProps) {
  const status = props.status;
  const label = props.label;
  const className = props.className;
  const colorClasses = STATUS_COLORS[status.toLowerCase()] ?? "bg-gray-100 text-gray-800";
  const displayLabel = label ?? status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClasses} ${className ?? ""}`}
    >
      {displayLabel}
    </span>
  );
}
