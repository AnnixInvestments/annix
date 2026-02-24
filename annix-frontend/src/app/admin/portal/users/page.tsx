"use client";

import Link from "next/link";
import { useState } from "react";
import { useToast } from "@/app/components/Toast";
import { useAdminAuth } from "@/app/context/AdminAuthContext";
import type {
  AssignUserAccessDto,
  RbacSearchUser,
  RbacUserAccess,
  UpdateUserAccessDto,
} from "@/app/lib/api/adminApi";
import {
  useRbacApps,
  useRbacAppDetails,
  useRbacUsersWithAccess,
  useRbacAssignAccess,
  useRbacUpdateAccess,
  useRbacRevokeAccess,
  useRbacInviteUser,
} from "@/app/lib/query/hooks";
import { AppTabs } from "./components/AppTabs";
import { UserAccessCard } from "./components/UserAccessCard";
import { EditAccessModal } from "./components/EditAccessModal";
import { InviteUserModal } from "./components/InviteUserModal";
import { UserSearchDropdown } from "./components/UserSearchDropdown";

export default function AdminUsersPage() {
  const { admin } = useAdminAuth();
  const { showToast } = useToast();

  const [selectedAppCode, setSelectedAppCode] = useState<string>("");
  const [editingAccess, setEditingAccess] = useState<RbacUserAccess | null>(null);
  const [selectedUser, setSelectedUser] = useState<RbacSearchUser | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const { data: apps = [], isLoading: appsLoading } = useRbacApps();
  const { data: appDetails } = useRbacAppDetails(selectedAppCode);
  const { data: usersWithAccess = [], isLoading: usersLoading } =
    useRbacUsersWithAccess(selectedAppCode);

  const assignMutation = useRbacAssignAccess();
  const updateMutation = useRbacUpdateAccess();
  const revokeMutation = useRbacRevokeAccess();
  const inviteMutation = useRbacInviteUser();

  const isAdmin = admin?.roles?.includes("admin");

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

  if (!selectedAppCode && apps.length > 0) {
    setSelectedAppCode(apps[0].code);
  }

  const handleEditAccess = (access: RbacUserAccess) => {
    setEditingAccess(access);
    setSelectedUser(null);
    setShowEditModal(true);
  };

  const handleGrantAccess = (user: RbacSearchUser) => {
    setSelectedUser(user);
    setEditingAccess(null);
    setShowEditModal(true);
  };

  const handleRevokeAccess = (access: RbacUserAccess) => {
    if (!confirm(`Are you sure you want to revoke access for ${access.email}?`)) return;

    revokeMutation.mutate(
      { accessId: access.id, appCode: access.appCode },
      {
        onSuccess: () => {
          showToast(`Access revoked for ${access.email}`, "success");
        },
        onError: (err) => {
          showToast(`Error: ${err.message}`, "error");
        },
      },
    );
  };

  const handleSaveAccess = (dto: AssignUserAccessDto | UpdateUserAccessDto) => {
    if (editingAccess) {
      updateMutation.mutate(
        { accessId: editingAccess.id, dto: dto as UpdateUserAccessDto, appCode: selectedAppCode },
        {
          onSuccess: () => {
            showToast("Access updated successfully", "success");
            setShowEditModal(false);
            setEditingAccess(null);
          },
          onError: (err) => {
            showToast(`Error: ${err.message}`, "error");
          },
        },
      );
    } else if (selectedUser) {
      assignMutation.mutate(
        { userId: selectedUser.id, dto: { ...dto, appCode: selectedAppCode } as AssignUserAccessDto },
        {
          onSuccess: () => {
            showToast(`Access granted to ${selectedUser.email}`, "success");
            setShowEditModal(false);
            setSelectedUser(null);
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

  const existingUserIds = usersWithAccess.map((u) => u.userId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Access Management</h1>
          <p className="mt-1 text-sm text-gray-600">
            Configure user access to each app with roles or custom permissions
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          disabled={!selectedAppCode}
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

      {appsLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : apps.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-sm text-yellow-700">No apps configured. Please run migrations.</p>
        </div>
      ) : (
        <>
          <div className="bg-white shadow rounded-lg">
            <AppTabs
              apps={apps}
              selectedAppCode={selectedAppCode}
              onSelectApp={setSelectedAppCode}
            />

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-gray-900">
                      Users with Access ({usersWithAccess.length})
                    </h2>
                  </div>

                  {usersLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                    </div>
                  ) : usersWithAccess.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
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
                      <p className="mt-2">No users have access to this app yet.</p>
                      <p className="text-sm">Search for a user or invite a new one.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {usersWithAccess.map((access) => (
                        <UserAccessCard
                          key={access.id}
                          access={access}
                          onEdit={() => handleEditAccess(access)}
                          onRevoke={() => handleRevokeAccess(access)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">
                      Add Existing User
                    </h3>
                    <UserSearchDropdown
                      onSelectUser={handleGrantAccess}
                      excludeUserIds={existingUserIds}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Search for users already in the system to grant them access.
                    </p>
                  </div>

                  {appDetails && (
                    <div className="mt-4 bg-gray-50 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-gray-900 mb-3">
                        Available Roles
                      </h3>
                      <div className="space-y-2">
                        {appDetails.roles.map((role) => (
                          <div key={role.code} className="text-sm">
                            <span className="font-medium text-gray-700">{role.name}</span>
                            {role.isDefault && (
                              <span className="ml-1 text-xs text-blue-600">(Default)</span>
                            )}
                            {role.description && (
                              <p className="text-xs text-gray-500">{role.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <EditAccessModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingAccess(null);
          setSelectedUser(null);
        }}
        appDetails={appDetails ?? null}
        existingAccess={editingAccess}
        selectedUser={selectedUser}
        onSave={handleSaveAccess}
        isSaving={assignMutation.isPending || updateMutation.isPending}
      />

      <InviteUserModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        appDetails={appDetails ?? null}
        onInvite={handleInviteUser}
        isInviting={inviteMutation.isPending}
      />
    </div>
  );
}
