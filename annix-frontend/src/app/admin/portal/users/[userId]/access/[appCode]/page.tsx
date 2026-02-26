"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/app/components/Toast";
import type { AssignUserAccessDto, UpdateUserAccessDto } from "@/app/lib/api/adminApi";
import { PRODUCTS_AND_SERVICES, PROJECT_TYPES } from "@/app/lib/config/productsServices";
import {
  useFeatureFlags,
  useRbacAllUsers,
  useRbacAppDetails,
  useRbacAssignAccess,
  useRbacUpdateAccess,
  useToggleFeatureFlag,
} from "@/app/lib/query/hooks";
import { RoleManagementPanel } from "../../../components/RoleManagementPanel";

const RFQ_TYPE_FLAG_MAP = PROJECT_TYPES.reduce<Record<string, { label: string }>>((acc, type) => {
  acc[type.flagKey] = { label: type.label };
  return acc;
}, {});

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
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");
  const [isRoleManagementOpen, setIsRoleManagementOpen] = useState(false);

  const { data: allUsers = [] } = useRbacAllUsers();
  const { data: appDetails, isLoading: appLoading } = useRbacAppDetails(appCode);
  const flagsQuery = useFeatureFlags();
  const toggleMutation = useToggleFeatureFlag();

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

  const isRfqPlatform = appCode === "rfq-platform";

  const rfqFlags = useMemo(() => {
    if (!isRfqPlatform || !flagsQuery.data) return { typeFlags: [], otherFlags: [] };
    const allFlags = flagsQuery.data.flags ?? [];
    return {
      typeFlags: allFlags.filter((f) => f.flagKey.startsWith("RFQ_TYPE_")),
      otherFlags: allFlags.filter((f) =>
        ["FEEDBACK_WIDGET", "RFQ_RESTRICT_UNREGISTERED"].includes(f.flagKey),
      ),
    };
  }, [isRfqPlatform, flagsQuery.data]);

  useEffect(() => {
    if (existingAccess) {
      setUseCustomPermissions(existingAccess.useCustomPermissions);
      setSelectedRoleCode(existingAccess.roleCode);
      setSelectedPermissions([]);
      setSelectedProducts(existingAccess.productKeys ?? []);
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

  const toggleProduct = (flagKey: string) => {
    setSelectedProducts((prev) =>
      prev.includes(flagKey) ? prev.filter((k) => k !== flagKey) : [...prev, flagKey],
    );
  };

  const handleToggleFlag = (flagKey: string, currentEnabled: boolean) => {
    toggleMutation.mutate(
      { flagKey, enabled: !currentEnabled },
      {
        onError: (err) => {
          const message = err instanceof Error ? err.message : "Failed to update flag";
          showToast(message, "error");
        },
      },
    );
  };

  const handleSave = () => {
    if (!user || !appDetails) return;

    const dto: AssignUserAccessDto | UpdateUserAccessDto = {
      ...(existingAccess ? {} : { appCode }),
      useCustomPermissions,
      roleCode: useCustomPermissions ? null : selectedRoleCode,
      permissionCodes: useCustomPermissions ? selectedPermissions : undefined,
      productKeys: isRfqPlatform ? selectedProducts : undefined,
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
            router.push(`/admin/portal/users?userId=${userId}`);
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
            router.push(`/admin/portal/users?userId=${userId}`);
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

  const enabledTypes = rfqFlags.typeFlags.filter((f) => f.enabled).length;
  const enabledProducts = selectedProducts.length;

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
          <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Role</h3>
            <button
              type="button"
              onClick={() => setIsRoleManagementOpen(true)}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Manage Roles
            </button>
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

      {isRfqPlatform && (
        <div className="bg-white dark:bg-slate-800 shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              RFQ Configuration
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Control which project types and products/services are available when creating RFQs
            </p>
          </div>

          <div className="p-6 space-y-6">
            {rfqFlags.typeFlags.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                    Project Types
                  </label>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {enabledTypes} of {rfqFlags.typeFlags.length} enabled
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Select which project types users can choose when creating an RFQ
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {rfqFlags.typeFlags.map((flag) => {
                    const meta = RFQ_TYPE_FLAG_MAP[flag.flagKey];
                    const isUpdating =
                      toggleMutation.isPending &&
                      toggleMutation.variables?.flagKey === flag.flagKey;

                    return (
                      <button
                        key={flag.flagKey}
                        type="button"
                        onClick={() => handleToggleFlag(flag.flagKey, flag.enabled)}
                        disabled={isUpdating}
                        className={`flex items-center justify-center gap-2 px-2 py-2 border-2 rounded-lg transition-colors text-sm h-10 ${
                          flag.enabled
                            ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30 cursor-pointer"
                            : "border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 cursor-pointer opacity-60"
                        } ${isUpdating ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <div
                          className={`w-3 h-3 border-2 rounded-full flex items-center justify-center ${
                            flag.enabled
                              ? "border-blue-600 bg-blue-600"
                              : "border-gray-300 dark:border-slate-500"
                          }`}
                        >
                          {flag.enabled && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </div>
                        <span
                          className={`font-medium ${
                            flag.enabled
                              ? "text-gray-900 dark:text-white"
                              : "text-gray-400 dark:text-gray-500"
                          }`}
                        >
                          {meta?.label || flag.flagKey}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {PRODUCTS_AND_SERVICES.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                    Products & Services
                  </label>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {enabledProducts} of {PRODUCTS_AND_SERVICES.length} enabled
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Select which products and services this user can request quotes for
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {PRODUCTS_AND_SERVICES.map((product) => {
                    const isEnabled = selectedProducts.includes(product.flagKey);

                    return (
                      <button
                        key={product.flagKey}
                        type="button"
                        onClick={() => toggleProduct(product.flagKey)}
                        className={`flex items-start gap-3 px-4 py-3 border-2 rounded-lg transition-all text-left ${
                          isEnabled
                            ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30 cursor-pointer"
                            : "border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 cursor-pointer opacity-60"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 border-2 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            isEnabled
                              ? "border-blue-600 bg-blue-600"
                              : "border-gray-300 dark:border-slate-500"
                          }`}
                        >
                          {isEnabled && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={isEnabled ? "" : "grayscale"}>{product.icon}</span>
                            <span
                              className={`font-medium text-sm ${
                                isEnabled
                                  ? "text-gray-900 dark:text-white"
                                  : "text-gray-400 dark:text-gray-500"
                              }`}
                            >
                              {product.label}
                            </span>
                            {product.comingSoon && (
                              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                                Coming Soon
                              </span>
                            )}
                          </div>
                          {product.description && (
                            <p
                              className={`text-xs mt-1 ${
                                isEnabled
                                  ? "text-gray-500 dark:text-gray-400"
                                  : "text-gray-400 dark:text-gray-500"
                              }`}
                            >
                              {product.description}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {rfqFlags.otherFlags.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Other Settings
                </label>
                <div className="space-y-3">
                  {rfqFlags.otherFlags.map((flag) => {
                    const isUpdating =
                      toggleMutation.isPending &&
                      toggleMutation.variables?.flagKey === flag.flagKey;

                    return (
                      <div
                        key={flag.flagKey}
                        className="flex items-center justify-between p-4 border rounded-lg border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {flag.flagKey}
                          </span>
                          {flag.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {flag.description}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleFlag(flag.flagKey, flag.enabled)}
                          disabled={isUpdating}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            flag.enabled ? "bg-blue-600" : "bg-gray-200 dark:bg-slate-600"
                          } ${isUpdating ? "opacity-50 cursor-not-allowed" : ""}`}
                          role="switch"
                          aria-checked={flag.enabled}
                          aria-label={`Toggle ${flag.flagKey}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              flag.enabled ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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

      {appDetails && (
        <RoleManagementPanel
          isOpen={isRoleManagementOpen}
          onClose={() => setIsRoleManagementOpen(false)}
          appDetails={appDetails}
        />
      )}
    </div>
  );
}
