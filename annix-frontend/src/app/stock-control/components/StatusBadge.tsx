"use client";

import { statusColorClasses } from "../lib/statusColors";

interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
}

export function StatusBadge(props: StatusBadgeProps) {
  const status = props.status;
  const label = props.label;
  const className = props.className;
  const colorClasses = statusColorClasses(status);
  const displayLabel = label ?? status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClasses} ${className ?? ""}`}
    >
      {displayLabel}
    </span>
  );
}
