"use client";

import { toPairs as entries, keys } from "es-toolkit/compat";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useState } from "react";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import type {
  CompanyRole,
  StockControlLocation,
  StockControlTeamMember,
} from "@/app/lib/api/stockControlApi";
import {
  useActionPermissions,
  useCompanyRoles,
  useCreateCompanyRole,
  useDeleteCompanyRole,
  useInvalidateCompanyRoles,
  useReorderCompanyRoles,
  useSettingsTeamMembers,
  useUpdateActionPermissions,
  useUpdateCompanyRole,
  useUpdateNavRbacConfig,
  useUpdateUserLocations,
  useUserLocationAssignments,
} from "@/app/lib/query/hooks";
import { ALL_NAV_ITEMS, NAV_GROUP_ORDER, resolveNavItemRoles } from "../../config/navItems";
import { useStockControlRbac } from "../../context/StockControlRbacContext";
import { roleLabel } from "../../lib/roleLabels";
import { DepartmentsLocationsSection } from "./DepartmentsLocationsSection";
import { InboundEmailConfigSection } from "./InboundEmailConfigSection";
import { SupplierMappingsSection } from "./SupplierMappingsSection";
import { TeamManagementSection } from "./TeamManagementSection";
import { WorkflowConfigurationSection } from "./WorkflowConfigurationSection";
import { WorkflowPreviewSection } from "./WorkflowPreviewSection";

