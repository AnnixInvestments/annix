"use client";

import { useMemo } from "react";
import type { RbacApp, RbacAppAccessSummary } from "@/app/lib/api/adminApi";
import { fromISO, now } from "@/app/lib/datetime";

interface AppToggleCardProps {
  app: RbacApp;
  access: RbacAppAccessSummary | null;
  onEdit: () => void;
  onRevoke: () => void;
  onEnable: () => void;
  isRevoking?: boolean;
}

export function AppToggleCard({
  app,
  access,
  onEdit,
  onRevoke,
  onEnable,
  isRevoking,
}: AppToggleCardProps) {
  const hasAccess = access !== null;

  const isExpired = useMemo(() => {
    if (!access?.expiresAt) return false;
    return fromISO(access.expiresAt) < now();
  }, [access?.expiresAt]);

  const roleDisplay = access
    ? access.useCustomPermissions
      ? `Custom (${access.permissionCount ?? 0} permissions)`
      : (access.roleName ?? "No role assigned")
    : null;

  const handleToggle = () => {
    if (hasAccess) {
      onRevoke();
    } else {
      onEnable();
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800">
      <button
        type="button"
        onClick={onEdit}
        disabled={!hasAccess || isRevoking}
        className="flex-1 min-w-0 text-left disabled:cursor-default"
      >
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-gray-900 dark:text-white">{app.name}</span>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              hasAccess && !isExpired
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                : hasAccess && isExpired
                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                  : "bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-gray-300"
            }`}
          >
            {hasAccess ? (isExpired ? "Expired" : "Enabled") : "Disabled"}
          </span>
        </div>
        {roleDisplay && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{roleDisplay}</p>
        )}
      </button>

      <button
        type="button"
        onClick={handleToggle}
        disabled={isRevoking}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          hasAccess ? "bg-blue-600" : "bg-gray-200 dark:bg-slate-600"
        } ${isRevoking ? "opacity-50 cursor-not-allowed" : ""}`}
        role="switch"
        aria-checked={hasAccess}
        aria-label={`Toggle ${app.name} access`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            hasAccess ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
