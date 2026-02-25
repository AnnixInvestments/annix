"use client";

import { entries } from "es-toolkit/compat";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/app/components/Toast";
import type { RbacAppDetail, RbacAppRole } from "@/app/lib/api/adminApi";
import { PRODUCTS_AND_SERVICES } from "@/app/lib/config/productsServices";
import {
  useRbacCreateRole,
  useRbacDeleteRole,
  useRbacRoleProducts,
  useRbacSetRoleProducts,
  useRbacUpdateRole,
} from "@/app/lib/query/hooks";
import { RoleForm } from "./RoleForm";

interface RoleManagementPanelProps {
  isOpen: boolean;
  onClose: () => void;
  appDetails: RbacAppDetail;
}

const RFQ_PRODUCT_FLAG_MAP = PRODUCTS_AND_SERVICES.reduce<
  Record<
    string,
    { label: string; icon: React.ReactNode; description: string; comingSoon?: boolean }
  >
>((acc, product) => {
  acc[product.flagKey] = {
    label: product.label,
    icon: product.icon,
    description: product.description,
    comingSoon: product.comingSoon,
  };
  return acc;
}, {});

type Tab = "roles" | "products";

export function RoleManagementPanel({ isOpen, onClose, appDetails }: RoleManagementPanelProps) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("roles");
  const [editingRole, setEditingRole] = useState<RbacAppRole | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);

  const createMutation = useRbacCreateRole();
  const updateMutation = useRbacUpdateRole();
  const deleteMutation = useRbacDeleteRole();
  const setProductsMutation = useRbacSetRoleProducts();

  const selectedRole = useMemo(
    () => appDetails.roles.find((r) => r.id === selectedRoleId) ?? null,
    [appDetails.roles, selectedRoleId],
  );

  const { data: roleProductsData } = useRbacRoleProducts(selectedRoleId ?? 0);
  const enabledProducts = roleProductsData?.productKeys ?? [];

  useEffect(() => {
    if (isOpen && appDetails.roles.length > 0 && !selectedRoleId) {
      setSelectedRoleId(appDetails.roles[0].id);
    }
  }, [isOpen, appDetails.roles, selectedRoleId]);

  useEffect(() => {
    if (!isOpen) {
      setEditingRole(null);
      setIsCreating(false);
      setActiveTab("roles");
    }
  }, [isOpen]);

  const handleCreateRole = (data: { code: string; name: string; description?: string; isDefault?: boolean }) => {
    createMutation.mutate(
      { appCode: appDetails.code, dto: data },
      {
        onSuccess: (newRole) => {
          showToast(`Role "${newRole.name}" created successfully`, "success");
          setIsCreating(false);
        },
        onError: (err) => {
          showToast(`Error: ${err.message}`, "error");
        },
      },
    );
  };

  const handleUpdateRole = (data: { name?: string; description?: string; isDefault?: boolean }) => {
    if (!editingRole) return;
    updateMutation.mutate(
      { roleId: editingRole.id, dto: data, appCode: appDetails.code },
      {
        onSuccess: () => {
          showToast("Role updated successfully", "success");
          setEditingRole(null);
        },
        onError: (err) => {
          showToast(`Error: ${err.message}`, "error");
        },
      },
    );
  };

  const handleDeleteRole = (role: RbacAppRole) => {
    if (!confirm(`Are you sure you want to delete the role "${role.name}"? Users with this role will be reassigned to the default role.`)) {
      return;
    }
    deleteMutation.mutate(
      { roleId: role.id, appCode: appDetails.code },
      {
        onSuccess: (result) => {
          showToast(
            result.reassignedUsers > 0
              ? `Role deleted. ${result.reassignedUsers} user(s) reassigned.`
              : "Role deleted successfully",
            "success",
          );
          if (selectedRoleId === role.id) {
            setSelectedRoleId(appDetails.roles.find((r) => r.id !== role.id)?.id ?? null);
          }
        },
        onError: (err) => {
          showToast(`Error: ${err.message}`, "error");
        },
      },
    );
  };

  const handleToggleProduct = (productKey: string) => {
    if (!selectedRoleId) return;
    const newProducts = enabledProducts.includes(productKey)
      ? enabledProducts.filter((k) => k !== productKey)
      : [...enabledProducts, productKey];

    setProductsMutation.mutate(
      { roleId: selectedRoleId, productKeys: newProducts },
      {
        onError: (err) => {
          showToast(`Error: ${err.message}`, "error");
        },
      },
    );
  };

  if (!isOpen) return null;

  const isRfqPlatform = appDetails.code === "rfq-platform";
  const productFlags = entries(RFQ_PRODUCT_FLAG_MAP);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="absolute inset-y-0 right-0 flex max-w-full">
        <div className="relative w-screen max-w-2xl">
          <div className="flex h-full flex-col bg-white dark:bg-slate-800 shadow-xl">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Manage Roles
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{appDetails.name}</p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <span className="sr-only">Close panel</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
              <nav className="flex px-6" aria-label="Tabs">
                <button
                  type="button"
                  onClick={() => setActiveTab("roles")}
                  className={`px-4 py-3 text-sm font-medium border-b-2 ${
                    activeTab === "roles"
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
                  }`}
                >
                  Roles
                </button>
                {isRfqPlatform && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("products")}
                    className={`px-4 py-3 text-sm font-medium border-b-2 ${
                      activeTab === "products"
                        ? "border-blue-500 text-blue-600 dark:text-blue-400"
                        : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
                    }`}
                  >
                    Product Access
                  </button>
                )}
              </nav>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === "roles" && (
                <div className="space-y-4">
                  {(isCreating || editingRole) && (
                    <RoleForm
                      role={editingRole}
                      onSubmit={editingRole ? handleUpdateRole : handleCreateRole}
                      onCancel={() => {
                        setIsCreating(false);
                        setEditingRole(null);
                      }}
                      isSubmitting={createMutation.isPending || updateMutation.isPending}
                    />
                  )}

                  {!isCreating && !editingRole && (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsCreating(true)}
                        className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors"
                      >
                        + Create New Role
                      </button>

                      <div className="space-y-2">
                        {appDetails.roles.map((role) => (
                          <div
                            key={role.id}
                            className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-slate-700 rounded-lg"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {role.name}
                                </span>
                                {role.isDefault && (
                                  <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                    Default
                                  </span>
                                )}
                              </div>
                              {role.description && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                  {role.description}
                                </p>
                              )}
                              <p className="text-xs text-gray-400 dark:text-gray-500">
                                Code: {role.code}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <button
                                type="button"
                                onClick={() => setEditingRole(role)}
                                className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-600 border border-gray-300 dark:border-slate-500 rounded hover:bg-gray-50 dark:hover:bg-slate-500"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteRole(role)}
                                disabled={deleteMutation.isPending}
                                className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 bg-white dark:bg-slate-600 border border-gray-300 dark:border-slate-500 rounded hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === "products" && isRfqPlatform && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Select Role
                    </label>
                    <select
                      value={selectedRoleId ?? ""}
                      onChange={(e) => setSelectedRoleId(e.target.value ? Number(e.target.value) : null)}
                      className="block w-full rounded-md border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                      <option value="">Select a role...</option>
                      {appDetails.roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                          {role.isDefault ? " (Default)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedRole && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Products & Services for &quot;{selectedRole.name}&quot;
                        </label>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {enabledProducts.length} of {productFlags.length} enabled
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                        Users with this role can only request quotes for enabled products
                      </p>
                      <div className="grid grid-cols-1 gap-3">
                        {productFlags.map(([flagKey, meta]) => {
                          const isEnabled = enabledProducts.includes(flagKey);
                          const isUpdating =
                            setProductsMutation.isPending &&
                            setProductsMutation.variables?.roleId === selectedRoleId;

                          return (
                            <button
                              key={flagKey}
                              type="button"
                              onClick={() => handleToggleProduct(flagKey)}
                              disabled={isUpdating}
                              className={`flex items-start gap-3 px-4 py-3 border-2 rounded-lg transition-all text-left ${
                                isEnabled
                                  ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30"
                                  : "border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 opacity-60"
                              } ${isUpdating ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
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
                                  <span className={isEnabled ? "" : "grayscale"}>{meta.icon}</span>
                                  <span
                                    className={`font-medium text-sm ${
                                      isEnabled
                                        ? "text-gray-900 dark:text-white"
                                        : "text-gray-400 dark:text-gray-500"
                                    }`}
                                  >
                                    {meta.label}
                                  </span>
                                  {meta.comingSoon && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                                      Coming Soon
                                    </span>
                                  )}
                                </div>
                                {meta.description && (
                                  <p
                                    className={`text-xs mt-1 ${
                                      isEnabled
                                        ? "text-gray-500 dark:text-gray-400"
                                        : "text-gray-400 dark:text-gray-500"
                                    }`}
                                  >
                                    {meta.description}
                                  </p>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {!selectedRole && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      Select a role to configure product access
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
