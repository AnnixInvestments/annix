"use client";

import * as Popover from "@radix-ui/react-popover";
import { useMemo, useRef, useState } from "react";
import type { RbacUserWithAccessSummary } from "@/app/lib/api/adminApi";

interface UserSelectorProps {
  users: RbacUserWithAccessSummary[];
  selectedUserId: number | null;
  onSelectUser: (userId: number) => void;
  disabled?: boolean;
}

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

export function UserSelector({ users, selectedUserId, onSelectUser, disabled }: UserSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) ?? null,
    [users, selectedUserId],
  );

  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    const term = searchTerm.toLowerCase();
    return users.filter(
      (user) =>
        user.email.toLowerCase().includes(term) ||
        (user.firstName?.toLowerCase().includes(term) ?? false) ||
        (user.lastName?.toLowerCase().includes(term) ?? false),
    );
  }, [users, searchTerm]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      setSearchTerm("");
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  };

  const handleSelect = (userId: number) => {
    onSelectUser(userId);
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="flex items-center justify-between w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-left"
        >
          {selectedUser ? (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-slate-600 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300">
                {userInitial(selectedUser)}
              </div>
              <span className="truncate">{userDisplayName(selectedUser)}</span>
              <span className="text-gray-400 dark:text-gray-500 text-xs">
                ({selectedUser.appAccess.length} apps)
              </span>
            </div>
          ) : (
            <span className="text-gray-400 dark:text-gray-500">Select user...</span>
          )}
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            className="text-gray-400 dark:text-gray-500"
          >
            <path
              d="M2.5 4.5L6 8L9.5 4.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-md shadow-lg z-50 w-[var(--radix-popover-trigger-width)] max-h-96 overflow-hidden"
          sideOffset={4}
          align="start"
        >
          <div className="p-2 border-b border-gray-200 dark:border-slate-700">
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="max-h-72 overflow-y-auto p-1">
            {filteredUsers.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                No users found
              </div>
            ) : (
              filteredUsers.map((user) => {
                const statusColors = STATUS_COLORS[user.status] ?? STATUS_COLORS.deactivated;
                const isSelected = user.id === selectedUserId;
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleSelect(user.id)}
                    className={`relative flex items-center w-full px-2 py-2 text-sm rounded cursor-pointer select-none text-left hover:bg-blue-50 dark:hover:bg-blue-900/30 ${
                      isSelected
                        ? "text-blue-700 dark:text-blue-300 font-medium"
                        : "text-gray-900 dark:text-white"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-600 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-300 flex-shrink-0">
                      {userInitial(user)}
                    </div>
                    <div className="ml-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate">{userDisplayName(user)}</span>
                        <span
                          className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${statusColors.bg} ${statusColors.text}`}
                        >
                          {user.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {user.email}
                      </div>
                    </div>
                    <div className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                      {user.appAccess.length} apps
                    </div>
                    {isSelected && (
                      <span className="absolute right-2 text-blue-600 dark:text-blue-400">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path
                            d="M10 3L4.5 8.5L2 6"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
