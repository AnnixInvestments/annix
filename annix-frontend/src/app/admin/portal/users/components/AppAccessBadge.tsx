"use client";

import type { RbacAppAccessSummary } from "@/app/lib/api/adminApi";

interface AppAccessBadgeProps {
  access: RbacAppAccessSummary;
}

const APP_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "rfq-platform": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  "supplier-portal": { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  "admin-portal": { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  "annix-rep": { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
};

const DEFAULT_COLORS = { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" };

export function AppAccessBadge({ access }: AppAccessBadgeProps) {
  const colors = APP_COLORS[access.appCode] ?? DEFAULT_COLORS;

  const roleDisplay = access.useCustomPermissions
    ? `Custom (${access.permissionCount ?? 0})`
    : (access.roleName ?? "No Role");

  const isExpired = access.expiresAt && new Date(access.expiresAt) < new Date();

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border ${colors.bg} ${colors.text} ${colors.border} ${isExpired ? "opacity-50 line-through" : ""}`}
      title={`${access.appName}: ${roleDisplay}${isExpired ? " (Expired)" : ""}`}
    >
      <span className="font-semibold">{access.appName}</span>
      <span className="text-gray-400">|</span>
      <span>{roleDisplay}</span>
    </span>
  );
}
