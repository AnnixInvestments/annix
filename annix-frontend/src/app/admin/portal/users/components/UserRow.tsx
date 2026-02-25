"use client";

import type {
  RbacApp,
  RbacAppAccessSummary,
  RbacUserWithAccessSummary,
} from "@/app/lib/api/adminApi";
import { AppAccessBadge } from "./AppAccessBadge";
import { UserAccessDetails } from "./UserAccessDetails";

interface UserRowProps {
  user: RbacUserWithAccessSummary;
  apps: RbacApp[];
  isExpanded: boolean;
  onToggle: () => void;
  onEditAccess: (appCode: string, existingAccess: RbacAppAccessSummary | null) => void;
  onRevokeAccess: (access: RbacAppAccessSummary) => void;
}

export function UserRow({
  user,
  apps,
  isExpanded,
  onToggle,
  onEditAccess,
  onRevokeAccess,
}: UserRowProps) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  const displayName = fullName || user.email;

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    invited: "bg-blue-100 text-blue-800",
    suspended: "bg-red-100 text-red-800",
    deactivated: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div
        className="flex items-center px-4 py-3 bg-white cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                {(user.firstName?.[0] ?? user.email[0]).toUpperCase()}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColors[user.status] ?? "bg-gray-100 text-gray-800"}`}
                >
                  {user.status}
                </span>
              </div>
              {fullName && <p className="text-sm text-gray-500 truncate">{user.email}</p>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 ml-4">
          <div className="hidden md:flex flex-wrap gap-1 max-w-md">
            {user.appAccess.length > 0 ? (
              user.appAccess
                .slice(0, 3)
                .map((access) => <AppAccessBadge key={access.appCode} access={access} />)
            ) : (
              <span className="text-sm text-gray-400 italic">No app access</span>
            )}
            {user.appAccess.length > 3 && (
              <span className="text-xs text-gray-500 self-center">
                +{user.appAccess.length - 3} more
              </span>
            )}
          </div>

          <div className="hidden lg:block text-sm text-gray-500 whitespace-nowrap">
            {user.lastLoginAt
              ? `Last login: ${new Date(user.lastLoginAt).toLocaleDateString()}`
              : "Never logged in"}
          </div>

          <button
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          >
            <svg
              className={`w-5 h-5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
      </div>

      {isExpanded && (
        <UserAccessDetails
          user={user}
          apps={apps}
          onEditAccess={onEditAccess}
          onRevokeAccess={onRevokeAccess}
        />
      )}
    </div>
  );
}
