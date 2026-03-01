"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { useAuRubberAuth } from "@/app/context/AuRubberAuthContext";
import {
  type AuRubberPermissionDto,
  type AuRubberRoleDto,
  type AuRubberUserAccessDto,
  auRubberApiClient,
} from "@/app/lib/api/auRubberApi";
import { Breadcrumb } from "../../components/Breadcrumb";

export default function RbacPage() {
  const router = useRouter();
  const { isAdmin, isLoading: authLoading } = useAuRubberAuth();
  const { showToast } = useToast();

  const [users, setUsers] = useState<AuRubberUserAccessDto[]>([]);
  const [roles, setRoles] = useState<AuRubberRoleDto[]>([]);
  const [permissions, setPermissions] = useState<AuRubberPermissionDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [editingRole, setEditingRole] = useState<AuRubberRoleDto | null>(null);
  const [editingRolePermissions, setEditingRolePermissions] = useState<string[]>([]);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFirstName, setInviteFirstName] = useState("");
  const [inviteLastName, setInviteLastName] = useState("");
  const [inviteRole, setInviteRole] = useState("");

  const [showNewRoleModal, setShowNewRoleModal] = useState(false);
  const [newRoleCode, setNewRoleCode] = useState("");
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");

  const [editingUserAccess, setEditingUserAccess] = useState<AuRubberUserAccessDto | null>(null);
  const [editUserRole, setEditUserRole] = useState("");

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace("/au-rubber/portal/dashboard");
    }
  }, [authLoading, isAdmin, router]);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [usersData, rolesData, permissionsData] = await Promise.all([
        auRubberApiClient.accessUsers(),
        auRubberApiClient.accessRoles(),
        auRubberApiClient.accessPermissions(),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
      setPermissions(permissionsData);
    } catch {
      showToast("Failed to load RBAC data", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!authLoading && isAdmin) {
      loadData();
    }
  }, [authLoading, isAdmin, loadData]);

  const permissionsByCategory = permissions.reduce(
    (acc, perm) => {
      const category = perm.category || "Other";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(perm);
      return acc;
    },
    {} as Record<string, AuRubberPermissionDto[]>,
  );

  const handleEditRole = (role: AuRubberRoleDto) => {
    setEditingRole(role);
    setEditingRolePermissions([...role.permissions]);
  };

  const handleSaveRolePermissions = async () => {
    if (!editingRole) return;

    try {
      await auRubberApiClient.setRolePermissions(editingRole.id, editingRolePermissions);
      showToast("Role permissions updated", "success");
      setEditingRole(null);
      loadData();
    } catch {
      showToast("Failed to update role permissions", "error");
    }
  };

  const handleDeleteRole = async (roleId: number) => {
    if (!confirm("Are you sure you want to delete this role?")) return;

    try {
      await auRubberApiClient.deleteRole(roleId);
      showToast("Role deleted", "success");
      loadData();
    } catch {
      showToast("Failed to delete role", "error");
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleCode.trim() || !newRoleName.trim()) {
      showToast("Please fill in code and name", "error");
      return;
    }

    try {
      await auRubberApiClient.createRole({
        code: newRoleCode.toLowerCase().replace(/\s+/g, "-"),
        name: newRoleName,
        description: newRoleDescription || undefined,
      });
      showToast("Role created", "success");
      setShowNewRoleModal(false);
      setNewRoleCode("");
      setNewRoleName("");
      setNewRoleDescription("");
      loadData();
    } catch {
      showToast("Failed to create role", "error");
    }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail.trim() || !inviteRole) {
      showToast("Please fill in email and select a role", "error");
      return;
    }

    try {
      await auRubberApiClient.inviteUser({
        email: inviteEmail,
        firstName: inviteFirstName || undefined,
        lastName: inviteLastName || undefined,
        roleCode: inviteRole,
      });
      showToast("User invited successfully", "success");
      setShowInviteModal(false);
      setInviteEmail("");
      setInviteFirstName("");
      setInviteLastName("");
      setInviteRole("");
      loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to invite user";
      showToast(message, "error");
    }
  };

  const handleEditUserAccess = (user: AuRubberUserAccessDto) => {
    setEditingUserAccess(user);
    setEditUserRole(user.roleCode || "");
  };

  const handleSaveUserAccess = async () => {
    if (!editingUserAccess || !editUserRole) return;

    try {
      await auRubberApiClient.updateUserAccess(editingUserAccess.id, editUserRole);
      showToast("User role updated", "success");
      setEditingUserAccess(null);
      loadData();
    } catch {
      showToast("Failed to update user role", "error");
    }
  };

  const handleRevokeAccess = async (accessId: number) => {
    if (!confirm("Are you sure you want to revoke this user's access?")) return;

    try {
      await auRubberApiClient.revokeUserAccess(accessId);
      showToast("Access revoked", "success");
      loadData();
    } catch {
      showToast("Failed to revoke access", "error");
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-yellow-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "RBAC" }]} />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Role-Based Access Control</h1>
        <p className="mt-1 text-sm text-gray-600">Manage users, roles, and permissions</p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Users</h2>
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 transition-colors"
          >
            Invite User
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Role
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {user.firstName || user.lastName
                      ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{user.email}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                      {user.roleName || "No Role"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    <button
                      onClick={() => handleEditUserAccess(user)}
                      className="text-yellow-600 hover:text-yellow-800 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleRevokeAccess(user.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                    No users with access yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Roles</h2>
          <button
            onClick={() => setShowNewRoleModal(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 transition-colors"
          >
            Add Role
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Permissions
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Users
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {roles.map((role) => (
                <tr key={role.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">{role.name}</div>
                    {role.description && (
                      <div className="text-xs text-gray-500">{role.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{role.permissions.length}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{role.userCount}</td>
                  <td className="px-4 py-3 text-right text-sm">
                    <button
                      onClick={() => handleEditRole(role)}
                      className="text-yellow-600 hover:text-yellow-800 mr-3"
                    >
                      Edit
                    </button>
                    {!role.isDefault && (
                      <button
                        onClick={() => handleDeleteRole(role.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto m-4">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-medium">Edit Role: {editingRole.name}</h3>
              <button
                onClick={() => setEditingRole(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {Object.entries(permissionsByCategory).map(([category, perms]) => (
                <div key={category}>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">{category}</h4>
                  <div className="space-y-2">
                    {perms.map((perm) => (
                      <label key={perm.code} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingRolePermissions.includes(perm.code)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditingRolePermissions([...editingRolePermissions, perm.code]);
                            } else {
                              setEditingRolePermissions(
                                editingRolePermissions.filter((p) => p !== perm.code),
                              );
                            }
                          }}
                          className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-600">{perm.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setEditingRole(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRolePermissions}
                className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-medium">Invite User</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={inviteFirstName}
                    onChange={(e) => setInviteFirstName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={inviteLastName}
                    onChange={(e) => setInviteLastName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                >
                  <option value="">Select a role</option>
                  {roles.map((role) => (
                    <option key={role.code} value={role.code}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleInviteUser}
                className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700"
              >
                Invite
              </button>
            </div>
          </div>
        </div>
      )}

      {showNewRoleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-medium">Add New Role</h3>
              <button
                onClick={() => setShowNewRoleModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newRoleCode}
                  onChange={(e) => setNewRoleCode(e.target.value)}
                  placeholder="e.g., supervisor"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g., Supervisor"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  placeholder="Optional description"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowNewRoleModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRole}
                className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {editingUserAccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-medium">Edit User Role</h3>
              <button
                onClick={() => setEditingUserAccess(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Editing role for: <strong>{editingUserAccess.email}</strong>
                </p>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={editUserRole}
                  onChange={(e) => setEditUserRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                >
                  <option value="">Select a role</option>
                  {roles.map((role) => (
                    <option key={role.code} value={role.code}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setEditingUserAccess(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUserAccess}
                className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
