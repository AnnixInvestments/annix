"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { useAdminAuth } from "@/app/context/AdminAuthContext";
import type { RbacAppAccessSummary, RbacUserWithAccessSummary } from "@/app/lib/api/adminApi";
import { formatDateZA } from "@/app/lib/datetime";
import {
  useRbacAllUsers,
  useRbacAppDetails,
  useRbacApps,
  useRbacInviteUser,
  useRbacRevokeAccess,
} from "@/app/lib/query/hooks";
import { AppToggleCard } from "./components/AppToggleCard";
import { InviteUserModal } from "./components/InviteUserModal";
import { UserNavigationBar } from "./components/UserNavigationBar";
import { UserSelector } from "./components/UserSelector";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: "bg-green-100 dark:bg-green-900/50", text: "text-green-700 dark:text-green-300" },
  invited: { bg: "bg-blue-100 dark:bg-blue-900/50", text: "text-blue-700 dark:text-blue-300" },
  suspended: { bg: "bg-red-100 dark:bg-red-900/50", text: "text-red-700 dark:text-red-300" },
  deactivated: { bg: "bg-gray-100 dark:bg-gray-700", text: "text-gray-700 dark:text-gray-300" },
};

function userDisplayName(user: RbacUserWithAccessSummary): string {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return fullName || user.email;
}

function userInitial(user: RbacUserWithAccessSummary): string {
  return (user.firstName?.[0] ?? user.email[0]).toUpperCase();
}

export default function AdminUsersPage() {
  const { admin } = useAdminAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteAppCode, setInviteAppCode] = useState<string | null>(null);

  const { data: apps = [], isLoading: appsLoading } = useRbacApps();
  const { data: allUsers = [], isLoading: usersLoading } = useRbacAllUsers();
  const { data: inviteAppDetails } = useRbacAppDetails(inviteAppCode ?? "");

  const revokeMutation = useRbacRevokeAccess();
  const inviteMutation = useRbacInviteUser();

  const isAdmin = admin?.roles?.includes("admin");

  useEffect(() => {
    if (allUsers.length > 0 && selectedUserId === null) {
      setSelectedUserId(allUsers[0].id);
    }
  }, [allUsers, selectedUserId]);

  const selectedUser = useMemo(
    () => allUsers.find((u) => u.id === selectedUserId) ?? null,
    [allUsers, selectedUserId],
  );

  const currentUserIndex = useMemo(
    () => allUsers.findIndex((u) => u.id === selectedUserId),
    [allUsers, selectedUserId],
  );

  const accessByApp = useMemo(() => {
    if (!selectedUser) return {};
    return selectedUser.appAccess.reduce(
      (acc, access) => {
        acc[access.appCode] = access;
        return acc;
      },
      {} as Record<string, RbacAppAccessSummary>,
    );
  }, [selectedUser]);

  const enabledAppCount = selectedUser?.appAccess.length ?? 0;
  const isLoading = appsLoading || usersLoading;

  if (!isAdmin) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div className="flex">
          <svg
            className="w-6 h-6 text-red-600 dark:text-red-400 mr-3 flex-shrink-0"
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
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Access Denied</h3>
            <p className="mt-2 text-sm text-red-700 dark:text-red-300">
              Only users with the <strong>Admin</strong> role can access user management. You
              currently have the <strong>{admin?.roles?.join(", ")}</strong> role.
            </p>
            <div className="mt-4">
              <Link
                href="/admin/portal/dashboard"
                className="text-sm font-medium text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleNavigatePrevious = () => {
    if (currentUserIndex > 0) {
      setSelectedUserId(allUsers[currentUserIndex - 1].id);
    }
  };

  const handleNavigateNext = () => {
    if (currentUserIndex < allUsers.length - 1) {
      setSelectedUserId(allUsers[currentUserIndex + 1].id);
    }
  };

  const handleEditAccess = (appCode: string) => {
    if (!selectedUser) return;
    router.push(`/admin/portal/users/${selectedUser.id}/access/${appCode}`);
  };

  const handleRevokeAccess = (access: RbacAppAccessSummary) => {
    if (!selectedUser) return;
    const userName = userDisplayName(selectedUser);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            User Access Management
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage user access across all applications
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
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            No apps configured. Please run migrations.
          </p>
        </div>
      ) : allUsers.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 shadow rounded-lg p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
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
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            No users found in the system
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-slate-800 shadow rounded-lg p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <UserSelector
                  users={allUsers}
                  selectedUserId={selectedUserId}
                  onSelectUser={setSelectedUserId}
                />
              </div>
              <UserNavigationBar
                currentIndex={currentUserIndex}
                totalUsers={allUsers.length}
                onPrevious={handleNavigatePrevious}
                onNext={handleNavigateNext}
              />
            </div>
          </div>

          {selectedUser && (
            <>
              <div className="bg-white dark:bg-slate-800 shadow rounded-lg p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-slate-600 flex items-center justify-center text-lg font-medium text-gray-600 dark:text-gray-300">
                    {userInitial(selectedUser)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                        {userDisplayName(selectedUser)}
                      </h2>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded ${
                          STATUS_COLORS[selectedUser.status]?.bg ?? "bg-gray-100 dark:bg-gray-700"
                        } ${
                          STATUS_COLORS[selectedUser.status]?.text ??
                          "text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {selectedUser.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {selectedUser.email}
                    </p>
                  </div>
                  <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                    <div>
                      {selectedUser.lastLoginAt
                        ? `Last login: ${formatDateZA(selectedUser.lastLoginAt)}`
                        : "Never logged in"}
                    </div>
                    <div className="font-medium text-gray-700 dark:text-gray-300">
                      {enabledAppCount} of {apps.length} enabled
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 shadow rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      App Access
                    </h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {enabledAppCount} of {apps.length} enabled
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {apps.map((app) => {
                      const access = accessByApp[app.code] ?? null;
                      return (
                        <AppToggleCard
                          key={app.code}
                          app={app}
                          access={access}
                          onEdit={() => handleEditAccess(app.code)}
                          onRevoke={() => access && handleRevokeAccess(access)}
                          onEnable={() => handleEditAccess(app.code)}
                          isRevoking={
                            revokeMutation.isPending &&
                            revokeMutation.variables?.accessId === access?.accessId
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

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
