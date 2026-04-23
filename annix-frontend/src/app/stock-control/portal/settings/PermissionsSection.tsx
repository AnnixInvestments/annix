"use client";

import { toPairs as entries, keys } from "es-toolkit/compat";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CompanyRole } from "@/app/lib/api/stockControlApi";
import {
  useActionPermissions,
  useCreateCompanyRole,
  useDeleteCompanyRole,
  useUpdateActionPermissions,
  useUpdateCompanyRole,
  useUpdateNavRbacConfig,
} from "@/app/lib/query/hooks";
import { ALL_NAV_ITEMS, NAV_GROUP_ORDER, resolveNavItemRoles } from "../../config/navItems";
import { useStockControlRbac } from "../../context/StockControlRbacContext";

const SYSTEM_ROLE_KEYS = new Set(["admin", "manager", "quality", "storeman", "accounts", "viewer"]);

interface PermissionsSectionProps {
  roles: CompanyRole[];
  rolesLoading: boolean;
  onRolesChanged: () => Promise<void>;
}

type Tab = "pages" | "actions";

export function PermissionsSection({
  roles,
  rolesLoading,
  onRolesChanged,
}: PermissionsSectionProps) {
  const { rbacConfig, reloadRbacConfig } = useStockControlRbac();
  const loadPermissionsMutation = useActionPermissions();
  const updateNavMutation = useUpdateNavRbacConfig();
  const updateActionsMutation = useUpdateActionPermissions();
  const createRoleMutation = useCreateCompanyRole();
  const updateRoleMutation = useUpdateCompanyRole();
  const deleteRoleMutation = useDeleteCompanyRole();

  const [selectedRole, setSelectedRole] = useState<string>("");
  const [activeTab, setActiveTab] = useState<Tab>("pages");
  const [navConfig, setNavConfig] = useState<Record<string, string[]>>({});
  const [actionConfig, setActionConfig] = useState<Record<string, string[]>>({});
  const [actionLabels, setActionLabels] = useState<
    Record<string, { group: string; label: string }>
  >({});
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [success, setSuccess] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRoleLabel, setNewRoleLabel] = useState("");
  const [roleError, setRoleError] = useState("");
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
  const [editingRoleLabel, setEditingRoleLabel] = useState("");

  const assignableRoles = useMemo(
    () => roles.filter((r) => r.key !== "admin" && r.key !== "viewer"),
    [roles],
  );
  const roleKeys = useMemo(() => roles.map((r) => r.key), [roles]);

  useEffect(() => {
    if (assignableRoles.length > 0 && !selectedRole) {
      setSelectedRole(assignableRoles[0].key);
    }
  }, [assignableRoles, selectedRole]);

  const loadPermissions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await loadPermissionsMutation.mutateAsync();
      setActionConfig(data.config);
      setActionLabels(data.labels);
    } catch {
      setActionConfig({});
      setActionLabels({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  useEffect(() => {
    setNavConfig(
      entries(rbacConfig).reduce<Record<string, string[]>>((acc, [key, r]) => {
        acc[key] = [...r];
        return acc;
      }, {}),
    );
  }, [rbacConfig]);

  const navGroups = useMemo(() => {
    const grouped = ALL_NAV_ITEMS.reduce<Record<string, typeof ALL_NAV_ITEMS>>((acc, item) => {
      if (item.group === "hidden") return acc;
      const rawGroup = item.group;
      const group = rawGroup || "Core";
      if (!acc[group]) acc[group] = [];
      acc[group].push(item);
      return acc;
    }, {});
    const groupOrder = ["Core", ...NAV_GROUP_ORDER];
    return groupOrder
      .filter((g) => grouped[g] !== undefined)
      .map((g) => ({ name: g, items: grouped[g] }));
  }, []);

  const actionGroups = useMemo(() => {
    const actionKeys = keys(actionLabels);
    const grouped = actionKeys.reduce<Record<string, string[]>>((acc, key) => {
      const labelEntry = actionLabels[key];
      const rawGroup = labelEntry ? labelEntry.group : null;
      const group = rawGroup || "Other";
      if (!acc[group]) acc[group] = [];
      acc[group].push(key);
      return acc;
    }, {});
    return keys(grouped)
      .sort()
      .map((name) => ({ name, keys: grouped[name] }));
  }, [actionLabels]);

  const isNavItemEnabled = useCallback(
    (itemKey: string): boolean => {
      const item = ALL_NAV_ITEMS.find((i) => i.key === itemKey);
      if (!item) return false;
      const resolved = resolveNavItemRoles(item, navConfig, roleKeys);
      return resolved.includes(selectedRole);
    },
    [navConfig, roleKeys, selectedRole],
  );

  const isActionEnabled = useCallback(
    (actionKey: string): boolean => {
      const raw = actionConfig[actionKey];
      const rolesForAction = raw || [];
      return rolesForAction.includes(selectedRole);
    },
    [actionConfig, selectedRole],
  );

  const toggleNavItem = (itemKey: string) => {
    const item = ALL_NAV_ITEMS.find((i) => i.key === itemKey);
    if (!item || item.immutable) return;
    setNavConfig((prev) => {
      const current = resolveNavItemRoles(item, prev, roleKeys);
      const has = current.includes(selectedRole);
      return {
        ...prev,
        [itemKey]: has ? current.filter((r) => r !== selectedRole) : [...current, selectedRole],
      };
    });
    setDirty(true);
    setSuccess(false);
  };

  const toggleAction = (actionKey: string) => {
    setActionConfig((prev) => {
      const raw = prev[actionKey];
      const current = raw || [];
      const has = current.includes(selectedRole);
      return {
        ...prev,
        [actionKey]: has ? current.filter((r) => r !== selectedRole) : [...current, selectedRole],
      };
    });
    setDirty(true);
    setSuccess(false);
  };

  const toggleNavGroup = (items: typeof ALL_NAV_ITEMS) => {
    const allOn = items
      .filter((i) => !i.immutable)
      .every((i) => resolveNavItemRoles(i, navConfig, roleKeys).includes(selectedRole));
    setNavConfig((prev) => {
      const next = { ...prev };
      items.forEach((item) => {
        if (item.immutable) return;
        const current = resolveNavItemRoles(item, next, roleKeys);
        if (allOn) {
          next[item.key] = current.filter((r) => r !== selectedRole);
        } else if (!current.includes(selectedRole)) {
          next[item.key] = [...current, selectedRole];
        }
      });
      return next;
    });
    setDirty(true);
    setSuccess(false);
  };

  const toggleActionGroup = (actionKeys: string[]) => {
    const allOn = actionKeys.every((k) => {
      const raw = actionConfig[k];
      return (raw || []).includes(selectedRole);
    });
    setActionConfig((prev) => {
      const next = { ...prev };
      actionKeys.forEach((k) => {
        const raw = next[k];
        const current = raw || [];
        if (allOn) {
          next[k] = current.filter((r) => r !== selectedRole);
        } else if (!current.includes(selectedRole)) {
          next[k] = [...current, selectedRole];
        }
      });
      return next;
    });
    setDirty(true);
    setSuccess(false);
  };

  const toggleGroupExpand = (name: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    try {
      await updateNavMutation.mutateAsync(navConfig);
      const data = await updateActionsMutation.mutateAsync(actionConfig);
      setActionConfig(data.config);
      await reloadRbacConfig();
      setDirty(false);
      setSuccess(true);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    loadPermissions();
    setNavConfig(
      entries(rbacConfig).reduce<Record<string, string[]>>((acc, [key, r]) => {
        acc[key] = [...r];
        return acc;
      }, {}),
    );
    setDirty(false);
    setSuccess(false);
  };

  const handleAddRole = async () => {
    if (!newRoleLabel.trim()) return;
    setRoleError("");
    try {
      const key = newRoleLabel
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9_-]/g, "-")
        .replace(/-+/g, "-");
      await createRoleMutation.mutateAsync({ key, label: newRoleLabel.trim() });
      setNewRoleLabel("");
      setShowAddRole(false);
      await onRolesChanged();
    } catch (e) {
      setRoleError(e instanceof Error ? e.message : "Failed to create role");
    }
  };

  const handleSaveRoleLabel = async (id: number) => {
    if (!editingRoleLabel.trim()) return;
    setRoleError("");
    try {
      await updateRoleMutation.mutateAsync({ id, label: editingRoleLabel.trim() });
      setEditingRoleId(null);
      await onRolesChanged();
    } catch (e) {
      setRoleError(e instanceof Error ? e.message : "Failed to update role");
    }
  };

  const handleDeleteRole = async (id: number, key: string) => {
    setRoleError("");
    try {
      await deleteRoleMutation.mutateAsync(id);
      if (selectedRole === key && assignableRoles.length > 1) {
        const remaining = assignableRoles.find((r) => r.key !== key);
        if (remaining) setSelectedRole(remaining.key);
      }
      await onRolesChanged();
    } catch (e) {
      setRoleError(e instanceof Error ? e.message : "Failed to delete role");
    }
  };

  if (loading || rolesLoading) {
    return (
      <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900">Permissions</h3>
        <p className="mt-2 text-xs text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 cursor-pointer hover:bg-gray-50"
        onClick={() => setCollapsed((prev) => !prev)}
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${collapsed ? "" : "rotate-90"}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900">Permissions</h3>
          <span className="text-[10px] text-gray-500">
            Admin has full access · Viewer is read-only
          </span>
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {dirty && (
            <>
              <button
                type="button"
                onClick={handleReset}
                className="px-2 py-1 text-[10px] text-gray-500 border border-gray-300 rounded hover:bg-gray-50"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-2 py-1 text-[10px] text-white bg-teal-600 rounded hover:bg-teal-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </>
          )}
          {success && !dirty && <span className="text-[10px] text-green-600">Saved</span>}
        </div>
      </div>

      {collapsed ? null : (
        <div className="px-4 py-3">
          <div className="flex items-center gap-1 mb-1 border-b border-gray-200 pb-2 overflow-x-auto">
            {assignableRoles.map((role) => {
              const isActive = role.key === selectedRole;
              const isSystem = SYSTEM_ROLE_KEYS.has(role.key);
              const isEditing = editingRoleId === role.id;
              if (isEditing) {
                return (
                  <div key={role.key} className="flex items-center gap-1">
                    <input
                      type="text"
                      value={editingRoleLabel}
                      onChange={(e) => setEditingRoleLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveRoleLabel(role.id);
                        else if (e.key === "Escape") setEditingRoleId(null);
                      }}
                      className="px-2 py-1 text-xs border border-teal-500 rounded focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveRoleLabel(role.id)}
                      className="text-[10px] text-teal-600 hover:text-teal-800"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingRoleId(null)}
                      className="text-[10px] text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                );
              }
              return (
                <div key={role.key} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setSelectedRole(role.key)}
                    className={`px-3 py-1 text-xs font-medium rounded-l-md whitespace-nowrap transition-colors ${
                      isActive ? "bg-teal-600 text-white" : "text-gray-600 hover:bg-gray-100"
                    } ${isSystem ? "rounded-r-md" : ""}`}
                  >
                    {role.label}
                  </button>
                  {!isSystem && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRoleId(role.id);
                          setEditingRoleLabel(role.label);
                        }}
                        title="Rename role"
                        className={`px-1.5 py-1 text-xs transition-colors ${
                          isActive
                            ? "bg-teal-600 text-white hover:bg-teal-700"
                            : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        <svg
                          className="w-3 h-3"
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
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRole(role.id, role.key)}
                        title="Delete role"
                        className={`px-1.5 py-1 text-xs rounded-r-md transition-colors ${
                          isActive
                            ? "bg-teal-600 text-white hover:bg-red-600"
                            : "text-gray-400 hover:text-red-600 hover:bg-gray-100"
                        }`}
                      >
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              );
            })}
            {showAddRole ? (
              <div className="flex items-center gap-1 ml-1">
                <input
                  type="text"
                  value={newRoleLabel}
                  onChange={(e) => setNewRoleLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddRole();
                    else if (e.key === "Escape") setShowAddRole(false);
                  }}
                  placeholder="New role name"
                  className="px-2 py-1 text-xs border border-teal-500 rounded focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddRole}
                  className="text-[10px] text-teal-600 hover:text-teal-800"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddRole(false);
                    setNewRoleLabel("");
                  }}
                  className="text-[10px] text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddRole(true)}
                className="ml-1 px-2 py-1 text-[10px] text-teal-600 hover:text-teal-800 font-medium whitespace-nowrap"
              >
                + Add Role
              </button>
            )}
          </div>
          {roleError && <p className="text-[10px] text-red-600 mb-2">{roleError}</p>}

          <div className="flex items-center gap-4 text-xs font-medium border-b border-gray-200 mb-3">
            <button
              type="button"
              onClick={() => setActiveTab("pages")}
              className={`pb-2 border-b-2 transition-colors ${
                activeTab === "pages"
                  ? "border-teal-600 text-teal-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Pages
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("actions")}
              className={`pb-2 border-b-2 transition-colors ${
                activeTab === "actions"
                  ? "border-teal-600 text-teal-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Actions
            </button>
          </div>

          {activeTab === "pages" && (
            <div className="space-y-1">
              {navGroups.map((group) => {
                const mutableItems = group.items.filter((i) => !i.immutable);
                const enabledCount = mutableItems.filter((i) =>
                  resolveNavItemRoles(i, navConfig, roleKeys).includes(selectedRole),
                ).length;
                const totalCount = mutableItems.length;
                const isExpanded = expandedGroups.has(`pages:${group.name}`);
                const allOn = enabledCount === totalCount && totalCount > 0;
                const someOn = enabledCount > 0 && enabledCount < totalCount;
                return (
                  <div key={group.name} className="border border-gray-200 rounded">
                    <div className="flex items-center justify-between px-3 py-2 bg-gray-50">
                      <button
                        type="button"
                        onClick={() => toggleGroupExpand(`pages:${group.name}`)}
                        className="flex items-center gap-2 text-xs font-medium text-gray-700 flex-1 text-left"
                      >
                        <svg
                          className={`w-3 h-3 text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                        {group.name}
                        <span className="text-[10px] text-gray-500 font-normal">
                          ({enabledCount}/{totalCount})
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleNavGroup(group.items)}
                        className="text-[10px] font-medium text-teal-600 hover:text-teal-800"
                      >
                        {allOn ? "Clear all" : someOn ? "Select all" : "Select all"}
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="px-3 py-2 space-y-1">
                        {group.items.map((item) => {
                          const enabled = isNavItemEnabled(item.key);
                          return (
                            <label
                              key={item.key}
                              className={`flex items-center gap-2 py-1 text-xs ${
                                item.immutable ? "opacity-50" : "cursor-pointer hover:bg-gray-50"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={enabled}
                                disabled={item.immutable}
                                onChange={() => toggleNavItem(item.key)}
                                className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                              />
                              <span className="text-gray-700">{item.label}</span>
                              {item.immutable && (
                                <span className="text-[10px] text-gray-400 ml-auto">locked</span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === "actions" && (
            <div className="space-y-1">
              {actionGroups.map((group) => {
                const enabledCount = group.keys.filter((k) => {
                  const raw = actionConfig[k];
                  const list = raw || [];
                  return list.includes(selectedRole);
                }).length;
                const totalCount = group.keys.length;
                const isExpanded = expandedGroups.has(`actions:${group.name}`);
                const allOn = enabledCount === totalCount && totalCount > 0;
                return (
                  <div key={group.name} className="border border-gray-200 rounded">
                    <div className="flex items-center justify-between px-3 py-2 bg-gray-50">
                      <button
                        type="button"
                        onClick={() => toggleGroupExpand(`actions:${group.name}`)}
                        className="flex items-center gap-2 text-xs font-medium text-gray-700 flex-1 text-left"
                      >
                        <svg
                          className={`w-3 h-3 text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                        {group.name}
                        <span className="text-[10px] text-gray-500 font-normal">
                          ({enabledCount}/{totalCount})
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleActionGroup(group.keys)}
                        className="text-[10px] font-medium text-teal-600 hover:text-teal-800"
                      >
                        {allOn ? "Clear all" : "Select all"}
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="px-3 py-2 space-y-1">
                        {group.keys.map((key) => {
                          const labelEntry = actionLabels[key];
                          const label = labelEntry ? labelEntry.label : key;
                          const enabled = isActionEnabled(key);
                          return (
                            <label
                              key={key}
                              className="flex items-center gap-2 py-1 text-xs cursor-pointer hover:bg-gray-50"
                            >
                              <input
                                type="checkbox"
                                checked={enabled}
                                onChange={() => toggleAction(key)}
                                className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                              />
                              <span className="text-gray-700">{label}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
