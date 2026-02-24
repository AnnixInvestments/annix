"use client";

import type { RbacUserAccess } from "@/app/lib/api/adminApi";
import { formatDateZA } from "@/app/lib/datetime";

interface UserAccessCardProps {
  access: RbacUserAccess;
  onEdit: () => void;
  onRevoke: () => void;
}

export function UserAccessCard({ access, onEdit, onRevoke }: UserAccessCardProps) {
  const displayName = [access.firstName, access.lastName].filter(Boolean).join(" ") || access.email;
  const isExpired = access.expiresAt && new Date(access.expiresAt) < new Date();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-medium text-gray-900">{displayName}</div>
            <div className="text-sm text-gray-500">{access.email}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="text-blue-600 hover:text-blue-800 p-1"
            title="Edit access"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <button
            onClick={onRevoke}
            className="text-red-600 hover:text-red-800 p-1"
            title="Revoke access"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {access.useCustomPermissions ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            Custom ({access.permissionCount ?? 0} permissions)
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {access.roleName ?? "No Role"}
          </span>
        )}

        {isExpired ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Expired
          </span>
        ) : access.expiresAt ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Expires {formatDateZA(access.expiresAt)}
          </span>
        ) : null}
      </div>

      <div className="mt-2 text-xs text-gray-400">Granted {formatDateZA(access.grantedAt)}</div>
    </div>
  );
}
