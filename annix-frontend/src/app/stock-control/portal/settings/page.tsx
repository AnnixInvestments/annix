"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import type {
  CompanyRole,
  EligibleUser,
  StepNotificationRecipients,
  StockControlLocation,
  StockControlTeamMember,
  UserLocationSummary,
  WorkflowStepAssignment,
  WorkflowStepConfig,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { ALL_NAV_ITEMS, NAV_GROUP_ORDER } from "../../config/navItems";
import { useStockControlRbac } from "../../context/StockControlRbacContext";
import { roleLabel } from "../../lib/roleLabels";
import { DepartmentsLocationsSection } from "./DepartmentsLocationsSection";
import { TeamManagementSection } from "./TeamManagementSection";

export default function StockControlSettingsPage() {
  const router = useRouter();
  const { user } = useStockControlAuth();

  const [companyRoles, setCompanyRoles] = useState<CompanyRole[]>([]);
  const [companyRolesLoading, setCompanyRolesLoading] = useState(true);

  const loadCompanyRoles = useCallback(async () => {
    setCompanyRolesLoading(true);
    try {
      const data = await stockControlApiClient.companyRoles();
      setCompanyRoles(data);
    } catch {
      setCompanyRoles([]);
    } finally {
      setCompanyRolesLoading(false);
    }
  }, []);

  const [teamMembers, setTeamMembers] = useState<StockControlTeamMember[]>([]);
  const [locations, setLocations] = useState<StockControlLocation[]>([]);

  const loadTeamMembers = useCallback(async () => {
    try {
      const members = await stockControlApiClient.teamMembers();
      setTeamMembers(members);
    } catch {
      setTeamMembers([]);
    }
  }, []);

  useEffect(() => {
    if (user?.role !== "admin") {
      router.push("/stock-control/portal/dashboard");
      return;
    }

    loadTeamMembers();
    loadCompanyRoles();
  }, [user, router, loadTeamMembers, loadCompanyRoles]);

  if (user?.role !== "admin") {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <h1 className="text-2xl font-bold text-gray-900 lg:col-span-2">Settings</h1>

      <MenuVisibilitySection
        roles={companyRoles}
        rolesLoading={companyRolesLoading}
        onRolesChanged={loadCompanyRoles}
      />

      <ActionPermissionsSection roles={companyRoles} rolesLoading={companyRolesLoading} />

      <TeamManagementSection companyRoles={companyRoles} />

      <DepartmentsLocationsSection onLocationsLoaded={setLocations} />

      <WorkflowConfigurationSection teamMembers={teamMembers} />
      <UserLocationAssignmentsSection locations={locations} teamMembers={teamMembers} />
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

  return (
    <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold text-gray-900">Menu Visibility</h2>
        <button
          type="button"
          onClick={() => setShowAddRole(!showAddRole)}
          className="px-3 py-1.5 bg-teal-600 text-white text-sm font-medium rounded-md hover:bg-teal-700 transition-colors"
        >
          Add Role
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Control which menu items are visible to each role. Click a group header to expand sub-pages.
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
                          {!role.isSystem && (
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
                            <td className="py-2.5 pr-2 text-sm text-gray-600 pl-8">{item.label}</td>
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
    </div>
  );
}

type WorkflowTab = "assignments" | "notifications";

function WorkflowConfigurationSection({ teamMembers }: { teamMembers: StockControlTeamMember[] }) {
  const [stepConfigs, setStepConfigs] = useState<WorkflowStepConfig[]>([]);
  const [assignments, setAssignments] = useState<WorkflowStepAssignment[]>([]);
  const [recipients, setRecipients] = useState<StepNotificationRecipients[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<WorkflowTab>("assignments");
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [editingLabelKey, setEditingLabelKey] = useState<string | null>(null);
  const [editingLabelValue, setEditingLabelValue] = useState("");
  const [showAddStep, setShowAddStep] = useState(false);
  const [newStepLabel, setNewStepLabel] = useState("");
  const [newStepAfter, setNewStepAfter] = useState("");
  const [newStepIsBackground, setNewStepIsBackground] = useState(false);
  const [newStepTriggerAfter, setNewStepTriggerAfter] = useState("");
  const [backgroundSteps, setBackgroundSteps] = useState<WorkflowStepConfig[]>([]);

  const [editingNotifyStep, setEditingNotifyStep] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState("");
  const [editEmails, setEditEmails] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [configs, assignmentData, recipientData, bgSteps] = await Promise.all([
        stockControlApiClient.workflowStepConfigs(),
        stockControlApiClient.workflowAssignments(),
        stockControlApiClient.notificationRecipients(),
        stockControlApiClient.backgroundStepConfigs(),
      ]);
      setStepConfigs(configs);
      setAssignments(assignmentData);
      setRecipients(recipientData);
      setBackgroundSteps(bgSteps);
    } catch {
      setError("Failed to load workflow configuration");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const assignmentsByStep = assignments.reduce<Record<string, WorkflowStepAssignment>>(
    (acc, a) => ({ ...acc, [a.step]: a }),
    {},
  );

  const recipientsByStep = recipients.reduce<Record<string, StepNotificationRecipients>>(
    (acc, r) => ({ ...acc, [r.step]: r }),
    {},
  );

  const allUsers = assignments.reduce<EligibleUser[]>((acc, a) => {
    a.users.forEach((u) => {
      if (!acc.some((existing) => existing.id === u.id)) {
        acc.push(u);
      }
    });
    return acc;
  }, []);

  const uniqueTeamUsers = teamMembers.reduce<StockControlTeamMember[]>((acc, m) => {
    if (!allUsers.some((u) => u.id === m.id) && !acc.some((existing) => existing.id === m.id)) {
      acc.push(m);
    }
    return acc;
  }, []);

  const matrixUsers = [
    ...allUsers.map((u) => ({ id: u.id, name: u.name, role: u.role })),
    ...uniqueTeamUsers.map((m) => ({ id: m.id, name: m.name, role: m.role })),
  ];

  const isUserAssigned = (userId: number, step: string): boolean => {
    const assignment = assignmentsByStep[step];
    return assignment?.userIds?.includes(userId) ?? false;
  };

  const isPrimaryUser = (userId: number, step: string): boolean => {
    const assignment = assignmentsByStep[step];
    return assignment?.primaryUserId === userId;
  };

  const handleToggleAssignment = async (userId: number, step: string) => {
    const assignment = assignmentsByStep[step];
    const currentIds = assignment?.userIds ?? [];
    const currentPrimary = assignment?.primaryUserId ?? null;

    const isCurrentlyAssigned = currentIds.includes(userId);
    const newIds = isCurrentlyAssigned
      ? currentIds.filter((id) => id !== userId)
      : [...currentIds, userId];
    const newPrimary = isCurrentlyAssigned && currentPrimary === userId ? null : currentPrimary;

    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      await stockControlApiClient.updateWorkflowAssignments(step, newIds, newPrimary ?? undefined);
      await loadData();
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update assignment");
    } finally {
      setSaving(false);
    }
  };

  const handleSetPrimary = async (userId: number, step: string) => {
    const assignment = assignmentsByStep[step];
    const currentIds = assignment?.userIds ?? [];
    const newIds = currentIds.includes(userId) ? currentIds : [...currentIds, userId];

    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      await stockControlApiClient.updateWorkflowAssignments(step, newIds, userId);
      await loadData();
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to set primary user");
    } finally {
      setSaving(false);
    }
  };

  const handleStartEditLabel = (key: string, currentLabel: string) => {
    setEditingLabelKey(key);
    setEditingLabelValue(currentLabel);
  };

  const handleSaveLabel = async () => {
    if (!editingLabelKey || !editingLabelValue.trim()) return;
    setSaving(true);
    setError("");
    try {
      await stockControlApiClient.updateWorkflowStepLabel(
        editingLabelKey,
        editingLabelValue.trim(),
      );
      setEditingLabelKey(null);
      await loadData();
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update label");
    } finally {
      setSaving(false);
    }
  };

  const handleMoveStep = async (key: string, direction: "left" | "right") => {
    const currentIndex = stepConfigs.findIndex((s) => s.key === key);
    if (currentIndex === -1) return;
    const swapIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= stepConfigs.length) return;

    const reordered = [...stepConfigs];
    const temp = reordered[currentIndex];
    reordered[currentIndex] = reordered[swapIndex];
    reordered[swapIndex] = temp;

    setStepConfigs(reordered);
    setSaving(true);
    setError("");
    try {
      await stockControlApiClient.reorderWorkflowSteps(reordered.map((s) => s.key));
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reorder steps");
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleAddStep = async () => {
    if (!newStepLabel.trim()) return;
    if (!newStepIsBackground && !newStepAfter) return;
    if (newStepIsBackground && !newStepTriggerAfter) return;

    setSaving(true);
    setError("");
    try {
      await stockControlApiClient.addWorkflowStep({
        label: newStepLabel.trim(),
        afterStepKey: newStepIsBackground ? "" : newStepAfter,
        isBackground: newStepIsBackground,
        triggerAfterStep: newStepIsBackground ? newStepTriggerAfter : undefined,
      });
      setShowAddStep(false);
      setNewStepLabel("");
      setNewStepAfter("");
      setNewStepIsBackground(false);
      setNewStepTriggerAfter("");
      await loadData();
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add step");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleBackground = async (key: string, toBackground: boolean) => {
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const triggerStep = stepConfigs.length > 0 ? stepConfigs[0].key : undefined;
      await stockControlApiClient.toggleWorkflowStepBackground(
        key,
        toBackground,
        toBackground ? triggerStep : undefined,
      );
      await loadData();
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to toggle step");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveStep = async (key: string) => {
    setSaving(true);
    setError("");
    try {
      await stockControlApiClient.removeWorkflowStep(key);
      await loadData();
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove step");
    } finally {
      setSaving(false);
    }
  };

  const handleEditNotify = (step: string) => {
    const existing = recipientsByStep[step];
    setEditEmails(existing?.emails ?? []);
    setSelectedEmail("");
    setEditingNotifyStep(step);
    setError("");
    setSuccess(false);
  };

  const handleAddEmail = () => {
    if (!selectedEmail) return;
    const trimmed = selectedEmail.trim().toLowerCase();
    if (editEmails.includes(trimmed)) {
      setError("This user has already been added");
      return;
    }
    setEditEmails((prev) => [...prev, trimmed]);
    setSelectedEmail("");
    setError("");
  };

  const handleRemoveEmail = (email: string) => {
    setEditEmails((prev) => prev.filter((e) => e !== email));
  };

  const handleSaveNotify = async () => {
    if (!editingNotifyStep) return;

    setSaving(true);
    setError("");
    setSuccess(false);

    const emailsToSave = selectedEmail.trim().toLowerCase()
      ? [...new Set([...editEmails, selectedEmail.trim().toLowerCase()])]
      : editEmails;

    try {
      await stockControlApiClient.updateNotificationRecipients(editingNotifyStep, emailsToSave);
      await loadData();
      setEditingNotifyStep(null);
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save recipients");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Workflow Configuration</h2>
      <p className="text-sm text-gray-500 mb-4">
        Manage who is assigned to each workflow step and who receives notifications.
      </p>

      <div className="flex border-b border-gray-200 mb-4">
        <button
          type="button"
          onClick={() => setActiveTab("assignments")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "assignments"
              ? "border-teal-600 text-teal-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Step Assignments
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("notifications")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "notifications"
              ? "border-teal-600 text-teal-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Notifications
        </button>
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {success && <p className="text-sm text-green-600 mb-3">Updated successfully.</p>}

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading workflow configuration...</div>
      ) : activeTab === "assignments" ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-500">
              Click a cell to toggle assignment. Right-click (or long-press) to set as primary.
            </p>
            <button
              type="button"
              onClick={() => {
                setShowAddStep(!showAddStep);
                setNewStepAfter(
                  stepConfigs.length > 0 ? stepConfigs[stepConfigs.length - 1].key : "",
                );
              }}
              className="text-xs font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Step
            </button>
          </div>
          {showAddStep && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <label className="flex items-center gap-2 text-xs font-medium text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newStepIsBackground}
                    onChange={(e) => {
                      setNewStepIsBackground(e.target.checked);
                      if (e.target.checked && stepConfigs.length > 0) {
                        setNewStepTriggerAfter(stepConfigs[0].key);
                      }
                    }}
                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  Background Step
                </label>
                {newStepIsBackground && (
                  <span className="text-xs text-gray-400">
                    Runs parallel to main workflow, no signature required
                  </span>
                )}
              </div>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Step Name</label>
                  <input
                    type="text"
                    value={newStepLabel}
                    onChange={(e) => setNewStepLabel(e.target.value)}
                    placeholder={
                      newStepIsBackground ? "e.g. Internal QC Check" : "e.g. QC Inspection"
                    }
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {newStepIsBackground ? "Trigger After" : "Insert After"}
                  </label>
                  <select
                    value={newStepIsBackground ? newStepTriggerAfter : newStepAfter}
                    onChange={(e) =>
                      newStepIsBackground
                        ? setNewStepTriggerAfter(e.target.value)
                        : setNewStepAfter(e.target.value)
                    }
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                  >
                    {stepConfigs.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                    {newStepIsBackground &&
                      backgroundSteps.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.label} (Background)
                        </option>
                      ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleAddStep}
                  disabled={
                    saving ||
                    !newStepLabel.trim() ||
                    (newStepIsBackground ? !newStepTriggerAfter : !newStepAfter)
                  }
                  className="px-3 py-1.5 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:opacity-50"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddStep(false);
                    setNewStepIsBackground(false);
                  }}
                  className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-2 pr-4 pl-1 font-medium text-gray-700 sticky left-0 bg-white min-w-[160px]">
                    Team Member
                  </th>
                  {stepConfigs.map((step, idx) => (
                    <th
                      key={step.key}
                      className="py-2 px-1 font-medium text-gray-700 text-center min-w-[72px]"
                    >
                      {editingLabelKey === step.key ? (
                        <div className="flex flex-col items-center gap-1">
                          <input
                            type="text"
                            value={editingLabelValue}
                            onChange={(e) => setEditingLabelValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveLabel();
                              if (e.key === "Escape") setEditingLabelKey(null);
                            }}
                            autoFocus
                            className="w-16 px-1 py-0.5 text-xs border border-teal-400 rounded text-center focus:ring-1 focus:ring-teal-500"
                          />
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={handleSaveLabel}
                              className="text-teal-600 hover:text-teal-800"
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
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingLabelKey(null)}
                              className="text-gray-400 hover:text-gray-600"
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
                                  strokeWidth={3}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="group">
                          <button
                            type="button"
                            onClick={() => handleStartEditLabel(step.key, step.label)}
                            className="text-xs leading-tight block mx-auto hover:text-teal-600 cursor-pointer"
                            title="Click to rename"
                          >
                            {step.label}
                          </button>
                          <div className="flex items-center justify-center gap-0.5 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {idx > 0 && (
                              <button
                                type="button"
                                onClick={() => handleMoveStep(step.key, "left")}
                                className="text-gray-400 hover:text-teal-600 p-0.5"
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
                            {idx < stepConfigs.length - 1 && (
                              <button
                                type="button"
                                onClick={() => handleMoveStep(step.key, "right")}
                                className="text-gray-400 hover:text-teal-600 p-0.5"
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
                            <button
                              type="button"
                              onClick={() => handleToggleBackground(step.key, true)}
                              className="text-gray-400 hover:text-amber-600 p-0.5"
                              title="Move to background"
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
                                  d="M13 17l5-5-5-5m-6 10l5-5-5-5"
                                />
                              </svg>
                            </button>
                            {!step.isSystem && (
                              <button
                                type="button"
                                onClick={() => handleRemoveStep(step.key)}
                                className="text-gray-400 hover:text-red-500 p-0.5"
                                title="Remove step"
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
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {matrixUsers.map((user) => (
                  <tr
                    key={user.id}
                    className={`transition-colors ${selectedUser === user.id ? "bg-teal-50" : "hover:bg-gray-50"}`}
                    onClick={() => setSelectedUser(selectedUser === user.id ? null : user.id)}
                  >
                    <td className="py-2.5 pr-4 pl-1 sticky left-0 bg-inherit">
                      <div className="font-medium text-gray-900 text-sm">{user.name}</div>
                      <div className="text-xs text-gray-400">{roleLabel(user.role)}</div>
                    </td>
                    {stepConfigs.map((step) => {
                      const assigned = isUserAssigned(user.id, step.key);
                      const primary = isPrimaryUser(user.id, step.key);

                      return (
                        <td key={step.key} className="py-2.5 px-1 text-center">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleAssignment(user.id, step.key);
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (assigned) {
                                handleSetPrimary(user.id, step.key);
                              }
                            }}
                            className={`w-8 h-8 rounded-md border transition-all inline-flex items-center justify-center ${
                              primary
                                ? "bg-teal-600 border-teal-600 text-white shadow-sm"
                                : assigned
                                  ? "bg-teal-100 border-teal-300 text-teal-700"
                                  : "bg-white border-gray-200 text-gray-300 hover:border-gray-300"
                            } ${saving ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
                            title={
                              primary
                                ? `${user.name} is primary for ${step.label}`
                                : assigned
                                  ? `${user.name} assigned to ${step.label} (right-click for primary)`
                                  : `Assign ${user.name} to ${step.label}`
                            }
                          >
                            {primary ? (
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                                />
                              </svg>
                            ) : assigned ? (
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
                            ) : null}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center gap-4 text-xs text-gray-500 border-t border-gray-100 pt-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 h-4 rounded bg-teal-100 border border-teal-300 inline-block" />
              Assigned
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 h-4 rounded bg-teal-600 border border-teal-600 inline-block" />
              Primary
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 h-4 rounded bg-white border border-gray-200 inline-block" />
              Not assigned
            </span>
          </div>

          <div className="mt-6 border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Background Steps</h3>
            {backgroundSteps.length > 0 ? (
              <div className="space-y-2">
                {backgroundSteps.map((bgStep) => {
                  const triggerStep = stepConfigs.find((s) => s.key === bgStep.triggerAfterStep);
                  const assignment = assignmentsByStep[bgStep.key];
                  const assignedUsers = assignment?.users ?? [];

                  return (
                    <div
                      key={bgStep.key}
                      className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{bgStep.label}</span>
                          <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                            Background
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          Triggers after: {triggerStep?.label ?? bgStep.triggerAfterStep ?? "N/A"}
                        </div>
                        {assignedUsers.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {assignedUsers.map((u) => (
                              <span
                                key={u.id}
                                className="text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded cursor-pointer hover:bg-teal-200"
                                onClick={() => handleToggleAssignment(u.id, bgStep.key)}
                                title={`Click to unassign ${u.name}`}
                              >
                                {u.name}
                              </span>
                            ))}
                          </div>
                        )}
                        {assignedUsers.length === 0 && (
                          <p className="text-xs text-gray-400 mt-1">No users assigned</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleToggleAssignment(Number(e.target.value), bgStep.key);
                            }
                          }}
                          className="text-xs border border-gray-300 rounded px-1.5 py-1 focus:ring-teal-500 focus:border-teal-500"
                        >
                          <option value="">Assign user...</option>
                          {matrixUsers
                            .filter((u) => !assignedUsers.some((au) => au.id === u.id))
                            .map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name}
                              </option>
                            ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleToggleBackground(bgStep.key, false)}
                          className="text-gray-400 hover:text-teal-600 p-1"
                          title="Move to foreground workflow"
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
                              d="M11 17l-5-5 5-5m6 10l-5-5 5-5"
                            />
                          </svg>
                        </button>
                        {!bgStep.isSystem && (
                          <button
                            type="button"
                            onClick={() => handleRemoveStep(bgStep.key)}
                            className="text-gray-400 hover:text-red-500 p-1"
                            title="Remove background step"
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
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-400">
                No background steps configured. Use the arrow button on custom foreground steps to
                move them here.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {stepConfigs.map((step) => {
            const recipient = recipientsByStep[step.key];
            const isEditing = editingNotifyStep === step.key;
            const emailCount = recipient?.emails?.length ?? 0;

            return (
              <div
                key={step.key}
                className={`border rounded-lg p-4 transition-colors ${
                  isEditing ? "border-teal-300 bg-teal-50/30" : "border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900 text-sm">{step.label}</h3>
                    {emailCount > 0 && !isEditing && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                        {emailCount}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      isEditing ? setEditingNotifyStep(null) : handleEditNotify(step.key)
                    }
                    className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                  >
                    {isEditing ? "Cancel" : "Edit"}
                  </button>
                </div>

                {isEditing ? (
                  <div className="mt-3 space-y-3">
                    <div className="flex gap-2">
                      <select
                        value={selectedEmail}
                        onChange={(e) => setSelectedEmail(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-teal-500 focus:border-teal-500"
                      >
                        <option value="">Select a team member...</option>
                        {teamMembers
                          .filter((m) => !editEmails.includes(m.email.toLowerCase()))
                          .map((member) => (
                            <option key={member.id} value={member.email.toLowerCase()}>
                              {member.name} ({member.email})
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleAddEmail}
                        disabled={!selectedEmail}
                        className="px-3 py-2 bg-teal-600 text-white text-xs font-medium rounded-md hover:bg-teal-700 disabled:opacity-50 transition-colors"
                      >
                        Add
                      </button>
                    </div>

                    {editEmails.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {editEmails.map((email) => {
                          const member = teamMembers.find((m) => m.email.toLowerCase() === email);
                          return (
                            <span
                              key={email}
                              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {member ? member.name : email}
                              <button
                                type="button"
                                onClick={() => handleRemoveEmail(email)}
                                className="ml-1.5 text-blue-600 hover:text-blue-800"
                              >
                                &times;
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSaveNotify}
                        disabled={saving}
                        className="px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-md hover:bg-teal-700 disabled:opacity-50 transition-colors"
                      >
                        {saving ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingNotifyStep(null)}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  emailCount > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {recipient.emails.map((email) => {
                        const member = teamMembers.find(
                          (m) => m.email.toLowerCase() === email.toLowerCase(),
                        );
                        return (
                          <span
                            key={email}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {member ? member.name : email}
                          </span>
                        );
                      })}
                    </div>
                  )
                )}
              </div>
            );
          })}
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
  const [userLocations, setUserLocations] = useState<UserLocationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

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
    return userLoc?.locationIds?.includes(locationId) ?? false;
  };

  const handleToggleLocation = async (userId: number, locationId: number) => {
    const userLoc = userLocations.find((ul) => ul.userId === userId);
    const currentIds = userLoc?.locationIds ?? [];
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
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Store Location Assignments</h2>
      <p className="text-sm text-gray-500 mb-4">
        Click a cell to toggle access. Users with no locations assigned can access all locations.
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
                const hasAny = (userLoc?.locationIds?.length ?? 0) > 0;

                return (
                  <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 pr-4 pl-1 sticky left-0 bg-inherit">
                      <div className="font-medium text-gray-900 text-sm">{member.name}</div>
                      <div className="text-xs text-gray-400">
                        {roleLabel(member.role)}
                        {!hasAny && <span className="ml-1 text-amber-500">(all locations)</span>}
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
    const group = labels[key]?.group ?? "Other";
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
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Action Permissions</h2>
          <p className="text-xs text-gray-500">
            Control which roles can perform specific actions like importing, deleting, or approving
          </p>
        </div>
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
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500 w-64">Action</th>
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
                {labels[actionKey]?.label ?? actionKey}
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
