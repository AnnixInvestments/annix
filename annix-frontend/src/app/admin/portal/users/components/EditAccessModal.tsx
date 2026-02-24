"use client";

import { useState, useEffect } from "react";
import type {
  RbacAppDetail,
  RbacUserAccess,
  AssignUserAccessDto,
  UpdateUserAccessDto,
  RbacSearchUser,
} from "@/app/lib/api/adminApi";

interface EditAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  appDetails: RbacAppDetail | null;
  existingAccess?: RbacUserAccess | null;
  selectedUser?: RbacSearchUser | null;
  onSave: (dto: AssignUserAccessDto | UpdateUserAccessDto) => void;
  isSaving: boolean;
}

export function EditAccessModal({
  isOpen,
  onClose,
  appDetails,
  existingAccess,
  selectedUser,
  onSave,
  isSaving,
}: EditAccessModalProps) {
  const [useCustomPermissions, setUseCustomPermissions] = useState(false);
  const [selectedRoleCode, setSelectedRoleCode] = useState<string | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState<string>("");

  useEffect(() => {
    if (existingAccess) {
      setUseCustomPermissions(existingAccess.useCustomPermissions);
      setSelectedRoleCode(existingAccess.roleCode);
      setSelectedPermissions(existingAccess.permissionCodes ?? []);
      setExpiresAt(existingAccess.expiresAt ?? "");
    } else {
      setUseCustomPermissions(false);
      setSelectedRoleCode(appDetails?.roles.find((r) => r.isDefault)?.code ?? null);
      setSelectedPermissions([]);
      setExpiresAt("");
    }
  }, [existingAccess, appDetails, isOpen]);

  if (!isOpen || !appDetails) return null;

  const permissionsByCategory = appDetails.permissions.reduce(
    (acc, perm) => {
      const category = perm.category ?? "General";
      if (!acc[category]) acc[category] = [];
      acc[category].push(perm);
      return acc;
    },
    {} as Record<string, typeof appDetails.permissions>,
  );

  const togglePermission = (code: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(code) ? prev.filter((p) => p !== code) : [...prev, code],
    );
  };

  const handleSave = () => {
    const dto: AssignUserAccessDto | UpdateUserAccessDto = {
      ...(existingAccess ? {} : { appCode: appDetails.code }),
      useCustomPermissions,
      roleCode: useCustomPermissions ? null : selectedRoleCode,
      permissionCodes: useCustomPermissions ? selectedPermissions : undefined,
      expiresAt: expiresAt || null,
    };
    onSave(dto);
  };

  const userDisplay = existingAccess
    ? [existingAccess.firstName, existingAccess.lastName].filter(Boolean).join(" ") ||
      existingAccess.email
    : selectedUser
      ? [selectedUser.firstName, selectedUser.lastName].filter(Boolean).join(" ") ||
        selectedUser.email
      : "User";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />

        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {existingAccess ? "Edit Access" : "Grant Access"} - {appDetails.name}
            </h3>
            <p className="text-sm text-gray-500 mt-1">{userDisplay}</p>
          </div>

          <div className="px-6 py-4 space-y-6 overflow-y-auto max-h-[60vh]">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Access Type
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={!useCustomPermissions}
                    onChange={() => setUseCustomPermissions(false)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Use a predefined role</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={useCustomPermissions}
                    onChange={() => setUseCustomPermissions(true)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Custom permissions</span>
                </label>
              </div>
            </div>

            {!useCustomPermissions && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  value={selectedRoleCode ?? ""}
                  onChange={(e) => setSelectedRoleCode(e.target.value || null)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">Select a role...</option>
                  {appDetails.roles.map((role) => (
                    <option key={role.code} value={role.code}>
                      {role.name}
                      {role.isDefault ? " (Default)" : ""}
                    </option>
                  ))}
                </select>
                {appDetails.roles.find((r) => r.code === selectedRoleCode)?.description && (
                  <p className="mt-1 text-sm text-gray-500">
                    {appDetails.roles.find((r) => r.code === selectedRoleCode)?.description}
                  </p>
                )}
              </div>
            )}

            {useCustomPermissions && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permissions ({selectedPermissions.length} selected)
                </label>
                <div className="space-y-4 max-h-64 overflow-y-auto border border-gray-200 rounded-md p-3">
                  {Object.entries(permissionsByCategory).map(([category, perms]) => (
                    <div key={category}>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        {category}
                      </h4>
                      <div className="space-y-2">
                        {perms.map((perm) => (
                          <label key={perm.code} className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              checked={selectedPermissions.includes(perm.code)}
                              onChange={() => togglePermission(perm.code)}
                              className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 mt-0.5"
                            />
                            <div>
                              <span className="text-sm text-gray-900">{perm.name}</span>
                              {perm.description && (
                                <p className="text-xs text-gray-500">{perm.description}</p>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expiration Date (optional)
              </label>
              <input
                type="date"
                value={expiresAt ? expiresAt.split("T")[0] : ""}
                onChange={(e) =>
                  setExpiresAt(e.target.value ? `${e.target.value}T23:59:59Z` : "")
                }
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                Leave empty for permanent access
              </p>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || (!useCustomPermissions && !selectedRoleCode)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : existingAccess ? "Update Access" : "Grant Access"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
