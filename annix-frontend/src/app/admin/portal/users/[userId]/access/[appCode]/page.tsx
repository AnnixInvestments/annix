"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/app/components/Toast";
import type { AssignUserAccessDto, UpdateUserAccessDto } from "@/app/lib/api/adminApi";
import {
  useRbacAllUsers,
  useRbacAppDetails,
  useRbacAssignAccess,
  useRbacUpdateAccess,
} from "@/app/lib/query/hooks";

export default function EditUserAccessPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const userId = Number(params.userId);
  const appCode = params.appCode as string;

  const [useCustomPermissions, setUseCustomPermissions] = useState(false);
  const [selectedRoleCode, setSelectedRoleCode] = useState<string | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("");

  const { data: allUsers = [] } = useRbacAllUsers();
  const { data: appDetails, isLoading: appLoading } = useRbacAppDetails(appCode);

  const assignMutation = useRbacAssignAccess();
  const updateMutation = useRbacUpdateAccess();

  const user = useMemo(() => allUsers.find((u) => u.id === userId) ?? null, [allUsers, userId]);

  const existingAccess = useMemo(() => {
    if (!user) return null;
    return user.appAccess.find((a) => a.appCode === appCode) ?? null;
  }, [user, appCode]);

  const permissionsByCategory = useMemo(() => {
    if (!appDetails) return {};
    return appDetails.permissions.reduce(
      (acc, perm) => {
        const category = perm.category ?? "General";
        if (!acc[category]) acc[category] = [];
        acc[category].push(perm);
        return acc;
      },
      {} as Record<string, typeof appDetails.permissions>,
    );
  }, [appDetails]);

  const categories = useMemo(() => Object.keys(permissionsByCategory), [permissionsByCategory]);

  useEffect(() => {
    if (existingAccess) {
      setUseCustomPermissions(existingAccess.useCustomPermissions);
      setSelectedRoleCode(existingAccess.roleCode);
      setSelectedPermissions([]);
      setExpiresAt(existingAccess.expiresAt ?? "");
    } else if (appDetails) {
      setUseCustomPermissions(false);
      setSelectedRoleCode(appDetails.roles.find((r) => r.isDefault)?.code ?? null);
      setSelectedPermissions([]);
      setExpiresAt("");
    }
  }, [existingAccess, appDetails]);

  useEffect(() => {
    if (categories.length > 0 && !activeTab) {
      setActiveTab(categories[0]);
    }
  }, [categories, activeTab]);

  const togglePermission = (code: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(code) ? prev.filter((p) => p !== code) : [...prev, code],
    );
  };

  const handleSave = () => {
    if (!user || !appDetails) return;

    const dto: AssignUserAccessDto | UpdateUserAccessDto = {
      ...(existingAccess ? {} : { appCode }),
      useCustomPermissions,
      roleCode: useCustomPermissions ? null : selectedRoleCode,
      permissionCodes: useCustomPermissions ? selectedPermissions : undefined,
      expiresAt: expiresAt || null,
    };

    if (existingAccess) {
      updateMutation.mutate(
        {
          accessId: existingAccess.accessId,
          dto: dto as UpdateUserAccessDto,
          appCode,
        },
        {
          onSuccess: () => {
            showToast("Access updated successfully", "success");
            router.push("/admin/portal/users");
          },
          onError: (err) => {
            showToast(`Error: ${err.message}`, "error");
          },
        },
      );
    } else {
      assignMutation.mutate(
        {
          userId: user.id,
          dto: { ...dto, appCode } as AssignUserAccessDto,
        },
        {
          onSuccess: () => {
            showToast(`Access granted to ${userDisplayName(user)}`, "success");
            router.push("/admin/portal/users");
          },
          onError: (err) => {
            showToast(`Error: ${err.message}`, "error");
          },
        },
      );
    }
  };

  const userDisplayName = (u: typeof user) => {
    if (!u) return "User";
    const fullName = [u.firstName, u.lastName].filter(Boolean).join(" ");
    return fullName || u.email;
  };

  const enabledInCategory = (category: string) => {
    const perms = permissionsByCategory[category] ?? [];
    return perms.filter((p) => selectedPermissions.includes(p.code)).length;
  };

  const isSaving = assignMutation.isPending || updateMutation.isPending;

  if (appLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!appDetails) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <p className="text-sm text-red-700 dark:text-red-300">App not found: {appCode}</p>
        <Link
          href="/admin/portal/users"
          className="mt-4 inline-block text-sm font-medium text-red-600 hover:text-red-500"
        >
          Back to Users
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
            <Link href="/admin/portal/users" className="hover:text-blue-600">
              Users
            </Link>
            <span>/</span>
            <span>{userDisplayName(user)}</span>
            <span>/</span>
            <span>{appDetails.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {existingAccess ? "Edit Access" : "Grant Access"} - {appDetails.name}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{userDisplayName(user)}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Access Type</h3>
        </div>
        <div className="px-6 py-4">
          <div className="flex gap-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                checked={!useCustomPermissions}
                onChange={() => setUseCustomPermissions(false)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Use a predefined role
              </span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                checked={useCustomPermissions}
                onChange={() => setUseCustomPermissions(true)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Custom permissions
              </span>
            </label>
          </div>
        </div>
      </div>

      {!useCustomPermissions && (
        <div className="bg-white dark:bg-slate-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Role</h3>
          </div>
          <div className="px-6 py-4">
            <select
              value={selectedRoleCode ?? ""}
              onChange={(e) => setSelectedRoleCode(e.target.value || null)}
              className="block w-full max-w-md rounded-md border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {appDetails.roles.find((r) => r.code === selectedRoleCode)?.description}
              </p>
            )}
          </div>
        </div>
      )}

      {useCustomPermissions && categories.length > 0 && (
        <div className="bg-white dark:bg-slate-800 shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Permissions ({selectedPermissions.length} selected)
            </h3>
          </div>

          <div className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
            <nav className="flex overflow-x-auto px-4" aria-label="Permission categories">
              {categories.map((category) => {
                const isActive = activeTab === category;
                const enabled = enabledInCategory(category);
                const total = permissionsByCategory[category]?.length ?? 0;

                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveTab(category)}
                    className={`whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                      isActive
                        ? "border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800"
                        : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    }`}
                  >
                    {category}
                    <span
                      className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                        isActive
                          ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300"
                          : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-400"
                      }`}
                    >
                      {enabled}/{total}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-slate-700">
            {(permissionsByCategory[activeTab] ?? []).map((perm) => {
              const isEnabled = selectedPermissions.includes(perm.code);
              return (
                <div key={perm.code} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {perm.name}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          isEnabled
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-gray-300"
                        }`}
                      >
                        {isEnabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    {perm.description && (
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {perm.description}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => togglePermission(perm.code)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      isEnabled ? "bg-blue-600" : "bg-gray-200 dark:bg-slate-600"
                    }`}
                    role="switch"
                    aria-checked={isEnabled}
                    aria-label={`Toggle ${perm.name}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Expiration Date</h3>
        </div>
        <div className="px-6 py-4">
          <input
            type="date"
            value={expiresAt ? expiresAt.split("T")[0] : ""}
            onChange={(e) => setExpiresAt(e.target.value ? `${e.target.value}T23:59:59Z` : "")}
            className="block w-full max-w-md rounded-md border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Leave empty for permanent access
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Link
          href="/admin/portal/users"
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-600"
        >
          Cancel
        </Link>
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
  );
}
