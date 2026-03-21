"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import type {
  CompanyRole,
  StockControlLocation,
  StockControlTeamMember,
  UserLocationSummary,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import {
  useCompanyRoles,
  useInvalidateCompanyRoles,
  useSettingsTeamMembers,
} from "@/app/lib/query/hooks";
import { ALL_NAV_ITEMS, NAV_GROUP_ORDER } from "../../config/navItems";
import { useStockControlRbac } from "../../context/StockControlRbacContext";
import { roleLabel } from "../../lib/roleLabels";
import { DepartmentsLocationsSection } from "./DepartmentsLocationsSection";
import { InboundEmailConfigSection } from "./InboundEmailConfigSection";
import { QaWorkflowSection } from "./QaWorkflowSection";
import { TeamManagementSection } from "./TeamManagementSection";
import { WorkflowConfigurationSection } from "./WorkflowConfigurationSection";

export default function StockControlSettingsPage() {
  const router = useRouter();
  const { user } = useStockControlAuth();

  const isAdmin = user?.role === "admin";
  const { data: companyRoles = [], isLoading: companyRolesLoading } = useCompanyRoles();
  const invalidateCompanyRoles = useInvalidateCompanyRoles();
  const { data: teamMembers = [] } = useSettingsTeamMembers();
  const [locations, setLocations] = useState<StockControlLocation[]>([]);

  useEffect(() => {
    if (!isAdmin) {
      router.push("/stock-control/portal/dashboard");
    }
  }, [isAdmin, router]);

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <h1 className="text-2xl font-bold text-gray-900 lg:col-span-2">Settings</h1>

      <MenuVisibilitySection
        roles={companyRoles}
        rolesLoading={companyRolesLoading}
        onRolesChanged={invalidateCompanyRoles}
      />

      <ActionPermissionsSection roles={companyRoles} rolesLoading={companyRolesLoading} />

      <TeamManagementSection companyRoles={companyRoles} />

      <DepartmentsLocationsSection onLocationsLoaded={setLocations} />

      <WorkflowConfigurationSection teamMembers={teamMembers} />
      <QaWorkflowSection teamMembers={teamMembers} />
      <UserLocationAssignmentsSection locations={locations} teamMembers={teamMembers} />
      <InboundEmailConfigSection />
    </div>
  );
}

