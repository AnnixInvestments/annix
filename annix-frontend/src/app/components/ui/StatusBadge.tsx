"use client";

import { memo, useMemo } from "react";

type StatusVariant = "success" | "warning" | "error" | "neutral" | "info";

interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  className?: string;
}

const STATUS_COLORS: Record<string, StatusVariant> = {
  active: "success",
  approved: "success",
  completed: "success",
  confirmed: "success",
  pending: "warning",
  processing: "warning",
  waiting: "warning",
  review: "warning",
  suspended: "error",
  rejected: "error",
  failed: "error",
  cancelled: "error",
  deactivated: "neutral",
  inactive: "neutral",
  draft: "neutral",
  archived: "neutral",
  info: "info",
  new: "info",
};

const VARIANT_CLASSES: Record<StatusVariant, string> = {
  success: "bg-green-100 text-green-800",
  warning: "bg-yellow-100 text-yellow-800",
  error: "bg-red-100 text-red-800",
  neutral: "bg-gray-100 text-gray-600",
  info: "bg-blue-100 text-blue-800",
};

function StatusBadgeComponent({ status, variant, className = "" }: StatusBadgeProps) {
  const badgeClass = useMemo(() => {
    const statusLower = status.toLowerCase();
    const resolvedVariant = variant ?? STATUS_COLORS[statusLower] ?? "neutral";
    return VARIANT_CLASSES[resolvedVariant];
  }, [status, variant]);

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass} ${className}`}
    >
      {status}
    </span>
  );
}

export const StatusBadge = memo(StatusBadgeComponent);
