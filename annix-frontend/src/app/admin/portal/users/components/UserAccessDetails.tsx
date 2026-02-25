"use client";

import type {
  RbacApp,
  RbacAppAccessSummary,
  RbacUserWithAccessSummary,
} from "@/app/lib/api/adminApi";

interface UserAccessDetailsProps {
  user: RbacUserWithAccessSummary;
  apps: RbacApp[];
  onEditAccess: (appCode: string, existingAccess: RbacAppAccessSummary | null) => void;
  onRevokeAccess: (access: RbacAppAccessSummary) => void;
}

export function UserAccessDetails({
  user,
  apps,
  onEditAccess,
  onRevokeAccess,
}: UserAccessDetailsProps) {
  const accessByApp = user.appAccess.reduce(
    (acc, access) => {
      acc[access.appCode] = access;
      return acc;
    },
    {} as Record<string, RbacAppAccessSummary>,
  );

  return (
    <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
      <h4 className="text-sm font-medium text-gray-700 mb-3">App Access</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {apps.map((app) => {
          const access = accessByApp[app.code];
          const isExpired = access?.expiresAt && new Date(access.expiresAt) < new Date();

          return (
            <div
              key={app.code}
              className={`border rounded-lg p-3 ${access ? (isExpired ? "border-yellow-200 bg-yellow-50" : "border-green-200 bg-green-50") : "border-gray-200 bg-white"}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h5 className="text-sm font-medium text-gray-900 truncate">{app.name}</h5>
                  {access ? (
                    <div className="mt-1">
                      <p className="text-xs text-gray-600">
                        {access.useCustomPermissions
                          ? `Custom (${access.permissionCount ?? 0} permissions)`
                          : (access.roleName ?? "No role assigned")}
                      </p>
                      {isExpired && <p className="text-xs text-yellow-600 font-medium">Expired</p>}
                      {access.expiresAt && !isExpired && (
                        <p className="text-xs text-gray-500">
                          Expires: {new Date(access.expiresAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 mt-1">No access</p>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => onEditAccess(app.code, access ?? null)}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    title={access ? "Edit access" : "Grant access"}
                  >
                    {access ? (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                    )}
                  </button>
                  {access && (
                    <button
                      onClick={() => onRevokeAccess(access)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      title="Revoke access"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