function MenuVisibilitySection({
  roles,
  rolesLoading,
  onRolesChanged,
}: {
  roles: CompanyRole[];
  rolesLoading: boolean;
  onRolesChanged: () => Promise<void>;
}) {
  const { rbacConfig, reloadRbacConfig } = useStockControlRbac();
  const [localConfig, setLocalConfig] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const [newRoleLabel, setNewRoleLabel] = useState("");
  const [showAddRole, setShowAddRole] = useState(false);
  const [roleError, setRoleError] = useState("");
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
  const [editingRoleLabel, setEditingRoleLabel] = useState("");

  useEffect(() => {
    setLocalConfig(
      Object.entries(rbacConfig).reduce<Record<string, string[]>>((acc, [key, r]) => {
        acc[key] = [...r];
        return acc;
      }, {}),
    );
    setDirty(false);
  }, [rbacConfig]);

  const roleKeys = roles.map((r) => r.key);

  const toggleGroup = useCallback((group: string) => {
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  }, []);

  const handleToggle = useCallback((navKey: string, role: string) => {
    setLocalConfig((prev) => {
      const current = prev[navKey] ?? [];
      const has = current.includes(role);
      return {
        ...prev,
        [navKey]: has ? current.filter((r) => r !== role) : [...current, role],
      };
    });
    setDirty(true);
    setSuccess(false);
  }, []);

  const handleToggleGroup = useCallback(
    (groupName: string, role: string) => {
      const groupItems = ALL_NAV_ITEMS.filter((item) => item.group === groupName);
      const allChecked = groupItems.every((item) => {
        const itemRoles = localConfig[item.key] ?? item.defaultRoles;
        return itemRoles.includes(role);
      });

      setLocalConfig((prev) => {
        const next = { ...prev };
        groupItems.forEach((item) => {
          if (item.immutable) return;
          const current = next[item.key] ?? [...item.defaultRoles];
          if (allChecked) {
            next[item.key] = current.filter((r) => r !== role);
          } else if (!current.includes(role)) {
            next[item.key] = [...current, role];
          }
        });
        return next;
      });
      setDirty(true);
      setSuccess(false);
    },
    [localConfig],
  );

  const isGroupAllChecked = useCallback(
    (groupName: string, role: string): boolean => {
      const groupItems = ALL_NAV_ITEMS.filter((item) => item.group === groupName);
      return groupItems.every((item) => {
        const itemRoles = localConfig[item.key] ?? item.defaultRoles;
        return itemRoles.includes(role);
      });
    },
    [localConfig],
  );

  const isGroupPartialChecked = useCallback(
    (groupName: string, role: string): boolean => {
      const groupItems = ALL_NAV_ITEMS.filter((item) => item.group === groupName);
      const checkedCount = groupItems.filter((item) => {
        const itemRoles = localConfig[item.key] ?? item.defaultRoles;
        return itemRoles.includes(role);
      }).length;
      return checkedCount > 0 && checkedCount < groupItems.length;
    },
    [localConfig],
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSuccess(false);
    try {
      await stockControlApiClient.updateNavRbacConfig(localConfig);
      await reloadRbacConfig();
      setDirty(false);
      setSuccess(true);
    } finally {
      setSaving(false);
    }
  }, [localConfig, reloadRbacConfig]);

  const handleReset = useCallback(() => {
    setLocalConfig(
      Object.entries(rbacConfig).reduce<Record<string, string[]>>((acc, [key, r]) => {
        acc[key] = [...r];
        return acc;
      }, {}),
    );
    setDirty(false);
    setSuccess(false);
  }, [rbacConfig]);

  const handleAddRole = async () => {
    if (!newRoleLabel.trim()) return;
    setRoleError("");
    try {
      const key = newRoleLabel
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9_-]/g, "-")
        .replace(/-+/g, "-");
      await stockControlApiClient.createCompanyRole(key, newRoleLabel.trim());
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
      await stockControlApiClient.updateCompanyRole(id, editingRoleLabel.trim());
      setEditingRoleId(null);
      await onRolesChanged();
    } catch (e) {
      setRoleError(e instanceof Error ? e.message : "Failed to update role");
    }
  };

  const handleDeleteRole = async (id: number) => {
    setRoleError("");
    try {
      await stockControlApiClient.deleteCompanyRole(id);
      await onRolesChanged();
    } catch (e) {
      setRoleError(e instanceof Error ? e.message : "Failed to delete role");
    }
  };

  const handleMoveRole = async (roleId: number, direction: "left" | "right") => {
    const currentIndex = roles.findIndex((r) => r.id === roleId);
    if (currentIndex === -1) return;

    const targetIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= roles.length) return;

    const reordered = [...roles];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    const adminIndex = reordered.findIndex((r) => r.key === "admin");
    if (adminIndex !== -1 && adminIndex !== reordered.length - 1) {
      const [admin] = reordered.splice(adminIndex, 1);
      reordered.push(admin);
    }

    setRoleError("");
    try {
      await stockControlApiClient.reorderCompanyRoles(reordered.map((r) => r.id));
      await onRolesChanged();
    } catch (e) {
      setRoleError(e instanceof Error ? e.message : "Failed to reorder roles");
    }
  };

  const standaloneItems = ALL_NAV_ITEMS.filter(
    (item) => !item.group || item.group === "hidden",
  ).filter((item) => item.group !== "hidden");

  const groups = NAV_GROUP_ORDER.map((groupName) => ({
    name: groupName,
    items: ALL_NAV_ITEMS.filter((item) => item.group === groupName),
  })).filter((g) => g.items.length > 0);

  const hiddenItems = ALL_NAV_ITEMS.filter((item) => item.group === "hidden");

  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-1">
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className="flex items-center gap-2 text-lg font-semibold text-gray-900 hover:text-gray-700 transition-colors"
        >
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${collapsed ? "" : "rotate-90"}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Menu Visibility
        </button>
        {!collapsed && (
          <button
            type="button"
            onClick={() => setShowAddRole(!showAddRole)}
            className="px-3 py-1.5 bg-teal-600 text-white text-sm font-medium rounded-md hover:bg-teal-700 transition-colors"
          >
            Add Role
          </button>
        )}
      </div>
      {collapsed ? null : (
        <>
          <p className="text-sm text-gray-500 mb-4">
            Control which menu items are visible to each role. Click a group header to expand
            sub-pages.
          </p>

          {showAddRole && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Role name"
                  value={newRoleLabel}
                  onChange={(e) => {
                    setNewRoleLabel(e.target.value);
                    setRoleError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddRole();
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                />
                <button
                  type="button"
                  onClick={handleAddRole}
                  disabled={!newRoleLabel.trim()}
                  className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-md hover:bg-teal-700 disabled:opacity-50 transition-colors"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddRole(false);
                    setNewRoleLabel("");
                    setRoleError("");
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
              {roleError && <p className="mt-2 text-sm text-red-600">{roleError}</p>}
            </div>
          )}

          {rolesLoading ? (
            <div className="text-center py-8 text-gray-500">Loading roles...</div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase pb-3 pr-2 min-w-[160px]">
                      Menu Item
                    </th>
                    {roles.map((role, roleIndex) => (
                      <th
                        key={role.key}
                        className="text-center text-xs font-medium text-gray-500 uppercase pb-3 px-2 min-w-[80px]"
                      >
                        {editingRoleId === role.id ? (
                          <div className="flex flex-col items-center gap-1">
                            <input
                              type="text"
                              value={editingRoleLabel}
                              onChange={(e) => setEditingRoleLabel(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveRoleLabel(role.id);
                                if (e.key === "Escape") setEditingRoleId(null);
                              }}
                              autoFocus
                              className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded text-center focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                            />
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => handleSaveRoleLabel(role.id)}
                                className="text-[10px] text-teal-600 hover:text-teal-800 font-medium"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingRoleId(null)}
                                className="text-[10px] text-gray-500 hover:text-gray-700 font-medium"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-0.5">
                            <div className="flex items-center gap-1">
                              {role.key !== "admin" && roleIndex > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleMoveRole(role.id, "left")}
                                  className="text-gray-400 hover:text-gray-600 p-0.5"
                                  title="Move left"
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
                                      d="M15 19l-7-7 7-7"
                                    />
                                  </svg>
                                </button>
                              )}
                              <span>{role.label}</span>
                              {role.key !== "admin" && roleIndex < roles.length - 2 && (
                                <button
                                  type="button"
                                  onClick={() => handleMoveRole(role.id, "right")}
                                  className="text-gray-400 hover:text-gray-600 p-0.5"
                                  title="Move right"
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
                                      d="M9 5l7 7-7 7"
                                    />
                                  </svg>
                                </button>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingRoleId(role.id);
                                  setEditingRoleLabel(role.label);
                                }}
                                className="text-[10px] text-teal-600 hover:text-teal-800 font-medium"
                              >
                                Edit
                              </button>
                              {role.key !== "admin" && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRole(role.id)}
                                  className="text-[10px] text-red-500 hover:text-red-700 font-medium"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {standaloneItems.map((item) => {
                    const itemRoles = localConfig[item.key] ?? item.defaultRoles;
                    return (
                      <tr key={item.key} className="border-b border-gray-100">
                        <td className="py-3 pr-2 text-sm text-gray-700">{item.label}</td>
                        {roleKeys.map((rk) => {
                          const checked = itemRoles.includes(rk);
                          const disabled = rk === "admin" || item.immutable === true;
                          return (
                            <td key={rk} className="py-3 px-2 text-center">
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={disabled}
                                onChange={() => handleToggle(item.key, rk)}
                                className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}

                  {groups.map((group) => {
                    const isExpanded = expandedGroups[group.name] === true;
                    return [
                      <tr
                        key={`group-${group.name}`}
                        className="border-b border-gray-200 bg-gray-50 cursor-pointer hover:bg-gray-100"
                        onClick={() => toggleGroup(group.name)}
                      >
                        <td className="py-3 pr-2 text-sm font-semibold text-gray-900">
                          <span className="flex items-center gap-1.5">
                            <svg
                              className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
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
                            <span className="text-xs font-normal text-gray-400">
                              ({group.items.length})
                            </span>
                          </span>
                        </td>
                        {roleKeys.map((rk) => {
                          const allChecked = isGroupAllChecked(group.name, rk);
                          const partial = isGroupPartialChecked(group.name, rk);
                          const disabled = rk === "admin";
                          return (
                            <td key={rk} className="py-3 px-2 text-center">
                              <input
                                type="checkbox"
                                checked={allChecked}
                                ref={(el) => {
                                  if (el) {
                                    el.indeterminate = partial;
                                  }
                                }}
                                disabled={disabled}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleToggleGroup(group.name, rk);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                            </td>
                          );
                        })}
                      </tr>,
                      ...(isExpanded
                        ? group.items.map((item) => {
                            const itemRoles = localConfig[item.key] ?? item.defaultRoles;
                            return (
                              <tr key={item.key} className="border-b border-gray-100 bg-white">
                                <td className="py-2.5 pr-2 text-sm text-gray-600 pl-8">
                                  {item.label}
                                </td>
                                {roleKeys.map((rk) => {
                                  const checked = itemRoles.includes(rk);
                                  const disabled = rk === "admin" || item.immutable === true;
                                  return (
                                    <td key={rk} className="py-2.5 px-2 text-center">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        disabled={disabled}
                                        onChange={() => handleToggle(item.key, rk)}
                                        className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                      />
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })
                        : []),
                    ];
                  })}

                  {hiddenItems.map((item) => {
                    const itemRoles = localConfig[item.key] ?? item.defaultRoles;
                    return (
                      <tr key={item.key} className="border-b border-gray-100">
                        <td className="py-3 pr-2 text-sm text-gray-700">{item.label}</td>
                        {roleKeys.map((rk) => {
                          const checked = itemRoles.includes(rk);
                          const disabled = rk === "admin" || item.immutable === true;
                          return (
                            <td key={rk} className="py-3 px-2 text-center">
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={disabled}
                                onChange={() => handleToggle(item.key, rk)}
                                className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-4 text-xs text-gray-500">
            Admin always has full access. Settings is always admin-only.
          </p>

          {roleError && !showAddRole && <p className="mt-3 text-sm text-red-600">{roleError}</p>}
          {success && (
            <p className="mt-3 text-sm text-green-600">Menu visibility updated successfully.</p>
          )}

          <div className="mt-4 flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            {dirty && (
              <button
                onClick={handleReset}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function UserLocationAssignmentsSection({
  locations,
  teamMembers,
}: {
  locations: StockControlLocation[];
  teamMembers: StockControlTeamMember[];
}) {
  const [userLocations, setUserLocations] = useState<UserLocationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const activeLocations = locations.filter((l) => l.active);
  const eligibleMembers = teamMembers.filter(
    (m) => m.role === "storeman" || m.role === "manager" || m.role === "admin",
  );

  const loadUserLocations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await stockControlApiClient.userLocationAssignments();
      setUserLocations(data);
    } catch {
      setError("Failed to load user location assignments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserLocations();
  }, [loadUserLocations]);

  const isLocationAssigned = (userId: number, locationId: number): boolean => {
    const userLoc = userLocations.find((ul) => ul.userId === userId);
    return userLoc?.locationIds?.includes(locationId) || false;
  };

  const handleToggleLocation = async (userId: number, locationId: number) => {
    const userLoc = userLocations.find((ul) => ul.userId === userId);
    const currentIds = userLoc?.locationIds || [];
    const newIds = currentIds.includes(locationId)
      ? currentIds.filter((id) => id !== locationId)
      : [...currentIds, locationId];

    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      await stockControlApiClient.updateUserLocations(userId, newIds);
      await loadUserLocations();
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update location assignment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <button
        type="button"
        onClick={() => setCollapsed((prev) => !prev)}
        className="flex items-center gap-2 text-lg font-semibold text-gray-900 hover:text-gray-700 transition-colors mb-1"
      >
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${collapsed ? "" : "rotate-90"}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        Store Location Assignments
      </button>
      {collapsed ? null : (
        <>
          <p className="text-sm text-gray-500 mb-4">
            Click a cell to toggle access. Users with no locations assigned can access all
            locations.
          </p>

          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          {success && <p className="text-sm text-green-600 mb-3">Updated successfully.</p>}

          {activeLocations.length === 0 ? (
            <p className="text-sm text-gray-500 italic">
              No store locations configured. Add locations in the Locations section above first.
            </p>
          ) : loading ? (
            <div className="text-center py-8 text-gray-500">Loading location assignments...</div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="text-left py-2 pr-4 pl-1 font-medium text-gray-700 sticky left-0 bg-white min-w-[160px]">
                      Team Member
                    </th>
                    {activeLocations.map((loc) => (
                      <th
                        key={loc.id}
                        className="py-2 px-1 font-medium text-gray-700 text-center min-w-[72px]"
                      >
                        <span className="text-xs leading-tight block">{loc.name}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {eligibleMembers.map((member) => {
                    const userLoc = userLocations.find((ul) => ul.userId === member.id);
                    const hasAny = (userLoc?.locationIds?.length || 0) > 0;

                    return (
                      <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-2.5 pr-4 pl-1 sticky left-0 bg-inherit">
                          <div className="font-medium text-gray-900 text-sm">{member.name}</div>
                          <div className="text-xs text-gray-400">
                            {roleLabel(member.role)}
                            {!hasAny && (
                              <span className="ml-1 text-amber-500">(all locations)</span>
                            )}
                          </div>
                        </td>
                        {activeLocations.map((loc) => {
                          const assigned = isLocationAssigned(member.id, loc.id);
                          return (
                            <td key={loc.id} className="py-2.5 px-1 text-center">
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => handleToggleLocation(member.id, loc.id)}
                                className={`w-8 h-8 rounded-md border transition-all inline-flex items-center justify-center ${
                                  assigned
                                    ? "bg-emerald-100 border-emerald-300 text-emerald-700"
                                    : "bg-white border-gray-200 text-gray-300 hover:border-gray-300"
                                } ${saving ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
                                title={
                                  assigned
                                    ? `${member.name} can access ${loc.name}`
                                    : `Grant ${member.name} access to ${loc.name}`
                                }
                              >
                                {assigned && (
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2.5}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M4.5 12.75l6 6 9-13.5"
                                    />
                                  </svg>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ActionPermissionsSection({
  roles,
  rolesLoading,
}: {
  roles: CompanyRole[];
  rolesLoading: boolean;
}) {
  const [config, setConfig] = useState<Record<string, string[]>>({});
  const [labels, setLabels] = useState<Record<string, { group: string; label: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [collapsed, setCollapsed] = useState(false);

  const loadPermissions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await stockControlApiClient.actionPermissions();
      setConfig(data.config);
      setLabels(data.labels);
    } catch {
      setConfig({});
      setLabels({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  const roleKeys = roles.map((r) => r.key);

  const actionKeys = Object.keys(labels);
  const groups = actionKeys.reduce<Record<string, string[]>>((acc, key) => {
    const group = labels[key]?.group || "Other";
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(key);
    return acc;
  }, {});
  const groupNames = Object.keys(groups);

  const toggleGroup = useCallback((group: string) => {
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  }, []);

  const handleToggle = useCallback((actionKey: string, role: string) => {
    if (role === "admin") return;
    setConfig((prev) => {
      const current = prev[actionKey] ?? [];
      const has = current.includes(role);
      return {
        ...prev,
        [actionKey]: has ? current.filter((r) => r !== role) : [...current, role],
      };
    });
    setDirty(true);
    setSuccess(false);
  }, []);

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      const data = await stockControlApiClient.updateActionPermissions(config);
      setConfig(data.config);
      setDirty(false);
      setSuccess(true);
    } catch {
      // save failed
    } finally {
      setSaving(false);
    }
  }, [config]);

  const handleReset = useCallback(() => {
    loadPermissions();
    setDirty(false);
    setSuccess(false);
  }, [loadPermissions]);

  if (loading || rolesLoading) {
    return (
      <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900">Action Permissions</h2>
        <p className="mt-2 text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className="flex items-center gap-2 text-lg font-semibold text-gray-900 hover:text-gray-700 transition-colors"
        >
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${collapsed ? "" : "rotate-90"}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Action Permissions
        </button>
        {!collapsed && (
          <div className="flex items-center gap-2">
            {success && <span className="text-xs text-green-600 font-medium">Saved</span>}
            {dirty && (
              <>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-3 py-1.5 text-xs text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {collapsed ? null : (
        <>
          <p className="text-xs text-gray-500 mb-2">
            Control which roles can perform specific actions like importing, deleting, or approving
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500 w-64">
                    Action
                  </th>
                  {roles.map((role) => (
                    <th
                      key={role.key}
                      className="text-center py-2 px-2 text-xs font-medium text-gray-500 min-w-[70px]"
                    >
                      {role.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groupNames.map((groupName) => {
                  const expanded = expandedGroups[groupName] !== false;
                  const groupActions = groups[groupName];

                  return (
                    <GroupRows
                      key={groupName}
                      groupName={groupName}
                      expanded={expanded}
                      onToggleExpand={() => toggleGroup(groupName)}
                      actionKeys={groupActions}
                      labels={labels}
                      config={config}
                      roleKeys={roleKeys}
                      roles={roles}
                      onToggle={handleToggle}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function GroupRows({
  groupName,
  expanded,
  onToggleExpand,
  actionKeys,
  labels,
  config,
  roleKeys,
  roles,
  onToggle,
}: {
  groupName: string;
  expanded: boolean;
  onToggleExpand: () => void;
  actionKeys: string[];
  labels: Record<string, { group: string; label: string }>;
  config: Record<string, string[]>;
  roleKeys: string[];
  roles: CompanyRole[];
  onToggle: (actionKey: string, role: string) => void;
}) {
  return (
    <>
      <tr
        className="border-b border-gray-100 bg-gray-50 cursor-pointer hover:bg-gray-100"
        onClick={onToggleExpand}
      >
        <td className="py-2 pr-4 font-medium text-gray-700 text-xs">
          <span className="mr-1">{expanded ? "▾" : "▸"}</span>
          {groupName}
        </td>
        {roles.map((role) => (
          <td key={role.key} className="text-center py-2 px-2">
            <span className="text-xs text-gray-400">
              {actionKeys.filter((ak) => (config[ak] ?? []).includes(role.key)).length}/
              {actionKeys.length}
            </span>
          </td>
        ))}
      </tr>
      {expanded &&
        actionKeys.map((actionKey) => {
          const actionRoles = config[actionKey] ?? [];
          return (
            <tr key={actionKey} className="border-b border-gray-50 hover:bg-gray-50">
              <td className="py-1.5 pr-4 pl-6 text-xs text-gray-600">
                {labels[actionKey]?.label || actionKey}
              </td>
              {roles.map((role) => {
                const isAdmin = role.key === "admin";
                const checked = actionRoles.includes(role.key);
                return (
                  <td key={role.key} className="text-center py-1.5 px-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={isAdmin}
                      onChange={() => onToggle(actionKey, role.key)}
                      className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 disabled:opacity-50"
                    />
                  </td>
                );
              })}
            </tr>
          );
        })}
    </>
  );
}