export default function StockControlSettingsPage() {
  const router = useRouter();
  const { user, profile } = useStockControlAuth();

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

      {profile?.workflowEnabled === true && (
        <div className="lg:col-span-2 space-y-6">
          <WorkflowConfigurationSection teamMembers={teamMembers} />
          <WorkflowPreviewSection />
        </div>
      )}
      <UserLocationAssignmentsSection locations={locations} teamMembers={teamMembers} />
      <InboundEmailConfigSection />
      <SupplierMappingsSection />
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
  const updateNavRbacMutation = useUpdateNavRbacConfig();
  const createRoleMutation = useCreateCompanyRole();
  const updateRoleMutation = useUpdateCompanyRole();
  const deleteRoleMutation = useDeleteCompanyRole();
  const reorderRolesMutation = useReorderCompanyRoles();
  const [localConfig, setLocalConfig] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const [newRoleLabel, setNewRoleLabel] = useState("");
  const [showAddRole, setShowAddRole] = useState(false);
  const [roleError, setRoleError] = useState("");
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
  const [editingRoleLabel, setEditingRoleLabel] = useState("");

  useEffect(() => {
    setLocalConfig(
      entries(rbacConfig).reduce<Record<string, string[]>>((acc, [key, r]) => {
        acc[key] = [...r];
        return acc;
      }, {}),
    );
    setDirty(false);
  }, [rbacConfig]);

  const roleKeys = roles.map((r) => r.key);

  const handleToggle = useCallback((navKey: string, role: string) => {
    setLocalConfig((prev) => {
      const currentRaw = prev[navKey];
      const current = currentRaw ? currentRaw : [];
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
        const itemRoles = resolveNavItemRoles(item, localConfig, roleKeys);
        return itemRoles.includes(role);
      });

      setLocalConfig((prev) => {
        const next = { ...prev };
        groupItems.forEach((item) => {
          if (item.immutable) return;
          const current = resolveNavItemRoles(item, next, roleKeys);
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
    [localConfig, roleKeys],
  );

  const isGroupAllChecked = useCallback(
    (groupName: string, role: string): boolean => {
      const groupItems = ALL_NAV_ITEMS.filter((item) => item.group === groupName);
      return groupItems.every((item) => {
        const itemRoles = resolveNavItemRoles(item, localConfig, roleKeys);
        return itemRoles.includes(role);
      });
    },
    [localConfig, roleKeys],
  );

  const isGroupPartialChecked = useCallback(
    (groupName: string, role: string): boolean => {
      const groupItems = ALL_NAV_ITEMS.filter((item) => item.group === groupName);
      const checkedCount = groupItems.filter((item) => {
        const itemRoles = resolveNavItemRoles(item, localConfig, roleKeys);
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
      await updateNavRbacMutation.mutateAsync(localConfig);
      await reloadRbacConfig();
      setDirty(false);
      setSuccess(true);
    } finally {
      setSaving(false);
    }
  }, [localConfig, reloadRbacConfig]);

  const handleReset = useCallback(() => {
    setLocalConfig(
      entries(rbacConfig).reduce<Record<string, string[]>>((acc, [key, r]) => {
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

  const handleDeleteRole = async (id: number) => {
    setRoleError("");
    try {
      await deleteRoleMutation.mutateAsync(id);
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
      await reorderRolesMutation.mutateAsync(reordered.map((r) => r.id));
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

  const renderCheckbox = (navKey: string, rk: string, immutable: boolean) => {
    const item = ALL_NAV_ITEMS.find((i) => i.key === navKey);
    const itemRoles = item ? resolveNavItemRoles(item, localConfig, roleKeys) : [];
    const checked = itemRoles.includes(rk);
    const disabled = rk === "admin" || immutable;
    return (
      <td key={rk} className="py-0.5 px-1 text-center">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={() => handleToggle(navKey, rk)}
          className="h-3 w-3 rounded border-gray-300 text-teal-600 focus:ring-teal-500 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        />
      </td>
    );
  };

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
          <h3 className="text-sm font-semibold text-gray-900">Menu Visibility</h3>
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
                {saving ? "..." : "Save"}
              </button>
            </>
          )}
          {success && !dirty && <span className="text-[10px] text-green-600">Saved</span>}
          {!collapsed && (
            <button
              type="button"
              onClick={() => setShowAddRole(!showAddRole)}
              className="text-[10px] text-teal-600 hover:text-teal-800 font-medium"
            >
              + Add Role
            </button>
          )}
        </div>
      </div>

      {collapsed ? null : (
        <div className="px-4 py-2">
          {showAddRole && (
            <div className="mb-2 p-2 bg-gray-50 rounded border border-gray-200">
              <div className="flex gap-2 items-center">
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
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                />
                <button
                  type="button"
                  onClick={handleAddRole}
                  disabled={!newRoleLabel.trim()}
                  className="px-2 py-1 bg-teal-600 text-white text-[10px] rounded hover:bg-teal-700 disabled:opacity-50"
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
                  className="px-2 py-1 text-[10px] text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
              {roleError && <p className="mt-1 text-[10px] text-red-600">{roleError}</p>}
            </div>
          )}

          {rolesLoading ? (
            <div className="text-center py-4 text-xs text-gray-500">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left text-[10px] font-medium text-gray-500 uppercase py-1 pr-2 w-[100px] sm:w-[140px]">
                      Page
                    </th>
                    {roles.map((role, ri) => (
                      <th
                        key={role.key}
                        className="text-center text-[10px] font-medium text-gray-500 uppercase py-1 px-1"
                      >
                        {editingRoleId === role.id ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <input
                              type="text"
                              value={editingRoleLabel}
                              onChange={(e) => setEditingRoleLabel(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveRoleLabel(role.id);
                                if (e.key === "Escape") setEditingRoleId(null);
                              }}
                              autoFocus
                              className="w-full px-1 py-0.5 text-[10px] border border-gray-300 rounded text-center focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                            />
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => handleSaveRoleLabel(role.id)}
                                className="text-[9px] text-teal-600"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingRoleId(null)}
                                className="text-[9px] text-gray-400"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <div className="flex items-center gap-0.5">
                              {role.key !== "admin" && ri > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleMoveRole(role.id, "left")}
                                  className="text-gray-300 hover:text-gray-500 text-[9px]"
                                >
                                  &lsaquo;
                                </button>
                              )}
                              <span className="truncate max-w-[80px]" title={role.label}>
                                {role.label}
                              </span>
                              {role.key !== "admin" && ri < roles.length - 2 && (
                                <button
                                  type="button"
                                  onClick={() => handleMoveRole(role.id, "right")}
                                  className="text-gray-300 hover:text-gray-500 text-[9px]"
                                >
                                  &rsaquo;
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
                                className="text-[9px] text-teal-500 hover:text-teal-700"
                              >
                                Edit
                              </button>
                              {role.key !== "admin" && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRole(role.id)}
                                  className="text-[9px] text-red-400 hover:text-red-600"
                                >
                                  Del
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-[11px]">
                  {standaloneItems.map((item) => (
                    <tr key={item.key} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-0.5 pr-2 text-gray-700">{item.label}</td>
                      {roleKeys.map((rk) => renderCheckbox(item.key, rk, item.immutable === true))}
                    </tr>
                  ))}

                  {groups.map((group) => (
                    <Fragment key={group.name}>
                      <tr className="border-b border-gray-100 bg-gray-50/70">
                        <td className="py-0.5 pr-2 font-semibold text-gray-800 text-[11px]">
                          {group.name}{" "}
                          <span className="font-normal text-gray-400 text-[10px]">
                            ({group.items.length})
                          </span>
                        </td>
                        {roleKeys.map((rk) => {
                          const allChecked = isGroupAllChecked(group.name, rk);
                          const partial = isGroupPartialChecked(group.name, rk);
                          const disabled = rk === "admin";
                          return (
                            <td key={rk} className="py-0.5 px-1 text-center">
                              <input
                                type="checkbox"
                                checked={allChecked}
                                ref={(el) => {
                                  if (el) el.indeterminate = partial;
                                }}
                                disabled={disabled}
                                onChange={() => handleToggleGroup(group.name, rk)}
                                className="h-3 w-3 rounded border-gray-300 text-teal-600 focus:ring-teal-500 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                              />
                            </td>
                          );
                        })}
                      </tr>
                      {group.items.map((item) => (
                        <tr key={item.key} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="py-0.5 pr-2 text-gray-600 pl-4">{item.label}</td>
                          {roleKeys.map((rk) =>
                            renderCheckbox(item.key, rk, item.immutable === true),
                          )}
                        </tr>
                      ))}
                    </Fragment>
                  ))}

                  {hiddenItems.map((item) => (
                    <tr key={item.key} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-0.5 pr-2 text-gray-700">{item.label}</td>
                      {roleKeys.map((rk) => renderCheckbox(item.key, rk, item.immutable === true))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-1 text-[10px] text-gray-400">
                Admin always has full access. Settings is always admin-only.
              </p>
            </div>
          )}

          {roleError && !showAddRole && (
            <p className="mt-1 text-[10px] text-red-600">{roleError}</p>
          )}
        </div>
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
  const {
    data: userLocations = [],
    isLoading: loading,
    error: loadError,
  } = useUserLocationAssignments();
  const updateLocationsMutation = useUpdateUserLocations();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const activeLocations = locations.filter((l) => l.active);
  const eligibleMembers = teamMembers.filter(
    (m) => m.role === "storeman" || m.role === "manager" || m.role === "admin",
  );

  useEffect(() => {
    if (loadError) {
      setError("Failed to load user location assignments");
    }
  }, [loadError]);

  const isLocationAssigned = (userId: number, locationId: number): boolean => {
    const userLoc = userLocations.find((ul) => ul.userId === userId);
    const locIds = userLoc ? userLoc.locationIds : null;
    return locIds ? locIds.includes(locationId) : false;
  };

  const handleToggleLocation = async (userId: number, locationId: number) => {
    const userLoc = userLocations.find((ul) => ul.userId === userId);
    const currentLocIds = userLoc ? userLoc.locationIds : null;
    const currentIds = currentLocIds ? currentLocIds : [];
    const newIds = currentIds.includes(locationId)
      ? currentIds.filter((id) => id !== locationId)
      : [...currentIds, locationId];

    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      await updateLocationsMutation.mutateAsync({ userId, locationIds: newIds });
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update location assignment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
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
        Store Location Assignments
      </button>
      {collapsed ? null : (
        <>
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}

          {activeLocations.length === 0 ? (
            <p className="text-xs text-gray-500 italic mt-2">
              No store locations configured. Add locations above first.
            </p>
          ) : loading ? (
            <div className="text-center py-2 text-xs text-gray-500">Loading...</div>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4 mt-2">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left py-1 pr-3 pl-1 text-[10px] font-medium text-gray-500 uppercase tracking-wide sticky left-0 bg-white min-w-[90px] sm:min-w-[120px]">
                      Team Member
                    </th>
                    {activeLocations.map((loc) => (
                      <th
                        key={loc.id}
                        className="py-1 px-0.5 text-[10px] font-medium text-gray-500 text-center min-w-[56px] uppercase tracking-wide"
                      >
                        {loc.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {eligibleMembers.map((member) => {
                    const userLoc = userLocations.find((ul) => ul.userId === member.id);
                    const ulLocIds = userLoc ? userLoc.locationIds : null;
                    const ulLocLen = ulLocIds ? ulLocIds.length : 0;
                    const hasAny = ulLocLen > 0;

                    return (
                      <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-1 pr-3 pl-1 sticky left-0 bg-inherit">
                          <span className="font-medium text-xs text-gray-900">{member.name}</span>
                          <span className="text-[10px] text-gray-400 ml-1">
                            {roleLabel(member.role)}
                            {!hasAny && <span className="ml-0.5 text-amber-500">(all)</span>}
                          </span>
                        </td>
                        {activeLocations.map((loc) => {
                          const assigned = isLocationAssigned(member.id, loc.id);
                          return (
                            <td key={loc.id} className="py-1 px-0.5 text-center">
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => handleToggleLocation(member.id, loc.id)}
                                className={`w-6 h-6 rounded border transition-all inline-flex items-center justify-center ${
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
                                    className="w-3 h-3"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={3}
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
  const [collapsed, setCollapsed] = useState(false);
  const loadPermissionsMutation = useActionPermissions();
  const updatePermissionsMutation = useUpdateActionPermissions();

  const loadPermissions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await loadPermissionsMutation.mutateAsync();
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

  const actionKeys = keys(labels);
  const groups = actionKeys.reduce<Record<string, string[]>>((acc, key) => {
    const labelEntry = labels[key];
    const groupVal = labelEntry ? labelEntry.group : null;
    const group = groupVal ? groupVal : "Other";
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(key);
    return acc;
  }, {});
  const groupNames = keys(groups);

  const handleToggle = useCallback((actionKey: string, role: string) => {
    if (role === "admin") return;
    setConfig((prev) => {
      const currentRaw2 = prev[actionKey];
      const current = currentRaw2 ? currentRaw2 : [];
      const has = current.includes(role);
      return {
        ...prev,
        [actionKey]: has ? current.filter((r) => r !== role) : [...current, role],
      };
    });
    setDirty(true);
    setSuccess(false);
  }, []);

  const handleToggleGroupAll = useCallback(
    (groupActions: string[], role: string) => {
      if (role === "admin") return;
      const allChecked = groupActions.every((ak) => {
        const cval = config[ak];
        return (cval ? cval : []).includes(role);
      });
      setConfig((prev) => {
        const next = { ...prev };
        groupActions.forEach((ak) => {
          const currentRaw3 = next[ak];
          const current = currentRaw3 ? currentRaw3 : [];
          if (allChecked) {
            next[ak] = current.filter((r) => r !== role);
          } else if (!current.includes(role)) {
            next[ak] = [...current, role];
          }
        });
        return next;
      });
      setDirty(true);
      setSuccess(false);
    },
    [config],
  );

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      const data = await updatePermissionsMutation.mutateAsync(config);
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
      <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900">Action Permissions</h3>
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
          <h3 className="text-sm font-semibold text-gray-900">Action Permissions</h3>
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
                {saving ? "..." : "Save"}
              </button>
            </>
          )}
          {success && !dirty && <span className="text-[10px] text-green-600">Saved</span>}
        </div>
      </div>

      {collapsed ? null : (
        <div className="px-4 py-2 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left text-[10px] font-medium text-gray-500 uppercase py-1 pr-2 w-[120px] sm:w-[180px]">
                  Action
                </th>
                {roles.map((role) => (
                  <th
                    key={role.key}
                    className="text-center text-[10px] font-medium text-gray-500 uppercase py-1 px-1"
                  >
                    <span className="truncate max-w-[80px] block" title={role.label}>
                      {role.label}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-[11px]">
              {groupNames.map((groupName) => {
                const groupActions = groups[groupName];
                return (
                  <Fragment key={groupName}>
                    <tr className="border-b border-gray-100 bg-gray-50/70">
                      <td className="py-0.5 pr-2 font-semibold text-gray-800 text-[11px]">
                        {groupName}{" "}
                        <span className="font-normal text-gray-400 text-[10px]">
                          ({groupActions.length})
                        </span>
                      </td>
                      {roles.map((role) => {
                        const checked = groupActions.filter((ak) => {
                          const akVal = config[ak];
                          return (akVal ? akVal : []).includes(role.key);
                        }).length;
                        const allChecked = checked === groupActions.length;
                        const partial = checked > 0 && !allChecked;
                        const disabled = role.key === "admin";
                        return (
                          <td key={role.key} className="py-0.5 px-1 text-center">
                            <input
                              type="checkbox"
                              checked={allChecked}
                              ref={(el) => {
                                if (el) el.indeterminate = partial;
                              }}
                              disabled={disabled}
                              onChange={() => handleToggleGroupAll(groupActions, role.key)}
                              className="h-3 w-3 rounded border-gray-300 text-teal-600 focus:ring-teal-500 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            />
                          </td>
                        );
                      })}
                    </tr>
                    {groupActions.map((actionKey) => {
                      const actionRolesRaw = config[actionKey];
                      const actionRoles = actionRolesRaw ? actionRolesRaw : [];
                      return (
                        <tr key={actionKey} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="py-0.5 pr-2 text-gray-600 pl-4">
                            {(() => {
                              const akEntry = labels[actionKey];
                              const akLabel = akEntry ? akEntry.label : null;
                              return akLabel ? akLabel : actionKey;
                            })()}
                          </td>
                          {roles.map((role) => {
                            const checked = actionRoles.includes(role.key);
                            const disabled = role.key === "admin";
                            return (
                              <td key={role.key} className="py-0.5 px-1 text-center">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={disabled}
                                  onChange={() => handleToggle(actionKey, role.key)}
                                  className="h-3 w-3 rounded border-gray-300 text-teal-600 focus:ring-teal-500 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
