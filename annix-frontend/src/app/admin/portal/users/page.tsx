"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { useAdminAuth } from "@/app/context/AdminAuthContext";
import type {
  AssignUserAccessDto,
  RbacAppAccessSummary,
  RbacUserWithAccessSummary,
  UpdateUserAccessDto,
} from "@/app/lib/api/adminApi";
import {
  useRbacAllUsers,
  useRbacAppDetails,
  useRbacApps,
  useRbacAssignAccess,
  useRbacInviteUser,
  useRbacRevokeAccess,
  useRbacUpdateAccess,
} from "@/app/lib/query/hooks";
import { EditAccessModal } from "./components/EditAccessModal";
import { InviteUserModal } from "./components/InviteUserModal";
import { UserRow } from "./components/UserRow";

type FilterOption = "all" | "with-access" | "no-access";

export default function AdminUsersPage() {
  const { admin } = useAdminAuth();
  const { showToast } = useToast();

  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOption, setFilterOption] = useState<FilterOption>("all");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingAppCode, setEditingAppCode] = useState<string | null>(null);
  const [inviteAppCode, setInviteAppCode] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<RbacUserWithAccessSummary | null>(null);
  const [editingAccess, setEditingAccess] = useState<RbacAppAccessSummary | null>(null);

  const { data: apps = [], isLoading: appsLoading } = useRbacApps();
  const { data: allUsers = [], isLoading: usersLoading } = useRbacAllUsers();
  const { data: appDetails } = useRbacAppDetails(editingAppCode ?? "");
  const { data: inviteAppDetails } = useRbacAppDetails(inviteAppCode ?? "");

  const assignMutation = useRbacAssignAccess();
  const updateMutation = useRbacUpdateAccess();
  const revokeMutation = useRbacRevokeAccess();
  const inviteMutation = useRbacInviteUser();

  const isAdmin = admin?.roles?.includes("admin");

  const filteredUsers = useMemo(() => {
    return allUsers.filter((user) => {
      const matchesSearch =
        searchQuery === "" ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (user.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

      const matchesFilter =
        filterOption === "all" ||
        (filterOption === "with-access" && user.appAccess.length > 0) ||
        (filterOption === "no-access" && user.appAccess.length === 0);

      return matchesSearch && matchesFilter;
    });
  }, [allUsers, searchQuery, filterOption]);

  if (!isAdmin) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex">
          <svg
            className="w-6 h-6 text-red-600 mr-3 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-red-800">Access Denied</h3>
            <p className="mt-2 text-sm text-red-700">
              Only users with the <strong>Admin</strong> role can access user management. You
              currently have the <strong>{admin?.roles?.join(", ")}</strong> role.
            </p>
            <div className="mt-4">
              <Link
                href="/admin/portal/dashboard"
                className="text-sm font-medium text-red-600 hover:text-red-500"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleToggleUser = (userId: number) => {
    setExpandedUserId((prev) => (prev === userId ? null : userId));
  };

  const handleEditAccess = (
    user: RbacUserWithAccessSummary,
    appCode: string,
    existingAccess: RbacAppAccessSummary | null,
  ) => {
    setEditingUser(user);
    setEditingAppCode(appCode);
    setEditingAccess(existingAccess);
    setShowEditModal(true);
  };

  const handleRevokeAccess = (user: RbacUserWithAccessSummary, access: RbacAppAccessSummary) => {
    const userName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
    if (!confirm(`Are you sure you want to revoke ${userName}'s access to ${access.appName}?`)) {
      return;
    }

    revokeMutation.mutate(
      { accessId: access.accessId, appCode: access.appCode },
      {
        onSuccess: () => {
          showToast(`Access to ${access.appName} revoked for ${userName}`, "success");
        },
        onError: (err) => {
          showToast(`Error: ${err.message}`, "error");
        },
      },
    );
  };

  const handleSaveAccess = (dto: AssignUserAccessDto | UpdateUserAccessDto) => {
    if (!editingUser || !editingAppCode) return;

    if (editingAccess) {
      updateMutation.mutate(
        {
          accessId: editingAccess.accessId,
          dto: dto as UpdateUserAccessDto,
          appCode: editingAppCode,
        },
        {
          onSuccess: () => {
            showToast("Access updated successfully", "success");
            setShowEditModal(false);
            setEditingUser(null);
            setEditingAppCode(null);
            setEditingAccess(null);
          },
          onError: (err) => {
            showToast(`Error: ${err.message}`, "error");
          },
        },
      );
    } else {
      assignMutation.mutate(
        {
          userId: editingUser.id,
          dto: { ...dto, appCode: editingAppCode } as AssignUserAccessDto,
        },
        {
          onSuccess: () => {
            const userName =
              [editingUser.firstName, editingUser.lastName].filter(Boolean).join(" ") ||
              editingUser.email;
            showToast(`Access granted to ${userName}`, "success");
            setShowEditModal(false);
            setEditingUser(null);
            setEditingAppCode(null);
            setEditingAccess(null);
          },
          onError: (err) => {
            showToast(`Error: ${err.message}`, "error");
          },
        },
      );
    }
  };

  const handleInviteUser = (dto: Parameters<typeof inviteMutation.mutate>[0]) => {
    inviteMutation.mutate(dto, {
      onSuccess: (response) => {
        showToast(response.message, "success");
        setShowInviteModal(false);
      },
      onError: (err) => {
        showToast(`Error: ${err.message}`, "error");
      },
    });
  };

  const isLoading = appsLoading || usersLoading;

  const usersWithAccess = allUsers.filter((u) => u.appAccess.length > 0).length;
  const usersWithoutAccess = allUsers.filter((u) => u.appAccess.length === 0).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Access Management</h1>
          <p className="mt-1 text-sm text-gray-600">
            View and manage user access across all applications
          </p>
        </div>
        <button
          onClick={() => {
            setInviteAppCode(apps[0]?.code ?? null);
            setShowInviteModal(true);
          }}
          disabled={apps.length === 0}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Invite User
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : apps.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-sm text-yellow-700">No apps configured. Please run migrations.</p>
        </div>
      ) : (
        <>
          <div className="bg-white shadow rounded-lg p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label htmlFor="search" className="sr-only">
                  Search users
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  <input
                    id="search"
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Filter:</span>
                <select
                  value={filterOption}
                  onChange={(e) => setFilterOption(e.target.value as FilterOption)}
                  className="block w-full sm:w-auto rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="all">All users ({allUsers.length})</option>
                  <option value="with-access">With access ({usersWithAccess})</option>
                  <option value="no-access">No access ({usersWithoutAccess})</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">
                  Users ({filteredUsers.length})
                </h2>
                <span className="text-sm text-gray-500">{apps.length} apps available</span>
              </div>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <p className="mt-2 text-sm text-gray-500">
                  {searchQuery || filterOption !== "all"
                    ? "No users match your search criteria"
                    : "No users found in the system"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 p-4 space-y-3">
                {filteredUsers.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    apps={apps}
                    isExpanded={expandedUserId === user.id}
                    onToggle={() => handleToggleUser(user.id)}
                    onEditAccess={(appCode, existingAccess) =>
                      handleEditAccess(user, appCode, existingAccess)
                    }
                    onRevokeAccess={(access) => handleRevokeAccess(user, access)}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <EditAccessModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingUser(null);
          setEditingAppCode(null);
          setEditingAccess(null);
        }}
        appDetails={appDetails ?? null}
        existingAccess={
          editingAccess
            ? {
                id: editingAccess.accessId,
                userId: editingUser?.id ?? 0,
                email: editingUser?.email ?? "",
                firstName: editingUser?.firstName ?? null,
                lastName: editingUser?.lastName ?? null,
                appCode: editingAccess.appCode,
                roleCode: editingAccess.roleCode,
                roleName: editingAccess.roleName,
                useCustomPermissions: editingAccess.useCustomPermissions,
                permissionCodes: null,
                permissionCount: editingAccess.permissionCount,
                grantedAt: "",
                expiresAt: editingAccess.expiresAt,
                grantedById: null,
              }
            : null
        }
        selectedUser={
          editingUser && !editingAccess
            ? {
                id: editingUser.id,
                email: editingUser.email,
                firstName: editingUser.firstName,
                lastName: editingUser.lastName,
              }
            : null
        }
        onSave={handleSaveAccess}
        isSaving={assignMutation.isPending || updateMutation.isPending}
      />

      <InviteUserModal
        isOpen={showInviteModal}
        onClose={() => {
          setShowInviteModal(false);
          setInviteAppCode(null);
        }}
        appDetails={inviteAppDetails ?? null}
        onInvite={handleInviteUser}
        isInviting={inviteMutation.isPending}
      />
    </div>
  );
}
